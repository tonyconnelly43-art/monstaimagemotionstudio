"""Synthesized sound design for the TV reveal -> assets/audio/sfx.wav (timings match src/tv.html)."""
import wave, numpy as np
from pathlib import Path
SR, DUR = 48000, 12.5
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
out = np.zeros(N)
def seg(a, b): return (t >= a) & (t < b)
def env(a, b, att=0.02, rel=0.05):
    e = np.clip((t - a) / att, 0, 1) * np.clip((b - t) / rel, 0, 1); return e
def lp(x, k):            # one-pole low-pass
    y = np.empty_like(x); a = 0.0
    for i, v in enumerate(x): a += k * (v - a); y[i] = a
    return y
def add(sig, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig)); out[i:j] += sig[:j - i] * g
def tt(d): return np.arange(int(d * SR)) / SR

white = rng.standard_normal(N)
hiss = white - lp(white, 0.25)                         # bright static hiss
# static level over time: on at power-up, changes per station, flutters during VHS, gone at lock
lvl = np.zeros(N)
lvl += 0.32 * env(0.62, 2.0, 0.03, 0.02)
for a, b, g in [(2.0, 2.4, 0.30), (2.47, 2.95, 0.22), (3.02, 3.5, 0.12), (3.57, 4.0, 0.30)]: lvl += g * env(a, b, 0.01, 0.01)
vhs = env(4.0, 7.0, 0.02, 0.25) * (0.16 + 0.08 * np.sin(2 * np.pi * 7 * t)) * np.clip((7.0 - t) / 1.0 + 0.2, 0, 1)
lvl += vhs
out += hiss * lvl * 0.55
# station 2: rolling picture -> pulsing buzz; station 3: breakup crackle
out += np.sign(np.sin(2 * np.pi * 59.94 * t)) * 0.04 * env(2.47, 2.95) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t))
crack = (rng.random(N) < 0.004) * rng.standard_normal(N) * 3
out += lp(crack, 0.4) * env(3.02, 3.5) * 0.5
# electrical hum while the set is on
hum = 0.5 * np.sin(2 * np.pi * 60 * t) + 0.3 * np.sin(2 * np.pi * 120 * t) + 0.12 * np.sin(2 * np.pi * 180 * t)
out += hum * 0.035 * env(0.62, 9.3, 0.3, 0.4)
# VHS tape warble
wob = np.sin(2 * np.pi * (330 + 18 * np.sin(2 * np.pi * 5.5 * t)) * t)
out += wob * 0.025 * env(4.0, 6.9, 0.2, 0.4)
# CRT power-on: relay clunk + degauss buzz + rising whine
d = tt(0.7)
add(np.sin(2 * np.pi * 70 * d) * np.exp(-d * 18) * 0.8 + rng.standard_normal(len(d)) * np.exp(-d * 60) * 0.4, 0.6)
add(np.sign(np.sin(2 * np.pi * 60 * d)) * np.exp(-d * 4) * 0.15, 0.62)
add(np.sin(2 * np.pi * np.cumsum(5000 + 3000 * d) / SR) * np.exp(-d * 3) * 0.02, 0.65)
# channel dial clicks (detent click + body thunk)
for c in (2.4, 2.95, 3.5):
    d = tt(0.12)
    click = rng.standard_normal(len(d)) * np.exp(-d * 400) * 0.9 + np.sin(2 * np.pi * 2400 * d) * np.exp(-d * 200) * 0.4
    add(click + np.sin(2 * np.pi * 180 * d) * np.exp(-d * 45) * 0.5, c)
    add(rng.standard_normal(len(d)) * np.exp(-d * 500) * 0.3, c + 0.035)
# signal lock: soft two-note chime + low thump
d = tt(1.6)
chime = (np.sin(2 * np.pi * 659.3 * d) + 0.7 * np.sin(2 * np.pi * 987.8 * d) + 0.25 * np.sin(2 * np.pi * 1318.5 * d)) * np.exp(-d * 3.2)
add(chime * 0.22 * np.clip(d / 0.005, 0, 1), 7.0)
add(np.sin(2 * np.pi * 55 * d) * np.exp(-d * 6) * 0.35, 7.0)
# push through the screen: airy rising whoosh releasing at the glass
d = tt(1.6); x = rng.standard_normal(len(d)); y = np.zeros_like(x); a = 0.0
for i in range(len(x)):
    k = 0.01 + 0.18 * (i / len(x)) ** 1.5; a += k * (x[i] - a); y[i] = a
add(y * (np.sin(np.pi * np.clip(d / 1.6, 0, 1)) ** 1.5) * 1.6, 8.1)
# final sting: warm pad chord + soft sub, settles under the tagline
d = tt(3.4)
pad = sum(g * np.sin(2 * np.pi * f * d + p) for f, g, p in [(220, 1, 0), (277.2, .7, 1), (329.6, .7, 2), (440, .45, 3), (554.4, .25, 4)])
pad *= np.clip(d / 0.35, 0, 1) * np.exp(-d * 0.55) * (1 + 0.04 * np.sin(2 * np.pi * 4 * d))
add(pad * 0.07, 9.4)
add(np.sin(2 * np.pi * 55 * d) * np.exp(-d * 2.5) * np.clip(d / 0.05, 0, 1) * 0.25, 9.45)
out *= np.clip((DUR - t) / 0.6, 0, 1)
out = out / np.abs(out).max() * 0.85
pcm = (np.stack([out, out], 1) * 32767).astype('<i2')
with wave.open(str(Path(__file__).resolve().parent.parent / 'assets/audio/sfx.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('sfx written')
