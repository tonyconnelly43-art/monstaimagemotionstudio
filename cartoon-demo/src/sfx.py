"""Synthesizes the cartoon sound effects track (assets/audio/sfx.wav)."""
import wave, numpy as np
from pathlib import Path
SR, DUR = 48000, 8.6
out = np.zeros(int(DUR * SR)); rng = np.random.default_rng(2)
def add(sig, t, g=1.0):
    i = int(t * SR); j = min(len(out), i + len(sig)); out[i:j] += sig[:j - i] * g
def tt(d): return np.arange(int(d * SR)) / SR
def whoosh(d):
    x = rng.standard_normal(int(d * SR)); y = np.zeros_like(x); a = 0
    for i in range(len(x)): k = 0.02 + 0.3 * i / len(x); a += k * (x[i] - a); y[i] = a
    return y * (np.arange(len(x)) / len(x)) ** 2 * 2.5
def thump():
    t = tt(0.5); f = 45 + 90 * np.exp(-t * 18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + rng.standard_normal(len(t)) * np.exp(-t * 40) * 0.3
def boing(d=0.45):
    t = tt(d); f = 180 + 520 * (t / d) ** 0.6; vib = 1 + 0.06 * np.sin(2 * np.pi * 18 * t)
    return np.sin(2 * np.pi * np.cumsum(f * vib) / SR) * np.exp(-t * 3) * 0.6
def pop():
    t = tt(0.08); return np.sin(2 * np.pi * (900 - 4000 * t) * t) * np.exp(-t * 60) * 0.5
add(whoosh(0.5), 0.0, 0.5); add(thump(), 0.5, 1.0)
add(boing(), 5.05, 0.8); add(thump(), 5.75, 0.9)
add(pop(), 6.6, 0.7); add(pop(), 6.85, 0.6)
out = out / np.abs(out).max() * 0.9
pcm = (np.stack([out, out], 1) * 32767).astype('<i2')
with wave.open(str(Path(__file__).resolve().parent.parent / 'assets/audio/sfx.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
