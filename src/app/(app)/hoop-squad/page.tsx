import Link from "next/link";
import { MapPinned } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listHoopSquadScenes, listSceneTemplates, SCENE_CATEGORIES } from "@/lib/data/hoop-squad-scenes";
import { NewLocationButton } from "@/components/hoop-squad/new-location-button";
import { TemplatesList } from "@/components/hoop-squad/templates-list";
import { ImageLightboxThumb } from "@/components/shared/image-lightbox-thumb";

export default async function HoopSquadPage() {
  const supabase = await createServerSupabaseClient();
  const [locations, templates] = await Promise.all([listHoopSquadScenes(supabase), listSceneTemplates(supabase)]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Locations"
        description="The permanent scene & environment library, shared across every project. Save each approved location once, then reuse it with Scene Lock instead of re-uploading backgrounds."
        action={<NewLocationButton />}
      />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {locations.map((loc) => (
          <Link key={loc.id} href={`/hoop-squad/${loc.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted/60">
                {loc.main_image_url ? (
                  <ImageLightboxThumb url={loc.main_image_url} label={loc.name} className="size-full bg-white object-contain" />
                ) : (
                  <MapPinned className="size-8 text-muted-foreground/40" />
                )}
              </div>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {loc.name}
                  {loc.is_placeholder ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      placeholder
                    </Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="text-xs font-normal">
                  {SCENE_CATEGORIES.find((c) => c.value === loc.category)?.label}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="border-t border-border/60 p-6">
        <h2 className="mb-1 text-sm font-medium">Scene Templates</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Reusable combinations of environment, camera angle, characters, and prompt instructions — apply one from a scene&apos;s
          Scene Lock panel in Studio.
        </p>
        <TemplatesList templates={templates} locations={locations} />
      </div>
    </div>
  );
}
