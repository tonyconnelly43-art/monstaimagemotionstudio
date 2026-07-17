"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import Link from "next/link";
import { ImagePlus, Loader2, Trash2, Video, Library, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { uploadAsset } from "@/lib/supabase/upload";
import { deleteAssetAction, attachLibraryAssetAction } from "@/lib/actions/scenes";
import { ImageLightboxButton } from "@/components/shared/image-lightbox-button";
import { ASSET_ROLES, type UploadedAsset, type Scene } from "@/lib/data/scenes";
import { CHARACTER_REFERENCE_TYPES, type CharacterRow, type CharacterReference } from "@/lib/data/characters";
import { SCENE_VIEW_FIELDS, type HoopSquadScene, type SceneReference } from "@/lib/data/hoop-squad-scenes";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";

type AssetRole = Database["public"]["Tables"]["uploaded_assets"]["Row"]["role"];

interface LibraryImage {
  key: string;
  url: string;
  label: string;
}

function characterLibraryImages(character: CharacterRow, references: CharacterReference[]): LibraryImage[] {
  const profile: LibraryImage[] = [
    { field: character.main_image_url, label: "Main" },
    { field: character.front_view_url, label: "Front View" },
    { field: character.side_view_url, label: "Side View" },
    { field: character.back_view_url, label: "Back View" },
  ]
    .filter((f): f is { field: string; label: string } => Boolean(f.field))
    .map((f) => ({ key: `${character.id}-${f.label}`, url: f.field, label: f.label }));

  const refs: LibraryImage[] = references
    .filter((r) => r.character_id === character.id)
    .map((r) => ({
      key: r.id,
      url: r.image_url,
      label: r.label || CHARACTER_REFERENCE_TYPES.find((t) => t.value === r.reference_type)?.label || "Reference",
    }));

  return [...profile, ...refs];
}

function locationLibraryImages(location: HoopSquadScene, references: SceneReference[]): LibraryImage[] {
  const namedViews: LibraryImage[] = SCENE_VIEW_FIELDS.filter((f) => Boolean(location[f.field])).map((f) => ({
    key: `${location.id}-${f.field}`,
    url: location[f.field] as string,
    label: f.label,
  }));

  const refs: LibraryImage[] = references
    .filter((r) => r.hoop_squad_scene_id === location.id)
    .map((r) => ({ key: r.id, url: r.image_url, label: r.view_label }));

  return [...namedViews, ...refs];
}

export function AssetUploadPanel({
  projectId,
  sceneId,
  assets,
  scene,
  characters,
  locations,
  characterReferences,
  sceneReferences,
}: {
  projectId: string;
  sceneId: string;
  assets: UploadedAsset[];
  scene: Scene;
  characters: CharacterRow[];
  locations: HoopSquadScene[];
  characterReferences: CharacterReference[];
  sceneReferences: SceneReference[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<AssetRole>("main_starting_frame");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [attachingKey, setAttachingKey] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      setUploading(true);
      try {
        for (const file of files) {
          await uploadAsset({ file, role, projectId, sceneId });
        }
        toast.success(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [role, projectId, sceneId, router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/webm": [".webm"],
    },
    multiple: true,
  });

  function handleDelete(assetId: string) {
    startTransition(async () => {
      try {
        await deleteAssetAction(assetId, projectId);
        toast.success("Removed.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove asset.");
      }
    });
  }

  function handleAttach(image: LibraryImage) {
    setAttachingKey(image.key);
    startTransition(async () => {
      try {
        await attachLibraryAssetAction(sceneId, projectId, role, image.url, image.label);
        toast.success(`Added "${image.label}" as ${ASSET_ROLES.find((r) => r.value === role)?.label}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not attach that image.");
      } finally {
        setAttachingKey(null);
      }
    });
  }

  const sceneCharacters = characters.filter((c) => (scene.character_ids ?? []).includes(c.id));
  const sceneLocation = locations.find((l) => l.id === scene.hoop_squad_scene_id) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as AssetRole)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        render={<Link href={`/scene-builder?project=${projectId}&scene=${sceneId}`} />}
      >
        <Sparkles className="size-3.5" /> Compose this scene with AI (Scene Builder)
      </Button>

      <Tabs defaultValue="upload">
        <TabsList className="w-full">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="library">
            <Library className="size-3.5" /> From Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div
            {...getRootProps()}
            className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border/70 hover:border-border"
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" />
            )}
            <p className="text-xs text-muted-foreground">
              Drag & drop PNG, JPG, WEBP, or a reference video — tagged as &ldquo;{ASSET_ROLES.find((r) => r.value === role)?.label}&rdquo;
            </p>
          </div>
        </TabsContent>

        <TabsContent value="library">
          <div className="mt-2 max-h-80 space-y-4 overflow-y-auto scrollbar-thin">
            {sceneCharacters.length === 0 && !sceneLocation ? (
              <p className="p-2 text-xs text-muted-foreground">
                Select characters and a saved location for this scene (in the settings panel) to pull their reference
                photos in here — tagged as &ldquo;{ASSET_ROLES.find((r) => r.value === role)?.label}&rdquo;.
              </p>
            ) : null}
            {sceneCharacters.map((character) => {
              const images = characterLibraryImages(character, characterReferences);
              if (images.length === 0) return null;
              return (
                <div key={character.id}>
                  <p className="mb-1.5 text-xs font-medium">{character.name}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {images.map((img) => (
                      <button
                        key={img.key}
                        type="button"
                        disabled={isPending && attachingKey === img.key}
                        onClick={() => handleAttach(img)}
                        className="group relative aspect-square overflow-hidden rounded-md border border-border/60 bg-white disabled:opacity-60"
                        title={`Add "${img.label}"`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.label} className="size-full object-contain" />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                          {img.label}
                        </span>
                        {attachingKey === img.key ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="size-4 animate-spin text-white" />
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {sceneLocation
              ? (() => {
                  const images = locationLibraryImages(sceneLocation, sceneReferences);
                  if (images.length === 0) return null;
                  return (
                    <div>
                      <p className="mb-1.5 text-xs font-medium">{sceneLocation.name}</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {images.map((img) => (
                          <button
                            key={img.key}
                            type="button"
                            disabled={isPending && attachingKey === img.key}
                            onClick={() => handleAttach(img)}
                            className="group relative aspect-square overflow-hidden rounded-md border border-border/60 bg-white disabled:opacity-60"
                            title={`Add "${img.label}"`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt={img.label} className="size-full object-contain" />
                            <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                              {img.label}
                            </span>
                            {attachingKey === img.key ? (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <Loader2 className="size-4 animate-spin text-white" />
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()
              : null}
          </div>
        </TabsContent>
      </Tabs>

      {assets.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative overflow-hidden rounded-md border border-border/60 bg-muted/40">
              {asset.mime_type.startsWith("video") ? (
                <div className="flex aspect-square items-center justify-center">
                  <Video className="size-6 text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.public_url ?? undefined} alt="" className="aspect-square w-full bg-white object-contain" />
                  {asset.public_url ? (
                    <ImageLightboxButton url={asset.public_url} label={ASSET_ROLES.find((r) => r.value === asset.role)?.label ?? "Reference"} />
                  ) : null}
                </>
              )}
              <Badge variant="secondary" className="absolute bottom-1 left-1 max-w-[90%] truncate text-[10px] font-normal">
                {ASSET_ROLES.find((r) => r.value === asset.role)?.label}
              </Badge>
              <Button
                size="icon"
                variant="destructive"
                className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                disabled={isPending}
                onClick={() => handleDelete(asset.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
