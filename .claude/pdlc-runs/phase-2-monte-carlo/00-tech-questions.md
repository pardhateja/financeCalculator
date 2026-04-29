# Tech Lead questions — Phase 2 Monte Carlo

Author: tech-lead
Date: 2026-04-29

Format per question:
- **Severity**: BLOCKER | NICE-TO-RESOLVE
- **Why**: ...
- **Default if NICE**: ...
- **Options if BLOCKER**: ...

---

## Q1 — Web Worker compatibility with file:// protocol

- **Severity**: BLOCKER
- **Why**: Phase 2 requires 10K Monte Carlo sims in a Web Worker to keep UI responsive. Workers fail with `SecurityError` when loaded from `file://` (browser same-origin policy). Need to verify: does Pardha open `index.html` by double-clicking it (file://) or via a dev server (http://localhost)?
- **Options if BLOCKER**:
  1. Ship dual-mode: detect `file://` protocol → run sync-chunked compute (setTimeout batches of 500 sims) with progress bar; `http://` protocol → spawn Worker.
  2. Require dev server for Phase 2 (update docs, add `python3 -m http.server` or `npx serve` instructions).
  3. Bundle Worker code inline as Blob URL (works on file://, ~5 extra lines of boilerplate).
- **Tech Lead recommendation**: Option 3 (Blob URL) — cleanest UX, no mode split, works everywhere. If Blob fails on Safari file://, fallback to Option 1.

## Q2 — Historical returns dataset source and scope

- **Severity**: BLOCKER
- **Why**: Monte Carlo needs 35 years of annual returns for NIFTY 50, Indian debt index, and gold to bootstrap realistic simulations. Source must be citation-friendly (RBI, NSE, Wikipedia with refs) and cover 1991-2025 (liberalization onward).
- **Options**:
  1. Bundle static JS array: `RP._historicalReturns = { nifty50: [0.12, -0.08, ...], debt: [...], gold: [...] }` sourced from NSE historical data + RBI reports. ~1KB minified.
  2. Fetch from external API (Yahoo Finance, Alpha Vantage) on first sim run — requires internet, adds latency.
  3. Use synthetic distribution (mean + stdev) instead of bootstrap — loses fat-tail realism.
- **Tech Lead recommendation**: Option 1 (bundled static data). File: `js/historical-returns-data.js`, loaded in build.sh before `calc-montecarlo.js`. PM to approve data source citations in PRD.

## Q3 — build.sh auto-discovery of new JS files

- **Severity**: NICE-TO-RESOLVE
- **Why**: Phase 2 adds `js/calc-montecarlo.js`, `js/historical-returns-data.js`. Current build.sh (line 113-135) has hardcoded `<script src="js/...">` tags. Need to confirm: do we manually add new files, or does build.sh auto-glob `js/*.js`?
- **Default if NICE**: Manual addition. Tech Spec will list exact lines to add in build.sh FOOT heredoc (after line 127 `calc-tracker.js`, before line 133 `sharelink.js`).
- **Verification**: Read build.sh lines 113-135 — confirms hardcoded list. No auto-glob. Manual is correct.

## Q4 — PRNG quality and seed reproducibility for share-links

- **Severity**: BLOCKER if share-link must reproduce MC results; NICE otherwise
- **Why**: `Math.random()` is unseeded — same inputs produce different MC charts every run. For share-links to be useful ("here's my plan, what do you think?"), recipient must see the same success% chart as sender. Requires seeded PRNG.
- **Options**:
  1. Implement seeded PRNG (e.g., mulberry32: 8 lines, deterministic). Seed stored in URL param `&mcseed=12345`. Link receiver sees identical chart.
  2. Accept non-reproducibility — share-link only transmits inputs, not MC results. Receiver re-runs sim with their own random seed.
- **Tech Lead recommendation**: Option 1. Seed defaults to `Date.now()` for new runs, encoded in share-link alongside `&plan=...`. Minimal code, huge UX win. PM to confirm in PRD.

## Q5 — Cancel-and-restart behavior on input change mid-sim

- **Severity**: NICE-TO-RESOLVE
- **Why**: User changes `retirementAge` while 10K sim is running (4s in). Should we: (a) finish the stale run then auto-start fresh, (b) postMessage CANCEL to Worker + start new, or (c) debounce input changes?
- **Default if NICE**: Cancel + restart with 500ms debounce. When Worker receives CANCEL message, it stops and ACKs; main thread starts new sim with updated inputs. Clean, responsive, matches Pardha's "fix problems, never live with lag" preference.
- **Implementation note**: Worker listens for `self.onmessage = (e) => { if (e.data.type === 'CANCEL') { /* set flag, early return */ } }`. Progress bar resets to 0% on cancel.

## Q6 — Performance budget verification on user machines

- **Severity**: NICE-TO-RESOLVE
- **Why**: Intake requires "<8s for 10K sims on 2020+ MacBook Air." How do we verify this on Pardha's machine + help users diagnose slow runs?
- **Default if NICE**: Emit perf timing to console.log (`console.info('MC completed in 4.2s, 2380 sims/sec')`), AND display wall-clock time in UI footer of Monte Carlo view ("Last run: 4.2s"). If >8s, footer shows warning: "Slow performance detected — try 5K sims or close other tabs."
- **Implementation note**: Worker sends `postMessage({type: 'DONE', elapsed: perfEnd - perfStart})`. Main thread renders it.

## Q7 — Chart library reuse for Success Rate vs. Age visualization

- **Severity**: BLOCKER
- **Why**: Phase 1 ships `js/chart.js` (Canvas 2D renderer, ~600 lines). Renders line chart with gradient fill, retirement marker, zero line. Phase 2 needs a **bar chart** or **step chart** showing success% (0-100%) at discrete ages (70, 80, 90, 100). Can we extend `chart.js` to support bar/step type, or write new `renderMonteCarloChart()`?
- **Options**:
  1. Extend `chart.js` — add `RP.renderBarChart(canvasId, data, opts)` function (~100 lines). Reuses grid/axis logic, adds bar-drawing loop.
  2. New standalone `js/chart-montecarlo.js` — duplicates grid logic but tailored for success% display (0-100% Y-axis always, no negative values, green→yellow→red color gradient by success%).
- **Tech Lead recommendation**: Option 2 (standalone). MC chart semantics differ enough (fixed 0-100% scale, color-coded thresholds, discrete age labels) that forcing it into the existing line-chart abstraction adds complexity. ~150 lines, loaded after `chart.js` in build.sh.

## Q8 — Toggle state localStorage key convention

- **Severity**: NICE-TO-RESOLVE
- **Why**: Projections tab gains a toggle ("Ideal Scenario" vs "Stress Test (Monte Carlo)"). Should persist user's last choice across sessions. What localStorage key? Pattern from `darkmode.js` uses `rp_dark_mode` (line 22).
- **Default if NICE**: `localStorage.getItem('rp_projection_view')` with values `'ideal'` (default) or `'montecarlo'`. Matches `rp_` namespace convention. Restored on tab init, saved on toggle click.
- **Implementation note**: Toggle is `<button>` with `aria-pressed` state, styled via CSS (same pattern as two-tier nav in Phase 1).

## Q9 — Test infrastructure for Monte Carlo pure functions

- **Severity**: NICE-TO-RESOLVE
- **Why**: Monte Carlo engine (`runSingleSimulation()`, `bootstrapReturn()`, seeded PRNG) consists of pure functions — easy to unit test. Where should tests live? Phase 1 has `test-multigoal.html` (inline test runner, no framework).
- **Default if NICE**: Create `test-montecarlo.html` alongside `test-multigoal.html`. Inline assertions (no Vitest/Jest), logs to console + renders pass/fail summary in `<pre id="testResults">`. Tests: seeded PRNG repeatability, bootstrap sampling, single-sim corpus trajectory, 100-sim success% convergence.
- **Implementation note**: Test file loads `js/historical-returns-data.js`, `js/calc-montecarlo.js` (non-Worker parts), runs 5-10 micro-tests, outputs ✅/❌.

## Q10 — Share-link extension for MC seed + toggle state

- **Severity**: NICE-TO-RESOLVE
- **Why**: Phase 1 share-links encode all inputs via `?plan=<base64>` + optional `&phases=<base64>`. Should Phase 2 add `&mcseed=<int>` (Q4 seeded PRNG) and `&view=montecarlo` (Q8 toggle state) so recipients see the exact MC chart?
- **Default if NICE**: Yes. Extend `sharelink.js` (lines 13-61): when generating link, if toggle is on Monte Carlo view, append `&view=montecarlo&mcseed=<RP._mcSeed>`. On load, if `params.get('view') === 'montecarlo'`, auto-switch to MC tab AND run sim with decoded seed. Backward compat: links without these params load Ideal Scenario (current behavior).
- **Implementation note**: `RP.loadFromShareLink()` already parses URLSearchParams (line 65). Add 3 lines to check `view` + `mcseed`, restore state.

## Q11 — Mobile / responsive design for Monte Carlo chart

- **Severity**: NICE-TO-RESOLVE
- **Why**: Phase 1 ships `css/responsive.css` with breakpoints at 768px and 600px. Success Rate vs. Age chart (bar/step chart, ~5-7 bars) must render legibly on mobile. Any special handling needed?
- **Default if NICE**: Chart canvas width inherits parent container (already responsive via `canvas.parentElement.getBoundingClientRect()` pattern in `chart.js` line 12). Under 600px viewport: reduce bar padding, rotate age labels 45° if needed, shrink font size to 10px. Test on iPhone SE viewport (375px). No separate mobile chart implementation.
- **Implementation note**: MC chart renderer checks `W < 600` and adjusts `padding`, `fontSize`, `labelRotation` accordingly. Existing Phase 1 pattern.

---

**END OF TECH QUESTIONS (11 total)**
