import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type AgencyClient = Database["public"]["Tables"]["agency_clients"]["Row"];
export type AgencyClientMetric = Database["public"]["Tables"]["agency_client_metrics"]["Row"];

export const CLIENT_INDUSTRIES = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "Landscaping",
  "General Contracting",
  "Other Home Service",
];

export async function listAgencyClients(supabase: Client) {
  const { data, error } = await supabase.from("agency_clients").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAgencyClient(supabase: Client, id: string) {
  const { data, error } = await supabase.from("agency_clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listClientMetrics(supabase: Client, clientId: string) {
  const { data, error } = await supabase
    .from("agency_client_metrics")
    .select("*")
    .eq("client_id", clientId)
    .order("period_start", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Derived, not stored — always computed fresh so it can never drift out of sync with calls/conversions. */
export function closeRate(metric: Pick<AgencyClientMetric, "calls" | "conversions">): number {
  if (!metric.calls) return 0;
  return metric.conversions / metric.calls;
}

export function revenue(metric: Pick<AgencyClientMetric, "conversions" | "avg_ticket">): number {
  return metric.conversions * metric.avg_ticket;
}
