"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertClientMetricAction } from "@/lib/actions/agency-clients";
import type { AgencyClientMetric } from "@/lib/data/agency-clients";

function monthLabel(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function MetricEntryDialog({
  clientId,
  existing,
  trigger,
}: {
  clientId: string;
  existing?: AgencyClientMetric;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaultMonth = existing ? existing.period_start.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(defaultMonth);
  const [calls, setCalls] = useState(String(existing?.calls ?? ""));
  const [conversions, setConversions] = useState(String(existing?.conversions ?? ""));
  const [avgTicket, setAvgTicket] = useState(String(existing?.avg_ticket ?? ""));
  const [notes, setNotes] = useState(existing?.notes ?? "");

  function handleSave() {
    const callsNum = Number(calls) || 0;
    const conversionsNum = Number(conversions) || 0;
    const avgTicketNum = Number(avgTicket) || 0;
    if (conversionsNum > callsNum) {
      toast.error("Conversions can't be more than calls.");
      return;
    }
    startTransition(async () => {
      try {
        await upsertClientMetricAction(clientId, {
          periodLabel: monthLabel(month),
          periodStart: `${month}-01`,
          calls: callsNum,
          conversions: conversionsNum,
          avgTicket: avgTicketNum,
          notes: notes || null,
        });
        toast.success("Saved.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <Plus className="size-4" /> Add Period
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit" : "Add"} a month&apos;s results</DialogTitle>
          <DialogDescription>Entering the same month again updates that period instead of duplicating it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="metric-month">Month</Label>
            <Input id="metric-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="metric-calls">Calls</Label>
              <Input id="metric-calls" type="number" min={0} value={calls} onChange={(e) => setCalls(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metric-conversions">Conversions (booked jobs)</Label>
              <Input
                id="metric-conversions"
                type="number"
                min={0}
                value={conversions}
                onChange={(e) => setConversions(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metric-ticket">Average ticket ($)</Label>
            <Input
              id="metric-ticket"
              type="number"
              min={0}
              step={0.01}
              value={avgTicket}
              onChange={(e) => setAvgTicket(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metric-notes">Notes (optional)</Label>
            <Textarea id="metric-notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
