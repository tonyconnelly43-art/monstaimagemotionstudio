"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSceneCompositionAction } from "@/lib/actions/image-generation";
import type { CharacterRow } from "@/lib/data/characters";
import type { HoopSquadScene } from "@/lib/data/hoop-squad-scenes";

export function SceneBuilderPanel({
  sceneId,
  projectId,
  defaultCharacterIds,
  defaultLocationId,
  characters,
  locations,
}: {
  sceneId: string;
  projectId: string;
  defaultCharacterIds: string[];
  defaultLocationId: string | null;
  characters: CharacterRow[];
  locations: HoopSquadScene[];
}) {
  const router = useRouter();
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(defaultCharacterIds);
  const [locationId, setLocationId] = useState<string>(defaultLocationId ?? "none");
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);

  function toggleCharacter(id: string, checked: boolean) {
    setSelectedCharacterIds((prev) => (checked ? [...prev, id] : prev.filter((c) => c !== id)));
  }

  function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Describe the scene you want composed first.");
      return;
    }
    setPending(true);
    generateSceneCompositionAction(sceneId, projectId, selectedCharacterIds, locationId === "none" ? null : locationId, prompt)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Scene composed and set as the Main Starting Frame.");
        setPrompt("");
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Generation failed."))
      .finally(() => setPending(false));
  }

  return (
    <div className="mt-2 space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick who&apos;s in the shot and where, describe the action, and Nano Banana Pro composes one consistent
        starting image from their saved reference photos — then use Generate Video below to animate it. It replaces
        this scene&apos;s Main Starting Frame. ~$0.15 per image.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Characters in this shot</Label>
        <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-border/60 p-2 scrollbar-thin">
          {characters.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add characters in the Character Library first.</p>
          ) : (
            characters.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedCharacterIds.includes(c.id)}
                  onCheckedChange={(v) => toggleCharacter(c.id, Boolean(v))}
                />
                {c.name}
              </label>
            ))
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Location</Label>
        <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
          <SelectTrigger className="w-full">
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
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Describe the scene</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. G drives past Dash toward the basket, Dash reaching to block, both mid-motion, gym in the background"
          rows={4}
        />
      </div>
      <Button onClick={handleGenerate} disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Compose Scene
      </Button>
    </div>
  );
}
