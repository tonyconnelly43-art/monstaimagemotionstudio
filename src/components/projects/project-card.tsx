"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MoreVertical, Copy, Archive, Trash2, Clapperboard } from "lucide-react";
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
import { PROJECT_TYPES, type Project } from "@/lib/data/projects";
import { archiveProjectAction, deleteProjectAction, duplicateProjectAction } from "@/lib/actions/projects";
import { formatDistanceToNow } from "date-fns";

export function ProjectCard({ project }: { project: Project }) {
  const [isPending, startTransition] = useTransition();
  const typeLabel = PROJECT_TYPES.find((t) => t.value === project.project_type)?.label ?? project.project_type;

  function handle(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-colors hover:border-primary/40">
      <div className="flex aspect-video items-center justify-center bg-muted/60">
        {project.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail_url} alt="" className="size-full object-cover" />
        ) : (
          <Clapperboard className="size-8 text-muted-foreground/40" />
        )}
      </div>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{project.name}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-7 shrink-0" disabled={isPending} />}>
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handle(() => duplicateProjectAction(project.id), "Project duplicated.")}
            >
              <Copy className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handle(() => archiveProjectAction(project.id), "Project archived.")}>
              <Archive className="size-4" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handle(() => deleteProjectAction(project.id), "Project deleted.")}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1">
        <Badge variant="secondary" className="text-xs font-normal">
          {typeLabel}
        </Badge>
      </CardContent>
      <CardFooter className="gap-2">
        <Button render={<Link href={`/studio/${project.id}`} />} className="w-full" variant="outline">
          Open in Studio
        </Button>
      </CardFooter>
    </Card>
  );
}
