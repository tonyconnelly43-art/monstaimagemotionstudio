# Monsta at Work — new sound design

`monsta-at-work.mp4`: the supplied 15s clip (video untouched, 1280x720 24fps) with its audio replaced.

| Time | On screen | Sound |
|---|---|---|
| 0–2.6s | Typing | Keyboard clatter |
| 2.0s | Head scratch | Fur scratch |
| 3–5.8s | Mouse work on the logo | Mouse clicks, typing bursts |
| 5.9s | Final click | Firm "done" click |
| 6.0–6.8s | Logo shines | Shimmer chime |
| 7.0s | Fist pump | Swish |
| 7.75s | Portal opens | Electric zap, crackle bed, riser |
| 9.5–10s | Leap and dive | Jump whoosh, warp |
| 10–11s | Hyperspace | Whoosh |
| 11.0s | Landing | Impact boom + 808 bass drop |
| 11.5–12.2s | MONSTA text | Swoosh, sparkle, ding |

Music: "Punchier 808 Bass" from 5.09s, so its quiet build sits under the work scenes and the bass drop (16.09s in the song) lands on the landing at 11.0s. All SFX are synthesized in `src/sfx.py`.

```
python3 src/sfx.py
GAIN=3dB ./src/mix.sh
```
