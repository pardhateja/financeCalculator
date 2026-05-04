# Tech Spec — Phase 2 Monte Carlo

Owner: pdlc-tech-lead  
Date: 2026-04-30  
Status: DRAFT

## 1. Architecture overview

Phase 2 adds **probabilistic stress-testing** to the existing deterministic projection model. The implementation is a **parallel view** within the existing Projections tab — user toggles between "Ideal Scenario" (existing year-by-year table, untouched) and "Stress Test (Monte Carlo)" (new success-rate-by-age visualization).

**Core data flow**:
```
┌──────────────────────────────────────────────────────────────────┐
│ Existing Projections Tab (Phase 1)                              │
│  RP.val('currentAge') → RP.val('retirementAge')                 │
│  RP.val('lifeExpectancy') → RP.val('currentSavings')            │
│  RP.val('monthlyInvestAmt') → RP._preReturn / RP._postReturn    │
│  Asset allocation % (equity/debt/gold)                          │
│  Multi-goal phase definitions (from calc-multigoal.js)          │
└──────────────────────────────────────────────────────────────────┘
                          ↓ (READ-ONLY)
┌──────────────────────────────────────────────────────────────────┐
│ NEW: Monte Carlo Engine (js/calc-montecarlo.js)                 │
│  User clicks "Stress Test (Monte Carlo)" toggle                 │
│    ↓                                                             │
│  Main thread spawns Web Worker via Blob URL                     │
│    ↓                                                             │
│  Worker reads bundled historical returns (1991-2025)            │
│    ↓                                                             │
│  10,000 simulation loop:                                        │
│    • Bootstrap ONE random year index per simulated age          │
│    • Apply that year's returns (NIFTY/debt/gold per allocation) │
│    • Apply that year's CPI to expense inflation                 │
│    • Track corpus trajectory per sim                            │
│    ↓                                                             │
│  Calculate success % at ages [70, 80, 90, 95, 100]              │
│  (success = corpus > 6mo expense buffer at age X)               │
│    ↓                                                             │
│  postMessage({type:'DONE', results}) back to main thread        │
│    ↓                                                             │
│  Main thread renders charts (bar + line with confidence band)   │
└──────────────────────────────────────────────────────────────────┘
```

**Tab independence (B5 requirement)**: Web Worker runs in background. User can switch to Tracker, Dashboard, Calculator tabs during the 10K sim run; UI remains fully responsive. Progress bar updates via Worker postMessage every 1000 sims.

**Isolation guarantee**: Zero modifications to existing calc-projections.js, calc-multigoal.js, chart.js core. Monte Carlo is a **consumer** of their state, never a modifier. Phases other than Projections are byte-identical pre/post Phase 2.

## 2. New files & changes

