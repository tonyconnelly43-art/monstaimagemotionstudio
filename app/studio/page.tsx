"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const STYLES = [
  { id: "realistic", label: "Realistic", emoji: "🌄" },
  { id: "cinematic", label: "Cinematic", emoji: "🎥" },
  { id: "cartoon", label: "Cartoon", emoji: "🎨" },
  { id: "product_ad", label: "Product Ad", emoji: "📦" },
  { id: "mascot", label: "Mascot Anim.", emoji: "🤖" },
] as const;

type Style = (typeof STYLES)[number]["id"];
type Duration = 5 | 10;
type Status = "idle" | "uploading" | "generating" | "done" | "error";

export default function StudioPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<Duration>(5);
  const [style, setStyle] = useState<Style>("cinematic");
  const [status, setStatus] = useState<Status>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) loadImage(file);
  }, []);

  const loadImage = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setVideoUrl(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!imageFile || !prompt.trim()) return;
    setStatus("uploading");
    setError(null);
    setVideoUrl(null);
    setProgress("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("prompt", prompt.trim());
      formData.append("duration", String(duration));
      formData.append("style", style);

      setProgress("Submitting to fal.ai...");
      setStatus("generating");

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");

      // Poll for status
      const requestId = data.requestId;
      setProgress("Generating your video — this takes ~30–60 seconds...");

      let attempts = 0;
      while (attempts < 120) {
        await new Promise((r) => setTimeout(r, 3000));
        const poll = await fetch(`/api/status?requestId=${requestId}`);
        const pollData = await poll.json();

        if (pollData.status === "COMPLETED") {
          setVideoUrl(pollData.videoUrl);
          setStatus("done");
          setProgress("");
          return;
        }
        if (pollData.status === "FAILED") {
          throw new Error(pollData.error || "Video generation failed");
        }
        attempts++;
        const elapsed = attempts * 3;
        setProgress(`Generating... ${elapsed}s elapsed`);
      }

      throw new Error("Generation timed out — please try again");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
      setProgress("");
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `monstai-video-${Date.now()}.mp4`;
    a.click();
  };

  const isGenerating = status === "uploading" || status === "generating";

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
        >
          ← Monstai Motion Studio
        </Link>
        <span className="text-white/40 text-sm">Image → Video</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8 p-8 flex-1 max-w-7xl mx-auto w-full">
        {/* Left — controls */}
        <div className="flex flex-col gap-6 w-full lg:w-96 shrink-0">
          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Source Image
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-white/20 rounded-2xl p-6 text-center cursor-pointer hover:border-violet-500/60 transition-colors bg-white/5 min-h-[160px] flex flex-col items-center justify-center"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-36 rounded-lg object-contain"
                />
              ) : (
                <>
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="text-sm text-white/50">
                    Drop an image here or click to browse
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    JPG, PNG, WebP supported
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadImage(f);
                }}
              />
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Motion Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Camera slowly zooms in while clouds drift across the sky..."
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 resize-none transition-colors"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Video Length
            </label>
            <div className="flex gap-3">
              {([5, 10] as Duration[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    duration === d
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-white/5 border-white/15 text-white/60 hover:border-violet-500/40"
                  }`}
                >
                  {d} seconds
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    style === s.id
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-white/5 border-white/15 text-white/60 hover:border-violet-500/40"
                  }`}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!imageFile || !prompt.trim() || isGenerating}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-violet-900/40"
          >
            {isGenerating ? "Generating..." : "Generate Video ✨"}
          </button>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right — result */}
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-white/10 min-h-[400px] p-8">
          {status === "idle" && (
            <div className="text-center text-white/30">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-lg font-medium">Your video will appear here</p>
              <p className="text-sm mt-1">
                Upload an image and write a prompt to get started
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mx-auto mb-6" />
              <p className="text-white font-medium">{progress}</p>
              <p className="text-white/40 text-sm mt-2">
                Sit tight — AI magic is happening
              </p>
            </div>
          )}

          {status === "done" && videoUrl && (
            <div className="w-full flex flex-col items-center gap-6">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full max-w-2xl rounded-2xl shadow-2xl shadow-violet-900/40"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold transition-all"
                >
                  📥 Download MP4
                </button>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setVideoUrl(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all"
                >
                  Generate Another
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center text-white/30">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-white/60">Generation failed</p>
              <p className="text-sm mt-1">
                Fix the error on the left and try again
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
