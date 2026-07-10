"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PROJECT_TYPES } from "@/lib/data/projects";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name your project.").max(120),
  project_type: z.enum(PROJECT_TYPES.map((t) => t.value) as [string, ...string[]]),
});

export interface ProjectActionState {
  error?: string;
}

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    project_type: formData.get("project_type"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid project details." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name: parsed.data.name, project_type: parsed.data.project_type })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the project." };
  }

  revalidatePath("/projects");
  revalidatePath("/studio");
  redirect(`/studio/${data.id}`);
}

export async function duplicateProjectAction(projectId: string) {
  const { supabase, user } = await requireUser();
  const { data: source, error: sourceError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (sourceError || !source) throw new Error("Project not found.");

  const { data: copy, error: copyError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: `${source.name} (Copy)`,
      project_type: source.project_type,
      description: source.description,
      target_aspect_ratio: source.target_aspect_ratio,
      target_platform: source.target_platform,
    })
    .select("id")
    .single();
  if (copyError || !copy) throw new Error(copyError?.message ?? "Could not duplicate the project.");

  const { data: scenes } = await supabase.from("scenes").select("*").eq("project_id", projectId);
  if (scenes?.length) {
    const rows = scenes.map(({ id: _id, project_id: _pid, selected_take_id: _stid, ...rest }) => ({
      ...rest,
      project_id: copy.id,
      user_id: user.id,
    }));
    await supabase.from("scenes").insert(rows);
  }

  revalidatePath("/projects");
  revalidatePath("/studio");
}

export async function archiveProjectAction(projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").update({ status: "archived" }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  revalidatePath("/studio");
}

export async function deleteProjectAction(projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").update({ status: "deleted" }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  revalidatePath("/studio");
}
