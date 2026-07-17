"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SceneBuilderForm } from "@/components/scene-builder/scene-builder-form";
import type { Project } from "@/lib/data/projects";
import type { Scene } from "@/lib/data/scenes";
import type { CharacterRow } from "@/lib/data/characters";
import type { HoopSquadScene, SceneReference } from "@/lib/data/hoop-squad-scenes";
import type { AppSettings } from "@/lib/data/settings";

export function SceneBuilderWorkspace({
  projects,
  scenes,
  characters,
  locations,
  sceneReferences,
  settings,
  initialProjectId,
  initialSceneId,
  currentStartingFrameUrl,
}: {
  projects: Project[];
  scenes: Scene[];
  characters: CharacterRow[];
  locations: HoopSquadScene[];
  sceneReferences: SceneReference[];
  settings: AppSettings | null;
  initialProjectId: string;
  initialSceneId: string;
  currentStartingFrameUrl: string | null;
}) {
  const router = useRouter();
  const projectId = initialProjectId;
  const projectScenes = scenes.filter((s) => s.project_id === projectId);
  const sceneId = initialSceneId;
  const scene = scenes.find((s) => s.id === sceneId) ?? null;

  function goTo(nextProjectId: string, nextSceneId: string) {
    router.push(`/scene-builder?project=${nextProjectId}&scene=${nextSceneId}`);
  }

  if (projects.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">Create a project in Studio first, then come back here to build its scenes.</p>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Project</Label>
          <Select
            value={projectId}
            onValueChange={(v) => {
              if (!v) return;
              const next = scenes.find((s) => s.project_id === v);
              goTo(v, next?.id ?? "");
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
          <Select value={sceneId} onValueChange={(v) => v && goTo(projectId, v)}>
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
        <SceneBuilderForm
          key={scene.id}
          scene={scene}
          projectId={projectId}
          characters={characters}
          locations={locations}
          sceneReferences={sceneReferences}
          settings={settings}
          currentStartingFrameUrl={currentStartingFrameUrl}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Add a scene to this project from Studio to start building it here.</p>
      )}
    </div>
  );
}
