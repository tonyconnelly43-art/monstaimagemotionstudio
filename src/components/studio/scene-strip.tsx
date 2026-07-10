"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSceneAction, deleteSceneAction, duplicateSceneAction } from "@/lib/actions/scenes";
import { submitGenerationAction } from "@/lib/actions/generation";
import type { Scene } from "@/lib/data/scenes";

export function SceneStrip({
  projectId,
  scenes,
  activeSceneId,
  onSelect,
}: {
  projectId: string;
  scenes: Scene[];
  activeSceneId: string | null;
  onSelect: (sceneId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);

  function handleAdd() {
    startTransition(async () => {
      try {
        const id = await createSceneAction(projectId);
        onSelect(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add scene.");
      }
    });
  }

  function handleGenerateAll() {
    const ungenerated = scenes.filter((s) => !s.selected_take_id);
    if (ungenerated.length === 0) {
      toast.info("Every scene already has a take.");
      return;
    }
    startTransition(async () => {
      for (const scene of ungenerated) {
        const result = await submitGenerationAction(scene.id);
        if (result.error) toast.error(`${scene.name}: ${result.error}`);
      }
      toast.success(`Started generation for ${ungenerated.length} scene(s).`);
    });
  }

  return (
    <div className="flex h-full items-center gap-3 border-t border-border/60 bg-card/60 px-4">
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-thin">
        {scenes.map((scene) => (
          <div key={scene.id} className="group relative shrink-0">
            <button
              type="button"
              onClick={() => onSelect(scene.id)}
              className={`flex h-16 w-28 flex-col justify-between rounded-md border p-2 text-left text-xs transition-colors ${
                scene.id === activeSceneId ? "border-primary bg-primary/10" : "border-border/60 bg-muted/40 hover:border-border"
              }`}
            >
              <span className="truncate font-medium">{scene.name}</span>
              <span className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{scene.duration_seconds}s</span>
                {scene.selected_take_id ? (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                    done
                  </Badge>
                ) : null}
              </span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-background text-[10px] group-hover:flex"
                aria-label="Scene options"
              >
                ⋮
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() =>
                    startTransition(async () => {
                      const id = await duplicateSceneAction(scene.id, projectId);
                      onSelect(id);
                    })
                  }
                >
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => startTransition(() => deleteSceneAction(scene.id, projectId))}
                >
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button variant="ghost" size="icon" className="size-16 shrink-0 border border-dashed border-border/60" onClick={handleAdd} disabled={isPending}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className={`text-xs ${totalDuration > 15 ? "text-destructive" : "text-muted-foreground"}`}>
          {totalDuration}s / 15s
        </span>
        <Button size="sm" variant="outline" onClick={handleGenerateAll} disabled={isPending}>
          <Sparkles className="size-3.5" /> Generate All Ungenerated
        </Button>
      </div>
    </div>
  );
}
