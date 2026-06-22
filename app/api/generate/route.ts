import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Style → prompt suffix. Keep camera stable and preserve the source art style.
const STYLE_SUFFIXES: Record<string, string> = {
  realistic: "Keep the original art style. Static camera, no zoom, no pan.",
  cinematic: "Slow cinematic push-in. Keep the original art style exactly as-is.",
  cartoon: "Keep the original illustration and art style exactly as-is. Static camera, no zoom.",
  product_ad: "Slow reveal. Keep the original art style exactly as-is. Static camera.",
  mascot: "Keep the original character art style exactly as-is. Static camera, minimal movement.",
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "FAL_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    fal.config({ credentials: apiKey });

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string;
    const duration = Number(formData.get("duration")) || 5;
    const style = (formData.get("style") as string) || "cinematic";

    if (!imageFile || !prompt) {
      return NextResponse.json(
        { error: "Image and prompt are required" },
        { status: 400 }
      );
    }

    // Upload the image to fal storage so we get a stable URL
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
    const imageUrl = await fal.storage.upload(imageBlob);

    // Build the enriched prompt — suffix keeps art style and camera stable
    const styleSuffix = STYLE_SUFFIXES[style] || "Keep the original art style exactly as-is. Static camera.";
    const enrichedPrompt = `${prompt}. ${styleSuffix}`;

    // Submit async job to Kling v2.1 image-to-video
    const { request_id } = await fal.queue.submit(
      "fal-ai/kling-video/v2.1/standard/image-to-video",
      {
        input: {
          image_url: imageUrl,
          prompt: enrichedPrompt,
          duration: duration === 10 ? "10" : "5",
        },
      }
    );

    return NextResponse.json({ requestId: request_id });
  } catch (err: unknown) {
    console.error("[generate]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
