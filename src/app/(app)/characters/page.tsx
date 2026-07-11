import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listCharacters } from "@/lib/data/characters";
import { NewCharacterButton } from "@/components/characters/new-character-button";

export default async function CharactersPage() {
  const supabase = await createServerSupabaseClient();
  const characters = await listCharacters(supabase);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Characters"
        description="The permanent Hoop Squad character library. Upload approved artwork here once, then reuse it in every scene with Character Lock."
        action={<NewCharacterButton />}
      />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {characters.map((c) => (
          <Link key={c.id} href={`/characters/${c.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted/60">
                {c.main_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.main_image_url} alt={c.name} className="size-full object-contain" />
                ) : (
                  <Users className="size-8 text-muted-foreground/40" />
                )}
              </div>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {c.name}
                  {c.is_placeholder ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      placeholder
                    </Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {c.basketball_position || c.description || "No details yet — upload approved artwork to complete this profile."}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
