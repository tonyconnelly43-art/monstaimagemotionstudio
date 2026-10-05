# Monsta Demo Reel

`monsta-demo-reel.mp4`: 1920x1080, 30fps, 45s, H.264 + AAC (-14.5 LUFS).

| Time | Audio | On screen |
|---|---|---|
| 0–5.2s | Intro VO over the music build | "Your business deserves more than a logo. It deserves a brand they can't ignore." over a dim wall of work |
| 5.2s | Beat drop | Monsta logo slam |
| 6.8–17.2s | Music | **Vehicle Wraps**: 13 vans drive through on the beat |
| 17.2–20.4s | Music | **Custom Mascots**: both character sheets, panels popping in on the beat |
| 20.4–25.2s | Music | **Branded Apparel**: front/back polos for Yard Heros, Apex, Amp Theory, Mammoth, SVAC, Level Up (front + back) |
| 25.2–30.0s | Music | **Print & Stationery**: True North, Amp Theory, Apex, Captain Gutter, Grizzly, Air Command |
| 30.0–35.6s | Music | **Behind the Scenes**: On Par + Kraken in Illustrator, sketch timelapse, then the finished Yard Heros dog |
| 35.6–39.2s | Music | **Full Brand Packages**: Grizzly Comfort, Adelaide, Clear Point boards scroll |
| 39.2–45s | Closing VO, music ducked | Logo, "Branding that eats the competition.", monstamediaanddesign.com |

The soundtrack starts 20.47s into "Overdrive", so its drop lands at 5.2s. Every cut sits on the 150 BPM grid (0.4s beats); `DROP`/`BEAT` live at the top of `src/reel.html`. The sketch clip's own audio isn't used.

## Re-render
```
node src/render.mjs build/video_only.mp4 30   # frames via Playwright/Chromium -> ffmpeg
GAIN=2.2dB ./src/mix.sh                       # VO + music -> monsta-demo-reel.mp4
```
The van cutouts in `assets/img/` were cleaned by `src/clean_vans.py` (originals in `assets/img-orig/`), which strips the mockups' baked white-background shadow and pulls the Kraken and Bug Bounty vans off their layout boards.

To add or reorder shots, edit the `SHOTS` list in `src/reel.html` (each entry is a start beat, an end beat and a draw function).
