"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GenerateReferenceResult } from "@/lib/actions/image-generation";

/** Shared "Generate with AI" flow for character-references and scene-references — the only difference between the two callers is which server action gets invoked. */
export function GenerateReferenceDialog({
  dialogTitle,
  hasExistingPhotos,
  extraLabelField,
  onGenerate,
}: {
  dialogTitle: string;
  hasExistingPhotos: boolean;
  /** Renders a free-text label input above the prompt (locations need a view label; characters don't). */
  extraLabelField?: { label: string; placeholder?: string };
  onGenerate: (prompt: string, useExistingAsGuide: boolean, extraLabel: string) => Promise<GenerateReferenceResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [extraLabel, setExtraLabel] = useState("");
  const [useExisting, setUseExisting] = useState(hasExistingPhotos);
  const [pending, setPending] = useState(false);

  function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Describe the image you want first.");
      return;
    }
    if (extraLabelField && !extraLabel.trim()) {
      toast.error(`Enter a ${extraLabelField.label.toLowerCase()} first.`);
      return;
    }
    setPending(true);
    onGenerate(prompt, useExisting, extraLabel)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Generated and saved.");
        setOpen(false);
        setPrompt("");
        setExtraLabel("");
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Generation failed."))
      .finally(() => setPending(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/70 text-[10px] text-muted-foreground hover:border-border hover:text-foreground"
          >
            <Sparkles className="size-4" />
            AI
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Generated with Nano Banana Pro (~$0.15 per image, billed through your fal.ai account). Describe the pose,
            expression, or angle you want.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {extraLabelField ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{extraLabelField.label}</Label>
              <Input value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} placeholder={extraLabelField.placeholder} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Full-body action pose, mid-air layup, same uniform and colors, plain white background"
              rows={4}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={useExisting} onCheckedChange={(v) => setUseExisting(Boolean(v))} disabled={!hasExistingPhotos} />
            Use existing saved photos as a reference for consistency
          </label>
          {!hasExistingPhotos ? (
            <p className="text-xs text-muted-foreground">No saved photos yet — this one will be generated from the prompt alone.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
