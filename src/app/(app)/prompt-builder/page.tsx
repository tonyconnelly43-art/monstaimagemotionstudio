import { PageHeader } from "@/components/shared/page-header";
import { PromptBuilderWorkspace } from "@/components/prompt-builder/prompt-builder-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data/projects";
import { listAllScenesForUser } from "@/lib/data/scenes";
import { listCharacters } from "@/lib/data/characters";
import { listHoopSquadScenes } from "@/lib/data/hoop-squad-scenes";
import { getAppSettings } from "@/lib/data/settings";

export default async function PromptBuilderPage() {
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
        title="Prompt Builder"
        description="A guided builder for the production prompt — no blank text box. Changes save to the scene automatically."
      />
      <PromptBuilderWorkspace projects={projects} scenes={scenes} characters={characters} locations={locations} settings={settings} />
    </div>
  );
}
