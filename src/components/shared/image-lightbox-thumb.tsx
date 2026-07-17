"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Standalone image + click-to-preview overlay, for thumbnails that sit
 * inside a Link (list-page cards) where the rest of the card should still
 * navigate normally on click.
 */
export function ImageLightboxThumb({ url, label, className }: { url: string; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group/thumb relative size-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className={className ?? "size-full bg-white object-contain"} />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100"
        title={`Preview ${label}`}
      >
        <Maximize2 className="size-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none ring-0">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="max-h-[85vh] w-full rounded-lg bg-white object-contain" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
