import { PageHeader } from "@/components/shared/page-header";
import { SceneBuilderWorkspace } from "@/components/scene-builder/scene-builder-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data/projects";
import { listAllScenesForUser, getCurrentStartingFrame } from "@/lib/data/scenes";
import { listCharacters } from "@/lib/data/characters";
import { listHoopSquadScenes, listAllSceneReferences } from "@/lib/data/hoop-squad-scenes";
import { getAppSettings } from "@/lib/data/settings";

export default async function SceneBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; scene?: string }>;
}) {
  const { project: initialProjectId, scene: initialSceneId } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [projects, scenes, characters, locations, sceneReferences, settings] = await Promise.all([
    listProjects(supabase),
    listAllScenesForUser(supabase),
    listCharacters(supabase),
    listHoopSquadScenes(supabase),
    listAllSceneReferences(supabase),
    user ? getAppSettings(supabase, user.id) : Promise.resolve(null),
  ]);

  const effectiveProjectId =
    initialProjectId && projects.some((p) => p.id === initialProjectId) ? initialProjectId : (projects[0]?.id ?? "");
  const projectScenes = scenes.filter((s) => s.project_id === effectiveProjectId);
  const effectiveSceneId =
    initialSceneId && projectScenes.some((s) => s.id === initialSceneId) ? initialSceneId : (projectScenes[0]?.id ?? "");
  const currentStartingFrameUrl = effectiveSceneId ? await getCurrentStartingFrame(supabase, effectiveSceneId) : null;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Scene Builder"
        description="Compose the exact shot with Nano Banana Pro before animating it — a separate step from the video motion prompt in Studio."
      />
      <SceneBuilderWorkspace
        projects={projects}
        scenes={scenes}
        characters={characters}
        locations={locations}
        sceneReferences={sceneReferences}
        settings={settings}
        initialProjectId={effectiveProjectId}
        initialSceneId={effectiveSceneId}
        currentStartingFrameUrl={currentStartingFrameUrl}
      />
    </div>
  );
}
