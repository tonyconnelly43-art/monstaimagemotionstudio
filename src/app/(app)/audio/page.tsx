import { PageHeader } from "@/components/shared/page-header";
import { AudioWorkspace } from "@/components/audio/audio-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data/projects";
import { listAllScenesForUser } from "@/lib/data/scenes";
import { listCharacters } from "@/lib/data/characters";
import { listAudioTracks, listDialogueLines } from "@/lib/data/audio";

export default async function AudioPage() {
  const supabase = await createServerSupabaseClient();
  const [projects, scenes, characters] = await Promise.all([
    listProjects(supabase),
    listAllScenesForUser(supabase),
    listCharacters(supabase),
  ]);

  const scenesByProject: Record<string, { scene: (typeof scenes)[number]; dialogueLines: Awaited<ReturnType<typeof listDialogueLines>>; audioTracks: Awaited<ReturnType<typeof listAudioTracks>> }[]> = {};
  for (const scene of scenes) {
    const [dialogueLines, audioTracks] = await Promise.all([
      listDialogueLines(supabase, scene.id),
      listAudioTracks(supabase, scene.id),
    ]);
    scenesByProject[scene.project_id] ??= [];
    scenesByProject[scene.project_id].push({ scene, dialogueLines, audioTracks });
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Audio"
        description="Dialogue, voiceover, music, sound effects, lip sync, and the final FFmpeg mix — all per scene."
      />
      <AudioWorkspace projects={projects} scenesByProject={scenesByProject} characters={characters} />
    </div>
  );
}
