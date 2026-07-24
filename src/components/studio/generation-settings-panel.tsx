"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Lock, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  VIDEO_MODELS,
  CONSISTENCY_STRENGTH_LABELS,
  recommendVideoModel,
  getVideoModel,
  type ConsistencyStrength,
} from "@/lib/fal/models";
import { estimateVideoCost } from "@/lib/pricing/config";
import { updateSceneAction } from "@/lib/actions/scenes";
import { submitGenerationAction } from "@/lib/actions/generation";
import type { Scene } from "@/lib/data/scenes";
import type { CharacterRow } from "@/lib/data/characters";
import type { HoopSquadScene } from "@/lib/data/hoop-squad-scenes";
import { SCENE_CATEGORIES } from "@/lib/data/hoop-squad-scenes";

const CONSISTENCY_STRENGTHS: ConsistencyStrength[] = ["flexible", "balanced", "strong", "maximum"];

export function GenerationSettingsPanel({
  scene,
  projectId,
  characters,
  locations,
  hasMainFrame,
  onJobSubmitted,
}: {
  scene: Scene;
  projectId: string;
  characters: CharacterRow[];
  locations: HoopSquadScene[];
  hasMainFrame: boolean;
  onJobSubmitted: (jobId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const model = getVideoModel(scene.video_model_id ?? "") ?? VIDEO_MODELS[0];

  const recommendation = useMemo(
    () =>
      recommendVideoModel({
        hasStartImage: hasMainFrame,
        hasEndImage: false,
        referenceImageCount: scene.character_ids?.length ?? 0,
        hasDialogue: false,
        wantsFastPreview: false,
      }),
    [hasMainFrame, scene.character_ids],
  );

  function patch(update: Parameters<typeof updateSceneAction>[2]) {
    startTransition(async () => {
      try {
        await updateSceneAction(scene.id, projectId, update);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save setting.");
      }
    });
  }

  function toggleCharacter(id: string, checked: boolean) {
    const current = scene.character_ids ?? [];
    const next = checked ? [...current, id] : current.filter((c) => c !== id);
    patch({ character_ids: next });
  }

  async function handleGenerate() {
    setSubmitting(true);
    try {
      const result = await submitGenerationAction(scene.id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.jobId) {
        toast.info("Generation started — this can take a minute or two.");
        onJobSubmitted(result.jobId);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const cost = estimateVideoCost(model.id, scene.duration_seconds);

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <Label className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5" /> Video Model
        </Label>
        <Select value={model.id} onValueChange={(v) => patch({ video_model_id: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {model.id !== recommendation.modelId ? (
          <button
            type="button"
            onClick={() => patch({ video_model_id: recommendation.modelId })}
            className="mt-1.5 text-left text-xs text-muted-foreground hover:text-primary"
          >
            Suggested: {getVideoModel(recommendation.modelId)?.displayName} — {recommendation.reason}
          </button>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">{recommendation.reason}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Scene Style</Label>
        <Select value={scene.style_mode} onValueChange={(v) => v && patch({ style_mode: v as "basketball" | "everyday" })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="everyday">Everyday (Recess-style cartoon)</SelectItem>
            <SelectItem value="basketball">Basketball (cinematic, Batman/Marvel-style)</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {scene.style_mode === "basketball"
            ? "Game moments get moodier lighting, cinematic camera work, and heroic framing."
            : "Hangout & story moments get bright, playful Saturday-morning-cartoon energy."}{" "}
          Edit the exact wording in Settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Duration</Label>
          <Select value={String(scene.duration_seconds)} onValueChange={(v) => patch({ duration_seconds: Number(v) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.capabilities.durations
                .filter((d): d is number => typeof d === "number")
                .map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}s
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Aspect Ratio</Label>
          <Select value={scene.aspect_ratio} onValueChange={(v) => v && patch({ aspect_ratio: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.capabilities.aspectRatios
                .filter((r) => r !== "auto")
                .map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 p-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-sm">
            <Lock className="size-3.5" /> Character Lock
          </Label>
          <Switch checked={scene.character_lock} onCheckedChange={(v) => patch({ character_lock: v })} />
        </div>
        {scene.character_lock ? (
          <Select
            value={scene.character_lock_strength}
            onValueChange={(v) => patch({ character_lock_strength: v as ConsistencyStrength })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSISTENCY_STRENGTHS.map((s) => (
                <SelectItem key={s} value={s}>
                  {CONSISTENCY_STRENGTH_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="max-h-32 space-y-1.5 overflow-y-auto scrollbar-thin">
          {characters.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={(scene.character_ids ?? []).includes(c.id)}
                onCheckedChange={(v) => toggleCharacter(c.id, Boolean(v))}
              />
              {c.name}
              {c.is_placeholder ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  placeholder
                </Badge>
              ) : null}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {model.capabilities.supportsReferenceToVideo
            ? "Checked characters send their reference photo straight to the video model, so the same character keeps looking like themselves."
            : `${model.displayName} only accepts one starting image, so checked characters here won't add reference photos — switch to "Seedance 2 — Reference to Video" for that. Character consistency here comes from the Main Starting Frame itself.`}
        </p>
        {model.capabilities.supportsAudioReference ? (
          <p className="text-xs text-muted-foreground">
            If a checked character has dialogue, assigning them a voice on the{" "}
            <a href="/voices" className="underline underline-offset-2">
              Voices page
            </a>{" "}
            (with at least one saved sample) sends that voice along too, so they don&apos;t sound different every generation.
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 p-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5" /> Scene Lock
          </Label>
          <Switch checked={scene.scene_lock} onCheckedChange={(v) => patch({ scene_lock: v })} />
        </div>
        {scene.scene_lock ? (
          <Select value={scene.scene_lock_strength} onValueChange={(v) => patch({ scene_lock_strength: v as ConsistencyStrength })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSISTENCY_STRENGTHS.map((s) => (
                <SelectItem key={s} value={s}>
                  {CONSISTENCY_STRENGTH_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={scene.hoop_squad_scene_id ?? "none"} onValueChange={(v) => patch({ hoop_squad_scene_id: v === "none" ? null : v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a saved location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No saved location</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name} · {SCENE_CATEGORIES.find((c) => c.value === loc.category)?.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Camera angle"
            defaultValue={scene.camera_angle ?? ""}
            onBlur={(e) => patch({ camera_angle: e.target.value })}
          />
          <Input
            placeholder="Time of day"
            defaultValue={scene.time_of_day ?? ""}
            onBlur={(e) => patch({ time_of_day: e.target.value })}
          />
        </div>
      </div>

      <Accordion>
        <AccordionItem value="basketball">
          <AccordionTrigger className="text-sm">Basketball Motion Guardrails</AccordionTrigger>
          <AccordionContent>
            <BasketballGuardrailsForm scene={scene} onPatch={patch} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-auto space-y-2 border-t border-border/60 pt-4">
        <p className="text-xs text-muted-foreground">{cost.label}</p>
        <Button className="w-full" size="lg" onClick={handleGenerate} disabled={submitting || isPending}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate Video
        </Button>
      </div>
    </div>
  );
}

function BasketballGuardrailsForm({
  scene,
  onPatch,
}: {
  scene: Scene;
  onPatch: (update: Parameters<typeof updateSceneAction>[2]) => void;
}) {
  const target = (scene.hoop_target as Record<string, string>) ?? {};
  const fields: { key: string; label: string; placeholder: string }[] = [
    { key: "shotType", label: "Shot Type", placeholder: "e.g. three-pointer (feet behind the arc), layup, free throw" },
    { key: "targetBasket", label: "Target Basket", placeholder: "e.g. right-side basket" },
    { key: "playerDirection", label: "Player Direction", placeholder: "e.g. moving left to right" },
    { key: "shootingHand", label: "Shooting Hand", placeholder: "e.g. right hand" },
    { key: "dribblingHand", label: "Dribbling Hand", placeholder: "e.g. left hand" },
    { key: "startingPose", label: "Starting Pose", placeholder: "e.g. triple-threat stance" },
    { key: "endingPose", label: "Ending Pose", placeholder: "e.g. follow-through" },
    { key: "ballOwnership", label: "Ball Ownership", placeholder: "e.g. Dash has the ball" },
    { key: "defenderPlacement", label: "Defender Placement", placeholder: "e.g. one step back" },
    { key: "cameraSide", label: "Camera Side", placeholder: "e.g. baseline camera" },
    { key: "courtDirection", label: "Court Direction", placeholder: "e.g. attacking toward camera" },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{f.label}</Label>
          <Input
            placeholder={f.placeholder}
            defaultValue={target[f.key] ?? ""}
            onBlur={(e) => onPatch({ hoop_target: { ...target, [f.key]: e.target.value } })}
          />
        </div>
      ))}
    </div>
  );
}
