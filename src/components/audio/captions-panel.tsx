"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { DialogueLine } from "@/lib/data/audio";

const CAPTION_STYLES = ["Clean", "Bold Social", "Cartoon", "Minimal", "Hoop Squad"] as const;

function formatVttTime(ms: number): string {
  const date = new Date(ms);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const mmm = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${mmm}`;
}

export function CaptionsPanel({ lines }: { lines: DialogueLine[] }) {
  const [style, setStyle] = useState<(typeof CAPTION_STYLES)[number]>("Clean");

  const cues = useMemo(
    () =>
      lines
        .filter((l) => l.text_content.trim())
        .map((l) => ({
          start: l.start_time_ms,
          end: l.start_time_ms + (l.estimated_duration_ms ?? 1500),
          text: l.text_content,
        })),
    [lines],
  );

  function download() {
    const vtt = ["WEBVTT", "", ...cues.map((c, i) => `${i + 1}\n${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.text}\n`)].join(
      "\n",
    );
    const blob = new Blob([vtt], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "captions.vtt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Captions are generated directly from the dialogue script above — no speech-to-text needed since the text is
        already known. Burned-in caption rendering onto video is a documented next step (see FEATURE_CHECKLIST.md);
        for now, export the caption file and use it with any player or editor that supports WebVTT.
      </p>
      <div className="flex items-center gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Caption style</Label>
          <Select value={style} onValueChange={(v) => v && setStyle(v as (typeof CAPTION_STYLES)[number])}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPTION_STYLES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="mt-5" size="sm" variant="outline" onClick={download} disabled={cues.length === 0}>
          <Download className="size-3.5" /> Download .vtt
        </Button>
      </div>

      <div className="space-y-1.5">
        {cues.map((cue, i) => (
          <div key={i} className="rounded-md border border-border/60 p-2 text-xs">
            <span className="mr-2 text-muted-foreground">
              {formatVttTime(cue.start)} → {formatVttTime(cue.end)}
            </span>
            {cue.text}
          </div>
        ))}
        {cues.length === 0 ? <p className="text-xs text-muted-foreground">Add dialogue lines to generate captions.</p> : null}
      </div>
    </div>
  );
}
