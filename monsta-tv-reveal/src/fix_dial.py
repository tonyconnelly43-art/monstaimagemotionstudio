"""Repairs the channel dial on the TV photo: erases the garbled/duplicated numbers
(3, 3, 20, 12, 12, 11 ...) and paints a clean 2-13 channel ring in the same colour,
size and lighting. Reads assets/img/tv.webp, writes assets/img/tv-fixed.webp."""
import math
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

root = Path(__file__).resolve().parent.parent
src = np.array(Image.open(root / 'assets/img/tv.webp').convert('RGB'))
CX, CY = 1281.5, 246.0            # dial centre (photo px)
R_IN, R_OUT, R_NUM = 63, 96, 80   # erase band and numeral radius

# work at 4x on a crop around the dial
S = 4
x0, y0, x1, y1 = 1160, 125, 1404, 369
crop = cv2.resize(src[y0:y1, x0:x1], None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
h, w = crop.shape[:2]
yy, xx = np.mgrid[0:h, 0:w]
r = np.hypot(xx / S + x0 - CX, yy / S + y0 - CY)
band = (r > R_IN) & (r < R_OUT)
lum = crop.mean(2)
# numerals are the bright marks on the dark ring
local = cv2.GaussianBlur(lum.astype(np.float32), (0, 0), 18)
marks = band & (lum > np.maximum(local + 12, 55))
ink = crop[marks]
colour = np.percentile(ink, 92, axis=0)                        # numeral colour from the photo
marks = cv2.dilate(marks.astype(np.uint8), np.ones((15, 15), np.uint8)) & band.astype(np.uint8)
# fill the erased marks from the surrounding dark ring only (normalised blur of unmarked
# band pixels), so the ring keeps its original near-black colour instead of bronze bleed
keep = (band & (marks == 0)).astype(np.float32)
num = cv2.GaussianBlur(crop.astype(np.float32) * keep[..., None], (0, 0), 14)
den = cv2.GaussianBlur(keep, (0, 0), 14)[..., None] + 1e-4
fill = num / den * (1 + np.random.default_rng(2).normal(0, 0.06, (h, w)))[..., None]
clean = np.where(marks[..., None] > 0, fill, crop).clip(0, 255).astype(np.uint8)

# paint 2..13: 6 at the top, 30 degrees apart, clockwise (2 sits next to 13 at lower left)
layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
font = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 82)
dl, ds = ImageDraw.Draw(layer), ImageDraw.Draw(shadow)
for ch in range(2, 14):
    a = math.radians(-90 + (ch - 6) * 30)
    px, py = (CX + R_NUM * math.cos(a) - x0) * S, (CY + R_NUM * math.sin(a) - y0) * S
    txt = str(ch)
    kw = dict(font=font, anchor='mm')
    ds.text((px + 3, py + 4), txt, fill=(0, 0, 0, 170), **kw)
    dl.text((px, py), txt, fill=tuple(int(c * k) for c, k in zip(colour, (1.0, 0.95, 0.84))) + (255,), **kw)   # warm cream-gold
shadow = shadow.filter(ImageFilter.GaussianBlur(4))
layer = layer.filter(ImageFilter.GaussianBlur(1.1))            # match the photo's softness
# lighting: brighter toward the upper right like the original numerals
L = np.array(layer).astype(np.float32)
light = 0.82 + 0.2 * np.clip(((xx / S + x0 - CX) - (yy / S + y0 - CY)) / 140 + 0.5, 0, 1)
grain = 1 + np.random.default_rng(1).normal(0, 0.05, (h, w))
L[..., :3] *= (light * grain)[..., None]
L = np.clip(L, 0, 255)
out = Image.fromarray(clean).convert('RGBA')
out.alpha_composite(shadow)
out.alpha_composite(Image.fromarray(L.astype(np.uint8)))
patch = cv2.resize(np.array(out.convert('RGB')), (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
# only replace inside the band (feathered), so the knob and bezel stay original pixels
rr = np.hypot(np.mgrid[y0:y1, x0:x1][1] - CX, np.mgrid[y0:y1, x0:x1][0] - CY)
m = np.clip(np.minimum(rr - (R_IN - 1), (R_OUT + 1) - rr) / 2, 0, 1)[..., None]
fixed = src.copy()
fixed[y0:y1, x0:x1] = (patch * m + src[y0:y1, x0:x1] * (1 - m)).astype(np.uint8)
Image.fromarray(fixed).save(root / 'assets/img/tv-fixed.webp', quality=95)
print('numeral colour', colour.round(), '-> wrote tv-fixed.webp')
