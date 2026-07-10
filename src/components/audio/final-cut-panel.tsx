"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildFinalCutAction } from "@/lib/actions/final-cut";
import type { Scene } from "@/lib/data/scenes";

export function FinalCutPanel({ scene }: { scene: Scene }) {
  const [building, setBuilding] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleBuild() {
    setBuilding(true);
    setResultUrl(null);
    const result = await buildFinalCutAction(scene.id);
    setBuilding(false);
    if (result.error) toast.error(result.error);
    else if (result.url) {
      setResultUrl(result.url);
      toast.success("Final cut rendered.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Combines this scene&apos;s selected video take with every unmuted audio track (or only soloed tracks, if any),
        applying volume, fades, and basic ducking of music/SFX under dialogue, plus a master limiter — rendered
        server-side with FFmpeg.
      </p>
      <Button onClick={handleBuild} disabled={building || !scene.selected_take_id}>
        {building ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
        Build Final Cut
      </Button>
      {!scene.selected_take_id ? <p className="text-xs text-muted-foreground">Generate a video take in Studio first.</p> : null}
      {resultUrl ? (
        <div className="space-y-2">
          <video src={resultUrl} controls className="max-h-64 rounded-lg border border-border/60" />
          <Button size="sm" variant="outline" render={<a href={resultUrl} download />}>
            <Download className="size-3.5" /> Download Final Cut
          </Button>
        </div>
      ) : null}
    </div>
  );
}
