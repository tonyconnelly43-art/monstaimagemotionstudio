# Monsta at Work — new sound design

`monsta-at-work.mp4`: 1920x1080 24fps, from the supplied 15s clip (1280x720) with its audio replaced and the ending's charcoal background recoloured to brand navy.

**Navy ending:** `src/navy_bg.py` maps the low-saturation grey background (from ~10s, fading in across the dive) onto the logo banner's navy, keeping its brightness so the vignette, bokeh and floor reflection survive; reds, whites and outlines are untouched.

**Real logo ending:** at 14.45s, right after his wink + thumbs-up (13.5–14.3s), a shine-sweep crossfade swaps the AI-generated logo for the supplied files (`assets/icon.webp`, `assets/mascot.webp`, `assets/wordmark.webp`), laid out to match the clip's final shot (`src/final_logo.py`, mascot gets a white sticker keyline so its navy outline reads on navy). `src/compose.py` puts them on a clean navy plate sampled from the clip, adds a floor reflection and drifting particles, follows the clip's slow pull-back, and upscales the whole video to 1080p. The hold is extended to 17s so the real logo stays on screen ~2.5s; the music runs on to match.

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
GAIN=3dB ./src/mix.sh                      # audio onto the original video
python3 src/navy_bg.py                    # -> build/video_navy.mp4
python3 src/final_logo.py && python3 src/compose.py   # -> build/video_final.mp4
VIDEO=build/video_final.mp4 DUR=17.0 GAIN=3dB ./src/mix.sh   # final 17s video + audio
```