| File | Action | Lines (est) | Purpose |
|------|--------|------------|---------|
| **`js/historical-returns-data.js`** | NEW | ~60 | Bundle NIFTY 50, Indian debt index, gold, CPI annual returns 1991-2025 (~140 numbers). Inline citations (RBI, NSE, Wikipedia). Global `RP._historicalReturns = { nifty50: [...], debt: [...], gold: [...], cpi: [...], years: [...] }`. ~2KB minified. |
| **`js/calc-montecarlo.js`** | NEW | ~180 | Main-thread API: `RP.runMonteCarlo(inputs, callbacks)` spawns Blob-URL Worker, manages cancel, dispatches results to chart renderer. Handles Safari file:// fallback (sync chunked compute if Worker unavailable). |
| **`js/calc-montecarlo-worker.js`** | NEW | ~220 | Worker source (loaded via Blob URL, NOT concatenated). Implements: mulberry32 PRNG, bootstrap loop (10K sims), corpus trajectory tracking, success% calc per age milestone, progress reporting every 1K sims. |
| **`js/chart-montecarlo.js`** | NEW | ~160 | Canvas 2D renderer for MC results. **Primary chart**: vertical BAR chart (success% by age, color-coded per B3 thresholds). **Secondary chart**: LINE chart with 10/50/90 percentile confidence band (median corpus trajectory). Reuses Phase 1 grid/axis idioms from chart.js. |
| **`pages/tab-projections.html`** | EDIT | +~35 | Add segmented-control toggle above existing summary cards (`<div class="view-toggle"><button>Ideal Scenario</button><button>Stress Test</button></div>`). Add `<div id="mc-section" hidden>` after existing projection table: callout box + two canvas elements (`#mcSuccessChart`, `#mcConfidenceChart`) + sr-only data tables. |
| **`css/projections.css`** | EDIT | +~45 | Styles for: toggle segmented control (iOS-style pill), MC section container, chart aspect-ratio wrappers, callout box (reuse Phase 1 `.alert` pattern), threshold colors (reuse semantic tokens from multigoal.css). Dark-mode variants inherit from existing `css/dark.css` patterns. |
| **`js/sharelink.js`** | EDIT | ~8 | Append `&view=montecarlo&mcseed=N` on encode if toggle is on MC view. Parse on decode: set toggle to MC view, seed Worker with decoded `mcseed`. Backward compat: links without these params default to Ideal Scenario. |
| **`build.sh`** | EDIT | +3 | Insert 3 new script tags after `calc-tracker.js` (line 126): `<script src="js/historical-returns-data.js"></script>`, `<script src="js/calc-montecarlo.js"></script>`, `<script src="js/chart-montecarlo.js"></script>`. Worker source (`calc-montecarlo-worker.js`) NOT concatenated — loaded via Blob URL at runtime. |
| **`test-montecarlo.html`** | NEW | ~120 | Inline test runner (no framework). 8 scenarios: PRNG repeatability (seed 42 → identical sequence × 5 runs), bootstrap convergence (10K samples → mean ± 1% of historical mean), single-sim determinism (seed 99 → exact trajectory match), 100-sim vs 10K-sim success% delta (<5%), CPI sanity (inflated expense at age 80 within 20% of formula), corpus-never-negative check, Safari sync-fallback smoke test. Pass/fail rendered as DOM table. |

**Modified files summary**:
- **Zero changes** to: calc-projections.js, calc-multigoal.js, chart.js core (RP.renderChart), app.js, any tabs other than Projections
- **Additive-only changes** to: tab-projections.html (+MC section), projections.css (+MC styles), sharelink.js (+2 params), build.sh (+3 includes)

**File size budget**: +~650 lines total (~18KB raw JS, ~6KB minified). Historical data bundle adds ~2KB. Total page weight increase <10KB minified+gzipped.

## 3. Web Worker design

