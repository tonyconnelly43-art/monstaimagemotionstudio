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

// Evenly spread thresholds from lightest (broadest silhouette, drawn first/underneath)
// to darkest (just the core ink lines, drawn last/on top). Each threshold's traced
// region is a strict subset of the lighter one before it, so layering them in this
// order produces clean, non-overlapping-looking color bands out of plain B&W line art.
const THRESHOLDS = [210, 165, 120, 70];
const DEFAULT_BAND_COLORS = ["#f4e9d8", "#e2b04a", "#8a5a2b", "#241a12"];

function loadPotrace(buffer: Buffer): Promise<Potrace> {
  return new Promise((resolve, reject) => {
    const instance = new Potrace({ blackOnWhite: true, threshold: THRESHOLDS[0] });
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
