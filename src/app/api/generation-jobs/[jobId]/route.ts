import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVideoModel, getLipsyncModel } from "@/lib/fal/models";
import { getQueueStatus, getQueueResult, explainFalError } from "@/lib/fal/queue";
import type { SeedanceOutput } from "@/lib/fal/adapters/seedance";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Job = Database["public"]["Tables"]["generation_jobs"]["Row"];

async function finalizeVideoJob(
  supabase: SupabaseClient<Database>,
  userId: string,
  job: Job,
  result: SeedanceOutput,
) {
  const inputPayload = job.input_payload as { falInput?: Record<string, unknown>; prompt?: string; audio_url?: string };
  const inputImageUrls = [
    inputPayload.falInput?.image_url,
    inputPayload.falInput?.end_image_url,
    ...(Array.isArray(inputPayload.falInput?.image_urls) ? (inputPayload.falInput?.image_urls as string[]) : []),
  ].filter((v): v is string => typeof v === "string");

  let outputUrl = result.video.url;
  let permanentPath: string | null = null;
  try {
    const videoRes = await fetch(result.video.url);
    if (videoRes.ok) {
      const blob = await videoRes.blob();
      const path = `${userId}/${job.scene_id}/${job.id}.mp4`;
      const { error: uploadError } = await supabase.storage
        .from("generations")
        .upload(path, blob, { contentType: "video/mp4", upsert: true });
      if (!uploadError) {
        permanentPath = path;
        const { data: publicUrl } = supabase.storage.from("generations").getPublicUrl(path);
        outputUrl = publicUrl.publicUrl;
      }
    }
  } catch {
    // Permanent copy failed — fall back to the fal-hosted URL. It's still
    // usable now; the take is flagged via permanent_storage_path=null.
  }

  const { count: existingTakes } = await supabase
    .from("generation_takes")
    .select("id", { count: "exact", head: true })
    .eq("scene_id", job.scene_id!);

  const { data: take, error: takeError } = await supabase
    .from("generation_takes")
    .insert({
      user_id: userId,
      scene_id: job.scene_id!,
      generation_job_id: job.id,
      take_number: (existingTakes ?? 0) + 1,
      prompt_used: inputPayload.prompt ?? (job.job_type === "lipsync" ? "Lip-synced take" : null),
      model_id: job.model_id,
      input_image_urls: inputImageUrls,
      seed: "seed" in result ? result.seed : null,
      cost_estimate: job.cost_estimate,
      cost_estimate_is_exact: job.cost_estimate_is_exact,
      output_url: outputUrl,
      permanent_storage_path: permanentPath,
    })
    .select("*")
    .single();
  if (takeError || !take) throw new Error(takeError?.message ?? "Could not save the generated take.");

  await supabase.from("generation_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);

  const { data: scene } = await supabase.from("scenes").select("selected_take_id").eq("id", job.scene_id!).maybeSingle();
  if (scene && !scene.selected_take_id) {
    await supabase.from("scenes").update({ selected_take_id: take.id }).eq("id", job.scene_id!);
  }

  return take;
}

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: job, error } = await supabase.from("generation_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    const { data: takes } = await supabase
      .from("generation_takes")
      .select("*")
      .eq("generation_job_id", job.id)
      .order("created_at", { ascending: false });
    return NextResponse.json({ job, takes: takes ?? [] });
  }

  if (!["video", "lipsync"].includes(job.job_type) || !job.fal_request_id) {
    return NextResponse.json({ job, takes: [] });
  }

  const model = job.job_type === "lipsync" ? getLipsyncModel(job.model_id) : getVideoModel(job.model_id);
  if (!model) {
    return NextResponse.json({ error: "Model configuration missing." }, { status: 500 });
  }

  try {
    const status = await getQueueStatus(model.falEndpointId, job.fal_request_id);

    if (status.status === "queued" || status.status === "processing") {
      if (job.status !== status.status) {
        await supabase.from("generation_jobs").update({ status: status.status }).eq("id", job.id);
      }
      return NextResponse.json({ job: { ...job, status: status.status }, takes: [], logs: status.logs });
    }

    if (status.status === "failed") {
      const message = status.logs?.length
        ? `The model reported an error: ${status.logs.join(" ")}`
        : "The model could not complete this generation. Try adjusting your inputs and generate again.";
      await supabase
        .from("generation_jobs")
        .update({ status: "failed", error_message: message, error_code: "fal_failed", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      return NextResponse.json({ job: { ...job, status: "failed", error_message: message }, takes: [] });
    }

    // completed
    const result = await getQueueResult<SeedanceOutput>(model.falEndpointId, job.fal_request_id);
    const take = await finalizeVideoJob(supabase, user.id, job, result);
    return NextResponse.json({ job: { ...job, status: "completed" }, takes: [take] });
  } catch (err) {
    const { message, code } = explainFalError(err);
    await supabase.from("generation_jobs").update({ status: "failed", error_message: message, error_code: code }).eq("id", job.id);
    return NextResponse.json({ job: { ...job, status: "failed", error_message: message }, takes: [] });
  }
}
