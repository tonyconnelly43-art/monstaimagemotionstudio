"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Shapes, Download, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  vectorizeBrandElementAction,
  updateBrandVectorColorsAction,
} from "@/lib/actions/brand";
import type { BrandElementType, BrandVectorLayers } from "@/lib/data/brand";

const BAND_LABELS = ["Lightest fill", "Light shade", "Mid shade", "Ink lines"];

function svgMarkup(vector: BrandVectorLayers, colors: string[]): string {
  const paths = vector.bands
    .map((band, i) => `<path d="${band.path}" fill="${colors[i] ?? band.color}" stroke="none" fill-rule="evenodd"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${vector.width}" height="${vector.height}" viewBox="0 0 ${vector.width} ${vector.height}">${paths}</svg>`;
}

export function VectorizePanel({
  projectId,
  elementType,
  label,
  sourceImageUrl,
  vector,
}: {
  projectId: string;
  elementType: BrandElementType;
  label: string;
  sourceImageUrl: string | null;
  vector: BrandVectorLayers | null;
}) {
  const router = useRouter();
  const [vectorizing, setVectorizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState<string[]>(vector?.bands.map((b) => b.color) ?? []);
  const [activeVector, setActiveVector] = useState(vector);
  const [zoomOpen, setZoomOpen] = useState(false);

  function handleVectorize() {
    if (!sourceImageUrl) return;
    setVectorizing(true);
    vectorizeBrandElementAction(projectId, elementType, sourceImageUrl)
      .then((result) => {
        if (result.error || !result.vector) {
          toast.error(result.error ?? "Could not vectorize that image.");
          return;
        }
        setActiveVector(result.vector);
        setColors(result.vector.bands.map((b) => b.color));
        toast.success(`${label} vectorized — pick your colors below.`);
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not vectorize that image."))
      .finally(() => setVectorizing(false));
  }

  function handleSaveColors() {
    if (!activeVector) return;
    setSaving(true);
    const updated: BrandVectorLayers = {
      ...activeVector,
      bands: activeVector.bands.map((band, i) => ({ ...band, color: colors[i] ?? band.color })),
    };
    updateBrandVectorColorsAction(projectId, elementType, updated)
      .then(() => {
        setActiveVector(updated);
        toast.success("Colors saved.");
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not save colors."))
      .finally(() => setSaving(false));
  }

  function handleDownload() {
    if (!activeVector) return;
    const blob = new Blob([svgMarkup(activeVector, colors)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Vectorize &amp; Color — {label}</p>
          {sourceImageUrl ? (
            <Button size="sm" variant="outline" onClick={handleVectorize} disabled={vectorizing}>
              {vectorizing ? <Loader2 className="size-4 animate-spin" /> : <Shapes className="size-4" />}
              {activeVector ? "Re-vectorize" : "Vectorize"}
            </Button>
          ) : null}
        </div>

        {!sourceImageUrl ? (
          <p className="text-xs text-muted-foreground">Pick a favorite {label.toLowerCase()} above first.</p>
        ) : !activeVector ? (
          <p className="text-xs text-muted-foreground">
            Turns your favorite into a clean scalable vector, split into recolorable layers, so you can pick the exact
            brand colors yourself.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="group relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-lg border border-border/60 bg-white"
              title="Click to zoom in"
            >
              <svg
                viewBox={`0 0 ${activeVector.width} ${activeVector.height}`}
                className="size-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                {activeVector.bands.map((band, i) => (
                  <path key={i} d={band.path} fill={colors[i] ?? band.color} stroke="none" fillRule="evenodd" />
                ))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <Maximize2 className="size-8 text-white" />
              </div>
            </button>
            <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
              <DialogContent className="max-w-[95vw] border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-[95vw]">
                <DialogTitle className="sr-only">{label} vector preview</DialogTitle>
                <div className="mx-auto aspect-square max-h-[92vh] w-auto overflow-hidden rounded-lg bg-white">
                  <svg
                    viewBox={`0 0 ${activeVector.width} ${activeVector.height}`}
                    className="size-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {activeVector.bands.map((band, i) => (
                      <path key={i} d={band.path} fill={colors[i] ?? band.color} stroke="none" fillRule="evenodd" />
                    ))}
                  </svg>
                </div>
              </DialogContent>
            </Dialog>
            <div className="space-y-2">
              {activeVector.bands.map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[i] ?? "#000000"}
                    onChange={(e) =>
                      setColors((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    className="size-8 shrink-0 cursor-pointer rounded border border-border/60 bg-transparent p-0"
                  />
                  <Label className="text-xs text-muted-foreground">
                    {BAND_LABELS[i] ?? `Layer ${i + 1}`}
                  </Label>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={handleSaveColors} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save Colors
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="size-4" />
                  Download SVG
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setColors(activeVector.bands.map((b) => b.color))}
                  title="Reset to the last saved colors"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
