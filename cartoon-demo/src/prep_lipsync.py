"""Turns the voiceover into per-frame mouth shapes + caption word timings (src/lipsync.js)."""
import json, librosa, numpy as np
from pathlib import Path
root = Path(__file__).resolve().parent.parent
FPS = 30
y, sr = librosa.load(root / 'assets/audio/vo.mp3', sr=22050)
hop = sr // FPS
rms = librosa.feature.rms(y=y, frame_length=hop * 2, hop_length=hop)[0]
# brightness separates "ee/ss" (wide) from "oh/oo" (round)
cent = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=hop * 2, hop_length=hop)[0][:len(rms)]
db = 20 * np.log10(rms + 1e-6)
lev = np.clip((db - (db.max() - 34)) / 26, 0, 1)
# relative to a short moving max so the mouth closes between syllables
from scipy.ndimage import maximum_filter1d
rel = rms / (maximum_filter1d(rms, 9) + 1e-6)
lev = np.where(lev < 0.18, lev, lev * (0.45 + 0.55 * np.clip((rel - 0.3) / 0.5, 0, 1)))
shapes = []
for l, c in zip(lev, cent):
    if l < 0.18: shapes.append('X')            # closed
    elif l < 0.45: shapes.append('B')          # slightly open
    elif c < 1400: shapes.append('O')          # round
    elif l < 0.75: shapes.append('E')          # wide
    else: shapes.append('A')                   # wide open
# hold each shape >= 2 frames so it reads like drawn mouth swaps
orig = shapes[:]
for i in range(1, len(shapes) - 1):
    if orig[i] != orig[i - 1] and orig[i] != orig[i + 1]: shapes[i] = orig[i + 1]
phrases = [(0.05, 1.85, "Your business deserves more than a logo."), (2.38, 3.88, "It deserves a brand they can't ignore.")]
syl = lambda w: max(1, sum(1 for i, ch in enumerate(w.lower()) if ch in 'aeiouy' and (i == 0 or w.lower()[i-1] not in 'aeiouy')))
words = []
for a, b, text in phrases:
    ws = text.split(); wt = np.array([syl(w) for w in ws], float); edges = a + (b - a) * np.concatenate([[0], np.cumsum(wt) / wt.sum()])
    words += [dict(w=w, t0=round(float(edges[i]), 3), t1=round(float(edges[i + 1]), 3)) for i, w in enumerate(ws)]
energy = [round(float(v), 3) for v in lev]
(root / 'src/lipsync.js').write_text('window.LIP = ' + json.dumps(dict(fps=FPS, shapes=''.join(shapes), energy=energy, words=words)) + ';\n')
print(''.join(shapes)); print([ (w['w'], w['t0']) for w in words])
