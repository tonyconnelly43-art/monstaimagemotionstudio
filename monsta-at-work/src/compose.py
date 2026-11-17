"""Final 1080p video: the navy-recoloured clip upscaled, then at ~12.5s a shine-sweep
switch to a clean plate with the real logo files (build/final_logo.png): navy gradient
and floor sampled from the clip, floor reflection of the real logo, drifting particles,
and the clip's slow camera pull-back. Writes build/video_final.mp4 (no audio)."""
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
root = Path(__file__).resolve().parent.parent
W, H, FPS = 1920, 1080, 24
SW0, SW1 = 12.45, 12.75                    # crossfade window (shine sweep 12.45-13.15)
ZC = (983, 564)                            # pull-back centre (1080p), measured from the clip
FLOOR = 622 * 1.5                          # mascot feet / floor line

# --- clean background plate from the clip's own navy (rows/cols that never hold the logo)
ref = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', '13.5', '-i', str(root / 'build/video_navy.mp4'), '-frames:v', '1',
                      '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
ref = np.frombuffer(ref, np.uint8).reshape(H, W, 3).astype(np.float32)
import scipy.ndimage as nd
right = nd.median_filter(ref[:, 1820:1910], size=(1, 9, 1)).mean(1)                     # per-row colour at the right edge
rowc = nd.gaussian_filter1d(right, 12, axis=0)
top = nd.gaussian_filter1d(nd.median_filter(ref[20:120].mean(0), size=(25, 1)), 40, axis=0)  # per-column brightness above the logo
colgain = (top.mean(1) / top.mean(1)[1865])[None, :, None]
plate = np.clip(rowc[:, None, :] * colgain, 0, 255)

logo = Image.open(root / 'build/final_logo.png')
L = np.array(logo).astype(np.float32)
# reflection: flipped about the floor line, faded and softened
refl = logo.transpose(Image.FLIP_TOP_BOTTOM)
off = int(2 * FLOOR - H)
R = np.zeros_like(L); src = np.array(refl.filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
if off >= 0: R[off:] = src[:H - off]
else: R[:H + off] = src[-off:]
yy = np.arange(H)[:, None]
R[..., 3] *= np.clip(1 - (yy - FLOOR) / 160, 0, 1) * (yy > FLOOR) * 0.28

rng = np.random.default_rng(4)
PART = [(rng.random() * W, rng.random() * H, 1.5 + rng.random() * 4, 6 + rng.random() * 18, rng.random() * 6.28, 0.25 + rng.random() * 0.5) for _ in range(70)]

def comp(img, A, out):
    a = A[..., 3:4] / 255; out *= (1 - a); out += A[..., :3] * a
def scaled(A, z):
    if abs(z - 1) < 1e-4: return A
    im = Image.fromarray(A.astype(np.uint8), 'RGBA')
    w, h = int(W * z), int(H * z); im = im.resize((w, h), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.alpha_composite(im, (int(ZC[0] - ZC[0] * z), int(ZC[1] - ZC[1] * z)))
    return np.array(c).astype(np.float32)
def final_frame(t):
    out = plate.copy()
    z = 1 - 0.024 * (t - 13.5)
    comp(out, scaled(R, z), out)
    for x, y, r, v, ph, a in PART:                       # slow drifting bokeh
        px, py = x + 8 * np.sin(t * 0.6 + ph), (y - t * v) % H
        x0, x1, y0, y1 = int(max(0, px - r * 3)), int(min(W, px + r * 3)), int(max(0, py - r * 3)), int(min(H, py + r * 3))
        if x1 <= x0 or y1 <= y0: continue
        gy, gx = np.mgrid[y0:y1, x0:x1]; d = np.exp(-((gx - px) ** 2 + (gy - py) ** 2) / (2 * r * r))[..., None] * a * (0.6 + 0.4 * np.sin(t * 2 + ph))
        out[y0:y1, x0:x1] += d * np.array([120, 170, 255], np.float32)
    Lz = scaled(L, z)
    comp(out, Lz, out)
    k = (t - SW0) / 0.7                                   # shine sweep, masked to the logo
    if 0 < k < 1:
        xx = np.arange(W)[None, :]; band = np.exp(-((xx + (yy - H / 2) * 0.35 - (-300 + k * (W + 600))) / 90.0) ** 2)
        out += (band * (Lz[..., 3] / 255) * 150 * np.sin(k * np.pi))[..., None]
    return out

dec = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', str(root / 'build/video_navy.mp4'), '-vf', f'scale={W}:{H}:flags=lanczos',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', str(root / 'build/video_final.mp4')], stdin=subprocess.PIPE)
n = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    t = n / FPS; n += 1
    if t < SW0: enc.stdin.write(buf); continue
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
    m = min(1, (t - SW0) / (SW1 - SW0)); m = m * m * (3 - 2 * m)
    out = f * (1 - m) + final_frame(t) * m
    fl = max(0, 1 - abs(t - 12.6) / 0.12) * 0.15          # soft flash at the switch
    out = out + (255 - out) * fl
    enc.stdin.write(out.clip(0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait(); dec.wait()
print('frames', n)
