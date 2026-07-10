import { PageHeader } from "@/components/shared/page-header";
import { HistoryTable } from "@/components/history/history-table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listHistory } from "@/lib/data/history";
import { listProjects } from "@/lib/data/projects";

export default async function HistoryPage() {
  const supabase = await createServerSupabaseClient();
  const [rows, projects] = await Promise.all([listHistory(supabase), listProjects(supabase)]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Generation History" description="Every take across every project — searchable and filterable." />
      <HistoryTable rows={rows} projects={projects} />
    </div>
  );
}
