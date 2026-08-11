"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateProjectAction } from "@/lib/actions/projects";
import type { Project } from "@/lib/data/projects";

export function ProjectStyleDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [styleInstructions, setStyleInstructions] = useState(project.style_instructions ?? "");
  const [basketball, setBasketball] = useState(project.basketball_style_instructions ?? "");
  const [everyday, setEveryday] = useState(project.everyday_style_instructions ?? "");

  function handleSave() {
    startTransition(async () => {
      try {
        await updateProjectAction(project.id, {
          style_instructions: styleInstructions,
          basketball_style_instructions: basketball,
          everyday_style_instructions: everyday,
        });
        toast.success("Style profile saved.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save the style profile.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Palette className="size-3.5" /> Style Profile
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Style Profile — {project.name}</DialogTitle>
          <DialogDescription>
            Automatically added to every prompt generated in this project only — other projects on your account each
            keep their own, so switching between shows never mixes up art styles.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Style instructions</Label>
            <Textarea
              value={styleInstructions}
              onChange={(e) => setStyleInstructions(e.target.value)}
              placeholder="e.g. Preserve the exact approved character illustration style. Flat cel-shaded cartoon linework, bold outlines, consistent proportions..."
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Basketball scenes (only used if a scene&apos;s Style is set to Basketball)</Label>
            <Textarea
              value={basketball}
              onChange={(e) => setBasketball(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Everyday scenes (only used if a scene&apos;s Style is set to Everyday)</Label>
            <Textarea
              value={everyday}
              onChange={(e) => setEveryday(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            Save Style Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
