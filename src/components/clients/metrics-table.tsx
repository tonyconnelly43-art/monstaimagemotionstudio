"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricEntryDialog } from "@/components/clients/metric-entry-dialog";
import { deleteClientMetricAction } from "@/lib/actions/agency-clients";
import { closeRate, revenue, type AgencyClientMetric } from "@/lib/data/agency-clients";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

export function MetricsTable({ clientId, metrics }: { clientId: string; metrics: AgencyClientMetric[] }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(metricId: string) {
    if (!confirm("Delete this period's numbers?")) return;
    startTransition(async () => {
      try {
        await deleteClientMetricAction(clientId, metricId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  if (metrics.length === 0) {
    return <p className="text-sm text-muted-foreground">No periods entered yet — add one to start tracking results.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Calls</TableHead>
          <TableHead>Conversions</TableHead>
          <TableHead>Close Rate</TableHead>
          <TableHead>Avg Ticket</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="font-medium">{m.period_label}</TableCell>
            <TableCell>{m.calls}</TableCell>
            <TableCell>{m.conversions}</TableCell>
            <TableCell>{percent(closeRate(m))}</TableCell>
            <TableCell>{currency.format(m.avg_ticket)}</TableCell>
            <TableCell className="font-medium">{currency.format(revenue(m))}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <MetricEntryDialog
                  clientId={clientId}
                  existing={m}
                  trigger={
                    <Button size="sm" variant="ghost">
                      Edit
                    </Button>
                  }
                />
                <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(m.id)} disabled={isPending}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
