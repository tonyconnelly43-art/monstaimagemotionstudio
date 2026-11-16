"""Cartoon sound design for monsta-at-work (timings match the 15.08s clip) -> assets/sfx.wav"""
import wave, numpy as np
from pathlib import Path
SR, DUR = 48000, 15.1
N = int(SR * DUR); out = np.zeros(N); rng = np.random.default_rng(11)
def tt(d): return np.arange(int(d * SR)) / SR
def add(sig, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig)); out[i:j] += sig[:j - i] * g
def lp(x, k):
    y = np.empty_like(x); a = 0.0
    for i, v in enumerate(x): a += k * (v - a); y[i] = a
    return y
def keyclick(pitch=1.0):
    d = tt(0.05)
    return (rng.standard_normal(len(d)) * np.exp(-d * 300) * 0.6 + np.sin(2 * np.pi * 3200 * pitch * d) * np.exp(-d * 250) * 0.25
            + np.sin(2 * np.pi * 420 * pitch * d) * np.exp(-d * 90) * 0.35)
def mouseclick():
    d = tt(0.04)
    return rng.standard_normal(len(d)) * np.exp(-d * 600) * 0.7 + np.sin(2 * np.pi * 2600 * d) * np.exp(-d * 400) * 0.4
def sweep(d, f0, f1, k0, k1, shape='rise'):
    x = rng.standard_normal(int(d * SR)); y = np.zeros_like(x); a = 0.0; n = len(x)
    for i in range(n):
        f = i / n; k = k0 + (k1 - k0) * f; a += k * (x[i] - a); y[i] = a
    e = np.linspace(0, 1, n)
    env = e ** 2 if shape == 'rise' else (np.sin(np.pi * e) ** 1.5 if shape == 'swell' else (1 - e) ** 2)
    return y * env * 3
def chime(at, notes, gap, g=0.3):
    for i, f in enumerate(notes):
        d = tt(1.2)
        s = (np.sin(2 * np.pi * f * d) + 0.4 * np.sin(2 * np.pi * f * 2 * d) + 0.15 * np.sin(2 * np.pi * f * 3.01 * d)) * np.exp(-d * 4)
        add(s * np.clip(d / 0.003, 0, 1), at + i * gap, g)

# --- working: typing clatter, head scratch, mouse clicks ---
t = 0.05
while t < 2.55:
    add(keyclick(0.85 + 0.3 * rng.random()), t, 0.5 + 0.3 * rng.random()); t += 0.055 + 0.07 * rng.random()
d = tt(0.6); scratch = lp(rng.standard_normal(len(d)), 0.35) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * d))) * np.sin(np.pi * d / 0.6)
add(scratch * 0.9, 2.0)
for c in (3.1, 3.55, 3.7, 4.2, 4.75, 4.9, 5.35):
    add(mouseclick(), c, 0.6)
t = 3.9
while t < 4.4: add(keyclick(1.1), t, 0.4); t += 0.06 + 0.05 * rng.random()
add(mouseclick(), 5.9, 1.0); add(np.sin(2 * np.pi * 180 * tt(0.15)) * np.exp(-tt(0.15) * 30) * 0.5, 5.9)
# --- logo complete: shimmer ---
chime(6.0, [1046.5, 1318.5, 1568.0, 2093.0], 0.07, 0.22)
d = tt(0.9); add(np.sin(2 * np.pi * (2400 + 800 * d) * d) * (rng.random(len(d)) < 0.02) * np.exp(-d * 2) * 0.6, 6.0)
# --- fist pump swish ---
add(sweep(0.28, 0, 0, 0.05, 0.3, 'swell'), 6.95, 0.6)
# --- portal: zap, crackle bed, riser ---
d = tt(0.5)
zap = np.sin(2 * np.pi * np.cumsum(1800 * np.exp(-d * 8) + 60) / SR) * np.exp(-d * 6) + rng.standard_normal(len(d)) * np.exp(-d * 10) * 0.6
add(zap * 0.8, 7.75)
d = tt(2.3)
crack = (rng.random(len(d)) < 0.012) * rng.standard_normal(len(d)) * 4
buzz = np.sign(np.sin(2 * np.pi * 110 * d)) * 0.12 * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * d))
add((lp(crack, 0.5) + lp(buzz, 0.2)) * np.clip(d / 0.1, 0, 1) * np.clip((2.3 - d) / 0.3, 0, 1) * 0.7, 7.8)
add(sweep(2.0, 0, 0, 0.01, 0.35, 'rise'), 7.85, 0.55)
# --- leap + warp through the screen + hyperspace ---
d = tt(0.35); add(np.sin(2 * np.pi * np.cumsum(220 + 500 * d / 0.35) / SR) * np.exp(-d * 4) * 0.35, 9.45)
add(sweep(0.4, 0, 0, 0.05, 0.4, 'swell'), 9.5, 0.7)
d = tt(0.7); warp = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-d * 4) + 80) / SR) * np.sin(np.pi * d / 0.7)
add(warp * 0.5, 9.8)
add(sweep(1.2, 0, 0, 0.35, 0.03, 'swell'), 9.85, 0.8)
# --- landing impact ---
d = tt(1.5); f = 38 + 90 * np.exp(-d * 14)
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-d * 3.2) * 1.1 + rng.standard_normal(len(d)) * np.exp(-d * 30) * 0.5, 10.98)
# --- logo text swoosh + sparkle, final ding ---
add(sweep(0.45, 0, 0, 0.04, 0.35, 'swell'), 11.35, 0.55)
chime(11.7, [1568.0, 2093.0], 0.09, 0.18)
chime(12.2, [2637.0], 0.0, 0.12)
out *= np.clip((DUR - np.arange(N) / SR) / 0.5, 0, 1)
out = out / np.abs(out).max() * 0.9
pcm = (np.stack([out, out], 1) * 32767).astype('<i2')
with wave.open(str(Path(__file__).resolve().parent.parent / 'assets/sfx.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('sfx written')
