# Monsta Brand Experience — motion graphic

`monsta-brand-experience.mp4`: 1920x1080, 30fps, 27s, H.264 + AAC (-14.6 LUFS).

| Time | Voiceover | On screen |
|---|---|---|
| 0–1s | — | Red slash intro |
| 1–3s | "Your brand is more than just a logo." | YOUR BRAND slams in; "LOGO." badge gets struck through |
| 3–7s | "It's the way people see, remember, and experience your business." | SEE / REMEMBER / EXPERIENCE icons pop on each word, then a red wipe |
| 8–12.5s | "At Monsta, we build bold, custom brands from the ground up," | Monsta logo slam; BOLD. CUSTOM. BRANDS.; blocks rise from the ground |
| 13–17s | "then bring them to life across your vehicles, print, digital, and beyond." | BRING IT TO LIFE; Vehicles, Print, Digital and & Beyond cards land on each word |
| 17.5–20.5s | "Everything connected. Everything unmistakably yours." | Cards link up to a Monsta hub; YOURS. in red |
| 20.6–22.2s | "That's the Monsta Brand Experience." | Logo hero + BRAND EXPERIENCE |
| 22.2–27s | — (music swells to full) | Light rays, particle burst, "Branding that eats the competition." tagline, fade out |

Audio: the VO starts at 1.0s. The hip-hop cover starts at its beat drop (16.3s into the song). It's ducked to about -14 dB under the VO, then ramps up to full volume over 0.7s once the VO ends, and fades out over the last 1.6s.

## Re-render
```
node src/render.mjs build/video_only.mp4 30   # frames via Playwright/Chromium -> ffmpeg
./src/mix.sh                                  # VO + ducked music -> monsta-brand-experience.mp4
```
Cue times live in `CUE` at the top of `src/scene.html`. To preview in a browser, open `src/scene.html#play`.
