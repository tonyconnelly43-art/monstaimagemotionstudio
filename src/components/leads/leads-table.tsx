"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WebsiteLead } from "@/lib/data/leads";

export function LeadsTable({ leads }: { leads: WebsiteLead[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.company, lead.phone, lead.email, lead.package, lead.promo, lead.message]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [leads, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search name, company, phone, package…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {leads.length}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Promo</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((lead) => (
            <TableRow key={lead.id}>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
