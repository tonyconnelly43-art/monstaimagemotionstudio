import "server-only";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

function probeDurationSeconds(sourceUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(sourceUrl, (err, data) => {
      if (err) return reject(err);
      resolve(data.format.duration ?? 0);
    });
  });
}

export interface MixAudioTrack {
  /** Absolute local file path or remote URL fluent-ffmpeg/ffmpeg can read directly. */
  sourceUrl: string;
  startMs: number;
  trimStartMs: number;
  trimEndMs: number | null;
  volumeDb: number;
  fadeInMs: number;
  fadeOutMs: number;
  isMuted: boolean;
  /** Voiceover tracks are never ducked and their presence triggers ducking of other tracks. */
  isDialogueTrack: boolean;
  /** Whether this non-dialogue track should be lowered under dialogue (ignored for dialogue tracks). */
  duckUnderDialogue: boolean;
}

export interface MixVideoInput {
  videoUrl: string;
  tracks: MixAudioTrack[];
  /** Lower background music under dialogue by this many dB when a dialogue track is present. */
  duckingDb?: number;
}

/**
 * Combines a source video with one or more audio tracks (voiceover, music,
 * SFX) using server-side FFmpeg, with per-track volume/fade/mute, basic
 * ducking of non-dialogue tracks under dialogue, and a master limiter on the
 * final mix. Returns the rendered file's bytes — the caller is responsible
 * for uploading them to permanent storage.
 *
 * Runs only in a Node.js runtime (not Edge) — see the route handler that
 * calls this for `export const runtime = "nodejs"`.
 */
export async function mixVideoWithAudioTracks(input: MixVideoInput): Promise<Buffer> {
  const workDir = await mkdtemp(join(tmpdir(), "monsta-mix-"));
  const outputPath = join(workDir, "output.mp4");
  const hasDialogue = input.tracks.some((t) => t.isDialogueTrack && !t.isMuted);

  try {
    const activeTracks = input.tracks.filter((t) => !t.isMuted);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg().input(input.videoUrl);
      for (const track of activeTracks) {
        command.input(track.sourceUrl);
      }
      command.on("error", (err) => reject(err)).on("end", () => resolve());

      if (activeTracks.length === 0) {
        command.outputOptions(["-c:v", "copy", "-c:a", "aac"]).save(outputPath);
        return;
      }

      Promise.all(activeTracks.map((t) => probeDurationSeconds(t.sourceUrl)))
        .then((durations) => {
          const filterParts: string[] = [];
          const mixLabels: string[] = [];

          activeTracks.forEach((track, i) => {
            const inputIndex = i + 1; // 0 is the video
            const duckAdjust = !track.isDialogueTrack && track.duckUnderDialogue && hasDialogue ? (input.duckingDb ?? -12) : 0;
            const totalVolumeDb = track.volumeDb + duckAdjust;
            const trackDuration = durations[i] || 0;
            const filters: string[] = [];

            if (track.trimStartMs > 0 || track.trimEndMs) {
              const start = track.trimStartMs / 1000;
              const end = track.trimEndMs ? track.trimEndMs / 1000 : undefined;
              filters.push(`atrim=start=${start}${end ? `:end=${end}` : ""}`, "asetpts=PTS-STARTPTS");
            }
            if (track.startMs > 0) {
              filters.push(`adelay=${track.startMs}|${track.startMs}`);
            }
            filters.push(`volume=${totalVolumeDb}dB`);
            if (track.fadeInMs > 0) {
              filters.push(`afade=t=in:st=0:d=${track.fadeInMs / 1000}`);
            }
            if (track.fadeOutMs > 0 && trackDuration > 0) {
              const fadeOutStart = Math.max(0, trackDuration - track.fadeOutMs / 1000);
              filters.push(`afade=t=out:st=${fadeOutStart}:d=${track.fadeOutMs / 1000}`);
            }

            const label = `a${i}`;
            filterParts.push(`[${inputIndex}:a]${filters.join(",")}[${label}]`);
            mixLabels.push(`[${label}]`);
          });

          filterParts.push(
            `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=2[mixed]`,
          );
          // Master limiter to avoid clipping on the combined mix.
          filterParts.push(`[mixed]alimiter=limit=0.9[aout]`);

          command
            .complexFilter(filterParts)
            .outputOptions(["-map", "0:v:0", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-shortest"])
            .save(outputPath);
        })
        .catch(reject);
    });

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Downloads a remote file to a local temp path so ffmpeg can read it reliably. */
export async function downloadToTemp(url: string, dir: string, filename: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const path = join(dir, filename);
  await writeFile(path, buffer);
  return path;
}

export { mkdtemp, tmpdir, join, rm };
