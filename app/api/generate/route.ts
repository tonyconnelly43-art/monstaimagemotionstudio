import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Style → prompt prefix map to steer the model
const STYLE_PREFIXES: Record<string, string> = {
  realistic: "Photorealistic motion, natural lighting,",
  cinematic: "Cinematic camera movement, film grain, dramatic lighting,",
  cartoon: "Animated cartoon style, vibrant colors, smooth motion,",
  product_ad: "Clean product advertisement, professional lighting, slow reveal,",
  mascot: "Fun mascot animation, bouncy movement, character animation,",
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

    // Build the enriched prompt
    const stylePrefix = STYLE_PREFIXES[style] || "";
    const enrichedPrompt = stylePrefix
      ? `${stylePrefix} ${prompt}`
      : prompt;

    // Submit async job to fal-ai/kling-video/v1.6/standard/image-to-video
    // Kling supports duration 5s and 10s natively
    const { request_id } = await fal.queue.submit(
      "fal-ai/kling-video/v1.6/standard/image-to-video",
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
