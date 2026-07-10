"use client";

import { useEffect, useRef, useState } from "react";
import type { Database } from "@/types/database";

type Job = Database["public"]["Tables"]["generation_jobs"]["Row"];
type Take = Database["public"]["Tables"]["generation_takes"]["Row"];

interface JobPollResult {
  job: Job | null;
  takes: Take[];
  error?: string;
}

/**
 * Polls GET /api/generation-jobs/[id] until the job reaches a terminal
 * state. No endless retry loop — stops after `maxAttempts` and surfaces a
 * clear message instead of polling forever.
 */
export function useGenerationJob(jobId: string | null, onSettled?: (result: JobPollResult) => void) {
  const [state, setState] = useState<JobPollResult>({ job: null, takes: [] });
  const attemptsRef = useRef(0);
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  useEffect(() => {
    if (!jobId) return;
    attemptsRef.current = 0;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      attemptsRef.current += 1;
      try {
        const res = await fetch(`/api/generation-jobs/${jobId}`, { cache: "no-store" });
        const data: JobPollResult = await res.json();
        if (cancelled) return;
        setState(data);

        const terminal = data.job && ["completed", "failed", "cancelled"].includes(data.job.status);
        if (terminal) {
          onSettledRef.current?.(data);
          return;
        }
        if (attemptsRef.current >= 150) {
          setState({ job: data.job, takes: data.takes, error: "Still processing after several minutes. Check Generation History shortly." });
          return;
        }
        timeoutId = setTimeout(poll, 4000);
      } catch {
        if (cancelled) return;
        if (attemptsRef.current >= 5) {
          setState((prev) => ({ ...prev, error: "Lost connection while checking generation status." }));
          return;
        }
        timeoutId = setTimeout(poll, 4000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [jobId]);

  return state;
}
