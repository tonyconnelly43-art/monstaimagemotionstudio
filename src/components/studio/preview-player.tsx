"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Download, Heart, RotateCcw, X, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { setTakeApprovalAction, selectTakeAction } from "@/lib/actions/scenes";
import type { GenerationTake, Scene } from "@/lib/data/scenes";

export function PreviewPlayer({
  scene,
  projectId,
  takes,
  activeJob,
}: {
  scene: Scene;
  projectId: string;
  takes: GenerationTake[];
  activeJob?: { status: string; error?: string } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [compareId, setCompareId] = useState<string | null>(null);
  const selected = takes.find((t) => t.id === scene.selected_take_id) ?? takes[0] ?? null;
  const compareTake = compareId ? takes.find((t) => t.id === compareId) : null;

  function updateTake(id: string, patch: Parameters<typeof setTakeApprovalAction>[2]) {
    startTransition(async () => {
      try {
        await setTakeApprovalAction(id, projectId, patch);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update take.");
      }
    });
  }

  const isGenerating = activeJob && ["queued", "processing"].includes(activeJob.status);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Preview</h3>
        <Badge variant="outline" className="text-xs font-normal">
          {scene.generation_mode === "multi_shot_composite" ? "Multi-Shot Composite" : "Native Single Generation"}
        </Badge>
      </div>

      <div className={`grid gap-3 ${compareTake ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="flex flex-col gap-2">
          <div className="flex h-96 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-black/40">
            {isGenerating ? (
              <div className="flex w-64 flex-col items-center gap-3 p-6 text-center">
                <Progress value={null} className="w-full animate-pulse" />
                <p className="text-xs text-muted-foreground">
                  {activeJob?.status === "queued" ? "Queued for generation…" : "Generating your video…"}
                </p>
              </div>
            ) : activeJob?.status === "failed" ? (
              <p className="max-w-xs p-6 text-center text-sm text-destructive">
                {activeJob.error ?? "Generation failed. Adjust your inputs and try again."}
              </p>
            ) : selected?.output_url ? (
              <video src={selected.output_url} controls className="max-h-full max-w-full" />
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No takes yet. Fill in your prompt and generation settings, then click Generate Video.
              </p>
            )}
          </div>
          {selected ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => updateTake(selected.id, { approval_status: "approved" })} disabled={isPending}>
                <Check className="size-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateTake(selected.id, { approval_status: "rejected" })} disabled={isPending}>
                <X className="size-3.5" /> Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateTake(selected.id, { is_favorite: !selected.is_favorite })}
                disabled={isPending}
              >
                <Heart className={`size-3.5 ${selected.is_favorite ? "fill-current text-destructive" : ""}`} /> Favorite
              </Button>
              <Button size="sm" variant="outline" render={<a href={selected.output_url ?? "#"} download />}>
                <Download className="size-3.5" /> Download
              </Button>
            </div>
          ) : null}
        </div>
        {compareTake ? (
          <div className="flex flex-col gap-2">
            <div className="flex h-96 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-black/40">
              {compareTake.output_url ? (
                <video src={compareTake.output_url} controls className="max-h-full max-w-full" />
              ) : null}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCompareId(null)}>
              Close comparison
            </Button>
          </div>
        ) : null}
      </div>

      {takes.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Takes ({takes.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {takes.map((take) => (
              <div key={take.id} className="flex shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => startTransition(() => selectTakeAction(scene.id, take.id, projectId))}
                  className={`relative flex size-16 items-center justify-center rounded-md border text-xs ${
                    take.id === selected?.id ? "border-primary ring-1 ring-primary" : "border-border/60"
                  }`}
                >
                  Take {take.take_number}
                  {take.is_favorite ? <Heart className="absolute right-0.5 top-0.5 size-3 fill-destructive text-destructive" /> : null}
                </button>
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground hover:text-primary"
                  onClick={() => setCompareId(take.id === compareId ? null : take.id)}
                >
                  <Columns2 className="mr-0.5 inline size-2.5" />
                  compare
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {selected ? (
        <Button size="sm" variant="ghost" className="justify-start" disabled>
          <RotateCcw className="size-3.5" /> Regenerate uses the settings panel&apos;s Generate Video button
        </Button>
      ) : null}
    </div>
  );
}
