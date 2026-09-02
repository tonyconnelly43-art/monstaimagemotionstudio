import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCharacter, listCharacterReferences } from "@/lib/data/characters";
import { listVoices } from "@/lib/data/audio";
import { CharacterEditor } from "@/components/characters/character-editor";

export default async function CharacterDetailPage({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const supabase = await createServerSupabaseClient();
  const character = await getCharacter(supabase, characterId);
  if (!character) notFound();
  const [references, voices] = await Promise.all([
    listCharacterReferences(supabase, characterId),
    listVoices(supabase),
  ]);

  return <CharacterEditor character={character} references={references} voices={voices} />;
}
