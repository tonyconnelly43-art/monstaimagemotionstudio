"use client";

import { MetricEntryDialog } from "@/components/clients/metric-entry-dialog";
import { MetricsTable } from "@/components/clients/metrics-table";
import { WhatIfCalculator } from "@/components/clients/what-if-calculator";
import type { AgencyClient, AgencyClientMetric } from "@/lib/data/agency-clients";

export function ClientResultsWorkspace({
  client,
  metrics,
}: {
  client: AgencyClient;
  metrics: AgencyClientMetric[];
}) {
  const latest = metrics[0]; // listClientMetrics orders newest-first

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Monthly results</h2>
          <MetricEntryDialog clientId={client.id} />
        </div>
        <MetricsTable clientId={client.id} metrics={metrics} />

        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Connections</p>
          <p className="mt-1">
            CallRail: not connected yet. CRM / field service software (ServiceTitan, Housecall Pro, Jobber, etc.): not
            connected yet. Numbers above are entered manually for now — once those accounts are set up, this can pull
            live instead.
          </p>
        </div>
      </div>

      <div>
        {latest ? (
          <WhatIfCalculator baseline={latest} />
        ) : (
          <p className="text-sm text-muted-foreground">Add a period&apos;s results to unlock the what-if calculator.</p>
        )}
      </div>
    </div>
  );
}
