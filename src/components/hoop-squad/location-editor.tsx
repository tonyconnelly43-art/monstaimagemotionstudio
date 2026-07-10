"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageSlotUpload } from "@/components/shared/image-slot-upload";
import {
  updateHoopSquadSceneAction,
  deleteHoopSquadSceneAction,
  deleteSceneReferenceAction,
} from "@/lib/actions/hoop-squad-scenes";
import { uploadHoopSquadSceneView, uploadSceneReference } from "@/lib/supabase/upload";
import {
  SCENE_CATEGORIES,
  SCENE_VIEW_FIELDS,
  type HoopSquadScene,
  type SceneReference,
} from "@/lib/data/hoop-squad-scenes";

const TEXT_FIELDS: { key: keyof HoopSquadScene; label: string }[] = [
  { key: "environment_description", label: "Environment Description" },
  { key: "lighting_description", label: "Lighting Description" },
  { key: "color_palette", label: "Color Palette" },
  { key: "approved_props", label: "Approved Props" },
  { key: "required_objects", label: "Objects That Must Remain in the Scene" },
  { key: "forbidden_objects", label: "Objects That Should Never Be Added" },
  { key: "camera_direction_notes", label: "Camera Direction" },
  { key: "consistency_instructions", label: "Scene Consistency Instructions" },
  { key: "negative_instructions", label: "Scene Negative Instructions" },
];

export function LocationEditor({ location, references }: { location: HoopSquadScene; references: SceneReference[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function patch(update: Partial<HoopSquadScene>) {
    startTransition(async () => {
      try {
        await updateHoopSquadSceneAction(location.id, update as never);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${location.name}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteHoopSquadSceneAction(location.id);
      router.push("/hoop-squad");
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Input
          defaultValue={location.name}
          onBlur={(e) => patch({ name: e.target.value })}
          className="h-auto max-w-sm border-none bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-2">
          <Select value={location.category} onValueChange={(v) => v && patch({ category: v })}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Environment View Set</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SCENE_VIEW_FIELDS.map((v) => (
            <ImageSlotUpload
              key={v.field}
              label={v.label}
              url={location[v.field] as string | null}
              onUpload={(file) =>
                uploadHoopSquadSceneView(location.id, v.field as string, file).then(() => router.refresh())
              }
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Textarea
              defaultValue={(location[f.key] as string) ?? ""}
              onBlur={(e) => patch({ [f.key]: e.target.value } as never)}
              rows={2}
            />
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Additional Camera Angles</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Extra views connected to this same location (exterior entrance, view toward the scoreboard, near the snack bar,
          etc.) so the app treats them as one consistent environment.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {references.map((ref) => (
            <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-md border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ref.image_url} alt={ref.view_label} className="size-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                {ref.view_label}
              </span>
              <button
                type="button"
                onClick={() => startTransition(() => deleteSceneReferenceAction(ref.id, location.id))}
                className="absolute right-0.5 top-0.5 hidden size-4 items-center justify-center rounded-full bg-black/70 text-white group-hover:flex"
              >
                <Trash2 className="size-2.5" />
              </button>
            </div>
          ))}
          <AddViewSlot locationId={location.id} onDone={() => router.refresh()} />
        </div>
      </div>
    </div>
  );
}

function AddViewSlot({ locationId, onDone }: { locationId: string; onDone: () => void }) {
  return (
    <ImageSlotUpload
      label="Add view"
      onUpload={async (file) => {
        const label = window.prompt("Label this view (e.g. 'View from the bleachers')", "Custom view");
        if (!label) return;
        await uploadSceneReference(locationId, label, file);
        onDone();
      }}
    />
  );
}
