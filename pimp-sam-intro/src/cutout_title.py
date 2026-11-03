"""Removes the black background around the title card (only outside the badge
silhouette, so the badge's black interior stays) -> assets/title-card-cutout.png"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter
from scipy import ndimage
import numpy as np
root = Path(__file__).resolve().parent.parent
im = Image.open(root / 'assets/title-card-v2.webp').convert('RGB')
a = np.array(im).astype(np.float32)
dark = a.max(2) < 38
# the gold frame has small gaps by the crown: seal them, then fill the badge shape
solid = ndimage.binary_closing(~dark, structure=np.ones((3, 3)), iterations=12)
solid = ndimage.binary_fill_holes(solid) | ~dark
bg = ~solid
alpha = np.where(bg, 0, 255).astype(np.uint8)
# soft edge: feather 1.5px, and let near-black fringe pixels fade with their brightness
alpha = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2)))
fringe = (alpha > 0) & (alpha < 255)
alpha[fringe] = np.minimum(alpha[fringe], np.clip(a.max(2)[fringe] * 4, 0, 255)).astype(np.uint8)
out = np.dstack([a.astype(np.uint8), alpha])
ys, xs = np.where(alpha > 10)
Image.fromarray(out).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).save(root / 'assets/title-card-cutout.png')
print('saved', xs.max() - xs.min() + 1, 'x', ys.max() - ys.min() + 1)
