import { PageHeader } from "@/components/shared/page-header";
import { LeadsTable } from "@/components/leads/leads-table";
import { listWebsiteLeads } from "@/lib/data/leads";

// Must query the website's live Neon database on every request — otherwise
// Next.js would prerender this once at build time (before any real leads
// exist) and keep serving that same frozen snapshot forever.
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const { leads, notConfigured, error } = await listWebsiteLeads();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Leads"
        description="Every Free Brand Review form submission from the Monsta Media website, newest first."
      />
      <div className="p-6">
        {notConfigured ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-6">
            <p className="font-medium">WEBSITE_LEADS_DATABASE_URL isn&apos;t set yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the Monsta Media website&apos;s Neon <code className="rounded bg-muted px-1 py-0.5">DATABASE_URL</code> as{" "}
              <code className="rounded bg-muted px-1 py-0.5">WEBSITE_LEADS_DATABASE_URL</code> in this app&apos;s
              environment variables (Settings shows connection status once it&apos;s set).
            </p>
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-6">
            <p className="text-sm text-muted-foreground">
              {error ?? "No leads yet — they'll show up here as soon as someone submits the website's form."}
            </p>
          </div>
        ) : (
          <LeadsTable leads={leads} />
        )}
      </div>
    </div>
  );
}
