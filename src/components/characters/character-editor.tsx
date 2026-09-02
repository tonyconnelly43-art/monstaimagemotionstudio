"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ImageSlotUpload } from "@/components/shared/image-slot-upload";
import { GenerateReferenceDialog } from "@/components/shared/generate-reference-dialog";
import { ImageLightboxButton } from "@/components/shared/image-lightbox-button";
import { updateCharacterAction, deleteCharacterAction, deleteCharacterReferenceAction } from "@/lib/actions/characters";
import { assignCharacterVoiceAction } from "@/lib/actions/voices";
import { uploadCharacterProfileImage, uploadCharacterReference } from "@/lib/supabase/upload";
import { generateCharacterReferenceAction } from "@/lib/actions/image-generation";
import { CHARACTER_REFERENCE_TYPES, type CharacterReference, type CharacterRow } from "@/lib/data/characters";
import type { Voice } from "@/lib/data/audio";

const TEXT_FIELDS: { key: keyof CharacterRow; label: string; multiline?: boolean }[] = [
  { key: "description", label: "Character Description", multiline: true },
  { key: "personality", label: "Personality", multiline: true },
  { key: "basketball_position", label: "Basketball Position" },
  { key: "height_notes", label: "Height & Body Proportions" },
  { key: "skin_tone", label: "Skin Tone" },
  { key: "hair", label: "Hair" },
  { key: "clothing_details", label: "Clothing Details" },
  { key: "jersey_number", label: "Jersey Number" },
  { key: "approved_color_palette", label: "Approved Color Palette" },
  { key: "negative_instructions", label: "Negative Character Instructions", multiline: true },
  { key: "notes", label: "Notes", multiline: true },
];

export function CharacterEditor({
  character,
  references,
  voices,
}: {
  character: CharacterRow;
  references: CharacterReference[];
  voices: Voice[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const assignedVoice = voices.find((v) => v.character_id === character.id);

  function patch(update: Partial<CharacterRow>) {
    startTransition(async () => {
      try {
        await updateCharacterAction(character.id, update as never);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function handleVoiceChange(voiceId: string) {
    startTransition(async () => {
      try {
        await assignCharacterVoiceAction(character.id, voiceId === "none" ? null : voiceId);
        toast.success(voiceId === "none" ? "Voice unassigned." : "Voice assigned.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not assign voice.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${character.name}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteCharacterAction(character.id);
      router.push("/characters");
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Input
          defaultValue={character.name}
          onBlur={(e) => patch({ name: e.target.value })}
          className="h-auto max-w-sm border-none bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
        />
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="size-4" /> Delete Character
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 row-span-2">
          <ImageSlotUpload
            label="Main Transparent PNG"
            url={character.main_image_url}
            onUpload={(file) => uploadCharacterProfileImage(character.id, "main_image_url", file).then(() => router.refresh())}
          />
        </div>
        <ImageSlotUpload
          label="Front View"
          url={character.front_view_url}
          onUpload={(file) => uploadCharacterProfileImage(character.id, "front_view_url", file).then(() => router.refresh())}
        />
        <ImageSlotUpload
          label="Side View"
          url={character.side_view_url}
          onUpload={(file) => uploadCharacterProfileImage(character.id, "side_view_url", file).then(() => router.refresh())}
        />
        <ImageSlotUpload
          label="Back View"
          url={character.back_view_url}
          onUpload={(file) => uploadCharacterProfileImage(character.id, "back_view_url", file).then(() => router.refresh())}
        />
      </div>

      <div className="space-y-1.5 rounded-lg border border-border/60 p-3">
        <Label className="text-xs text-muted-foreground">Voice</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={assignedVoice?.id ?? "none"} onValueChange={(v) => v && handleVoiceChange(v)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No voice assigned</SelectItem>
              {voices.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/voices" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary">
            Design or manage voices
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Whichever voice is assigned here auto-attaches as a reference on Reference to Video generations whenever this
          character is Character Locked, and is what Dialogue Builder uses to generate this character&apos;s lines.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className={f.multiline ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            {f.multiline ? (
              <Textarea defaultValue={(character[f.key] as string) ?? ""} onBlur={(e) => patch({ [f.key]: e.target.value } as never)} rows={2} />
            ) : (
              <Input defaultValue={(character[f.key] as string) ?? ""} onBlur={(e) => patch({ [f.key]: e.target.value } as never)} />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Reference Images</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHARACTER_REFERENCE_TYPES.map((type) => {
            const items = references.filter((r) => r.reference_type === type.value);
            const hasExistingPhotos =
              Boolean(character.main_image_url || character.front_view_url || character.side_view_url || character.back_view_url) ||
              references.length > 0;
            return (
              <div key={type.value} className="space-y-2 rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{type.label}</Label>
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {items.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {items.map((ref) => (
                    <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-md border border-border/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ref.image_url} alt={ref.label ?? type.label} className="size-full bg-white object-contain" />
                      <ImageLightboxButton url={ref.image_url} label={ref.label ?? type.label} />
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteCharacterReferenceAction(ref.id, character.id);
                          })
                        }
                        className="absolute right-0.5 top-0.5 hidden size-4 items-center justify-center rounded-full bg-black/70 text-white group-hover:flex"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  ))}
                  <ImageSlotUpload
                    label="Add"
                    aspectClassName="aspect-square"
                    onUpload={(file) =>
                      uploadCharacterReference(character.id, type.value, type.label, file).then(() => router.refresh())
                    }
                  />
                  <GenerateReferenceDialog
                    dialogTitle={`Generate a ${type.label} for ${character.name}`}
                    hasExistingPhotos={hasExistingPhotos}
                    onGenerate={(prompt, useExisting) =>
                      generateCharacterReferenceAction(character.id, type.value, type.label, prompt, useExisting)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
