"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageLightboxThumb } from "@/components/shared/image-lightbox-thumb";
import { deleteBrandProjectAction } from "@/lib/actions/brand";
import type { BrandProject } from "@/lib/data/brand";

export function BrandProjectCard({ project }: { project: BrandProject }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteBrandProjectAction(project.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  const thumbnail = project.final_brand_url ?? project.mascot_favorite_url;

  return (
    <Link href={`/brand-generator/${project.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted/60">
          {thumbnail ? (
            <ImageLightboxThumb url={thumbnail} label={project.name} className="size-full bg-white object-contain" />
          ) : (
            <Palette className="size-8 text-muted-foreground/40" />
          )}
        </div>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {project.name}
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-xs text-muted-foreground">{project.company_info || "No details yet."}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
