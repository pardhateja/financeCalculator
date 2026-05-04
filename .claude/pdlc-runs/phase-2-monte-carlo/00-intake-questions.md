# Consolidated intake questions — Phase 2 Monte Carlo

Generated: 2026-04-29
Sources: 00-pm-questions.md (10 Qs), 00-tech-questions.md (11 Qs), 00-design-questions.md (11 Qs)
Total raw: 32 questions → after dedup: ~28 distinct decisions
BLOCKER count: 6 (asked to Pardha in one batch)
NICE-TO-RESOLVE: 22 (auto-defaulted, documented in 00-intake-assumptions.md)

---

## BLOCKERS — must ask Pardha

### B1 — Success metric definition (PM Q1)
What does "success" mean per simulated path?
- **PM recommends**: "Corpus > 6 months expense buffer at given age" — gives breathing room, computationally cheap, plain English: "At 80, in 85% of sims you still had ≥6mo expenses."
- Alternatives: corpus > 0 (too lax), corpus > 50% remaining lifetime expenses (too conservative), dual metric (cluttered).

### B2 — Inflation behavior in MC (PM Q5)
Should MC randomize inflation, or use Phase 1's deterministic per-phase inflation?
- **PM recommends**: deterministic for v1 (matches Phase 1 mental model, one less variable). Randomized inflation deferred to Phase 3.

### B3 — Color + threshold scheme (Design Q3 + PM Q3 disagreement)
PM proposed: ≥90 great / 75-89 OK / 50-74 risky / <50 fail (4 tiers)
Design proposed: ≥85 green / 75-84 blue / 50-74 amber / <50 red (4 tiers, different cut)
- Need ONE scheme to drive both colors AND copy.
- **Orchestrator recommendation**: use Design's lower cut (≥85 green) — conventional MC standard is 85% confidence; PM's 90% bar is too high for early retirement (anyone retiring at 50 will see 70-80% even with great plans). Use blue (Design Q3) instead of yellow (PM Q3) for 75-84% — blue reads "informational not warning" which matches the meaning better.

### B4 — Visualization type (Design Q1)
Vertical bar chart with color gradient — Design's recommendation.
- Confirm or alternative? Lollipop chart, line chart, heat map.
- **Design recommends**: vertical bar chart, height = success%, color = severity. Familiar (Phase 1 already uses bar charts).

### B5 — Loading UX during 5-8s sim (Design Q5)
Progress bar with % + cancel button + "Running 10,000 simulations..." text.
- Alternative: simple spinner only, or streaming partial results (show 1K-sim approximation immediately, refine to 10K).
- **Design recommends**: progress bar (gives time estimate, user knows app isn't frozen).

### B6 — Web Worker fallback strategy (Tech Q1)
How does Pardha open `index.html` today — double-click (file://) or via dev server (http://)?
- If file://: Workers fail with SecurityError. Need fallback.
- **Tech recommends**: Bundle Worker as Blob URL — works on file:// AND http://, no mode split. If Blob fails on Safari file://, fall back to setTimeout-chunked sync compute.
- Need Pardha confirmation on usage pattern.

---

## NICE-TO-RESOLVE — auto-defaulted (documented in 00-intake-assumptions.md)

### From PM:
- Q2 — Age points: adaptive, clamped to [retAge+1, lifeExpectancy], 4-5 evenly spaced
- Q4 — Empty/error states: existing Phase 1 patterns, "configure inputs first" message + error toast
- Q6 — Asset class scope: 3-asset (equity+debt+gold) matching Phase 1
- Q7 — Toggle persistence: localStorage `rp_projection_view`, default 'ideal'
- Q8 — Beyond success%: success% only for v1, defer median/P10/P90 to v2
- Q9 — Mobile: existing responsive patterns, 375px tested
- Q10 — Telemetry: none for v1

### From Tech:
- Q2 — Historical-returns dataset: bundle as `js/historical-returns-data.js`, ~1KB, NIFTY 50 + Indian debt + gold from RBI/NSE/Wikipedia citations
- Q3 — build.sh: hardcoded list, manually add 2-3 new files
- Q4 — PRNG: seeded mulberry32, seed in URL `&mcseed=N`
- Q5 — Cancel/restart: 500ms debounce, postMessage CANCEL to Worker
- Q6 — Perf: console.log + UI footer wall-clock
- Q7 — Chart library: NEW standalone `js/chart-montecarlo.js` (~150 lines)
- Q8 — Toggle key: `rp_projection_view`
- Q9 — Tests: `test-montecarlo.html` inline runner
- Q10 — Share-link: extend with `&view=montecarlo&mcseed=N`
- Q11 — Mobile breakpoints: existing `responsive.css` patterns

### From Design:
- Q2 — Toggle: segmented control above summary cards
- Q4 — Plain-English placement: callout box ABOVE chart (`.alert` pattern)
- Q6 — Empty state: Phase 1 pattern, gray placeholder + "Configure" CTA
- Q7 — Mobile: bars stay vertical, narrower at <600px
- Q8 — Median path: NO for v1
- Q9 — Dark mode: reuse Phase 1 4 semantic colors (green/blue/amber/red)
- Q10 — A11y: WCAG 2.1 AA, sr-only data table fallback, focus states reuse Phase 1 outline
- Q11 — CTA pattern: yes, "Increase monthly investment by ₹X" suggestion with button to Dashboard

---

All NICE-TO-RESOLVE defaults will be locked in 00-intake-assumptions.md after Pardha answers the 6 BLOCKERs.
