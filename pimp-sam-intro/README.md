# Pimp Sam & the Macksville Chronicles: intro

`pimp-sam-intro.mp4`: 1920x1080, 30fps, 23s, H.264 + AAC (-14.8 LUFS).

| Time | Shot |
|---|---|
| 0–7.06s | Water tower open (with the narration box) |
| 7.06s | Hard cut on the theme's big hit: barbershop push-in (played at 1.2x) |
| 13.22s | Sam grande; the cane tap lands on the 13.96s beat (its sound is kept, other clip audio muted) |
| 17.69s | Title card slams on the bar line over a blurred freeze of Sam: gold rays, sparkle burst, shine sweep |
| 22.2–23s | Music fade, fade to black |

Every cut is on the theme's beat grid (95.7 BPM, beats at 0.19 + n x 0.627s). The title card is the temporary one, cropped and upscaled 5x (`assets/title-card@5x.png`); drop a real logo into that file to swap it.

## Re-render
```
for c in 01-water-tower-open 02-barbershop-intro 03-sam-grande; do mkdir -p assets/frames/$c; ffmpeg -i assets/clips/$c.mp4 -q:v 3 assets/frames/$c/%03d.jpg; done
node src/render.mjs build/video_only.mp4 30
./src/mix.sh
```
