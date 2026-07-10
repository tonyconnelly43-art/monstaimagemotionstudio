import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProject, PROJECT_TYPES } from "@/lib/data/projects";
import { listScenes, listSceneAssets, listSceneTakes } from "@/lib/data/scenes";
import { listCharacters } from "@/lib/data/characters";
import { listHoopSquadScenes } from "@/lib/data/hoop-squad-scenes";

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

  const [scenes, characters, locations] = await Promise.all([
    listScenes(supabase, projectId),
    listCharacters(supabase),
    listHoopSquadScenes(supabase),
  ]);

  const activeScene = scenes.find((s) => s.id === sceneIdParam) ?? scenes[0] ?? null;
  const [assets, takes] = activeScene
    ? await Promise.all([listSceneAssets(supabase, activeScene.id), listSceneTakes(supabase, activeScene.id)])
    : [[], []];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        className="shrink-0"
        title={project.name}
        description="Upload artwork, choose characters, describe the action, and generate."
        action={
          <Badge variant="secondary">{PROJECT_TYPES.find((t) => t.value === project.project_type)?.label}</Badge>
        }
      />
      <StudioWorkspace
        project={project}
        scenes={scenes}
        characters={characters}
        locations={locations}
        activeScene={activeScene}
        assets={assets}
        takes={takes}
      />
    </div>
  );
}
