import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data/projects";

export default async function ProjectsPage() {
  const supabase = await createServerSupabaseClient();
  const projects = await listProjects(supabase);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Projects"
        description="Every Hoop Squad video lives in a project — scenes, characters, takes, and cost all roll up here."
        action={<NewProjectDialog />}
      />
      <div className="p-6">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to start turning Hoop Squad artwork into video."
            action={<NewProjectDialog />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
