import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ClientResultsWorkspace } from "@/components/clients/client-results-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAgencyClient, listClientMetrics } from "@/lib/data/agency-clients";

export default async function ClientResultsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createServerSupabaseClient();
  const client = await getAgencyClient(supabase, clientId);
  if (!client) notFound();
  const metrics = await listClientMetrics(supabase, clientId);

  return (
    <div className="flex flex-col">
      <PageHeader title={client.name} description={client.industry ?? "Client results"} />
      <ClientResultsWorkspace client={client} metrics={metrics} />
    </div>
  );
}
