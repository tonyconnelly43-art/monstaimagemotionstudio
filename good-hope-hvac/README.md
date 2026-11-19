# Good Hope Air Conditioning & Heating: social video brand kit (to start)

Client: Good Hope Air Conditioning & Heating · tagline "Comfort with a Higher Purpose" · 951-745-5670 · callgoodhope.com
Brand: purple, orange/gold shield, teal ribbon, sky blue + lavender clouds, angel technician mascot (halo, wings, wrench).

Assets (`assets/`):
- `angel-mascot.webp` — mascot, full body
- `clouds.png` — sky + cloud background art
- `banner-wordmark-screenshot.png` — wordmark/shield lock-up taken from an old banner (a clean logo file would be better)
- `van-wrap.webp` — van wrap mockup for reference

Ideas discussed: social brand kit (intro sting, outro end card with phone/site, lower thirds, caption style, 16:9 + 9:16), seasonal promo ads, maintenance-plan explainer, "fault to fixed" thermostat ad, review spotlights, animated mascot.

## Intro sting: test 1 (3.5s, 30fps, silent)

`intro-test-16x9.mp4` (1920x1080) and `intro-test-9x16.mp4` (1080x1920), from one source (`src/kit.html?scene=intro&format=h|v`).

| Time | Beat |
|---|---|
| 0–0.2s | Fade up from white into a wall of puffy clouds (drawn in the art's style: white, lavender rims, blue-violet outline) |
| 0.05–1.2s | Clouds part left/right, revealing the client's sky art with warm, slowly rotating light rays |
| 0.7–1.45s | Logo pops in with an overshoot and settles; soft flash |
| 1.05–1.85s | Gold halo ring pulses out from behind the logo |
| 1.55–2.45s | Light sweep across the logo (masked to the logo's own pixels) |
| 1.25–3.5s | Sparkles twinkle; logo floats gently |

The logo (`assets/logo-wordmark.png`, 784x428 PNG supplied by the client) is drawn as-is; effects are only composited over it. At this size it is upscaled ~1.35x (16:9) and ~1.1x (9:16), so a vector/hi-res logo is still wanted for finals.

```
FORMAT=h node src/render.mjs build/intro-16x9.mp4 30
FORMAT=v node src/render.mjs build/intro-9x16.mp4 30
FORMAT=v node src/render.mjs --stills build 0.6 1.2 3.4     # preview frames
```
