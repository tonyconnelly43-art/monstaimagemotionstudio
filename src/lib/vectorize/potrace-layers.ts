import "server-only";
import { Potrace } from "potrace";

export interface VectorBand {
  threshold: number;
  path: string;
  color: string;
}

export interface VectorLayers {
  width: number;
  height: number;
  bands: VectorBand[];
}

// Thresholds from lightest (broadest silhouette, drawn first/underneath) to
// darkest (just the core ink lines, drawn last/on top). Each threshold's traced
// region is a strict subset of the lighter one before it, so layering them in
// this order produces clean, non-overlapping-looking color bands out of plain
// B&W line art.
//
// The first threshold is set close to 255 on purpose: light shading (skin
// tone, subtle highlights inside bold lettering) commonly sits at a luminance
// well above a "middle" threshold like 210, so a lighter band would treat it
// as pure background and trace it as nothing at all — leaving a gap with no
// fill in the final SVG. Verified empirically: a threshold of 210 left a
// light-shaded test region completely untraced (transparent), while 250
// correctly captured it as the base layer.
const THRESHOLDS = [250, 195, 140, 80];
const DEFAULT_BAND_COLORS = ["#f4e9d8", "#e2b04a", "#8a5a2b", "#241a12"];

// Hand-drawn/Procreate-style artwork carries a lot of tiny brush-texture flecks
// that potrace would otherwise trace as their own little speckle paths (the
// "messy linework" look). turdSize suppresses speckles up to this pixel area;
// optTolerance/alphaMax smooth the remaining real curves instead of hugging
// every jagged pixel edge. Verified empirically against a synthetic speckled
// test image: default settings kept ~200 speckle subpaths, these settings
// collapsed it down to just the real shape's outline.
const CLEANUP_OPTIONS = { turdSize: 30, optTolerance: 0.5, alphaMax: 1.2 };

function loadPotrace(buffer: Buffer): Promise<Potrace> {
  return new Promise((resolve, reject) => {
    const instance = new Potrace({ blackOnWhite: true, threshold: THRESHOLDS[0], ...CLEANUP_OPTIONS });
    instance.loadImage(buffer, (err) => {
      if (err) reject(err);
      else resolve(instance);
    });
  });
}

/** Traces a black-and-white line-art image into layered, independently recolorable vector bands. */
export async function vectorizeToLayers(buffer: Buffer): Promise<VectorLayers> {
  const instance = await loadPotrace(buffer);
  const luminance = (instance as unknown as { _luminanceData: { width: number; height: number } })._luminanceData;

  const bands: VectorBand[] = THRESHOLDS.map((threshold, i) => {
    instance.setParameters({ threshold });
    const tag = instance.getPathTag(DEFAULT_BAND_COLORS[i]);
    const d = /\sd="([^"]*)"/.exec(tag)?.[1] ?? "";
    return { threshold, path: d, color: DEFAULT_BAND_COLORS[i] };
  }).filter((band) => band.path.length > 0);

  return { width: luminance.width, height: luminance.height, bands };
}

/** Composes the stored band data (with whatever colors the user has picked) back into a full SVG string. */
export function renderVectorSVG(vector: VectorLayers): string {
  const paths = vector.bands
    .map(
      (band, i) =>
        `<path data-band="${i}" d="${band.path}" fill="${band.color}" stroke="none" fill-rule="evenodd"/>`,
    )
    .join("\n\t");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${vector.width}" height="${vector.height}" ` +
    `viewBox="0 0 ${vector.width} ${vector.height}" version="1.1">\n\t${paths}\n</svg>`
  );
}
