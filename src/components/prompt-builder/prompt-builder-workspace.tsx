"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PromptSectionsForm } from "@/components/prompt-builder/prompt-sections-form";
import { buildFinalPrompt } from "@/lib/prompt/build-prompt";
import { EMPTY_PROMPT_SECTIONS, type PromptSections } from "@/lib/prompt/types";
import { updateSceneAction } from "@/lib/actions/scenes";
import type { Project } from "@/lib/data/projects";
import type { Scene } from "@/lib/data/scenes";
import type { CharacterRow } from "@/lib/data/characters";
import type { HoopSquadScene } from "@/lib/data/hoop-squad-scenes";
import type { AppSettings } from "@/lib/data/settings";

export function PromptBuilderWorkspace({
  projects,
  scenes,
  characters,
  locations,
  settings,
}: {
  projects: Project[];
  scenes: Scene[];
  characters: CharacterRow[];
  locations: HoopSquadScene[];
  settings: AppSettings | null;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const projectScenes = scenes.filter((s) => s.project_id === projectId);
  const [sceneId, setSceneId] = useState(projectScenes[0]?.id ?? "");
  const scene = scenes.find((s) => s.id === sceneId) ?? projectScenes[0] ?? null;

  const [localSections, setLocalSections] = useState<PromptSections | null>(null);
  const [localCasualIdea, setLocalCasualIdea] = useState<string | null>(null);

  const sections: PromptSections =
    localSections ?? { ...EMPTY_PROMPT_SECTIONS, ...((scene?.prompt_sections as Partial<PromptSections>) ?? {}) };
  const casualIdea = localCasualIdea ?? scene?.casual_idea ?? "";

  const preview = scene
    ? buildFinalPrompt({
        casualIdea,
        sections,
        characters: characters.filter((c) => scene.character_ids?.includes(c.id)),
        location: locations.find((l) => l.id === scene.hoop_squad_scene_id) ?? null,
        cameraAngle: scene.camera_angle,
        timeOfDay: scene.time_of_day,
        characterLock: scene.character_lock,
        characterLockStrength: scene.character_lock_strength,
        sceneLock: scene.scene_lock,
        sceneLockStrength: scene.scene_lock_strength,
        hoopSquadStyleInstructions: settings?.hoop_squad_style_instructions ?? "",
        globalNegativePrompt: settings?.global_negative_prompt ?? "",
      })
    : null;

  if (projects.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">Create a project in Studio first, then come back here to build its prompt.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select
              value={projectId}
              onValueChange={(v) => {
                if (!v) return;
                setProjectId(v);
                const next = scenes.find((s) => s.project_id === v);
                setSceneId(next?.id ?? "");
                setLocalSections(null);
                setLocalCasualIdea(null);
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Scene</Label>
            <Select
              value={sceneId}
              onValueChange={(v) => {
                if (!v) return;
                setSceneId(v);
                setLocalSections(null);
                setLocalCasualIdea(null);
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="No scenes yet" />
              </SelectTrigger>
              <SelectContent>
                {projectScenes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {scene ? (
          <PromptSectionsForm
            casualIdea={casualIdea}
            sections={sections}
            onCasualIdeaChange={(value) => {
              setLocalCasualIdea(value);
              void updateSceneAction(scene.id, scene.project_id, { casual_idea: value });
            }}
            onSectionsChange={(next) => {
              setLocalSections(next);
              void updateSceneAction(scene.id, scene.project_id, { prompt_sections: next as never });
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Add a scene to this project from the Studio to start building its prompt.</p>
        )}
      </div>

      <Card className="h-fit">
        <CardContent className="space-y-3 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Production Prompt Preview</p>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs scrollbar-thin">
            {preview?.prompt || "Fill in the sections to preview the final prompt."}
          </pre>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Negative Prompt</p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs scrollbar-thin">
            {preview?.negativePrompt || "—"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
