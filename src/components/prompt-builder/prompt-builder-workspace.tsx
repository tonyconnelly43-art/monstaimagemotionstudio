"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PromptSectionsForm } from "@/components/prompt-builder/prompt-sections-form";
import { buildFinalPrompt } from "@/lib/prompt/build-prompt";
import { EMPTY_PROMPT_SECTIONS, type PromptSections } from "@/lib/prompt/types";
import { updateSceneAction } from "@/lib/actions/scenes";
import { writeCinematicPromptAction, updateAiWrittenPromptAction, setPromptSourceAction } from "@/lib/actions/cinematic-prompt";
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
  const [localAiPrompt, setLocalAiPrompt] = useState<string | null>(null);
  const [sceneIdea, setSceneIdea] = useState("");
  const [writing, setWriting] = useState(false);

  const sections: PromptSections =
    localSections ?? { ...EMPTY_PROMPT_SECTIONS, ...((scene?.prompt_sections as Partial<PromptSections>) ?? {}) };
  const casualIdea = localCasualIdea ?? scene?.casual_idea ?? "";
  const aiPrompt = localAiPrompt ?? scene?.ai_written_prompt ?? "";
  const promptSource = scene?.prompt_source ?? "guided";

  function resetLocalState() {
    setLocalSections(null);
    setLocalCasualIdea(null);
    setLocalAiPrompt(null);
    setSceneIdea("");
  }

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
        sceneStyleMode: scene.style_mode,
        basketballStyleInstructions: settings?.basketball_style_instructions ?? "",
        everydayStyleInstructions: settings?.everyday_style_instructions ?? "",
      })
    : null;

  function handleWritePrompt() {
    if (!scene) return;
    if (!sceneIdea.trim()) {
      toast.error("Describe what happens in this scene first.");
      return;
    }
    setWriting(true);
    writeCinematicPromptAction(scene.id, scene.project_id, sceneIdea)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setLocalAiPrompt(result.prompt ?? "");
        toast.success("Cinematic prompt written.");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not write the prompt."))
      .finally(() => setWriting(false));
  }

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
                resetLocalState();
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
                resetLocalState();
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
          <Tabs
            value={promptSource}
            onValueChange={(v) => {
              if (!v) return;
              void setPromptSourceAction(scene.id, scene.project_id, v as "guided" | "ai_written");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="guided">Guided Builder</TabsTrigger>
              <TabsTrigger value="ai_written">
                <Sparkles className="size-3.5" /> AI Cinematic Script
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guided">
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
            </TabsContent>

            <TabsContent value="ai_written">
              <div className="mt-2 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Describe what happens in this whole clip and Claude writes it as a timestamped, multi-shot script
                  (camera angle, shot size, movement, action, and dialogue per shot) — the same technique
                  professional AI-video creators use, tailored to this scene&apos;s characters, location, and style
                  settings. A few cents per write, billed through your Anthropic account.
                </p>
                <Textarea
                  value={sceneIdea}
                  onChange={(e) => setSceneIdea(e.target.value)}
                  placeholder="e.g. G brings the ball up the court, crosses over on Dash, pulls up for a jumper from the wing and hits it. Dash reacts frustrated."
                  rows={4}
                />
                <Button onClick={handleWritePrompt} disabled={writing}>
                  {writing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Write Cinematic Prompt
                </Button>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Shot list (edit freely before generating)</Label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setLocalAiPrompt(e.target.value)}
                    onBlur={(e) => void updateAiWrittenPromptAction(scene.id, scene.project_id, e.target.value)}
                    placeholder="Nothing written yet — describe the scene above and click Write Cinematic Prompt."
                    rows={10}
                    className="font-mono text-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This tab is now active for &ldquo;{scene.name}&rdquo; — Generate Video in Studio will send this shot
                  list to the video model instead of the Guided Builder&apos;s prompt. Switch back to the Guided
                  Builder tab to use that instead.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground">Add a scene to this project from the Studio to start building its prompt.</p>
        )}
      </div>

      <Card className="h-fit">
        <CardContent className="space-y-3 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {promptSource === "ai_written" ? "AI Cinematic Script (used for generation)" : "Production Prompt Preview"}
          </p>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs scrollbar-thin">
            {promptSource === "ai_written"
              ? aiPrompt || "Nothing written yet."
              : preview?.prompt || "Fill in the sections to preview the final prompt."}
          </pre>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Negative Prompt</p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs scrollbar-thin">
            {promptSource === "ai_written" ? settings?.global_negative_prompt || "—" : preview?.negativePrompt || "—"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
