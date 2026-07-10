"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function updateCharacterAction(
  characterId: string,
  patch: Partial<Database["public"]["Tables"]["characters"]["Update"]>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("characters").update(patch).eq("id", characterId);
  if (error) throw new Error(error.message);
  revalidatePath("/characters");
  revalidatePath(`/characters/${characterId}`);
}

export async function createCharacterAction(name: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("characters")
    .insert({ user_id: user.id, name, is_placeholder: true })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create character.");
  revalidatePath("/characters");
  return data.id as string;
}

export async function deleteCharacterAction(characterId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("characters").delete().eq("id", characterId);
  if (error) throw new Error(error.message);
  revalidatePath("/characters");
}

export async function deleteCharacterReferenceAction(referenceId: string, characterId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("character_references").delete().eq("id", referenceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/characters/${characterId}`);
}
