"""Turns the van mockups' baked white-background haze into a dark shadow.

Reads the original cutouts from assets/img-orig/ and writes cleaned copies to assets/img/.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

root = Path(__file__).resolve().parent.parent / 'assets'
for src in sorted((root / 'img-orig').glob('van-*.webp')):
    im = Image.open(src).convert('RGBA')
    a = np.array(im).astype(float)
    al, lum = a[:, :, 3], a[:, :, :3].mean(2)
    if im.width == 1500:
        # light semi-transparent shadow haze -> black shadow
        yy = np.arange(a.shape[0])[:, None] * np.ones((1, a.shape[1]))
        haze = (al < 120) | ((al < 240) & (yy > 520) & (lum > 100))
        a[haze, :3] = 0
        a[haze, 3] = np.clip(al[haze] * 1.4, 0, 200)
    else:
        # white fringe on the cutout edge -> erode 2px and darken the remaining edge
        er = np.array(Image.fromarray(al.astype(np.uint8)).filter(ImageFilter.MinFilter(5))).astype(float)
        a[:, :, 3] = er
        edge = (er > 0) & (er < 230)
        a[edge, :3] *= 0.45
    Image.fromarray(a.astype(np.uint8)).save(root / 'img' / src.name, quality=95)
    print('cleaned', src.name)
