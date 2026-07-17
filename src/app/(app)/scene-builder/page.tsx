import { PageHeader } from "@/components/shared/page-header";
import { SceneBuilderWorkspace } from "@/components/scene-builder/scene-builder-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data/projects";
import { listAllScenesForUser } from "@/lib/data/scenes";
import { listCharacters } from "@/lib/data/characters";
import { listHoopSquadScenes } from "@/lib/data/hoop-squad-scenes";
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

  const [projects, scenes, characters, locations, settings] = await Promise.all([
    listProjects(supabase),
    listAllScenesForUser(supabase),
    listCharacters(supabase),
    listHoopSquadScenes(supabase),
    user ? getAppSettings(supabase, user.id) : Promise.resolve(null),
  ]);

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
        settings={settings}
        initialProjectId={initialProjectId}
        initialSceneId={initialSceneId}
      />
    </div>
  );
}
