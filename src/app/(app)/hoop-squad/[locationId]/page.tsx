import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getHoopSquadScene, listSceneReferences } from "@/lib/data/hoop-squad-scenes";
import { LocationEditor } from "@/components/hoop-squad/location-editor";

export default async function LocationDetailPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params;
  const supabase = await createServerSupabaseClient();
  const location = await getHoopSquadScene(supabase, locationId);
  if (!location) notFound();
  const references = await listSceneReferences(supabase, locationId);

  return <LocationEditor location={location} references={references} />;
}
