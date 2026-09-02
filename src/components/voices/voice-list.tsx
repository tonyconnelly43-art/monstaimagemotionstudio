"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Loader2, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { VOICE_MODELS } from "@/lib/fal/models";
import {
  createVoiceAction,
  deleteVoiceAction,
  updateVoiceAction,
  assignCharacterVoiceAction,
  generateVoicePreviewAction,
  confirmVoiceCloneConsentAction,
} from "@/lib/actions/voices";
import { uploadVoiceCloneReference } from "@/lib/supabase/upload";
import type { CharacterRow } from "@/lib/data/characters";
import type { Voice } from "@/lib/data/audio";

export function VoiceList({ voices, characters }: { voices: Voice[]; characters: CharacterRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createVoiceAction(newName.trim());
      setNewName("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="New voice name, e.g. Energetic Young Point Guard" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button onClick={handleCreate} disabled={isPending || !newName.trim()}>
          <Plus className="size-4" /> Add Voice
        </Button>
      </div>

      <Accordion multiple>
        {voices.map((voice) => (
          <AccordionItem key={voice.id} value={voice.id}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                {voice.name}
                {voice.is_cloned ? <Badge variant="outline" className="text-[10px] font-normal">cloned</Badge> : null}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <VoiceEditor voice={voice} characters={characters} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function VoiceEditor({ voice, characters }: { voice: Voice; characters: CharacterRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [sampleText, setSampleText] = useState("Hello Hoop Squad! Let's get ready for the big game.");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const model = VOICE_MODELS.find((m) => m.id === voice.model_id) ?? VOICE_MODELS[0];

  function patch(update: Partial<Voice>) {
    startTransition(async () => {
      try {
        await updateVoiceAction(voice.id, update as never);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function handleCharacterChange(characterId: string) {
    startTransition(async () => {
      try {
        // Routed through assignCharacterVoiceAction (not a plain patch) so any
        // other voice already pointing at the newly-picked character gets
        // cleared first — generation only ever expects one voice per character.
        if (characterId === "none") {
          await updateVoiceAction(voice.id, { character_id: null } as never);
        } else {
          await assignCharacterVoiceAction(characterId, voice.id);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not assign voice.");
      }
    });
  }

  async function handlePreview() {
    setGenerating(true);
    setPreviewUrl(null);
    const result = await generateVoicePreviewAction(voice.id, sampleText);
    if (result.error) toast.error(result.error);
    else setPreviewUrl(result.audioUrl ?? null);
    setGenerating(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Character</Label>
          <Select
            value={voice.character_id ?? "none"}
            onValueChange={(v) => v && handleCharacterChange(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not assigned to a character</SelectItem>
              {characters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Model</Label>
          <Select value={voice.model_id ?? model.id} onValueChange={(v) => v && patch({ model_id: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.displayName}
                  {!m.isWired ? " (not yet wired)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {model.capabilities.supportsVoiceSelection ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Voice ID / name</Label>
            <Input
              defaultValue={voice.voice_id ?? ""}
              placeholder="e.g. Rachel"
              onBlur={(e) => patch({ voice_id: e.target.value })}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Default speed</Label>
          <Input
            type="number"
            step={0.05}
            min={0.5}
            max={2}
            defaultValue={voice.default_speed ?? ""}
            onBlur={(e) => patch({ default_speed: e.target.value ? Number(e.target.value) : null })}
            disabled={!model.capabilities.supportsSpeed}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            defaultValue={voice.description ?? ""}
            placeholder="e.g. Confident but friendly young player"
            onBlur={(e) => patch({ description: e.target.value })}
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Default emotion</Label>
          <Input
            defaultValue={voice.default_emotion ?? ""}
            placeholder="e.g. excited"
            onBlur={(e) => patch({ default_emotion: e.target.value })}
            disabled={!model.capabilities.supportsEmotionTags}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Age-appropriate tone</Label>
          <Input
            defaultValue={voice.age_appropriate_tone ?? ""}
            placeholder="e.g. youthful, energetic"
            onBlur={(e) => patch({ age_appropriate_tone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Pronunciation guide</Label>
          <Input
            defaultValue={voice.pronunciation_guide ?? ""}
            onBlur={(e) => patch({ pronunciation_guide: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        <Label className="text-xs text-muted-foreground">Preview before saving</Label>
        <Textarea value={sampleText} onChange={(e) => setSampleText(e.target.value)} rows={2} />
        <p className="text-[11px] text-muted-foreground">
          Inline direction tags supported where the model allows them, e.g. [excited], [whispers], [laughs].
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePreview} disabled={generating}>
            {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Preview Voice
          </Button>
          {previewUrl ? (
            <>
              <audio src={previewUrl} controls className="h-8" />
              <Button
                size="icon-sm"
                variant="ghost"
                title="Download this preview"
                render={<a href={previewUrl} download={`${voice.name.replace(/\s+/g, "-").toLowerCase()}-preview.mp3`} />}
              >
                <Download className="size-3.5" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        <Label className="text-xs text-muted-foreground">Voice Cloning (optional)</Label>
        <p className="text-[11px] text-muted-foreground">
          Only clone a voice you own or have clear permission to use. Reference audio must be uploaded by you — no
          cloning tools are provided for celebrities, public figures, or unidentified people.
        </p>
        <label className="flex items-start gap-2 text-xs">
          <Checkbox checked={consentChecked} onCheckedChange={(v) => setConsentChecked(Boolean(v))} />
          I confirm that I own this voice or have clear permission from the speaker to create and use this voice.
        </label>
        <input
          type="file"
          accept="audio/*"
          disabled={!consentChecked || isPending}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const url = await uploadVoiceCloneReference(voice.id, file);
              await confirmVoiceCloneConsentAction(voice.id, url);
              toast.success(
                "Reference audio saved. Cloned-voice generation requires a voice-cloning model (F5-TTS/Qwen), not yet wired — see Settings.",
              );
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Upload failed.");
            }
          }}
        />
        {voice.consent_confirmed_at ? (
          <p className="text-[11px] text-muted-foreground">
            Consent confirmed {new Date(voice.consent_confirmed_at).toLocaleDateString()}.
          </p>
        ) : null}
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => startTransition(() => deleteVoiceAction(voice.id))}
        disabled={isPending}
      >
        <Trash2 className="size-3.5" /> Delete Voice
      </Button>
    </div>
  );
}
