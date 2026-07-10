import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCharacter, listCharacterReferences } from "@/lib/data/characters";
import { CharacterEditor } from "@/components/characters/character-editor";

export default async function CharacterDetailPage({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const supabase = await createServerSupabaseClient();
  const character = await getCharacter(supabase, characterId);
  if (!character) notFound();
  const references = await listCharacterReferences(supabase, characterId);

  return <CharacterEditor character={character} references={references} />;
}
