# Qualitrol International — repair services promo (style tests)

Three 6-second style tests (1920x1080, 30fps, silent) for a ≤60s promo on Qualitrol's repair services and two-year warranty:

1. **Global Signal** — rebuilt dotted globe (real land shapes from `global-land-mask`), orbit rings, orange arcs out of Charlotte, logo + tagline + warranty line.
2. **Inside the Machine** — camera glides over a circuit board with orange current; a VFD assembles from a blueprint outline into its photo; "2-Year Warranty" LED badge.
3. **Fault to Fixed** — red "FAULT DETECTED" HUD with racing downtime/lost-output counters, glitches into Qualitrol navy/orange, systems flip to "ONLINE ✓", ends on "System Restored · 2-Year Warranty".

Logo and product photos are cut from the supplied brochure (`assets/brochure.pdf`) as placeholders until the client sends originals.

```
STYLE=1 node src/render.mjs build/test1.mp4 30    # 2, 3 likewise
```
