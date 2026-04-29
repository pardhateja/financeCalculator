# Stage 0 assumptions (locked, surface at Gate A if wrong)

Generated: 2026-04-29
Source: NICE-TO-RESOLVE answers from PM/Tech/Design questions, defaulted by orchestrator.
Pardha sees these in Gate A (Stage 2). Any wrong assumption → revise then.

## All BLOCKER answers (from Pardha)

| # | Question | Pardha's answer |
|---|---|---|
| B1 | Success metric | **Corpus > 6mo expense buffer at age X** |
| B2 | MC inflation | **Randomize inflation too** — bootstrap Indian CPI 1991-2025 |
| B3 | Color scheme | **≥85% green / 75-84% blue / 50-74% amber / <50% red** |
| B4 | Visualization | **Multiple charts** — Designer picks layout (primary bar + supporting line/lollipop/heatmap) |
| B5 | Loading UX | **Progress bar + cancel + sim runs in background, all tabs stay accessible** (Web Worker mandatory) |
| B6 | App open mode | **Both file:// and localhost** — Worker must use Blob URL fallback for file:// |

## NICE-TO-RESOLVE defaults (auto-locked)

### Product (PM)
- **Age points**: adaptive, clamped to [retirementAge+1, lifeExpectancy], 4-5 evenly spaced milestones
- **Plain-English thresholds for copy** (matching B3 colors): ≥85% "great" / 75-84% "OK" / 50-74% "risky" / <50% "likely to fail"
- **Empty state**: "Configure inputs in Calculator tab to run Monte Carlo" (matches Phase 1 pattern)
- **Crash handling**: console.log error + UI toast "Simulation failed, please refresh"
- **Asset class scope**: 3-asset portfolio (equity + debt + gold) matching Phase 1 user allocation
- **Toggle persistence**: localStorage `rp_projection_view`, default `'ideal'` on cold start
- **Beyond success%**: success% only for v1 (median/percentiles deferred to v2)
- **Mobile**: Phase 1 responsive patterns, 375px iPhone-SE viewport tested
- **Telemetry**: NONE — match Phase 1 (no analytics in app)

### Tech
- **Historical data source**: bundle `js/historical-returns-data.js` with NIFTY 50 + Indian debt index + gold + Indian CPI annual returns 1991-2025 (~35 years × 4 series ≈ 140 numbers, ~2KB minified). Cite RBI / NSE / Wikipedia inline.
- **Web Worker delivery**: Blob URL pattern (works on file:// AND localhost) per B6. Sync chunked-compute fallback only if Blob URL fails (e.g. Safari restrictions).
- **build.sh**: hardcoded list, manually add: `historical-returns-data.js`, `calc-montecarlo.js`, `chart-montecarlo.js` after `calc-tracker.js` and before `sharelink.js`. Worker script lives separately as `js/calc-montecarlo-worker.js` (not concatenated; loaded via Blob URL).
- **PRNG**: seeded **mulberry32** (8 lines, deterministic). Default seed = `Date.now()` for new runs. Encoded in URL `&mcseed=N` for share-link reproducibility.
- **Cancel/restart**: 500ms debounce on input change. Worker receives `{type:'CANCEL'}` postMessage, exits gracefully, ACKs.
- **Performance measurement**: `console.info('MC done in 4.2s, 2380 sims/sec')` + UI footer wall-clock "Last run: 4.2s". Warning if >8s: "Try 5K sims or close other tabs."
- **Chart implementation**: NEW `js/chart-montecarlo.js` (~150 lines, Canvas 2D, standalone; reuses Phase 1 grid/axis idioms but tailored to 0-100% Y-axis with color-coded bars). Multiple chart types per B4 — UI Designer specifies which subset.
- **Toggle key**: `rp_projection_view`, values `'ideal'` | `'montecarlo'`.
- **Tests**: `test-montecarlo.html` inline runner, no framework. Tests: seeded PRNG repeatability, bootstrap sampling, single-sim trajectory, 100-sim convergence.
- **Share-link extension**: `&view=montecarlo&mcseed=N` appended to existing `?plan=base64`. Backward compat: links without these params load Ideal Scenario.
- **Mobile**: existing `responsive.css` patterns. 600px breakpoint: shrink bar widths, rotate age labels if needed.

### Design
- **Toggle UX**: segmented control (iOS-style) "Ideal Scenario | Stress Test (Monte Carlo)" above existing summary cards in Projections tab.
- **Plain-English message placement**: callout box ABOVE charts using Phase 1 `.alert` pattern (info/warning/danger variants based on overall plan health).
- **Empty state**: gray placeholder card + icon + "Configure your retirement plan in the Calculator tab to see Monte Carlo projections" + CTA "Go to Calculator" link.
- **Mobile**: bars stay vertical, narrower at <600px; age labels remain horizontal or stack below. No separate mobile chart implementation.
- **Median corpus**: NOT shown for v1 (matches PM Q8). Reconsider in v2 if Pardha requests.
- **Dark mode**: reuse Phase 1 4 semantic colors (already verified for WCAG AA in `03-a11y-defaults.md`). No new dark-mode variants needed.
- **A11y**: WCAG 2.1 AA contrast (already met by Phase 1 colors). `sr-only` data table fallback below each chart with toggle "Show data table" for sighted users. Focus states reuse Phase 1 outline pattern.
- **CTA when risky**: yes — show "Increase monthly investment by ₹X to reach 85% confidence" suggestion in callout box, with "Adjust Investment →" button that links to Calculator/Income tab and auto-focuses the monthly investment input.

## Updates to scope from Pardha's BLOCKER answers

1. **Inflation now stochastic** (B2): adds CPI dataset to historical data bundle, adds inflation bootstrap to MC engine. Slightly more compute, slightly more complex messaging ("returns AND inflation are random").
2. **Multiple charts** (B4): expands from "ONE chart" to "primary + supporting charts". UI Designer in Stage 1 will design the layout. Estimated: 1 primary + 2 supporting visualizations.
3. **Tab-independent execution** (B5): Web Worker via Blob URL is now MANDATORY (was "recommended"). No fallback path acceptable for the "must run in background" contract — sync chunked compute would block the UI thread, violating B5.
4. **Dual-mode app open** (B6): Blob URL pattern handles both file:// and http:// transparently. README updated with both usage patterns.

## Open scope risks for Gate A review

- **Inflation bootstrap data quality** (B2): Indian CPI history has structural breaks (rebasing, methodology changes 2014). Need to validate dataset choice with Tech Lead in Stage 1.
- **Multi-chart layout density** (B4): risk of cluttering Projections tab. UI Designer will need 2-3 wireframe iterations. May surface as a layout tradeoff at Gate A.
- **Worker on Safari file://** edge case (B6): if Blob URL ALSO fails on Safari file://, we need the sync chunked fallback. Tech to verify in Stage 1 spike.
