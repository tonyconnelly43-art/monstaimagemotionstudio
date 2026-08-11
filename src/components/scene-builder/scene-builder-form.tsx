"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, RotateCcw, ImageOff, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageLightboxButton } from "@/components/shared/image-lightbox-button";
import { generateSceneCompositionAction } from "@/lib/actions/image-generation";
import { buildScenePrompt, THREE_POINT_POSITION_OPTIONS, type ThreePointPosition } from "@/lib/prompt/build-scene-prompt";
import { characterLibraryImages, locationLibraryImages } from "@/lib/reference-images";
import type { Scene } from "@/lib/data/scenes";
import type { CharacterRow, CharacterReference } from "@/lib/data/characters";
import type { HoopSquadScene, SceneReference } from "@/lib/data/hoop-squad-scenes";
import type { Project } from "@/lib/data/projects";

export function SceneBuilderForm({
  scene,
  projectId,
  characters,
  characterReferences,
  locations,
  sceneReferences,
  project,
  currentStartingFrameUrl,
}: {
  scene: Scene;
  projectId: string;
  characters: CharacterRow[];
  characterReferences: CharacterReference[];
  locations: HoopSquadScene[];
  sceneReferences: SceneReference[];
  project: Project | null;
  currentStartingFrameUrl: string | null;
}) {
  const router = useRouter();
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(scene.character_ids ?? []);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [characterImageSelections, setCharacterImageSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const id of scene.character_ids ?? []) {
      const c = characters.find((ch) => ch.id === id);
      const defaultUrl = c?.main_image_url ?? c?.front_view_url ?? c?.side_view_url ?? c?.back_view_url;
      initial[id] = defaultUrl ? [defaultUrl] : [];
    }
    return initial;
  });
  const [locationId, setLocationId] = useState<string>(scene.hoop_squad_scene_id ?? "none");
  const [selectedLocationImageUrls, setSelectedLocationImageUrls] = useState<string[]>(() => {
    const initialLocation = locations.find((l) => l.id === (scene.hoop_squad_scene_id ?? ""));
    return initialLocation?.main_image_url ? [initialLocation.main_image_url] : [];
  });
  const [threePointPosition, setThreePointPosition] = useState<ThreePointPosition>("unspecified");
  const [sceneDescription, setSceneDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);
  const previewUrl = lastGeneratedUrl ?? currentStartingFrameUrl;

  function toggleCharacter(id: string, checked: boolean) {
    setSelectedCharacterIds((prev) => (checked ? [...prev, id] : prev.filter((c) => c !== id)));
    if (checked) {
      setCharacterImageSelections((prev) => {
        if (prev[id]?.length) return prev;
        const c = characters.find((ch) => ch.id === id);
        const defaultUrl = c?.main_image_url ?? c?.front_view_url ?? c?.side_view_url ?? c?.back_view_url;
        return { ...prev, [id]: defaultUrl ? [defaultUrl] : [] };
      });
    }
  }

  function toggleCharacterImage(characterId: string, url: string, checked: boolean) {
    setCharacterImageSelections((prev) => {
      const current = prev[characterId] ?? [];
      return { ...prev, [characterId]: checked ? [...current, url] : current.filter((u) => u !== url) };
    });
  }

  function handleLocationChange(v: string) {
    setLocationId(v);
    const next = locations.find((l) => l.id === v);
    setSelectedLocationImageUrls(next?.main_image_url ? [next.main_image_url] : []);
  }

  function toggleLocationImage(url: string, checked: boolean) {
    setSelectedLocationImageUrls((prev) => (checked ? [...prev, url] : prev.filter((u) => u !== url)));
  }

  const selectedCharacters = characters.filter((c) => selectedCharacterIds.includes(c.id));
  const location = locations.find((l) => l.id === locationId) ?? null;
  const locationImages = location ? locationLibraryImages(location, sceneReferences) : [];

  const previewPrompt = buildScenePrompt({
    styleInstructions: project?.style_instructions ?? "",
    locationName: location?.name ?? null,
    placements: selectedCharacters.map((c) => ({ name: c.name, position: positions[c.id] ?? "" })),
    threePointPosition,
    sceneDescription,
  });

  function handleGenerate() {
    if (!sceneDescription.trim() && !selectedCharacters.some((c) => positions[c.id]?.trim())) {
      toast.error("Describe the scene, or give at least one character a position, first.");
      return;
    }
    setPending(true);
    generateSceneCompositionAction(
      scene.id,
      projectId,
      selectedCharacterIds.map((id) => ({
        characterId: id,
        position: positions[id] ?? "",
        imageUrls: characterImageSelections[id] ?? [],
      })),
      locationId === "none" ? null : locationId,
      selectedLocationImageUrls,
      threePointPosition,
      sceneDescription,
    )
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`Scene composed and set as "${scene.name}"'s Main Starting Frame.`);
        if (result.imageUrl) setLastGeneratedUrl(result.imageUrl);
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Generation failed."))
      .finally(() => setPending(false));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Characters in this shot</Label>
          {characters.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add characters in the Character Library first.</p>
          ) : (
            <div className="space-y-2">
              {characters.map((c) => {
                const checked = selectedCharacterIds.includes(c.id);
                const poseImages = checked ? characterLibraryImages(c, characterReferences) : [];
                const selectedPoseUrls = characterImageSelections[c.id] ?? [];
                return (
                  <div key={c.id} className="rounded-lg border border-border/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        className="mt-0.5"
                        checked={checked}
                        onCheckedChange={(v) => toggleCharacter(c.id, Boolean(v))}
                      />
                      <div className="flex-1 space-y-1.5">
                        <span className="text-sm font-medium">{c.name}</span>
                        {checked ? (
                          <Input
                            placeholder="Where & what they're doing — e.g. left wing, mid-dribble"
                            value={positions[c.id] ?? ""}
                            onChange={(e) => setPositions((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        ) : null}
                      </div>
                    </div>

                    {checked && poseImages.length > 0 ? (
                      <div className="mt-2.5 space-y-1.5 pl-6">
                        <Label className="text-xs text-muted-foreground">
                          Poses & expressions to use ({selectedPoseUrls.length} selected)
                        </Label>
                        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                          {poseImages.map((img) => {
                            const imgChecked = selectedPoseUrls.includes(img.url);
                            return (
                              <button
                                key={img.key}
                                type="button"
                                onClick={() => toggleCharacterImage(c.id, img.url, !imgChecked)}
                                className={`group relative aspect-square overflow-hidden rounded-md border bg-white transition-colors ${
                                  imgChecked ? "border-primary ring-1 ring-primary" : "border-border/60"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url} alt={img.label} className="size-full object-contain" />
                                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                                  {img.label}
                                </span>
                                <ImageLightboxButton url={img.url} label={img.label} />
                                {imgChecked ? (
                                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <Check className="size-2.5" />
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : checked ? (
                      <p className="mt-2 pl-6 text-xs text-muted-foreground">
                        No saved photos for {c.name} yet — add some in the Character Library first.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Location</Label>
          <Select value={locationId} onValueChange={(v) => v && handleLocationChange(v)}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No location reference</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {location && locationImages.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Reference photos to use ({selectedLocationImageUrls.length} selected)
              </Label>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {locationImages.map((img) => {
                  const checked = selectedLocationImageUrls.includes(img.url);
                  return (
                    <button
                      key={img.key}
                      type="button"
                      onClick={() => toggleLocationImage(img.url, !checked)}
                      className={`group relative aspect-square overflow-hidden rounded-md border bg-white transition-colors ${
                        checked ? "border-primary ring-1 ring-primary" : "border-border/60"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.label} className="size-full object-contain" />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                        {img.label}
                      </span>
                      <ImageLightboxButton url={img.url} label={img.label} />
                      {checked ? (
                        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-2.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Pick whichever angle actually shows the court lines you need — Nano Banana composes from the real
                photo, so the selected image matters more than the text description for geometry.
              </p>
            </div>
          ) : location ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No saved photos for this location yet — add some in Hoop Squad first.
            </p>
          ) : null}
        </div>

        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Three-point line position</Label>
          <Select value={threePointPosition} onValueChange={(v) => v && setThreePointPosition(v as ThreePointPosition)}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THREE_POINT_POSITION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Applies to every character checked above. For this to actually work, make sure the location&apos;s saved
            reference photo clearly shows the court lines — Nano Banana composes from that real photo, it doesn&apos;t
            invent court geometry from nothing.
          </p>
        </div>

        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Describe the scene</Label>
          <Textarea
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            placeholder="e.g. Tense game moment, G about to release a jump shot, Dash closing out with a hand up"
            rows={4}
          />
        </div>

        <Button onClick={handleGenerate} disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : previewUrl ? (
            <RotateCcw className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {previewUrl ? "Regenerate Scene (~$0.15)" : "Compose Scene (~$0.15)"}
        </Button>
        {previewUrl ? (
          <p className="text-xs text-muted-foreground">
            Not right? Tweak the fields above and hit Regenerate — it overwrites this same starting frame, no need to
            clean up the old one.
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card className="h-fit">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {lastGeneratedUrl ? "Just Composed" : "Current Main Starting Frame"}
            </p>
            {previewUrl ? (
              <div className="group relative aspect-square overflow-hidden rounded-md border border-border/60 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={`${scene.name} starting frame`} className="size-full object-contain" />
                <ImageLightboxButton url={previewUrl} label={`${scene.name} starting frame`} />
              </div>
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
                <ImageOff className="size-6" />
                No starting frame set yet
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This is what Studio will use as &ldquo;{scene.name}&rdquo;&apos;s Main Starting Frame right now.
            </p>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Composition Prompt Preview</p>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs scrollbar-thin">
              {previewPrompt || "Fill in the fields to preview the composition prompt."}
            </pre>
            <p className="text-xs text-muted-foreground">
              This is the image prompt only — it has nothing to do with the video motion prompt in Studio. Composing
              here sets &ldquo;{scene.name}&rdquo;&apos;s Main Starting Frame; head to Studio and hit Generate Video to
              animate it.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
