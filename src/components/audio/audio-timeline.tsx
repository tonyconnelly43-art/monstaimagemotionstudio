"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadAudioTrack } from "@/lib/supabase/upload";
import { updateAudioTrackAction, deleteAudioTrackAction, duplicateAudioTrackAction } from "@/lib/actions/audio-tracks";
import type { AudioTrack } from "@/lib/data/audio";
import type { Database } from "@/types/database";

type TrackType = Database["public"]["Tables"]["audio_tracks"]["Row"]["track_type"];

const TRACK_TYPES: { value: TrackType; label: string }[] = [
  { value: "voiceover_generated", label: "Generated Voiceover" },
  { value: "voiceover_uploaded", label: "Uploaded Voiceover" },
  { value: "music", label: "Background Music" },
  { value: "sfx", label: "Sound Effect (basketball, sneakers, crowd, whistle, buzzer, swish…)" },
  { value: "ambience", label: "Gym Ambience" },
];

export function AudioTimeline({ sceneId, tracks }: { sceneId: string; tracks: AudioTrack[] }) {
  const [isPending, startTransition] = useTransition();
  const [uploadType, setUploadType] = useState<TrackType>("sfx");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAudioTrack(sceneId, uploadType, file.name, file);
      toast.success("Track added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function patch(trackId: string, update: Partial<AudioTrack>) {
    startTransition(async () => {
      try {
        await updateAudioTrackAction(trackId, update as never);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/70 p-3">
        <Select value={uploadType} onValueChange={(v) => v && setUploadType(v as TrackType)}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRACK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label>
          <input type="file" accept="audio/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted">
            <Plus className="size-4" />
            {uploading ? "Uploading…" : "Upload Audio File"}
          </span>
        </label>
      </div>

      <div className="space-y-3">
        {tracks.map((track) => (
          <div key={track.id} className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {track.label ?? TRACK_TYPES.find((t) => t.value === track.track_type)?.label}
              </span>
              <audio src={track.source_url} controls className="h-7 max-w-[220px]" />
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={isPending}
                onClick={() => startTransition(() => duplicateAudioTrackAction(track.id))}
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={isPending}
                onClick={() => startTransition(() => deleteAudioTrackAction(track.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Start (ms)</Label>
                <Input type="number" defaultValue={track.start_ms} onBlur={(e) => patch(track.id, { start_ms: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Volume (dB)</Label>
                <Input type="number" defaultValue={track.volume_db} onBlur={(e) => patch(track.id, { volume_db: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Fade in (ms)</Label>
                <Input type="number" defaultValue={track.fade_in_ms} onBlur={(e) => patch(track.id, { fade_in_ms: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Fade out (ms)</Label>
                <Input type="number" defaultValue={track.fade_out_ms} onBlur={(e) => patch(track.id, { fade_out_ms: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <ToggleField label="Mute" checked={track.is_muted} onCheckedChange={(v) => patch(track.id, { is_muted: v })} />
              <ToggleField label="Solo" checked={track.is_solo} onCheckedChange={(v) => patch(track.id, { is_solo: v })} />
              <ToggleField label="Loop" checked={track.is_looped} onCheckedChange={(v) => patch(track.id, { is_looped: v })} />
              <ToggleField
                label="Duck under dialogue"
                checked={track.duck_under_dialogue}
                onCheckedChange={(v) => patch(track.id, { duck_under_dialogue: v })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </label>
  );
}
