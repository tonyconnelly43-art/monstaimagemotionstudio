"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MoreVertical, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteAgencyClientAction } from "@/lib/actions/agency-clients";
import type { AgencyClient } from "@/lib/data/agency-clients";

export function ClientCard({ client }: { client: AgencyClient }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete ${client.name}? This removes all of their tracked metrics too.`)) return;
    startTransition(async () => {
      try {
        await deleteAgencyClientAction(client.id);
        toast.success("Client deleted.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="group relative flex flex-col transition-colors hover:border-primary/40">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="size-4 text-muted-foreground" />
          </div>
          <CardTitle className="truncate text-base">{client.name}</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-7 shrink-0" disabled={isPending} />}>
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1">
        {client.industry ? (
          <Badge variant="secondary" className="text-xs font-normal">
            {client.industry}
          </Badge>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button render={<Link href={`/clients/${client.id}`} />} className="w-full" variant="outline">
          View Results
        </Button>
      </CardFooter>
    </Card>
  );
}
