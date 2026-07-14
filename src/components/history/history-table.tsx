"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Download, Heart, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { History as HistoryIcon } from "lucide-react";
import { VIDEO_MODELS } from "@/lib/fal/models";
import type { HistoryTakeRow } from "@/lib/data/history";

type StatusFilter = "all" | "completed" | "failed" | "favorites" | "approved";

export function HistoryTable({ rows, projects }: { rows: HistoryTakeRow[]; projects: { id: string; name: string }[] }) {
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("all");
  const [modelId, setModelId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !`${r.project_name} ${r.scene_name}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (projectId !== "all" && r.project_id !== projectId) return false;
      if (modelId !== "all" && r.model_id !== modelId) return false;
      if (status === "favorites" && !r.is_favorite) return false;
      if (status === "approved" && r.approval_status !== "approved") return false;
      if (status === "failed" && r.status !== "failed") return false;
      if (status === "completed" && r.status !== "completed") return false;
      return true;
    });
  }, [rows, search, projectId, modelId, status]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search by project or scene…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={projectId} onValueChange={(v) => v && setProjectId(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modelId} onValueChange={(v) => v && setModelId(v)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {VIDEO_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No generations found" description="Adjust your filters, or generate your first take from the Studio." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project / Scene</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/studio/${row.project_id}?scene=${row.scene_id}`} className="hover:text-primary">
                    <div className="font-medium">{row.project_name}</div>
                    <div className="text-xs text-muted-foreground">{row.scene_name}</div>
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{VIDEO_MODELS.find((m) => m.id === row.model_id)?.displayName ?? row.model_id}</TableCell>
                <TableCell>
                  {row.status === "failed" ? (
                    <div className="space-y-1">
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        Failed
                      </Badge>
                      {row.error_message ? (
                        <p className="max-w-64 text-xs text-muted-foreground">{row.error_message}</p>
                      ) : null}
                    </div>
                  ) : (
                    <Badge variant="secondary" className="capitalize">
                      {row.approval_status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.cost_estimate ? `~$${row.cost_estimate.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(row.created_at), "MMM d, yyyy p")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {row.is_favorite ? <Heart className="size-3.5 fill-destructive text-destructive" /> : null}
                    {row.output_url ? (
                      <>
                        <Button size="icon" variant="ghost" className="size-7" render={<a href={row.output_url} target="_blank" rel="noreferrer" />}>
                          <Play className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" render={<a href={row.output_url} download />}>
                          <Download className="size-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
