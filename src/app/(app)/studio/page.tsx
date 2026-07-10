import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjects, PROJECT_TYPES } from "@/lib/data/projects";
import { formatDistanceToNow } from "date-fns";

export default async function StudioPage() {
  const supabase = await createServerSupabaseClient();
  const projects = await listProjects(supabase);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Studio"
        description="Select a project to keep building, or start a new one."
        action={<NewProjectDialog />}
      />
      <div className="p-6">
        {projects.length === 0 ? (
          <EmptyState
            icon={Clapperboard}
            title="Start your first Hoop Squad video"
            description="Create a project, upload your artwork, choose characters, and generate your first take."
            action={<NewProjectDialog />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/studio/${project.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader>
                    <CardTitle className="truncate text-base">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {PROJECT_TYPES.find((t) => t.value === project.project_type)?.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
