"""Generates the sliding-puzzle move list (src/moves.js) and the sound effects
track (assets/audio/sfx.wav) so picture and sound share the same timings.

Grid is 6x2. The bottom-right tile starts off the board (the classic empty slot).
The scramble is a random walk of the empty slot; the animation plays it back in
reverse, one tile per move, then the missing tile slides in last.
"""
import json, random, wave
from pathlib import Path
import numpy as np

COLS, ROWS, N_MOVES = 6, 2, 18
START, END = 2.0, 6.55          # first move starts / last move lands
FINAL_START, LOCK = 6.75, 7.2   # missing piece slides in, locks with the drop
VO_AT, DUR, SR = 8.4, 14.5, 48000
WORD_HITS = [10.4, 10.72, 10.98, 11.26, 11.55]
root = Path(__file__).resolve().parent.parent

def nbrs(e):
    r, c = divmod(e, COLS)
    out = []
    if r > 0: out.append(e - COLS)
    if r < ROWS - 1: out.append(e + COLS)
    if c > 0: out.append(e - 1)
    if c < COLS - 1: out.append(e + 1)
    return out

def scramble(seed):
    rng = random.Random(seed)
    board = list(range(COLS * ROWS)); empty = len(board) - 1; board[empty] = None
    walk, prev = [], None
    for _ in range(N_MOVES):
        e = rng.choice([n for n in nbrs(empty) if n != prev])
        board[empty], board[e] = board[e], None
        walk.append((e, empty)); prev, empty = empty, e
    misplaced = sum(1 for i, t in enumerate(board) if t is not None and t != i)
    return misplaced, board, walk

best = max((scramble(s) + (s,) for s in range(4000)), key=lambda x: (x[0], -x[3]))
misplaced, board, walk, seed = best
# solve = walk reversed: each step moves the tile sitting at `src` into `dst`
solve = [(empty_was, tile_from) for (tile_from, empty_was) in reversed(walk)]
gaps = np.linspace(0.34, 0.18, N_MOVES)
dur = np.minimum(gaps * 0.8, 0.2)
starts = START + np.concatenate([[0], np.cumsum(gaps[:-1])])
starts *= 1; scale = (END - START - dur[-1]) / (starts[-1] - START)
starts = START + (starts - START) * scale
moves = [dict(src=int(s), dst=int(d), t0=round(float(t), 3), t1=round(float(t + dd), 3))
         for (s, d), t, dd in zip(solve, starts, dur)]
data = dict(cols=COLS, rows=ROWS, start=board, moves=moves, finalStart=FINAL_START, lock=LOCK,
            voAt=VO_AT, duration=DUR, wordHits=WORD_HITS)
(root / 'src' / 'moves.js').write_text('window.PUZZLE = ' + json.dumps(data) + ';\n')
print('seed', seed, 'misplaced', misplaced, 'of', COLS * ROWS - 1, 'start', board)

# ---------- sound effects ----------
n = int(DUR * SR); out = np.zeros(n)
rng = np.random.default_rng(1)
def add(sig, t, gain=1.0):
    i = int(t * SR); j = min(n, i + len(sig)); out[i:j] += sig[:j - i] * gain
def env(d, k): tt = np.arange(int(d * SR)) / SR; return tt, np.exp(-tt * k)
def click(pitch):
    tt, e = env(0.08, 70)
    noise = np.diff(rng.standard_normal(len(tt) + 1)) * np.exp(-tt * 260) * 0.35
    tone = np.sin(2 * np.pi * pitch * tt) * np.exp(-tt * 120) * 0.45
    thunk = np.sin(2 * np.pi * 150 * tt) * e * 0.55
    return noise + tone + thunk
def whoosh(d, rising=True):
    tt = np.arange(int(d * SR)) / SR
    x = rng.standard_normal(len(tt)); y = np.zeros_like(x); a = 0.0
    for i in range(len(x)):
        f = (tt[i] / d) if rising else 1 - tt[i] / d
        k = 0.02 + 0.25 * f; a += k * (x[i] - a); y[i] = a
    shape = np.sin(np.pi * tt / d) ** 2 if not rising else (tt / d) ** 2
    return y * shape * 1.2
for i, m in enumerate(moves):
    add(whoosh(m['t1'] - m['t0']) * 0.25, m['t0'])
    add(click(1500 + 40 * i), m['t1'], 0.8)
# riser into the lock, final piece whoosh, impact boom
add(whoosh(LOCK - 5.4, rising=True) * 0.6, 5.4)
add(whoosh(LOCK - FINAL_START + 0.05, rising=False) * 0.5, FINAL_START)
tt = np.arange(int(1.8 * SR)) / SR
freq = 35 + 75 * np.exp(-tt * 5)
boom = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-tt * 2.2)
crack = rng.standard_normal(len(tt)) * np.exp(-tt * 18) * 0.5
add(boom * 1.0 + crack, LOCK)
add(click(900) * 1.2, LOCK)
for t in WORD_HITS:
    tt2, e2 = env(0.25, 18)
    add(np.sin(2 * np.pi * 70 * tt2) * e2 * 0.7 + np.diff(rng.standard_normal(len(tt2) + 1)) * np.exp(-tt2 * 120) * 0.15, t)
out = out / np.abs(out).max() * 0.9
pcm = (np.stack([out, out], 1) * 32767).astype('<i2')
with wave.open(str(root / 'assets' / 'audio' / 'sfx.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('sfx written')
