# Cartoon animation demo

`cartoon-demo.mp4`: 1080x1920 (Reels/Shorts), 30fps, 8.6s.

A test of cut-out (puppet) animation. The monster is a stand-in drawn from separate parts in `src/cartoon.html`: body, horns, eyes with lids and pupils, brows, 5 mouth shapes, two-joint arms and feet. A `rig(t)` function poses them over time.

- **Lip sync**: `src/prep_lipsync.py` reads the voiceover and picks a mouth shape (closed / slightly open / wide / round / wide open) for every frame, plus word timings for the captions.
- **Acting**: drop-in with squash and stretch, talking head-bob driven by voice energy, blinks, eye darts, brow raise on "logo", pointing, fierce fists on "can't ignore", a jump, a wave.
- **Camera**: punch-ins and shakes on the beats of the line.
- **Captions**: word-by-word, current word highlighted.
- **Audio**: VO + "Punchier 808 Bass" (drop on the landing, ducked under the VO) + synthesized whoosh/thump/boing (`src/sfx.py`).

A real character swaps in by replacing the drawing functions with the artist's layered parts (PNG per body part and mouth shape).

```
python3 src/prep_lipsync.py && python3 src/sfx.py
node src/render.mjs build/video_only.mp4 30
GAIN=1.5dB ./src/mix.sh
```
