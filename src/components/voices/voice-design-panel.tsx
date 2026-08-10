"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { designVoiceAction, saveDesignedVoiceAction, type VoiceDesignPreviewResult } from "@/lib/actions/voice-design";
import type { CharacterRow } from "@/lib/data/characters";

export function VoiceDesignPanel({ characters }: { characters: CharacterRow[] }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [designing, setDesigning] = useState(false);
  const [previews, setPreviews] = useState<VoiceDesignPreviewResult[] | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [characterId, setCharacterId] = useState("none");
  const [savingId, setSavingId] = useState<string | null>(null);

  const canGenerate = prompt.trim().length >= 20 && !designing;

  function handleGenerate() {
    setDesigning(true);
    setPreviews(null);
    designVoiceAction(prompt, sampleText)
      .then((result) => {
        if (result.error || !result.previews) {
          toast.error(result.error ?? "Could not design a voice from that description.");
          return;
        }
        setPreviews(result.previews);
      })
      .finally(() => setDesigning(false));
  }

  function handleSave(preview: VoiceDesignPreviewResult) {
    if (!voiceName.trim()) {
      toast.error("Give the voice a name first.");
      return;
    }
    setSavingId(preview.generatedVoiceId);
    saveDesignedVoiceAction(preview.generatedVoiceId, voiceName, prompt, characterId === "none" ? null : characterId)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`"${voiceName.trim()}" saved — ready to use anywhere in the app.`);
        setPreviews(null);
        setPrompt("");
        setSampleText("");
        setVoiceName("");
        setCharacterId("none");
        router.refresh();
      })
      .finally(() => setSavingId(null));
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-medium">Design a Voice</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Describe how a voice should sound and generate a few brand-new options to choose from — uses your fal.ai
          balance, no separate ElevenLabs account needed.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Voice description</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A warm, energetic young male narrator in his 20s, upbeat and encouraging, like a hype-man teammate."
            rows={3}
          />
          <p className="text-[11px] text-muted-foreground">{prompt.trim().length}/1000 characters (20 minimum)</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sample line to preview (optional)</Label>
          <Textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            placeholder="Leave blank to auto-generate a sample line for this voice."
            rows={2}
          />
        </div>

        <Button size="sm" onClick={handleGenerate} disabled={!canGenerate}>
          {designing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Generate Voice Options
        </Button>

        {previews ? (
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Voice name</Label>
                <Input
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g. Hype-Man Narrator"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assign to a character (optional)</Label>
                <Select value={characterId} onValueChange={(v) => v && setCharacterId(v)}>
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
            </div>

            <div className="space-y-2">
              {previews.map((preview, i) => (
                <div
                  key={preview.generatedVoiceId}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2"
                >
                  <span className="text-xs text-muted-foreground">Option {i + 1}</span>
                  <audio src={preview.audioUrl} controls className="h-8" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(preview)}
                    disabled={savingId !== null || !voiceName.trim()}
                  >
                    {savingId === preview.generatedVoiceId ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Use this one
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
