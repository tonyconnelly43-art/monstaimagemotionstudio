"""Builds the clean van cutouts used in the reel.

* The 1500px mockups share one van silhouette, but it includes the mockup's baked
  floor shadow. The clean True North cutout is the same van render, so its
  outline (scaled 0.6125, offset 110,1; IoU 0.998 against the body) is used to cut
  away everything that isn't van.
* Kraken and Bug Bounty only exist as layout boards. Every board uses the same
  mockup in the same spot (layout = 0.83 * cutout + (-1.47, 105.17), measured by
  template-matching the SVAC and On Par cutouts against their boards), so the
  top-left van is pulled out with that transform and the shared silhouette.
* The 2000px mockups (True North, Mammoth) only get their white edge fringe trimmed.

Reads originals from assets/img-orig/ and writes to assets/img/.
"""
from pathlib import Path
from PIL import Image, ImageFilter
from scipy import ndimage
import numpy as np, cv2

root = Path(__file__).resolve().parent.parent / 'assets'
orig, out = root / 'img-orig', root / 'img'
S, OX, OY = 0.83, -1.47, 105.17

ref = np.array(Image.open(orig / 'van-svac.webp').convert('RGBA')).astype(np.float32)
sil = ndimage.binary_fill_holes(ref[:, :, 3] >= 235)
tn = np.array(Image.open(orig / 'van-truenorth.webp').convert('RGBA'))[:, :, 3]
tn = ndimage.binary_fill_holes(tn >= 128).astype(np.float32)
tn = cv2.resize(tn, (round(2000 * 0.6125), round(1029 * 0.6125)), interpolation=cv2.INTER_AREA) > 0.5
van = np.zeros_like(sil)
th, tw = tn.shape
van[1:1 + th, 110:110 + tw] = tn[:sil.shape[0] - 1, :sil.shape[1] - 110]
sil &= van
# soft 1px edge from the mockup's own anti-aliasing, clipped to the silhouette
edge_alpha = np.where(sil, 255, 0).astype(np.float32)
edge_alpha = np.array(Image.fromarray(edge_alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)
edge_alpha = np.minimum(edge_alpha, np.where(sil, 255, 0))

def save(rgb, alpha, name):
    rgba = np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba).save(out / name, quality=95)
    print('wrote', name)

for src in sorted(orig.glob('van-*.webp')):
    a = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    if a.shape[1] == 1500:
        save(a[:, :, :3], edge_alpha, src.name)
    else:
        er = np.array(Image.fromarray(a[:, :, 3].astype(np.uint8)).filter(ImageFilter.MinFilter(5))).astype(np.float32)
        rgb = a[:, :, :3].copy()
        rim = (er > 0) & (er < 230)
        rgb[rim] *= 0.45
        save(rgb, er, src.name)

h, w = sil.shape
M = np.array([[S, 0, OX], [0, S, OY]], np.float32)  # cutout -> layout
for board, name in [('layout-kraken.jpg', 'van-kraken.webp'), ('layout-bugbounty.jpg', 'van-bugbounty.webp')]:
    L = cv2.imread(str(root / 'img' / board))[:, :, ::-1].astype(np.float32)
    rgb = cv2.warpAffine(L, M, (w, h), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP)
    save(rgb, edge_alpha, name)
