import "server-only";
import { fal } from "@fal-ai/client";
import { getServerEnv } from "@/lib/env";

let configured = false;

/**
 * Configures the shared @fal-ai/client singleton with the server-only FAL_KEY.
 * Must only ever be imported from server actions / route handlers — this
 * module is guarded by `server-only` so a browser-side import fails the build.
 */
export function getFalClient() {
  if (!configured) {
    const env = getServerEnv();
    fal.config({ credentials: env.FAL_KEY });
    configured = true;
  }
  return fal;
}
