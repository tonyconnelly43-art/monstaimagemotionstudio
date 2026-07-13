"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AssetUploadPanel } from "@/components/studio/asset-upload-panel";
import { GenerationSettingsPanel } from "@/components/studio/generation-settings-panel";
import { PreviewPlayer } from "@/components/studio/preview-player";
import { SceneStrip } from "@/components/studio/scene-strip";
import { PromptSectionsForm } from "@/components/prompt-builder/prompt-sections-form";
import { EMPTY_PROMPT_SECTIONS, type PromptSections } from "@/lib/prompt/types";
import { updateSceneAction } from "@/lib/actions/scenes";
import { useGenerationJob } from "@/lib/hooks/use-generation-job";
import type { Project } from "@/lib/data/projects";
import type { Scene, UploadedAsset, GenerationTake } from "@/lib/data/scenes";
import type { CharacterRow } from "@/lib/data/characters";
import type { HoopSquadScene } from "@/lib/data/hoop-squad-scenes";

export function StudioWorkspace({
  project,
  scenes,
  characters,
  locations,
  activeScene,
  assets,
  takes,
  initialActiveJobId,
}: {
  project: Project;
  scenes: Scene[];
  characters: CharacterRow[];
  locations: HoopSquadScene[];
  activeScene: Scene | null;
  assets: UploadedAsset[];
  takes: GenerationTake[];
  initialActiveJobId: string | null;
}) {
  const router = useRouter();
  // A generation started in an earlier visit (or a different tab) keeps
  // running on fal.ai even after this page stops watching it. Seeding this
  // from the server-fetched in-flight job means reopening the scene resumes
  // checking instead of leaving it stuck at "processing" forever. Keyed by
  // scene id (see the parent page), so switching scenes re-seeds this too.
  const [jobId, setJobId] = useState<string | null>(initialActiveJobId);

  function onSelectScene(sceneId: string) {
    router.push(`/studio/${project.id}?scene=${sceneId}`, { scroll: false });
  }
  const { job } = useGenerationJob(jobId, (result) => {
    if (result.job?.status === "completed") toast.success("Your video is ready.");
    if (result.job?.status === "failed") toast.error(result.job.error_message ?? "Generation failed.");
  });

  const sections: PromptSections = useMemo(
    () => ({ ...EMPTY_PROMPT_SECTIONS, ...((activeScene?.prompt_sections as Partial<PromptSections>) ?? {}) }),
    [activeScene?.prompt_sections],
  );

  if (!activeScene) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted-foreground">
          Add a scene from the strip below to start building this project.
        </div>
        <div className="h-24 shrink-0">
          <SceneStrip projectId={project.id} scenes={scenes} activeSceneId={null} onSelect={onSelectScene} />
        </div>
      </div>
    );
  }

  const hasMainFrame = assets.some((a) => a.role === "main_starting_frame");

  function persistSections(next: PromptSections, casualIdea?: string) {
    void updateSceneAction(activeScene!.id, project.id, {
      prompt_sections: next as never,
      ...(casualIdea !== undefined ? { casual_idea: casualIdea } : {}),
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
        <Input
          key={activeScene.id}
          defaultValue={activeScene.name}
          onBlur={(e) => updateSceneAction(activeScene.id, project.id, { name: e.target.value })}
          className="h-8 w-56 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"
        />
        <span className="text-xs text-muted-foreground">Scene {activeScene.scene_number}</span>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col overflow-y-auto scrollbar-thin lg:flex-row">
          <div className="w-full shrink-0 border-b border-border/60 p-4 lg:w-64 lg:border-b-0 lg:border-r lg:overflow-y-auto">
            <h3 className="mb-3 text-sm font-medium">Visual Assets</h3>
            <AssetUploadPanel projectId={project.id} sceneId={activeScene.id} assets={assets} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-border/60 p-4">
              <h3 className="mb-3 text-sm font-medium">Prompt Builder</h3>
              <PromptSectionsForm
                casualIdea={activeScene.casual_idea ?? ""}
                sections={sections}
                onCasualIdeaChange={(value) => persistSections(sections, value)}
                onSectionsChange={(next) => persistSections(next)}
              />
            </div>
            <Card className="m-4 flex-1 border-border/60 p-0">
              <PreviewPlayer scene={activeScene} projectId={project.id} takes={takes} activeJob={job} />
            </Card>
          </div>
        </div>
        <div className="border-t border-border/60 lg:border-l lg:border-t-0">
          <GenerationSettingsPanel
            scene={activeScene}
            projectId={project.id}
            characters={characters}
            locations={locations}
            hasMainFrame={hasMainFrame}
            onJobSubmitted={setJobId}
          />
        </div>
      </div>

      <div className="h-24 shrink-0">
        <SceneStrip projectId={project.id} scenes={scenes} activeSceneId={activeScene.id} onSelect={onSelectScene} />
      </div>
    </div>
  );
}
