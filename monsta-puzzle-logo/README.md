# Monsta Puzzle Logo sting

`monsta-puzzle-logo.mp4`: 1920x1080, 30fps, 14.5s, H.264 + AAC (-16 LUFS).
`monsta-puzzle-logo-vertical.mp4`: 1080x1920 Reels version (same timing and audio; tagline on three lines).

| Time | What happens |
|---|---|
| 0–2s | Logo split into a 6x2 sliding puzzle, all 11 tiles in the wrong slots, bottom-right slot empty |
| 2–6.6s | 18 slides solve it one tile at a time, speeding up, with motion blur, a click and a settle bump on each lock |
| 6.75–7.2s | The missing bottom-right piece flies in; it locks on the 808 drop with a flash, shake, pulse ring and particle burst |
| 7.2s+ | Tile gaps close and the untouched original logo takes over with a red glow |
| 8.4s | Closing VO; the tagline words land on "Branding that eats the competition" (~10.4–11.6s) |
| ~12–14.5s | Hold on logo + tagline, fade out |

The logo is only ever cropped into tiles, never redrawn. After the lock, the original PNG is drawn as-is.

Music: "Punchier 808 Bass" from 8.89s, so its bass drop (16.09s in the song) lands on the lock at 7.2s. Clicks, whooshes, the riser and the impact are synthesized by `src/build_puzzle.py`, which also writes the move timings (`src/moves.js`), so picture and sound share one timeline.

## Re-render
```
python3 src/build_puzzle.py                     # moves + sfx
node src/render.mjs build/video_only.mp4 30     # frames via Playwright/Chromium -> ffmpeg
GAIN=1.5dB ./src/mix.sh                         # music + sfx + VO -> monsta-puzzle-logo.mp4

# vertical / Reels
node src/render.mjs --vertical build/video_only_vertical.mp4 30
GAIN=1.5dB VIDEO=build/video_only_vertical.mp4 OUT=monsta-puzzle-logo-vertical.mp4 ./src/mix.sh
```
