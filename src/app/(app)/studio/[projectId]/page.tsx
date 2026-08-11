import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { ProjectStyleDialog } from "@/components/studio/project-style-dialog";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProject, PROJECT_TYPES } from "@/lib/data/projects";
import { listScenes, listSceneAssets, listSceneTakes, getActiveGenerationJob } from "@/lib/data/scenes";
import { listCharacters, listAllCharacterReferences } from "@/lib/data/characters";
import { listHoopSquadScenes, listAllSceneReferences } from "@/lib/data/hoop-squad-scenes";

export default async function StudioProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ scene?: string }>;
}) {
  const { projectId } = await params;
  const { scene: sceneIdParam } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const project = await getProject(supabase, projectId);
  if (!project) notFound();

  const [scenes, characters, locations, characterReferences, sceneReferences] = await Promise.all([
    listScenes(supabase, projectId),
    listCharacters(supabase),
    listHoopSquadScenes(supabase),
    listAllCharacterReferences(supabase),
    listAllSceneReferences(supabase),
  ]);

  const activeScene = scenes.find((s) => s.id === sceneIdParam) ?? scenes[0] ?? null;
  const [assets, takes, activeJob] = activeScene
    ? await Promise.all([
        listSceneAssets(supabase, activeScene.id),
        listSceneTakes(supabase, activeScene.id),
        getActiveGenerationJob(supabase, activeScene.id),
      ])
    : [[], [], null];

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        className="shrink-0"
        title={project.name}
        description="Upload artwork, choose characters, describe the action, and generate."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{PROJECT_TYPES.find((t) => t.value === project.project_type)?.label}</Badge>
            <ProjectStyleDialog project={project} />
          </div>
        }
      />
      <StudioWorkspace
        key={activeScene?.id ?? "none"}
        project={project}
        scenes={scenes}
        characters={characters}
        locations={locations}
        characterReferences={characterReferences}
        sceneReferences={sceneReferences}
        activeScene={activeScene}
        assets={assets}
        takes={takes}
        initialActiveJobId={activeJob?.id ?? null}
      />
    </div>
  );
}
