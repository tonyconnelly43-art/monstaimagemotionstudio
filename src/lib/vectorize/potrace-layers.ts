import "server-only";
import { Potrace } from "potrace";
import Jimp from "jimp";

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

// Luminance-threshold bands for internal shading detail (when the artwork
// actually has any) — from lighter to darker, drawn on top of the silhouette
// base fill. The bottom "base fill" band is NOT one of these: it's built
// separately below via flood fill, because pure line art with no internal
// shading at all (a very common Procreate-style result) has no pixel-value
// difference between "inside the outline" and "outside it" — luminance
// thresholding alone can never fill that in, no matter where the threshold
// is set. Verified empirically: a synthetic pure-outline test image (solid
// black ring, white on both sides) traced to nothing at every threshold;
// flood-filling from the image border to find what's NOT reachable (i.e.
// enclosed by the outline) correctly recovered the interior as solid fill.
const SHADING_THRESHOLDS = [195, 140, 80];
const BAND_COLORS = ["#f4e9d8", "#e2b04a", "#8a5a2b", "#241a12"];
const INK_LUMINANCE_THRESHOLD = 100;

// The silhouette mask is a clean binary image we generate ourselves, so a
// light speckle filter is enough to smooth its boundary. The shading bands
// trace the *original* artwork's airbrush-style grain texture, though, which
// is a different beast: verified empirically that turdSize=30 (fine for
// linework) still let ~100 grain-speckle subpaths through in a shaded region,
// turning smooth shadows into a scattered mess of tiny shapes once
// vectorized. turdSize=220 collapsed that same test down to ~4 real subpaths.
const SILHOUETTE_CLEANUP = { turdSize: 30, optTolerance: 0.5, alphaMax: 1.2 };
const SHADING_CLEANUP = { turdSize: 220, optTolerance: 0.8, alphaMax: 1.3 };

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Builds a solid silhouette mask: everything reachable from the image's
 * border by walking only non-ink, non-transparent pixels is "exterior"
 * (real background); everything else — the ink strokes themselves, plus any
 * pocket fully enclosed by them, regardless of its own shading — is treated
 * as solid shape. This is what actually guarantees the base fill layer has
 * no gaps, independent of how much (if any) internal shading the source
 * artwork has.
 */
async function buildSilhouetteBuffer(image: Jimp): Promise<Buffer> {
  const { width, height, data } = image.bitmap;
  const isInk = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < 128) continue;
      if (luminance(data[idx], data[idx + 1], data[idx + 2]) < INK_LUMINANCE_THRESHOLD) {
        isInk[y * width + x] = 1;
      }
    }
  }

  const exterior = new Uint8Array(width * height);
  const stack: number[] = [];
  const seedIfBackground = (x: number, y: number) => {
    const i = y * width + x;
    if (!isInk[i] && !exterior[i]) {
      exterior[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    seedIfBackground(x, 0);
    seedIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seedIfBackground(0, y);
    seedIfBackground(width - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = Math.floor(i / width);
    if (x > 0) seedIfBackground(x - 1, y);
    if (x < width - 1) seedIfBackground(x + 1, y);
    if (y > 0) seedIfBackground(x, y - 1);
    if (y < height - 1) seedIfBackground(x, y + 1);
  }

  const silhouette = new Jimp(width, height, 0xffffffff);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isShape = isInk[i] === 1 || exterior[i] === 0;
      if (isShape) silhouette.setPixelColor(0x000000ff, x, y);
    }
  }
  return silhouette.getBufferAsync(Jimp.MIME_PNG);
}

function loadPotrace(
  buffer: Buffer,
  threshold: number,
  cleanup: { turdSize: number; optTolerance: number; alphaMax: number },
): Promise<Potrace> {
  return new Promise((resolve, reject) => {
    const instance = new Potrace({ blackOnWhite: true, threshold, ...cleanup });
    instance.loadImage(buffer, (err) => {
      if (err) reject(err);
      else resolve(instance);
    });
  });
}

function extractPathD(instance: Potrace, color: string): string {
  const tag = instance.getPathTag(color);
  return /\sd="([^"]*)"/.exec(tag)?.[1] ?? "";
}

/** Traces a black-and-white line-art image into layered, independently recolorable vector bands. */
export async function vectorizeToLayers(buffer: Buffer): Promise<VectorLayers> {
  const image = await Jimp.read(buffer);
  const { width, height } = image.bitmap;

  const bands: VectorBand[] = [];

  const silhouetteBuffer = await buildSilhouetteBuffer(image);
  const silhouetteInstance = await loadPotrace(silhouetteBuffer, 128, SILHOUETTE_CLEANUP);
  const silhouettePath = extractPathD(silhouetteInstance, BAND_COLORS[0]);
  if (silhouettePath) {
    bands.push({ threshold: 0, path: silhouettePath, color: BAND_COLORS[0] });
  }

  const shadingInstance = await loadPotrace(buffer, SHADING_THRESHOLDS[0], SHADING_CLEANUP);
  SHADING_THRESHOLDS.forEach((threshold, i) => {
    shadingInstance.setParameters({ threshold });
    const path = extractPathD(shadingInstance, BAND_COLORS[i + 1]);
    if (path) bands.push({ threshold, path, color: BAND_COLORS[i + 1] });
  });

  return { width, height, bands };
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
