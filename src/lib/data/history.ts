import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface HistoryTakeRow {
  id: string;
  scene_id: string;
  project_id: string;
  project_name: string;
  scene_name: string;
  model_id: string;
  output_url: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
  approval_status: "pending" | "approved" | "rejected";
  cost_estimate: number | null;
  created_at: string;
  status: "completed" | "failed";
  error_message?: string | null;
}

export async function listHistory(supabase: Client): Promise<HistoryTakeRow[]> {
  const [{ data: takes }, { data: failedJobs }, { data: scenes }, { data: projects }] = await Promise.all([
    supabase.from("generation_takes").select("*").order("created_at", { ascending: false }),
    supabase
      .from("generation_jobs")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false }),
    supabase.from("scenes").select("id, name, project_id"),
    supabase.from("projects").select("id, name"),
  ]);

  const sceneMap = new Map((scenes ?? []).map((s) => [s.id, s]));
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const completedRows: HistoryTakeRow[] = (takes ?? []).map((t) => {
    const scene = sceneMap.get(t.scene_id);
    return {
      id: t.id,
      scene_id: t.scene_id,
      project_id: scene?.project_id ?? "",
      project_name: (scene && projectMap.get(scene.project_id)) ?? "Unknown project",
      scene_name: scene?.name ?? "Unknown scene",
      model_id: t.model_id,
      output_url: t.output_url,
      thumbnail_url: t.thumbnail_url,
      is_favorite: t.is_favorite,
      approval_status: t.approval_status,
      cost_estimate: t.cost_estimate,
      created_at: t.created_at,
      status: "completed",
    };
  });

  const failedRows: HistoryTakeRow[] = (failedJobs ?? [])
    .filter((j) => j.scene_id)
    .map((j) => {
      const scene = sceneMap.get(j.scene_id!);
      return {
        id: j.id,
        scene_id: j.scene_id!,
        project_id: scene?.project_id ?? j.project_id ?? "",
        project_name: (scene && projectMap.get(scene.project_id)) ?? "Unknown project",
        scene_name: scene?.name ?? "Unknown scene",
        model_id: j.model_id,
        output_url: null,
        thumbnail_url: null,
        is_favorite: false,
        approval_status: "pending",
        cost_estimate: j.cost_estimate,
        created_at: j.created_at,
        status: "failed",
        error_message: j.error_message,
      };
    });

  return [...completedRows, ...failedRows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
