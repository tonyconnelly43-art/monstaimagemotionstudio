"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSceneTemplateAction, deleteSceneTemplateAction } from "@/lib/actions/hoop-squad-scenes";
import type { HoopSquadScene, SceneTemplate } from "@/lib/data/hoop-squad-scenes";

export function TemplatesList({ templates, locations }: { templates: SceneTemplate[]; locations: HoopSquadScene[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState<string>("none");
  const [cameraAngle, setCameraAngle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createSceneTemplateAction({
          name: name.trim(),
          hoopSquadSceneId: locationId === "none" ? null : locationId,
          cameraAngle: cameraAngle || undefined,
          promptInstructions: instructions || undefined,
        });
        setOpen(false);
        setName("");
        setCameraAngle("");
        setInstructions("");
        toast.success("Template saved.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save template.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 py-1 pl-3 pr-1 text-xs">
            <span>{t.name}</span>
            {t.hoop_squad_scene_id ? (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {locations.find((l) => l.id === t.hoop_squad_scene_id)?.name}
              </Badge>
            ) : null}
            <button
              type="button"
              onClick={() => startTransition(() => deleteSceneTemplateAction(t.id))}
              className="rounded-full p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <Plus className="size-3.5" /> Save New Template
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save a scene template</DialogTitle>
            <DialogDescription>Combine an environment, camera angle, and prompt instructions for reuse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Template name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Team Huddle at Center Court" />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific location</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Camera angle</Label>
              <Input value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} placeholder="e.g. wide center-court push-in" />
            </div>
            <div className="space-y-1.5">
              <Label>Prompt instructions</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
