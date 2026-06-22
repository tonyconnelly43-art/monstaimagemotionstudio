import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "FAL_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    fal.config({ credentials: apiKey });

    const requestId = req.nextUrl.searchParams.get("requestId");
    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 }
      );
    }

    const statusRes = await fal.queue.status(
      "fal-ai/kling-video/v1.6/standard/image-to-video",
      { requestId, logs: false }
    );

    if (statusRes.status === "COMPLETED") {
      const result = await fal.queue.result(
        "fal-ai/kling-video/v1.6/standard/image-to-video",
        { requestId }
      );

      // fal returns { video: { url: string } }
      const data = result.data as { video?: { url?: string } };
      const videoUrl = data?.video?.url;

      if (!videoUrl) {
        return NextResponse.json(
          { status: "FAILED", error: "No video URL in response" },
          { status: 500 }
        );
      }

      return NextResponse.json({ status: "COMPLETED", videoUrl });
    }

    // IN_QUEUE or IN_PROGRESS
    return NextResponse.json({ status: statusRes.status });
  } catch (err: unknown) {
    console.error("[status]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
