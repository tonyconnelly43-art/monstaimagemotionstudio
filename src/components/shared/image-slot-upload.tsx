"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";

export function ImageSlotUpload({
  label,
  url,
  onUpload,
  aspectClassName = "aspect-square",
}: {
  label: string;
  url?: string | null;
  onUpload: (file: File) => Promise<unknown>;
  aspectClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      toast.success(`${label} updated.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/40 text-xs text-muted-foreground transition-colors hover:border-primary/50 ${aspectClassName}`}
    >
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} />
      {uploading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <ImagePlus className="mb-1 size-5" />
          <span className="px-2 text-center leading-tight">{label}</span>
        </>
      )}
      {url ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          Replace {label}
        </span>
      ) : null}
    </button>
  );
}
