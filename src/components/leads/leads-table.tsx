"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WebsiteLead } from "@/lib/data/leads";
import {
  getLeadScore,
  getLeadStatus,
  getScoreTier,
  LEAD_STATUS_DESCRIPTION,
  LEAD_STATUS_DOT_CLASS,
  LEAD_STATUS_LABEL,
  SCORE_TIER_BAR_CLASS,
  SCORE_TIER_LABEL,
} from "@/lib/leads/scoring";

type SortMode = "newest" | "score";

export function LeadsTable({ leads }: { leads: WebsiteLead[] }) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const scored = useMemo(
    () =>
      leads.map((lead) => ({
        lead,
        status: getLeadStatus(lead.created_at),
        score: getLeadScore(lead),
      })),
    [leads],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? scored.filter(({ lead }) =>
          [lead.name, lead.company, lead.phone, lead.email, lead.package, lead.promo, lead.message]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(q)),
        )
      : scored;

    return [...rows].sort((a, b) =>
      sortMode === "score"
        ? b.score - a.score
        : new Date(b.lead.created_at).getTime() - new Date(a.lead.created_at).getTime(),
    );
  }, [scored, search, sortMode]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, company, phone, package…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
          <Select value={sortMode} onValueChange={(v) => v && setSortMode(v as SortMode)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Sort: Newest</SelectItem>
              <SelectItem value="score">Sort: Best match</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {leads.length}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" /> New — under 24h old
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" /> Slow — 1–3 days, no update
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" /> Cold — 3+ days, no update
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Promo</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Match</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(({ lead, status, score }) => {
            const tier = getScoreTier(score);
            return (
              <TableRow key={lead.id}>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1.5">
                      <span className={`size-2.5 rounded-full ${LEAD_STATUS_DOT_CLASS[status]}`} />
                      <span className="text-sm">{LEAD_STATUS_LABEL[status]}</span>
                    </TooltipTrigger>
                    <TooltipContent>{LEAD_STATUS_DESCRIPTION[status]}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {format(new Date(lead.created_at), "MMM d, yyyy p")}
                </TableCell>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell className="text-sm">{lead.company}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  <a href={`tel:${lead.phone}`} className="hover:text-primary">
                    {lead.phone}
                  </a>
                </TableCell>
                <TableCell className="text-sm">
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="hover:text-primary">
                      {lead.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm">{lead.package || "—"}</TableCell>
                <TableCell className="text-sm">{lead.promo || "—"}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={lead.message ?? undefined}>
                  {lead.message || "—"}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="flex w-24 flex-col gap-1">
                      <span className="text-xs font-medium">{score}</span>
                      <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <span
                          className={`block h-full rounded-full ${SCORE_TIER_BAR_CLASS[tier]}`}
                          style={{ width: `${score}%` }}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{SCORE_TIER_LABEL[tier]}</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
