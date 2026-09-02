"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Loader2, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createDialogueLineAction,
  updateDialogueLineAction,
  deleteDialogueLineAction,
  generateDialogueLineAudioAction,
  generateAllDialogueLinesAction,
} from "@/lib/actions/dialogue";
import type { DialogueLine } from "@/lib/data/audio";
import type { CharacterRow } from "@/lib/data/characters";
import type { Scene } from "@/lib/data/scenes";

export function DialogueBuilder({
  scene,
  projectId,
  lines,
  characters,
}: {
  scene: Scene;
  projectId: string;
  lines: DialogueLine[];
  characters: CharacterRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const sceneDurationMs = scene.duration_seconds * 1000;
  const totalDurationMs = lines.reduce((sum, l) => sum + (l.estimated_duration_ms ?? 0) + l.pause_after_ms, 0);
  const overBudget = totalDurationMs > sceneDurationMs;

  function patch(lineId: string, update: Partial<DialogueLine>) {
    startTransition(async () => {
      try {
        await updateDialogueLineAction(lineId, update as never);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Dialogue Lines</p>
          <p className={`text-xs ${overBudget ? "text-destructive" : "text-muted-foreground"}`}>
            Estimated total: {(totalDurationMs / 1000).toFixed(1)}s / {scene.duration_seconds}s scene
            {overBudget ? " — dialogue is longer than the scene. Trim lines or extend the scene." : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => startTransition(() => createDialogueLineAction(scene.id, projectId))}
            disabled={isPending}
          >
            <Plus className="size-3.5" /> Add Line
          </Button>
          <Button
            size="sm"
            onClick={() =>
              startTransition(async () => {
                const result = await generateAllDialogueLinesAction(scene.id);
                if (result.errors.length) toast.error(result.errors[0]);
                if (result.generated) toast.success(`Generated ${result.generated} line(s).`);
              })
            }
            disabled={isPending || lines.length === 0}
          >
            Generate All As One Track
          </Button>
        </div>
      </div>

      {/* Simple relative timeline */}
      {lines.length > 0 ? (
        <div className="relative h-8 overflow-hidden rounded-md bg-muted/50">
          {lines.map((line, i) => {
            const left = (line.start_time_ms / sceneDurationMs) * 100;
            const width = Math.max(2, ((line.estimated_duration_ms ?? 500) / sceneDurationMs) * 100);
            return (
              <div
                key={line.id}
                className="absolute top-1 h-6 rounded bg-primary/40"
                style={{ left: `${Math.min(left, 100)}%`, width: `${Math.min(width, 100 - left)}%` }}
                title={`Line ${i + 1}`}
              />
            );
          })}
        </div>
      ) : null}

      <div className="space-y-3">
        {lines.map((line, i) => (
          <div key={line.id} className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0">
                Line {i + 1}
              </Badge>
              <Select
                value={line.speaker_character_id ?? "none"}
                onValueChange={(v) => v && patch(line.id, { speaker_character_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Speaker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No speaker</SelectItem>
                  {characters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-32"
                placeholder="Emotion"
                defaultValue={line.emotion ?? ""}
                onBlur={(e) => patch(line.id, { emotion: e.target.value })}
              />
              <Input
                className="w-24"
                type="number"
                placeholder="Start ms"
                defaultValue={line.start_time_ms}
                onBlur={(e) => patch(line.id, { start_time_ms: Number(e.target.value) })}
              />
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto size-7"
                onClick={() => startTransition(() => deleteDialogueLineAction(line.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <Textarea
              defaultValue={line.text_content}
              placeholder="Dialogue text…"
              onBlur={(e) => patch(line.id, { text_content: e.target.value })}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Performance note, e.g. [excited]"
                defaultValue={line.performance_note ?? ""}
                onBlur={(e) => patch(line.id, { performance_note: e.target.value })}
              />
              <Input
                className="w-28"
                type="number"
                placeholder="Pause after (ms)"
                defaultValue={line.pause_after_ms}
                onBlur={(e) => patch(line.id, { pause_after_ms: Number(e.target.value) })}
              />
              <LineGenerateButton line={line} />
            </div>
            {line.estimated_duration_ms ? (
              <p className="text-[11px] text-muted-foreground">
                Estimated speaking time: {(line.estimated_duration_ms / 1000).toFixed(1)}s
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function LineGenerateButton({ line }: { line: DialogueLine }) {
  const [generating, setGenerating] = useState(false);

  async function handle() {
    setGenerating(true);
    const result = await generateDialogueLineAudioAction(line.id);
    if (result.error) toast.error(result.error);
    else toast.success("Line regenerated.");
    setGenerating(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" onClick={handle} disabled={generating}>
        {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        Generate Line
      </Button>
      {line.audio_url ? (
        <>
          <audio src={line.audio_url} controls className="h-7 w-40" />
          <Button
            size="icon-sm"
            variant="ghost"
            title="Download this line's audio"
            render={<a href={line.audio_url} download={`dialogue-line-${line.id}.mp3`} />}
          >
            <Download className="size-3.5" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
