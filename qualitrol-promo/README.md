# Qualitrol International — repair services promo (style tests)

Three 6-second style tests (1920x1080, 30fps, silent) for a ≤60s promo on Qualitrol's repair services and two-year warranty:

1. **Global Signal** — rebuilt dotted globe (real land shapes from `global-land-mask`), orbit rings, orange arcs out of Charlotte, logo + tagline + warranty line.
2. **Inside the Machine** — camera glides over a circuit board with orange current; a VFD assembles from a blueprint outline into its photo; "2-Year Warranty" LED badge.
3. **Fault to Fixed** — red "FAULT DETECTED" HUD with racing downtime/lost-output counters, glitches into Qualitrol navy/orange, systems flip to "ONLINE ✓", ends on "System Restored · 2-Year Warranty".

Logo and product photos are cut from the supplied brochure (`assets/brochure.pdf`) as placeholders until the client sends originals.

```
STYLE=1 node src/render.mjs build/test1.mp4 30    # 2, 3 likewise
```

## Client revision 1: VFD → PLC → HMI (18s, 30fps, silent)

Client feedback on test 2: loves the VFD opening; wants PLC second and HMI last, and to finish on
"Evaluated repairs, system/load testing, 18-month in-service warranty w/ 1-year shelf life (bumper to bumper) warranty".
This replaces the placeholder "2-Year Warranty" badge.

`qualitrol-rev1-vfd-plc-hmi.mp4` (`STYLE=4`):

| Time | Beat |
|---|---|
| 0–5.2s | Circuit flythrough; VFD scans in as a cyan blueprint, wipes into the photo, label + brands |
| 5.2–9.6s | PLC, same build; I/O LEDs start blinking and the CPU switches to RUN once it powers up |
| 9.6–14s | HMI, same build; screen flashes on into a live process screen (tank level, speed trend, RPM/amps) |
| 13.8–18s | "Every repair includes": four lines check off, "Bumper-to-Bumper Warranty" badge, 704-702-6380 · qualitrol.com |

**PLC and HMI are drawn stand-ins** (`drawPLC`, `drawHMI` in `src/tests.html`), modelled on the units in the client's
reference videos (a Siemens S7-300-style rack PLC and a Moeller/Micro Innovation-style operator panel), with no
manufacturer logos. Swap in photos when the client sends them: cut the product out, make an `-edges` version like
`drive-edges.png`, and give that product `img:` instead of `draw:` in `PRODUCTS`.

```
STYLE=4 node src/render.mjs build/rev1.mp4 30
```
