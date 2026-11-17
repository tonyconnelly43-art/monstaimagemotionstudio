"""Builds the final-logo plate from the supplied files (icon, mascot, wordmark) at 1080p,
matching the layout of the video's last shot. Writes build/final_layers.npz:
background (navy + floor), logo layer RGBA (with reflection), used by compose.py."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
root = Path(__file__).resolve().parent.parent
S = 1.5                                    # 720p layout -> 1080p
def trimmed(n):
    im = Image.open(root / f'assets/{n}.webp').convert('RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
def keyline(im, px, colour=(255, 255, 255)):
    """white sticker keyline behind the artwork (artwork itself untouched)"""
    a = im.getchannel('A').filter(ImageFilter.MaxFilter(px * 2 + 1)).filter(ImageFilter.GaussianBlur(0.8))
    pad = Image.new('RGBA', im.size, colour + (0,)); pad.putalpha(a)
    pad.alpha_composite(im); return pad
def place(canvas, im, cx=None, cy=None, h=None, box=None):
    if box:
        x0, y0, x1, y1 = box; im = im.resize((int(x1 - x0), int(y1 - y0)), Image.LANCZOS); canvas.alpha_composite(im, (int(x0), int(y0))); return
    w = int(im.width * h / im.height); im = im.resize((w, int(h)), Image.LANCZOS)
    canvas.alpha_composite(im, (int(cx - w / 2), int(cy - h / 2)))
W, H = 1920, 1080
logo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
icon, mascot, word = trimmed('icon'), trimmed('mascot'), trimmed('wordmark')
mascot_big = mascot.resize((int(mascot.width * 0.5), int(mascot.height * 0.5)), Image.LANCZOS)
mascot_k = keyline(mascot_big, 4)
place(logo, word, box=(691 * S, 271 * S, 1193 * S, 378 * S))
place(logo, icon, cx=302 * S, cy=336 * S, h=390 * S)
place(logo, mascot_k, cx=552 * S, cy=376 * S, h=482 * S)
logo.save(root / 'build/final_logo.png')
print('logo layer saved')
