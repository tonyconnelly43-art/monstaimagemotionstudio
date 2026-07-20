"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Drop into an existing `group relative` thumbnail container (alongside a
 * delete button, etc.) to add a click-to-preview affordance without
 * disturbing whatever else that thumbnail already does on click.
 */
export function ImageLightboxButton({
  url,
  label,
  size = "default",
}: {
  url: string;
  label: string;
  size?: "default" | "large";
}) {
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
        <DialogContent
          className={`border-none bg-transparent p-0 shadow-none ring-0 ${size === "large" ? "max-w-[95vw]" : "max-w-3xl"}`}
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className={`w-full rounded-lg bg-white object-contain ${size === "large" ? "max-h-[92vh]" : "max-h-[85vh]"}`}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
