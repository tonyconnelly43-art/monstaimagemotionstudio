import { Palette } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NewBrandDialog } from "@/components/brand-generator/new-brand-dialog";
import { BrandProjectCard } from "@/components/brand-generator/brand-project-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listBrandProjects } from "@/lib/data/brand";

export default async function BrandGeneratorPage() {
  const supabase = await createServerSupabaseClient();
  const projects = await listBrandProjects(supabase);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Brand Generator"
        description="Build a new home service company's brand kit — Mascot, Wordmark, and Background — in the style of KickCharge/Fortitude-style branding agencies."
        action={<NewBrandDialog />}
      />
      <div className="p-6">
        {projects.length === 0 ? (
          <EmptyState
            icon={Palette}
            title="No brands yet"
            description="Create your first brand project to start generating a mascot, wordmark, and background."
            action={<NewBrandDialog />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <BrandProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
