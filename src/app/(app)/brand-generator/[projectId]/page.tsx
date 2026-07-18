import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { BrandWorkspace } from "@/components/brand-generator/brand-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBrandProject, listBrandReferences, listBrandBatches } from "@/lib/data/brand";

export default async function BrandProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const project = await getBrandProject(supabase, projectId);
  if (!project) notFound();

  const [references, batches] = await Promise.all([
    listBrandReferences(supabase, projectId),
    listBrandBatches(supabase, projectId),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={project.name}
        description="Generate 3 options for Mascot, Wordmark, and Background, pick your favorites, then combine them into one final brand."
      />
      <BrandWorkspace project={project} references={references} batches={batches} />
    </div>
  );
}
