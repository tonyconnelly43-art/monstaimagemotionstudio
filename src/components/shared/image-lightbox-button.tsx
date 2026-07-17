"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Drop into an existing `group relative` thumbnail container (alongside a
 * delete button, etc.) to add a click-to-preview affordance without
 * disturbing whatever else that thumbnail already does on click.
 */
export function ImageLightboxButton({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute left-0.5 top-0.5 hidden size-4 items-center justify-center rounded-full bg-black/70 text-white group-hover:flex"
        title={`Preview ${label}`}
      >
        <Maximize2 className="size-2.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none ring-0">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="max-h-[85vh] w-full rounded-lg bg-white object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
