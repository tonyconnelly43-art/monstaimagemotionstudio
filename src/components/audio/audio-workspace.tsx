"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogueBuilder } from "@/components/audio/dialogue-builder";
import { AudioTimeline } from "@/components/audio/audio-timeline";
import { CaptionsPanel } from "@/components/audio/captions-panel";
import { LipSyncPanel } from "@/components/audio/lip-sync-panel";
import { FinalCutPanel } from "@/components/audio/final-cut-panel";
import type { Project } from "@/lib/data/projects";
import type { Scene } from "@/lib/data/scenes";
import type { CharacterRow } from "@/lib/data/characters";
import type { AudioTrack, DialogueLine } from "@/lib/data/audio";

export function AudioWorkspace({
  projects,
  scenesByProject,
  characters,
}: {
  projects: Project[];
  scenesByProject: Record<string, { scene: Scene; dialogueLines: DialogueLine[]; audioTracks: AudioTrack[] }[]>;
  characters: CharacterRow[];
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const scenesForProject = scenesByProject[projectId] ?? [];
  const [sceneId, setSceneId] = useState(scenesForProject[0]?.scene.id ?? "");
  const current = scenesForProject.find((s) => s.scene.id === sceneId) ?? scenesForProject[0];

  if (projects.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">Create a project in Studio first.</p>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Project</Label>
          <Select
            value={projectId}
            onValueChange={(v) => {
              if (!v) return;
              setProjectId(v);
              setSceneId(scenesByProject[v]?.[0]?.scene.id ?? "");
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Scene</Label>
          <Select value={sceneId} onValueChange={(v) => v && setSceneId(v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="No scenes yet" />
            </SelectTrigger>
            <SelectContent>
              {scenesForProject.map((s) => (
                <SelectItem key={s.scene.id} value={s.scene.id}>
                  {s.scene.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {current ? (
        <Tabs defaultValue="dialogue">
          <TabsList variant="line">
            <TabsTrigger value="dialogue">Dialogue Builder</TabsTrigger>
            <TabsTrigger value="timeline">Audio Timeline</TabsTrigger>
            <TabsTrigger value="captions">Captions</TabsTrigger>
            <TabsTrigger value="lipsync">Lip Sync</TabsTrigger>
            <TabsTrigger value="finalcut">Final Cut</TabsTrigger>
          </TabsList>
          <TabsContent value="dialogue" className="pt-4">
            <DialogueBuilder scene={current.scene} projectId={projectId} lines={current.dialogueLines} characters={characters} />
          </TabsContent>
          <TabsContent value="timeline" className="pt-4">
            <AudioTimeline sceneId={current.scene.id} tracks={current.audioTracks} />
          </TabsContent>
          <TabsContent value="captions" className="pt-4">
            <CaptionsPanel lines={current.dialogueLines} />
          </TabsContent>
          <TabsContent value="lipsync" className="pt-4">
            <LipSyncPanel scene={current.scene} audioTracks={current.audioTracks} />
          </TabsContent>
          <TabsContent value="finalcut" className="pt-4">
            <FinalCutPanel scene={current.scene} />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">Add a scene to this project from the Studio first.</p>
      )}
    </div>
  );
}
