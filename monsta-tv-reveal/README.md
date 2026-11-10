# MONSTA vintage TV logo reveal

`monsta-tv-reveal.mp4`: 1920x1080, 30fps, 12.5s, H.264 + AAC (-16 LUFS).

| Time | Shot |
|---|---|
| 0–2s | Wide on the woodgrain TV in a dark studio; CRT powers on (line opens to a flash), black-and-white snow, slow push-in |
| 2–4s | Close-up on the channel dial; the knob turns three clicks (2.4, 2.95, 3.5s), each landing on a new kind of interference with a black blink between: rolling picture, signal breakup, snow with first colour |
| 4–6s | Front-facing; VHS tracking errors: magenta/cyan/blue/green/yellow streaks, tearing, chroma split, tracking bands, flickering fragments of the logo |
| 6–7s | Distortion slows, the logo resolves, one last tracking band rolls up |
| 7.0s | Signal locks: clean logo centred on the CRT, chime; VO "Monsta Media & Design" |
| 8.2–9.6s | Continuous push through the glass; scanlines, curvature shading and reflection dissolve away |
| 9.6–12.5s | Clean full-frame logo on navy, no effects on the artwork; VO "Branding that eats the competition"; fade |

Everything is built from the supplied TV photo with its channel dial repaired (`assets/img/tv-fixed.webp`, also exported full-size as `tv-fixed-dial.png`). `src/fix_dial.py` erases the garbled/duplicated numbers from the dial ring, refills it from the surrounding black, and paints a clean 2–13 ring in the sampled numeral colour; the knob, bezel and the rest of the photo are untouched. The video uses that image: a virtual camera frames it, the CRT picture is drawn inside the traced screen outline, and the channel knob is cropped and rotated in place. The logo (`assets/img/monsta-logo.png`) is never edited; interference is applied only while compositing, and the final frame draws the original file as-is. All sound effects are synthesized (`src/sfx.py`); the only recorded audio is the ElevenLabs closing line.

## Re-render
```
python3 src/sfx.py
node src/render.mjs build/video_only.mp4 30
GAIN=2dB ./src/mix.sh
```
