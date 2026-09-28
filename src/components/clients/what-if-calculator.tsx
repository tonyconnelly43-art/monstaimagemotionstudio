"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { closeRate, revenue, type AgencyClientMetric } from "@/lib/data/agency-clients";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function WhatIfCalculator({ baseline }: { baseline: AgencyClientMetric }) {
  const baseCloseRatePct = Math.round(closeRate(baseline) * 100);
  const [calls, setCalls] = useState(baseline.calls);
  const [closeRatePct, setCloseRatePct] = useState(baseCloseRatePct);
  const [avgTicket, setAvgTicket] = useState(baseline.avg_ticket);

  const currentRevenue = revenue(baseline);
  const projectedConversions = Math.round(calls * (closeRatePct / 100));
  const projectedRevenue = projectedConversions * avgTicket;
  const difference = projectedRevenue - currentRevenue;

  return (
    <Card>
      <CardContent className="space-y-6 p-5">
        <div>
          <p className="text-sm font-medium">What if...</p>
          <p className="text-xs text-muted-foreground">
            Based on {baseline.period_label}: {baseline.calls} calls, {baseCloseRatePct}% close rate,{" "}
            {currency.format(baseline.avg_ticket)} average ticket.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Calls per month</Label>
            <span className="text-sm font-medium tabular-nums">{calls}</span>
          </div>
          <Slider
            value={[calls]}
            min={0}
            max={Math.max(baseline.calls * 2, 20)}
            step={1}
            onValueChange={(v) => setCalls(Array.isArray(v) ? (v[0] ?? 0) : v)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Close rate</Label>
            <span className="text-sm font-medium tabular-nums">{closeRatePct}%</span>
          </div>
          <Slider value={[closeRatePct]} min={0} max={100} step={1} onValueChange={(v) => setCloseRatePct(Array.isArray(v) ? (v[0] ?? 0) : v)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Average ticket</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={avgTicket}
            onChange={(e) => setAvgTicket(Number(e.target.value) || 0)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Current revenue</p>
            <p className="text-lg font-semibold tabular-nums">{currency.format(currentRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projected revenue</p>
            <p className="text-lg font-semibold tabular-nums">{currency.format(projectedRevenue)}</p>
          </div>
          <div className="col-span-2 border-t border-border/60 pt-3">
            <p className="text-xs text-muted-foreground">Difference</p>
            <p className={`text-xl font-bold tabular-nums ${difference >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {difference >= 0 ? "+" : ""}
              {currency.format(difference)}/mo
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