**Delivery mechanism**: Blob URL (B6 requirement — works on both file:// and http://).

```javascript
// In calc-montecarlo.js
const workerSource = `
  // Entire worker code as string (calc-montecarlo-worker.js content)
  importScripts() NOT available (no external deps in Worker).
  Self-contained: PRNG + bootstrap + sim loop.
`;
const blob = new Blob([workerSource], {type: 'application/javascript'});
const workerURL = URL.createObjectURL(blob);
const worker = new Worker(workerURL);
```

**Message protocol**:

| Direction | Message | Payload | When |
|-----------|---------|---------|------|
| Main → Worker | `{type:'RUN', inputs, seed}` | `inputs` = {currentAge, retirementAge, lifeExpectancy, corpus, allocation%, phases[], historicalReturns}, `seed` = int | User clicks "Run Simulation" |
| Main → Worker | `{type:'CANCEL'}` | - | User clicks cancel button mid-run OR changes inputs (500ms debounce) |
| Worker → Main | `{type:'PROGRESS', completed, total}` | `completed` = sims done so far, `total` = 10000 | Every 1000 sims |
| Worker → Main | `{type:'DONE', results, elapsedMs}` | `results` = {successByAge:{70:0.99,80:0.85,...}, percentilesByAge:{70:{p10,p50,p90},...}} | Sim complete |
| Worker → Main | `{type:'CANCELLED'}` | - | Worker acknowledged cancel, exited early |
| Worker → Main | `{type:'ERROR', message}` | `message` = error string | Exception in Worker |

**Cancel handling**: Worker sets internal `shouldCancel` flag on receiving `{type:'CANCEL'}`. Loop checks flag every 100 sims: `if (shouldCancel) { postMessage({type:'CANCELLED'}); return; }`. Clean exit, no zombie Workers.

**Safari file:// fallback** (B6 edge case): If `new Worker(blobURL)` throws SecurityError (rare, but Safari file:// can block Workers):
```javascript
try {
  worker = new Worker(blobURL);
} catch (e) {
  console.warn('Worker unavailable, falling back to sync compute:', e);
  runSyncChunkedCompute(); // 500 sims per setTimeout tick, yield to event loop
  showWarning('Simulation running in foreground — tab switching may freeze UI');
}
```

**Important**: Sync fallback **breaks** the B5 "tab-independent execution" contract. Surface warning to user. This fallback is last-resort only; all modern browsers (Chrome/Firefox/Safari on http:// or recent file://) support Blob-URL Workers.

**Worker lifecycle**: One Worker per run. Main thread terminates Worker after receiving DONE or CANCELLED: `worker.terminate(); URL.revokeObjectURL(workerURL);`. Next run spawns fresh Worker (prevents stale-state bugs).

## 4. Historical data bundle

**Data series** (4 series × 35 years each, 1991-2025):

| Series | Source | Citation | Sample (annual %) |
|--------|--------|----------|-------------------|
| **NIFTY 50** | NSE / Wikipedia | [NSE Historical Data](https://www.nseindia.com), [Wikipedia NIFTY 50](https://en.wikipedia.org/wiki/NIFTY_50) | 1991: +32%, 2008: -52%, 2020: +15% |
| **Indian Debt** | CRISIL Composite Bond Fund Index | [CRISIL](https://www.crisil.com) | 1995: +18%, 2013: -2%, 2020: +9% |
| **Gold** | MCX gold annual returns | [MCX](https://www.mcxindia.com), Wikipedia | 2011: +32%, 2013: -7%, 2020: +25% |
| **CPI** | India CPI annual % change | [RBI Database on Indian Economy](https://dbie.rbi.org.in) | 1991: +13.9%, 2008: +8.3%, 2020: +6.2% |

**Format** (`js/historical-returns-data.js`):
```javascript
RP._historicalReturns = {
  nifty50: [32.1, -10.2, 4.5, ..., 15.3],  // 35 values, 1991-2025
  debt:    [18.2, 12.0, -2.1, ..., 8.9],   // 35 values
  gold:    [6.3, -5.4, 32.0, ..., 12.1],   // 35 values
  cpi:     [13.9, 10.2, 8.3, ..., 6.2],    // 35 values
  years:   [1991, 1992, ..., 2025]         // 35 values
};
// Inline comments per array with citations:
// nifty50: NSE Historical Data (nseindia.com), Wikipedia NIFTY 50
// debt: CRISIL Composite Bond Fund Index (crisil.com)
// gold: MCX gold annual returns (mcxindia.com)
// cpi: RBI DBIE (dbie.rbi.org.in)
```

**Bootstrap rule** (preserves return-inflation correlation):
- Per simulated year, sample **ONE** random year index `i` from `[0..34]`
- Apply `nifty50[i]`, `debt[i]`, `gold[i]` to user's allocation percentages → blended return for that year
- Apply `cpi[i]` to expense inflation for that year
- **Why this matters**: CPI-spike years (e.g., 2008, 2013) often coincide with equity-down years. Sampling independently would miss this correlation and underestimate risk.

**Data quality**: Indian CPI has structural breaks (rebasing 2001, 2010, methodology change 2014). We use the **unified backfilled series** from RBI DBIE which adjusts for these breaks. NIFTY 50 pre-1996 uses Sensex as proxy (NIFTY launched 1996; Sensex is highly correlated). Gold data pre-2003 uses London Bullion Market converted to INR (MCX gold launched 2003).

**Size**: ~140 numbers × 8 bytes (float64) = ~1.1KB raw data. With JS wrapper + comments: ~2KB minified.

## 5. PRNG & reproducibility

**Algorithm**: mulberry32 (deterministic, fast, 8 lines).

```javascript
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Usage**:
```javascript
// In Worker:
const rng = mulberry32(seed); // seed from main thread
for (let sim = 0; sim < 10000; sim++) {
  for (let year = retAge; year <= lifeExp; year++) {
    const idx = Math.floor(rng() * historicalReturns.years.length);
    // Use historicalReturns.nifty50[idx], etc.
  }
}
```

**Seed sources**:
1. **New run**: `seed = Date.now()` → different result every click
2. **Share-link**: `&mcseed=1714156800` → recipient sees identical chart
3. **Test harness**: `seed = 42` (hardcoded) → 5 runs produce identical sequence

**Reproducibility contract**:
- Same seed + same inputs → **byte-identical** results (success%, percentiles)
- Different seeds → different results (expected)
- Share-link round-trip: encode current view → decode in new tab → charts match pixel-for-pixel

**Why NOT Math.random()**: Math.random() is implementation-dependent (V8 vs SpiderMonkey produce different sequences from same Date.now()). mulberry32 guarantees identical behavior across all browsers given same seed.

**Test coverage** (in test-montecarlo.html):
- Seed 42 → run 5 times → verify all 5 produce identical array `[success70, success80, ..., p50_70, p50_80, ...]`
- Seed 99 vs seed 100 → verify results differ by >1% (proves seeding works)
- Share-link encode/decode → verify decoded seed matches original

## 6. Specialists needed

Per Tech Spec section 6 convention, evaluate need for:

| Specialist | Needed? | Rationale |
|------------|---------|-----------|
| **Infra Specialist** | ❌ NO | Zero infra changes. Vanilla JS, no env vars, no CI modifications. Existing build.sh pattern (concatenation) unchanged except +3 script tags. Opens via file:// or `python3 -m http.server` per existing Phase 1 pattern (B6 locked). |
| **DB Specialist** | ❌ NO | No database, no schema, no migrations. All state client-side (in-memory results, localStorage for toggle state only). |
| **Support Lead** | ❌ NO | Personal-use tool (Pardha is the user per Phase 1 Q4). No operational complexity, no user-facing error states requiring runbook. Client-side-only failures (Worker crash, OOM) logged to console; user refreshes page to recover. No on-call concerns. |

**Conclusion**: NO on-demand specialists. Stage 3 will spawn:
- **FE Lead** (formality — all work is FE, no BE)
- **BE Lead** (formality — no BE work, but PDLC protocol requires both leads)
- **QA Lead** (writes test plan, executes E2E Playwright tests)

Director-Eng validation at Stage 1 covers tech-stack choices (Section 5 confirms zero new dependencies → nothing to validate).

## 7. Test strategy

**Unit tests** (`test-montecarlo.html`, inline DOM renderer, no framework):

| Scenario | Input | Expected output | Pass condition |
|----------|-------|-----------------|----------------|
| **PRNG repeatability** | Seed 42, run 5 times | All 5 runs produce identical 20-float array `[rng(), rng(), ..., rng()]` | Arrays match byte-for-byte |
| **Bootstrap convergence** | 10K samples from historical NIFTY, compute mean | Mean within ±1% of historical mean (1991-2025 actual avg ≈ 12%) | `abs(sampleMean - 12) < 0.12` |
| **Single-sim determinism** | Seed 99, same inputs, run twice | Corpus trajectory at ages [70,80,90,100] match exactly | `trajectory1 === trajectory2` |
| **100-sim vs 10K-sim convergence** | Same seed, run 100 sims → success%, then 10K sims → success% | Delta <5% for all age milestones | `abs(s100 - s10k) < 0.05` |
| **CPI sanity** | Baseline ₹50k/mo expense, age 28→80 (52 years), bootstrap CPI | Inflated expense at 80 within 20% of formula `50k * (1+avgCPI)^52` | Accounts for variance |
| **Corpus never negative** | 10 sims, random seeds | Every sim's corpus trajectory has `min(corpus) >= 0` after flooring | No negative values post-floor |
| **Safari sync-fallback smoke** | Force Worker throw (stub `new Worker` to throw), run 100 sims | Sync compute completes, success% in valid range [0,1] | No crash, results valid |
| **Zero-phase handling** | Empty `phases[]` array | Expense = 0 for all ages, success% = 100% (corpus never depletes) | `success === 1.0` all ages |

**Pass/fail UI**: Green ✓ / Red ✗ badges per scenario, rendered in DOM table. No assertions framework — plain `if (actual === expected)` checks.

**Integration tests** (manual smoke, Stage 4):
- Toggle Ideal ↔ MC preserves state (localStorage `rp_projection_view`)
- Share-link encode → decode preserves seed + view (URL param `&mcseed=N&view=montecarlo`)
- Input change mid-run triggers cancel + restart (500ms debounce)
- Progress bar updates (1K, 2K, ..., 10K sims) without freezing UI

**E2E tests** (Playwright, Stage 4-5, owned by QA Lead):
```javascript
// Smoke: full 10K sim completes
await page.goto('file://.../index.html');
await page.click('[data-tab="projections"]');
await page.click('button:has-text("Stress Test")');
await page.waitForSelector('#mcSuccessChart', {timeout: 12000}); // 10K sims ~5-8s + render
const bars = await page.locator('#mcSuccessChart').screenshot();
expect(bars).toBeTruthy(); // Chart rendered

// Cancel mid-run
await page.click('button:has-text("Stress Test")');
await page.waitForSelector('.mc-progress-bar'); // Progress visible
await page.click('button:has-text("Cancel")');
await page.waitForSelector('.mc-section.hidden'); // MC section hidden

// Tab switch during sim (B5 contract)
await page.click('button:has-text("Stress Test")');
await page.click('[data-tab="dashboard"]'); // Switch tab mid-sim
await page.waitForTimeout(3000); // Let sim continue in background
await page.click('[data-tab="projections"]'); // Back to Projections
await page.waitForSelector('#mcSuccessChart'); // Sim completed, chart visible
```

**Regression guardrail**: All Phase 1 tests must pass. Run existing manual smoke on tabs [basics, expenses, investments, dashboard, multigoal, tracker] — verify byte-identical behavior pre/post Phase 2 merge.

**Performance test** (manual, Stage 4):
- 10K sims on 2020 MacBook Air (M1) must complete in <8s (B5 locked)
- Measure via Worker `elapsedMs` field in DONE message
- If >8s: reduce to 5K sims OR show warning "Close other tabs for faster results"

## 8. Build & deploy

**Build process** (unchanged from Phase 1, additive only):

1. Developer runs `./build.sh` from `retirement-planner/` directory
2. Script concatenates 3 new JS files into `index.html` between existing `<script>` tags:
   ```bash
   # build.sh line 126 (after calc-tracker.js, before sharelink.js):
   <script src="js/historical-returns-data.js"></script>
   <script src="js/calc-montecarlo.js"></script>
   <script src="js/chart-montecarlo.js"></script>
   ```
3. Worker source (`calc-montecarlo-worker.js`) stays as **separate file** in `js/` directory — NOT concatenated, loaded via Blob URL at runtime
4. Cache-busting versioning (existing Phase 1 pattern) auto-applies: `?v=20260430HHMMSS` appended to all CSS/JS references

**No new external dependencies**:
- Zero npm packages
- Zero CDN links
- Zero build tooling changes (no webpack, no babel, no minifier — raw ES6+ concatenation per existing pattern)

**Deployment** (local-first per B6):

| Mode | Command | Notes |
|------|---------|-------|
| **file://** | Open `index.html` directly in browser | Worker via Blob URL works. Safari file:// edge case falls back to sync compute (warning shown). |
| **localhost** | `cd retirement-planner && python3 -m http.server 8000` then open `http://localhost:8000` | Preferred for development. Worker always works. No CORS issues. |

**No server-side logic**: Phase 2 is 100% client-side JavaScript (matches Phase 1). No backend, no API endpoints, no database. Historical data bundle ships as static JS file.

**Rollback plan** (if critical bug found post-merge):
1. Comment out 3 script tags in `build.sh` (lines ~126-128)
2. Hide MC toggle in `tab-projections.html` (wrap toggle in `<!-- ... -->`)
3. Re-run `./build.sh`
4. Result: Projections tab reverts to Phase 1 behavior (Ideal Scenario only), zero risk to other tabs
5. Recovery time: <2 minutes

**Git workflow** (matches Phase 1 PDLC pattern):
- Branch: `phase-2` (already created, diverged from `main` at commit 615f8cd)
- Feature commits during Stage 4-5 → squash-merge to `phase-2` at Stage 8
- Final PR: `phase-2` → `main` after CEO launch approval (Stage 8)
- No force-push to main (per git safety protocol)
