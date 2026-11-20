"""Synthesized music bed + sound effects for client revision 1 (STYLE=4) -> assets/audio/bed-rev1.wav, assets/audio/sfx-rev1.wav.
Timings match src/tests.html: products at 6.3 / 15.3 / 23.7s, checks at 32.2 / 33.95 / 35.7 / 38.2s, badge 39.7s, end card 41.3s."""
import wave, numpy as np
from pathlib import Path
SR, DUR = 48000, 50.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(11)
root = Path(__file__).resolve().parent.parent

def tt(d): return np.arange(int(d * SR)) / SR
def add(buf, sig, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig)); buf[i:j] += sig[:j - i] * g
def band(x, lo, hi):                                   # FFT band-pass
    f = np.fft.rfftfreq(len(x), 1 / SR); X = np.fft.rfft(x); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def saw(freq, d, nh=10, roll=1.6):                     # soft band-limited saw
    x = tt(d); return sum(np.sin(2 * np.pi * freq * k * x) / k ** roll for k in range(1, nh + 1))
def hz(midi): return 440 * 2 ** ((midi - 69) / 12)

# ---------------- music bed: 100 BPM, dark minor, builds through the products, swells at the end card ----------------
bed = np.zeros(N)
BEAT = 0.6; BAR = BEAT * 4
chords = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]]   # Am  F  G  Em
start, end_hit = 0.4, 41.3
bar = 0
b0 = start
while b0 < 48.0:
    ch = chords[bar % 4] if b0 < end_hit - 0.1 else [45, 52, 57, 60, 64]
    d = BAR + 0.6 if b0 < end_hit - 0.1 else DUR - b0
    x = tt(d); env = np.clip(x / 0.35, 0, 1) * np.clip((d - x) / 0.5, 0, 1)
    pad = sum(saw(hz(m), d, nh=6, roll=1.9) * (1 + 0.003 * np.sin(2 * np.pi * 0.3 * x)) for m in ch)
    add(bed, pad * env * 0.05, b0)
    add(bed, np.sin(2 * np.pi * hz(ch[0] - 12) * x) * env * 0.16, b0)                 # sub bass
    b0 += BAR if b0 < end_hit - 0.1 else 99; bar += 1
    if b0 > end_hit - 0.1 and b0 < end_hit + BAR: b0 = end_hit                       # land the final chord on the end card
# pulse: soft kick on every beat from the VFD on; offbeat hats from the PLC on; drops out at the end card
for k in range(int((end_hit - 6.3) / BEAT)):
    at = 6.3 + k * BEAT; x = tt(0.35)
    kick = np.sin(2 * np.pi * (50 + 70 * np.exp(-x * 30)) * x) * np.exp(-x * 9)
    add(bed, kick, at, 0.32 if at > 15.3 else 0.22)
    if at > 15.3:
        h = band(rng.standard_normal(int(0.06 * SR)), 6000, 14000) * np.exp(-tt(0.06) * 70)
        add(bed, h, at + BEAT / 2, 0.10)
# arpeggio sparkle over the warranty list
for k in range(int((41.0 - 31.4) / (BEAT / 2))):
    at = 31.4 + k * BEAT / 2; m = [69, 72, 76, 79][k % 4]; x = tt(0.25)
    add(bed, np.sin(2 * np.pi * hz(m) * x) * np.exp(-x * 12), at, 0.035)
bed *= np.clip(t / 1.0, 0, 1) * np.clip((DUR - t) / 2.5, 0, 1)

# ---------------- sound effects ----------------
fx = np.zeros(N)
def whoosh(at, d=1.0, lo=300, hi=5000, g=0.5, rise=True):
    x = tt(d); n = band(rng.standard_normal(len(x)), lo, hi)
    e = (x / d) ** 2 * np.clip((d - x) / 0.08, 0, 1) if rise else np.exp(-x * 5 / d)
    add(fx, n * e, at, g)
def boom(at, g=0.7, f=45):
    x = tt(1.8); add(fx, np.sin(2 * np.pi * (f + 40 * np.exp(-x * 8)) * x) * np.exp(-x * 2.2), at, g)
def zap(at, g=0.12):                                   # scan-line sweep
    x = tt(1.2); add(fx, np.sin(2 * np.pi * np.cumsum(400 + 2600 * (x / 1.2)) / SR) * np.exp(-x * 2.5) * np.clip(x / 0.05, 0, 1), at, g)
def tick(at, g=0.35):                                  # checkmark
    x = tt(0.4)
    s = (np.sin(2 * np.pi * 1320 * x) * np.exp(-x * 18) + 0.6 * np.sin(2 * np.pi * 1980 * x) * np.exp(-x * 22) * (x > 0.06))
    add(fx, s, at, g)
def click(at, g=0.4):
    x = tt(0.08); add(fx, rng.standard_normal(len(x)) * np.exp(-x * 300) + np.sin(2 * np.pi * 160 * x) * np.exp(-x * 60), at, g)
def blip(at, g=0.25):
    x = tt(0.6); add(fx, np.sin(2 * np.pi * (880 + 880 * (x < 0.1)) * x) * np.exp(-x * 7), at, g)

# hook: reverse swell into the logo, low boom
whoosh(0.0, 0.7, 200, 3000, 0.35); boom(0.6, 0.6)
whoosh(4.9, 0.8, 600, 6000, 0.18, rise=False)          # logo tucks into the corner
for t0, seg, power in [(6.3, 9.0, None), (15.3, 8.4, 'click'), (23.7, 8.0, 'blip')]:
    zap(t0); whoosh(t0 + 0.6, 0.6, 400, 7000, 0.18)
    boom(t0 + 1.1, 0.35, 60)                           # unit fills in
    whoosh(t0 + 2.0, 0.9, 2000, 9000, 0.10, rise=False)   # light sweep
    if power == 'click': click(t0 + 2.0); click(t0 + 2.6, 0.3)
    if power == 'blip': blip(t0 + 2.0)
    whoosh(t0 + seg - 0.9, 0.9, 300, 5000, 0.25)          # exit
for c in (32.2, 33.95, 35.7, 38.2): tick(c)
boom(39.7, 0.55, 55); whoosh(39.7, 1.2, 3000, 12000, 0.12, rise=False)   # badge hit + shimmer
whoosh(40.4, 0.9, 200, 4000, 0.35); boom(41.3, 0.8, 42)                    # end card

for name, sig in [('bed-rev1.wav', bed), ('sfx-rev1.wav', fx)]:
    pcm = (np.clip(sig / max(1.0, np.abs(sig).max() / 0.9), -1, 1) * 32767).astype(np.int16)
    with wave.open(str(root / 'assets/audio' / name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote', name, round(float(np.abs(sig).max()), 2))
