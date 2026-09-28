"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export interface AgencyClientActionState {
  error?: string;
}

export async function createAgencyClientAction(
  _prev: AgencyClientActionState,
  formData: FormData,
): Promise<AgencyClientActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  if (!name) return { error: "Name the client first." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("agency_clients")
    .insert({ user_id: user.id, name, industry: industry || null })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create the client." };

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateAgencyClientAction(
  clientId: string,
  patch: Partial<Database["public"]["Tables"]["agency_clients"]["Update"]>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("agency_clients").update(patch).eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteAgencyClientAction(clientId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("agency_clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

export interface MetricPeriodInput {
  periodLabel: string;
  periodStart: string;
  calls: number;
  conversions: number;
  avgTicket: number;
  notes?: string | null;
}

/** Upserts by (client_id, period_start) — re-entering the same period's numbers edits that row instead of duplicating it. */
export async function upsertClientMetricAction(clientId: string, input: MetricPeriodInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("agency_client_metrics")
    .upsert(
      {
        user_id: user.id,
        client_id: clientId,
        period_label: input.periodLabel,
        period_start: input.periodStart,
        calls: input.calls,
        conversions: input.conversions,
        avg_ticket: input.avgTicket,
        notes: input.notes ?? null,
      },
      { onConflict: "client_id,period_start" },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientMetricAction(clientId: string, metricId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("agency_client_metrics").delete().eq("id", metricId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}
