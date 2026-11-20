# Qualitrol International — repair services promo (style tests)

Three 6-second style tests (1920x1080, 30fps, silent) for a ≤60s promo on Qualitrol's repair services and two-year warranty:

1. **Global Signal** — rebuilt dotted globe (real land shapes from `global-land-mask`), orbit rings, orange arcs out of Charlotte, logo + tagline + warranty line.
2. **Inside the Machine** — camera glides over a circuit board with orange current; a VFD assembles from a blueprint outline into its photo; "2-Year Warranty" LED badge.
3. **Fault to Fixed** — red "FAULT DETECTED" HUD with racing downtime/lost-output counters, glitches into Qualitrol navy/orange, systems flip to "ONLINE ✓", ends on "System Restored · 2-Year Warranty".

Logo and product photos are cut from the supplied brochure (`assets/brochure.pdf`) as placeholders until the client sends originals.

```
STYLE=1 node src/render.mjs build/test1.mp4 30    # 2, 3 likewise
```

## Client revision 1: VFD → PLC → HMI with voiceover (50s, 30fps, -16 LUFS)

Client feedback on test 2: loves the VFD opening; wants PLC second and HMI last, and to finish on
"Evaluated repairs, system/load testing, 18-month in-service warranty w/ 1-year shelf life (bumper to bumper) warranty".
Must be under a minute. The first cut (18s) was too fast, so this version is paced to an ElevenLabs read.

`qualitrol-rev1-vfd-plc-hmi.mp4` (`STYLE=4`):

| Time | Picture | Voiceover |
|---|---|---|
| 0–6s | Circuit flythrough, big logo + "Industrial Electronic Repair", logo tucks into the corner | "When your line goes down, every minute costs you. Qualitrol International gets you running again." |
| 6.3–15.3s | VFD scans in as a blueprint, fills in as the photo, label + brands, slow push-in | "Variable frequency drives. ABB, Allen Bradley, Siemens, Yaskawa, and dozens more, repaired and tested." |
| 15.3–23.7s | PLC, same build; CPU switches to RUN, I/O LEDs blink | "PLCs from every major manufacturer: evaluated, repaired, and proven before they ship." |
| 23.7–31.7s | HMI, same build; screen powers on into a live process screen | "Operator interfaces and HMIs, brought back to life and ready to install." |
| 31.4–41s | "Every repair includes": each line checks off on its word, then the Bumper-to-Bumper badge | "Every repair is evaluated... system and load tested... backed by an eighteen-month in-service warranty... with a one-year shelf life. Bumper to bumper." |
| 41–50s | Logo moves to centre, 704-702-6380 · qualitrol.com, "Repaired · Tested · Warrantied" | "Qualitrol International. Call 704-702-6380, or visit qualitrol.com." |

Audio: `assets/audio/vo-rev1.mp3` is the client-approved script read in one take; `src/mix_rev1.sh` cuts it at its
natural pauses and places each line (table at the top of the script). Music bed and SFX are synthesized by
`src/sfx_rev1.py` (100 BPM, Am–F–G–Em pad, kick from the VFD on, ticks on each checkmark, hits on the badge and end card).
The bed ducks under the voice.

**PLC and HMI are drawn stand-ins** (`drawPLC`, `drawHMI` in `src/tests.html`), modelled on the units in the client's
reference videos (a Siemens S7-300-style rack PLC and a Moeller/Micro Innovation-style operator panel), with no
manufacturer logos. Swap in photos when the client sends them: cut the product out, make an `-edges` version like
`drive-edges.png`, and give that product `img:` instead of `draw:` in `PRODUCTS`.

```
STYLE=4 node src/render.mjs build/rev1_video.mp4 30
python3 src/sfx_rev1.py
./src/mix_rev1.sh
```

## Revision 2: globe opening (50s)

`qualitrol-rev2-globe-open.mp4`: same as revision 1, but the opening uses the Global Signal globe from style test 1
(dotted Earth, arcs out of Charlotte, orbit rings) with the logo and "Industrial Electronic Repair" on the left.
From 5.6s the globe sinks and fades while the circuit board fades in, gone by ~7.8s as the VFD builds.
The style test's "2-Year Warranty" line is left out. Style test 1 itself is unchanged (`globeBG` + `globeBody`).

```
STYLE=4 node src/render.mjs build/rev2_video.mp4 30
VIDEO=build/rev2_video.mp4 OUT=qualitrol-rev2-globe-open.mp4 ./src/mix_rev1.sh
```

## Revision 3: Roddy Knox end card (50s)

`qualitrol-rev3-roddy-knox.mp4`: revision 2 with the end card showing Roddy Knox · 704-962-7497 · rknox@qualitrol.com
(plus qualitrol.com) instead of the main company number. No new recording: the voiceover now ends on
"Qualitrol International." (`CLOSE_END=34.70`), cutting the spoken company number; the music plays out under the card.
Only the changed tail was re-rendered (`START=40` in `src/render.mjs`) and spliced onto the revision 2 picture.

```
START=40 STYLE=4 node src/render.mjs build/end_roddy.mp4 30
ffmpeg -i build/rev2_video.mp4 -i build/end_roddy.mp4 -filter_complex "[0:v]trim=0:40,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]" -map "[v]" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p build/rev3_video.mp4
CLOSE_END=34.70 VIDEO=build/rev3_video.mp4 OUT=qualitrol-rev3-roddy-knox.mp4 ./src/mix_rev1.sh
```
