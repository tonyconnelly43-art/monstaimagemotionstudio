import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { ClientCard } from "@/components/clients/client-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listAgencyClients } from "@/lib/data/agency-clients";

export default async function ClientsPage() {
  const supabase = await createServerSupabaseClient();
  const clients = await listAgencyClients(supabase);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Client Results"
        description="Track calls, conversions, and close rate per client, and show them what improving a number is actually worth."
        action={<NewClientDialog />}
      />
      <div className="p-6">
        {clients.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No clients yet"
            description="Add your first client to start tracking their results and building the what-if projection for them."
            action={<NewClientDialog />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
