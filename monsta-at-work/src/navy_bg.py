"""Recolours the charcoal-grey background of the ending (inside the screen, from ~10s) to
the brand navy, keeping the logo, mascot, particles and floor reflection.

Background = low-saturation, mid-dark grey pixels. Their brightness is kept (so the
vignette, bokeh and reflection survive) and mapped onto navy: grey 39 (edges) ->
about (3,15,33), grey 57 (centre) -> about (4,22,48), matching the logo banner's navy.
Saturated colours (reds), bright whites (text, highlights) and the darkest outlines are
left as they are. Writes build/video_navy.mp4 (no audio)."""
import subprocess, sys
from pathlib import Path
import numpy as np
root = Path(__file__).resolve().parent.parent
src = root / 'assets/monsta-at-work-original.mp4'
W, H, FPS = 1280, 720, 24
T0, T1 = 9.95, 10.15                     # effect fades in across the dive into the screen
NAVY = np.array([0.07, 0.39, 0.84], np.float32)
dec = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', str(src), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', str(root / 'build/video_navy.mp4')], stdin=subprocess.PIPE)
n = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    t = n / FPS; n += 1
    k = min(1.0, max(0.0, (t - T0) / (T1 - T0)))
    if k <= 0: enc.stdin.write(buf); continue
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
    mx, mn = f.max(2), f.min(2)
    lum = f.mean(2)
    sat = (mx - mn) / (mx + 1e-3)
    w = np.clip((0.30 - sat) / 0.12, 0, 1) * np.clip((170 - lum) / 30, 0, 1) * np.clip((lum - 12) / 10, 0, 1) * k
    navy = lum[..., None] * NAVY
    out = f * (1 - w[..., None]) + navy * w[..., None]
    enc.stdin.write(out.clip(0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait(); dec.wait()
print('frames', n)
