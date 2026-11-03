# Pimp Sam & the Macksville Chronicles: intro

`pimp-sam-intro.mp4`: 1920x1080, 30fps, 23.5s, H.264 + AAC (-14.8 LUFS).

| Time | Shot |
|---|---|
| 0–8.23s | Water tower open. A virtual camera keeps the clip's narration box out of frame, starts on the welcome sign, then rises to the tower; "...the town called Macksville" (14.0s in the song) lands on the tower name at 7.0s |
| 8.23s | Cut on the bar line: barbershop push-in (1.2x) |
| 13.83s | Sam grande; the cane tap lands on the 14.48s beat (its sound is kept, other clip audio muted) |
| 18.26s | Title card slams on the bar line over a blurred freeze of Sam: gold rays, sparkle burst, gold glow, shine sweep masked to the logo |
| 22.3–23.5s | Music fade, fade to black |

The theme starts at 7.0s into the song. Every cut is on the theme's beat grid (95.7 BPM). The title card (`assets/title-card-v2.webp`) comes on a black background; `src/cutout_title.py` removes only the black outside the badge (sealing small gaps in the gold frame first) and writes `assets/title-card-cutout.png`, which the intro uses.

## Re-render
```
for c in 01-water-tower-open 02-barbershop-intro 03-sam-grande; do mkdir -p assets/frames/$c; ffmpeg -i assets/clips/$c.mp4 -q:v 3 assets/frames/$c/%03d.jpg; done
node src/render.mjs build/video_only.mp4 30
./src/mix.sh
```
