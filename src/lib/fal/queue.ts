import "server-only";
import { ApiError } from "@fal-ai/client";
import { getFalClient } from "@/lib/fal/client";

export interface QueueSubmitResult {
  requestId: string;
}

export async function submitToQueue(
  falEndpointId: string,
  input: Record<string, unknown>,
): Promise<QueueSubmitResult> {
  const fal = getFalClient();
  const result = await fal.queue.submit(falEndpointId, { input });
  return { requestId: result.request_id };
}

export type NormalizedJobStatus = "queued" | "processing" | "completed" | "failed";

export interface NormalizedStatus {
  status: NormalizedJobStatus;
  logs?: string[];
}

export async function getQueueStatus(
  falEndpointId: string,
  requestId: string,
): Promise<NormalizedStatus> {
  const fal = getFalClient();
  const status = await fal.queue.status(falEndpointId, { requestId, logs: true });
  const logs =
    "logs" in status && Array.isArray(status.logs)
      ? status.logs.map((l) => (typeof l === "string" ? l : l.message)).filter(Boolean)
      : undefined;

  switch (status.status) {
    case "IN_QUEUE":
      return { status: "queued", logs };
    case "IN_PROGRESS":
      return { status: "processing", logs };
    case "COMPLETED":
      return { status: "completed", logs };
    default:
      return { status: "failed", logs };
  }
}

export async function getQueueResult<T = unknown>(
  falEndpointId: string,
  requestId: string,
): Promise<T> {
  const fal = getFalClient();
  const result = await fal.queue.result(falEndpointId, { requestId });
  return result.data as T;
}

export async function cancelQueueRequest(falEndpointId: string, requestId: string): Promise<void> {
  const fal = getFalClient();
  await fal.queue.cancel(falEndpointId, { requestId });
}

/**
 * Submits a job and polls it to completion in-process, bounded by a timeout.
 * Suitable for fast jobs (TTS previews) where blocking the request is
 * acceptable — video generation should use the async queue+poll route
 * instead. Never retries indefinitely: throws after `timeoutMs`.
 */
export async function runQueueToCompletion<T = unknown>(
  falEndpointId: string,
  input: Record<string, unknown>,
  timeoutMs = 45_000,
): Promise<T> {
  const { requestId } = await submitToQueue(falEndpointId, input);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getQueueStatus(falEndpointId, requestId);
    if (status.status === "completed") {
      return getQueueResult<T>(falEndpointId, requestId);
    }
    if (status.status === "failed") {
      throw new Error("The model failed to complete this request.");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Timed out waiting for a response from fal.ai.");
}

/** Pulls the actual reason out of a fal ApiError/ValidationError body, when available. */
function extractFalDetail(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { detail?: unknown; message?: string } | undefined;
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) {
    const msgs = body.detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
      .filter(Boolean);
    if (msgs.length) return msgs.join("; ");
  }
  if (body?.message) return body.message;
  return error.message || null;
}

/** Maps low-level fal/network failures to a message a non-technical creator can act on. */
export function explainFalError(error: unknown): { message: string; code: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const detail = extractFalDetail(error);
  if (/401|unauthorized|invalid key/i.test(raw)) {
    return { message: "The fal.ai API key is missing or invalid. Check it in Settings.", code: "fal_auth" };
  }
  if (/429|rate limit/i.test(raw)) {
    return {
      message: "fal.ai is rate-limiting this account right now. Wait a moment and try again.",
      code: "fal_rate_limit",
    };
  }
  if (/timeout|timed out|ETIMEDOUT/i.test(raw)) {
    return { message: "The request to fal.ai timed out. Try again in a moment.", code: "fal_timeout" };
  }
  if (/422|validation|invalid input/i.test(raw)) {
    return {
      message: `The selected model rejected one of the inputs (image, duration, or resolution)${detail ? `: ${detail}` : ""}. Try adjusting your settings.`,
      code: "fal_validation",
    };
  }
  if (/network|fetch failed|ECONNRESET/i.test(raw)) {
    return { message: "Network error reaching fal.ai. Check your connection and try again.", code: "network" };
  }
  return {
    message: detail
      ? `Generation failed: ${detail}`
      : "Generation failed for an unknown reason. You can retry or check Generation History for details.",
    code: "unknown",
  };
}
