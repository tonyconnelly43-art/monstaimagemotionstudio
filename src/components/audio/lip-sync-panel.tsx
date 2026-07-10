"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitLipSyncAction, type LipSyncMode } from "@/lib/actions/lipsync";
import { useGenerationJob } from "@/lib/hooks/use-generation-job";
import type { AudioTrack } from "@/lib/data/audio";
import type { Scene } from "@/lib/data/scenes";

const MODES: { value: LipSyncMode; label: string }[] = [
  { value: "none", label: "No Lip Sync" },
  { value: "basic_mouth_movement", label: "Basic Mouth Movement" },
  { value: "dialogue_lip_sync", label: "Dialogue Lip Sync" },
  { value: "narration_only", label: "Narration Only" },
];

export function LipSyncPanel({ scene, audioTracks }: { scene: Scene; audioTracks: AudioTrack[] }) {
  const [mode, setMode] = useState<LipSyncMode>("none");
  const [trackId, setTrackId] = useState<string>(audioTracks[0]?.id ?? "");
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { job, takes } = useGenerationJob(jobId, (result) => {
    if (result.job?.status === "completed") toast.success("Lip-synced take saved to this scene's takes.");
    if (result.job?.status === "failed") toast.error(result.job.error_message ?? "Lip sync failed.");
  });

  async function handleRun() {
    if (mode === "none") {
      toast.info("Set a mode other than \"No Lip Sync\" first.");
      return;
    }
    if (!trackId) {
      toast.error("Add an audio track first (see Audio Timeline tab).");
      return;
    }
    if (!scene.selected_take_id) {
      toast.error("Generate and select a video take first.");
      return;
    }
    setSubmitting(true);
    const result = await submitLipSyncAction(scene.id, trackId, mode);
    setSubmitting(false);
    if (result.error) toast.error(result.error);
    else if (result.jobId) {
      toast.info("Lip sync started.");
      setJobId(result.jobId);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Lip sync is an optional post-production step and is never required — many Hoop Squad videos use narration or
        off-camera dialogue with no lip sync at all. Running it creates a new take (Sync Lipsync 2.0) you can compare
        against the original.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mode</Label>
          <Select value={mode} onValueChange={(v) => v && setMode(v as LipSyncMode)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Audio track to sync to</Label>
          <Select value={trackId} onValueChange={(v) => v && setTrackId(v)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a track" />
            </SelectTrigger>
            <SelectContent>
              {audioTracks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label ?? t.track_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleRun} disabled={submitting || mode === "none"}>
          {submitting || (job && ["queued", "processing"].includes(job.status)) ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Run Lip Sync
        </Button>
      </div>
      {takes[0]?.output_url ? (
        <video src={takes[0].output_url} controls className="max-h-64 rounded-lg border border-border/60" />
      ) : null}
    </div>
  );
}
