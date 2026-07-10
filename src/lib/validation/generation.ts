import { z } from "zod";

export const generationRequestSchema = z.object({
  sceneId: z.string().uuid(),
});

/** Simple sliding-window rate limit: max requests per user in the trailing window. */
export const GENERATION_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 30,
};
