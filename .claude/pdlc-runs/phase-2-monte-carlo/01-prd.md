# PRD — Phase 2 Monte Carlo Stress Test

Owner: pdlc-product-manager
Date: 2026-04-30
Status: DRAFT

## 1. Problem & Users

### Problem
Phase 1 (multi-goal early retirement planner) shipped a deterministic year-by-year projection model: one inflation rate (6%), one expected return per asset class (12% equity, 8% debt, 10% gold), one withdrawal path. This model answers the question "If everything goes as planned, will I have money?" It does NOT quantify **risk of ruin** — the probability that market randomness will deplete the corpus before death.

For a 35-year-old planning 60+ years of retirement, deterministic models are dangerously overconfident. Real markets have:
- Fat-tail return distributions (2008 crash, 2020 pandemic)
- Sequence-of-returns risk (retiring right before a crash vs right after matters enormously)
- Inflation volatility (Indian CPI ranged 1.5%-12% across 1991-2025)

The user (Pardha) explicitly requested a **"Stress Test"** view using Monte Carlo simulation to answer: "Given that markets are random, what's the probability I'll have money at age 70? 80? 95?" This is standard practice in financial planning (4% rule research, FIRECalc, Personal Capital use Monte Carlo) but missing from Phase 1.

**Source**: Direct user request (00-intake.md:16-30), validated via CEO decision doc (Phase 1 shipped successfully, Phase 2 backlog confirmed Monte Carlo as #1 priority).

### Users
**Primary user**: Pardha — sole owner of the retirement planner app, Indian FIRE community member, planning early retirement before age 45 with 60+ year time horizon.

**User count**: 1 for v1 (personal tool). Potential expansion to N if open-sourced to Indian FIRE community later.

**User characteristics**:
- Financially literate (understands concepts like probability, percentile, historical backtesting)
- Already completed Phase 1 deterministic plan (has inputs: retirement age, life expectancy, asset allocation, monthly SIP)
- Needs to **quantify confidence** in the plan, not just see one optimistic path
- India-resident: uses Indian market data (NIFTY 50, Indian debt index, gold, Indian CPI)

**NO invented personas** — Pardha is the real user. Do NOT create "Priya, 32, risk-averse investor" or similar synthetic characters.

## 2. Goals & Non-Goals

### Goals (measurable)

**Goal 1: Quantify plan robustness via success% at 4-5 milestone ages**
- **Metric**: Success Rate at each milestone age (defined as "corpus > 6 months expense buffer in X% of 10,000 simulations")
- **Target**: User can see success% for at least 5 ages between retirement and life expectancy (e.g., 70, 80, 90, 95, 100 for a retire-at-35 plan)
- **Baseline**: N/A — Phase 1 had no probabilistic modeling, only deterministic single-path projection
- **Source**: Pardha BLOCKER answer B1 (00-intake-assumptions.md:11)

**Goal 2: Model stochastic inflation alongside stochastic returns**
- **Metric**: Monte Carlo engine bootstraps BOTH asset returns AND Indian CPI from historical 1991-2025 data
- **Target**: Each of 10,000 simulations uses a randomly resampled inflation rate per year (not fixed 6%)
- **Baseline**: Phase 1 used fixed 6% inflation for all years; real Indian CPI ranged 1.5%-12%
- **Source**: Pardha BLOCKER answer B2 (00-intake-assumptions.md:12)

**Goal 3: Communicate risk via plain-English thresholds mapped to 4-tier color scheme**
- **Metric**: Callout box renders text "Your plan is great until age X, OK from X-Y, risky from Y-Z, likely to fail after Z" using ≥85% green / 75-84% blue / 50-74% amber / <50% red thresholds
- **Target**: User reads ONE sentence and understands where their plan gets dangerous, without parsing raw success percentages
- **Baseline**: N/A — new capability
- **Source**: Pardha BLOCKER answer B3 (00-intake-assumptions.md:13)

**Goal 4: Provide multiple chart types for deeper exploration**
- **Metric**: UI displays primary Success Rate vs Age bar chart PLUS at least 2 supporting visualizations (e.g., line chart showing median corpus over time, lollipop chart of percentile ranges, heatmap of failure clusters)
- **Target**: UI Designer in Stage 1 specifies exact chart mix; Tech implements all specified charts
- **Baseline**: N/A — new capability
- **Source**: Pardha BLOCKER answer B4 (00-intake-assumptions.md:14)

**Goal 5: Enable background simulation while user navigates other tabs**
- **Metric**: Monte Carlo runs in Web Worker; user can switch to Dashboard/Tracker/Calculator tabs while sim continues; progress bar updates in real-time
- **Target**: 10,000 simulations complete in <8s on 2020+ MacBook Air; UI never freezes
- **Baseline**: Phase 1 had no long-running compute; all calculations synchronous <100ms
- **Source**: Pardha BLOCKER answer B5 (00-intake-assumptions.md:15) — Web Worker is MANDATORY, not optional

### Non-Goals

What this feature explicitly does NOT do (critical for scope discipline):

1. **Modify existing Phase 1 tabs** — Dashboard, Tracker, Calculator, Multi-Goal Allocator, Financial Plan tabs remain byte-identical. Only Projections tab gains the toggle + new view.
2. **Replace the Year-by-Year deterministic table** — the existing Ideal Scenario table stays accessible via toggle; Monte Carlo is additive overlay, not replacement.
3. **Model mid-retirement income changes** (promotions, side gigs, kids contributing financially during parents' retirement) — Monte Carlo models expense side + corpus depletion only, matching Phase 1 scope.
4. **Tax modeling within Monte Carlo** — uses post-tax return assumptions (same as Phase 1); no capital gains / LTCG / tax-loss harvesting modeling.
5. **Withdrawal-strategy comparison** — v1 models fixed monthly withdrawals (inflation-adjusted). Does NOT compare 4% rule vs guardrails vs bucket strategy.
6. **User-uploaded custom historical data** — Monte Carlo uses bundled Indian market returns 1991-2025; user cannot upload their own CSV of returns.
7. **Show individual simulation paths** (ribbon/spaghetti chart of all 10,000 trajectories) — deferred to v2; v1 shows aggregate success% only.
8. **Backend persistence of MC results** — simulations run client-side, results stored in-memory only (shareable via URL seed param, but not saved server-side).
9. **Telemetry / analytics instrumentation** — no event tracking, no A/B testing, no usage heatmaps. Matches Phase 1 (personal tool, no backend).
10. **Native mobile app** — web-only, responsive down to 375px viewport (iPhone SE), but no iOS/Android native wrapper.

## 3. User stories

**US1**: As Pardha, I want to toggle between "Ideal Scenario" (deterministic) and "Stress Test (Monte Carlo)" views at the top of the Projections tab, so that I can compare the optimistic single-path plan against a probabilistic stress test without losing the original Year-by-Year table.

**US2**: As a FIRE planner with a 60-year retirement horizon, I want to see success% at 5+ milestone ages (70, 80, 90, 95, 100), so that I understand WHEN my plan starts to fail (e.g., "great until 80, risky after 90") rather than just one overall success number.

**US3**: As a user running 10,000 Monte Carlo simulations, I want to see a real-time progress bar and be able to cancel mid-run if I realize I entered wrong inputs, so that I don't wait 8 seconds for a useless result.

**US4**: As a multitasker, I want the Monte Carlo simulation to run in the background while I navigate to the Dashboard or Tracker tab to check my current savings, so that I can use other parts of the app without waiting for the sim to finish.

**US5**: As a financially literate user, I want Monte Carlo to bootstrap BOTH historical asset returns (NIFTY/debt/gold) AND Indian CPI inflation, so that the stress test reflects real-world volatility in both growth and cost-of-living, not just optimistic fixed 6% inflation.

**US6**: As a user who finds raw percentages hard to interpret, I want a plain-English callout that says "Your plan is great until age 80, OK from 80-90, risky from 90-95, likely to fail after 95" using color-coded thresholds, so that I know at a glance where my plan breaks down.

**US7**: As a user sharing my retirement plan with a financial advisor, I want the Monte Carlo view to include a reproducible seed in the share-link URL (`&mcseed=12345`), so that my advisor sees the exact same chart and success% when they open the link.

**US8**: As a user exploring different visualizations, I want to see multiple chart types beyond just the primary Success Rate vs Age bar chart (e.g., median corpus over time, percentile ranges), so that I can dig deeper into what drives the failure modes.

**US9**: As a user whose plan shows <75% success at any milestone age, I want to see a clear call-to-action ("Adjust Investment →") that links me to the Calculator tab with auto-focus on the monthly investment input, so that I know exactly where to go to fix the underfunding.

**US10**: As a new user who hasn't set retirement age yet, I want to see an empty state message ("Set your retirement age in the Calculator tab") instead of a broken chart, so that I understand what inputs are missing before Monte Carlo can run.

## 4. Acceptance criteria

**AC1: Toggle button renders and switches views instantly**  
Given: User opens Projections tab with valid retirement inputs (age 35, retire 45, life expectancy 100, corpus ₹5 crore)  
When: User clicks toggle at top of page from "Ideal Scenario" to "Stress Test (Monte Carlo)"  
Then: View switches in <100ms; Year-by-Year table disappears; Monte Carlo charts/empty-state appears; no page reload; toggle state persists to localStorage `rp_projection_view`

**AC2: Ideal Scenario view is byte-identical to Phase 1 (no regression)**  
Given: User has completed Phase 1 setup (retirement age, asset allocation, monthly SIP)  
When: User loads Projections tab with toggle in "Ideal Scenario" position  
Then: Year-by-Year table renders exactly as in Phase 1 final build (commit 615f8cd) — same columns, same corpus values row-by-row, same formatting, no layout shifts

**AC3: Monte Carlo runs 10,000 simulations with historical bootstrap**  
Given: User clicks toggle to "Stress Test (Monte Carlo)" with valid inputs  
When: User clicks "Run Simulation" button (or sim auto-starts on toggle if inputs complete)  
Then: Web Worker spawns, runs exactly 10,000 simulations, each simulation resamples (with replacement) annual returns from bundled historical dataset (NIFTY 50 1991-2025, Indian debt index 1991-2025, gold 1991-2025, Indian CPI 1991-2025)

**AC4: Simulation completes in <8 seconds on target hardware**  
Given: User on 2020+ MacBook Air (M1 or Intel i5) with Chrome 120+  
When: User runs 10,000 Monte Carlo simulations  
Then: Progress bar shows "Running 10,000 simulations… 10000/10000" and "Complete!" message appears within 8 seconds of start; console logs wall-clock time "MC done in 6.2s, 1612 sims/sec"

**AC5: Progress bar updates in real-time during simulation**  
Given: User initiates Monte Carlo run  
When: Simulation is running (e.g., 4,000/10,000 complete)  
Then: UI shows progress bar filled to 40%, text "Running 10,000 simulations… 4000/10000", and a "Cancel" button that's clickable; UI remains responsive (user can scroll, hover other elements)

**AC6: User can navigate to other tabs while simulation runs (Web Worker mandatory)**  
Given: User starts Monte Carlo simulation in Projections tab  
When: User clicks on "Dashboard" tab in Project group nav while sim is at 3,000/10,000  
Then: Dashboard tab loads instantly; user can interact with charts; when user returns to Projections tab, progress bar shows current state (e.g., 7,500/10,000); sim completes in background and chart renders when done

**AC7: Cancel button stops simulation within 1 second**  
Given: User starts Monte Carlo simulation, reaches 5,000/10,000  
When: User clicks "Cancel" button  
Then: Within 1s, progress bar disappears, UI returns to pre-sim state (empty chart placeholder or previous result if one existed), console logs "MC cancelled by user at 5123/10000"

**AC8: Success Rate vs Age chart shows 4-5 milestone ages with color-coded bars**  
Given: User retires at age 35, life expectancy 100  
When: Monte Carlo completes 10,000 simulations  
Then: Primary bar chart displays 5 bars for ages [45, 58, 71, 84, 97] (evenly spaced, clamped to [retAge+1, lifeExpectancy]), each bar height = success% at that age, bar color = green if ≥85% / blue if 75-84% / amber if 50-74% / red if <50%; Y-axis labeled "Success Rate (%)", X-axis labeled "Age"; chart title "Probability of Having Money at Key Ages"

**AC9: Plain-English callout renders above charts with 4-tier messaging**  
Given: Monte Carlo results show success% [age 45: 99%, age 60: 92%, age 75: 68%, age 90: 38%, age 100: 12%]  
When: Chart renders  
Then: Callout box above chart displays: "**Your plan is great until age 60** (≥85% success), **OK from 60-75** (75-84%), **risky from 75-90** (50-74%), and **likely to fail after 90** (<50%)." Text segments colored to match bar chart: green/blue/amber/red.

**AC10: CTA shown when success% drops below 75% at any milestone**  
Given: Monte Carlo results show age 80 has 68% success (amber tier)  
When: Callout box renders  
Then: Below the plain-English summary, a secondary line appears: "💡 **Tip**: Your plan becomes risky after age 75. [Adjust Investment →]" where the bracketed text is a clickable link to Calculator tab; clicking it scrolls to and auto-focuses the "Monthly Investment" input field.

**AC11: Toggle state persists across page reloads**  
Given: User switches toggle to "Stress Test (Monte Carlo)"  
When: User reloads the page (Cmd+R)  
Then: Projections tab loads with toggle still in "Stress Test (Monte Carlo)" position; if previous MC result exists in sessionStorage, it re-displays; if not, empty state shows

**AC12: Share-link URL includes Monte Carlo view and seed for reproducibility**  
Given: User runs Monte Carlo with default seed (e.g., timestamp seed 1714521234)  
When: User clicks "Generate Sharelink"  
Then: URL includes `&view=montecarlo&mcseed=1714521234`; when recipient opens link, toggle auto-switches to Stress Test view, re-runs MC with seed 1714521234, produces identical chart (same success% at each age, deterministic due to seeded PRNG)

**AC13: Empty state when retirementAge missing**  
Given: User has NOT set retirement age in Calculator tab (field is blank or 0)  
When: User switches to "Stress Test (Monte Carlo)" view in Projections  
Then: Chart area shows gray placeholder card with icon, heading "Missing Inputs", message "Set your retirement age in the Calculator tab to run Monte Carlo projections", and a "Go to Calculator →" CTA button

**AC14: Mobile responsive at 375px viewport (iPhone SE)**  
Given: User opens Projections tab on 375px × 667px viewport (Chrome DevTools iPhone SE preset)  
When: User toggles to "Stress Test (Monte Carlo)" and runs simulation  
Then: Toggle stacks vertically (labels readable without overflow), progress bar fits width, bar chart reflows (bars remain vertical, narrower, age labels horizontal or stacked below), callout text wraps cleanly, all touch targets ≥44px, no horizontal scroll

**AC15: Dark mode renders all 4 threshold colors with WCAG AA contrast**  
Given: User enables dark mode toggle (Phase 1 feature)  
When: User views Monte Carlo chart with all 4 color tiers (green/blue/amber/red bars)  
Then: All bar colors meet WCAG 2.1 Level AA contrast ratio (≥4.5:1) against dark panel background (#1a1a1a or similar); sr-only data table fallback includes `<table>` with Age / Success% / Status columns for screen readers, visually hidden but present in DOM below chart

## 5. Success metrics

How we know post-launch this worked (personal validation scope, no analytics):

**Metric 1: Performance — 10K sims in <8s**
- **What**: Wall-clock time from "Run Simulation" click to chart render complete
- **Target**: ≤8.0 seconds on 2020+ MacBook Air (M1 or Intel i5), Chrome 120+
- **Baseline**: N/A — new capability
- **Measurement**: `console.info('MC done in 6.2s')` log, manual stopwatch during bug bash
- **Dashboard**: None (manual check)
- **Time horizon**: Stage 4 implementation completion + Stage 8 bug bash

**Metric 2: Visual clarity — 5+ milestone ages shown**
- **What**: Number of age bars displayed in Success Rate vs Age chart
- **Target**: Exactly 4-5 bars (adaptive based on retirement age and life expectancy, clamped to [retAge+1, lifeExpectancy], evenly spaced)
- **Baseline**: N/A — Phase 1 had no age-based success visualization
- **Measurement**: Manual count of bars in chart; automated test in `test-montecarlo.html` asserts `chartBars.length >= 4 && chartBars.length <= 5`
- **Dashboard**: None
- **Time horizon**: Stage 4 implementation completion

**Metric 3: UI responsiveness — toggle <100ms**
- **What**: Latency from toggle click to view switch complete (DOM repaint)
- **Baseline**: N/A — new toggle
- **Target**: <100ms (measured via Chrome DevTools Performance tab or manual observation "feels instant")
- **Measurement**: Manual check during bug bash; no automated timing test
- **Dashboard**: None
- **Time horizon**: Stage 8 bug bash

**Metric 4: No Phase 1 regression**
- **What**: Byte-identical rendering of Ideal Scenario (Year-by-Year table) compared to Phase 1 final build (commit 615f8cd)
- **Target**: All 25 Phase 1 tests still pass; visual diff of Ideal Scenario table = zero pixel changes
- **Baseline**: 25/25 tests passing in Phase 1
- **Measurement**: Run `test-projections.html` (Phase 1 test suite) after Phase 2 implementation; manual visual comparison of table screenshots (Phase 1 final vs Phase 2 with toggle in Ideal position)
- **Dashboard**: None
- **Time horizon**: Stage 4 implementation completion + Stage 8 regression check

**Metric 5: Plain-English rendering correctness**
- **What**: Callout box above chart displays thresholded message using correct age ranges and tier labels (great/OK/risky/fail)
- **Target**: 100% accuracy across 3 test scenarios (all-green plan, mixed plan, all-red plan) in `test-montecarlo.html`
- **Baseline**: N/A — new capability
- **Measurement**: Automated test asserts callout text matches expected string for each scenario; manual visual check during bug bash
- **Dashboard**: None
- **Time horizon**: Stage 4 implementation completion

**Post-launch validation (Pardha-specific)**:
- Pardha completes one full Monte Carlo run with his real retirement inputs (age, corpus, asset allocation)
- Pardha confirms in retro: "The success% numbers make sense" AND "The plain-English callout helped me understand where my plan gets risky"
- If Pardha says "I don't trust these numbers" or "The message is confusing" → root-cause in retro, iterate math/UX in v1.1

## 6. Out of scope

Items explicitly considered but deferred to v2 or never:

**Deferred to v2** (might build later based on Pardha feedback):
1. **Sequence-of-returns risk metric** — Show not just success%, but also "average age of first depletion" or "volatility drag" as separate numbers. V1 shows success% only.
2. **Withdrawal-strategy comparison** — Model 4% rule vs guardrails vs dynamic spending vs bucket strategy side-by-side. V1 uses fixed monthly withdrawals (inflation-adjusted, matching Phase 1).
3. **Tax modeling within Monte Carlo** — Account for LTCG tax on equity withdrawals, indexation benefits on debt, etc. V1 uses post-tax return assumptions (same as Phase 1 deterministic model).
4. **User-uploaded custom historical data** — Let user CSV-upload their own return series or synthetic scenarios. V1 uses bundled Indian market data 1991-2025 only.
5. **Individual simulation paths display** — Ribbon/spaghetti chart showing all 10,000 trajectories overlaid (like FIRECalc). V1 shows aggregate success% only; exploring individual paths deferred.
6. **Median/percentile corpus visualization** — Show P10/P25/P50/P75/P90 corpus at each age in a percentile fan chart. Matches 00-intake-assumptions.md A27 "success% only for v1". Reconsider in v2 if Pardha requests.
7. **Backend persistence of MC results** — Save last run's 10,000 simulation trajectories to server for later retrieval. V1 runs client-side only; results live in sessionStorage, sharable via URL seed only.
8. **Comparison view (deterministic vs Monte Carlo)** — Side-by-side table showing "Ideal Scenario says you're safe until 100, Stress Test says 68% fail by 90." Deferred per 00-intake-assumptions.md parallel to Phase 1 multi-goal AC16.
9. **Randomized income modeling** — Monte Carlo on expense side + corpus depletion only. Does NOT model stochastic mid-retirement income (windfall inheritance, lottery, rental income spikes). Out of scope per 00-intake.md:68 "no mid-retirement income changes."
10. **Monte Carlo on pre-retirement accumulation phase** — V1 models retirement phase only (post-retirementAge). Randomizing monthly SIP returns during accumulation deferred to v2.
11. **Multi-currency or international data** — India-specific (NIFTY, Indian debt, Indian CPI) only. No S&P 500, no US CPI, no currency conversion.
12. **A/B testing toggle position** — Toggle placement at top of Projections tab is locked per 00-intake.md:48. No experimentation with sidebar placement, floating button, etc.
13. **Mobile native app** — Web-responsive only (down to 375px). No iOS/Android wrapper, no offline-first PWA with service worker (beyond what Phase 1 already has).
14. **Telemetry / usage analytics** — No event tracking ("user clicked toggle 3 times"), no heatmaps, no error reporting to Sentry. Matches Phase 1 (no backend, personal tool).

**Explicitly NEVER** (anti-scope, hard no):
15. **Replacing the Year-by-Year deterministic table** — It stays. Toggle makes both views accessible; Monte Carlo is additive, not a replacement.
16. **Touching Phase 1 tabs** (Dashboard, Tracker, Calculator, Multi-Goal Allocator, Financial Plan) — Only Projections tab changes. Other tabs stay byte-identical.
17. **Requiring npm / build toolchain change** — Vanilla JS only. No React, no Vue, no Vite. Build via existing `build.sh` concatenator (manual file list edit to add 3 new JS files).

## 7. Risks & mitigations

**Risk 1: Web Worker fails on Safari file:// protocol**  
**Impact**: BLOCKER — violates Goal 5 (background execution mandatory per Pardha B5) and hard constraint (app must work on both file:// and localhost per B6)  
**Likelihood**: Medium — Safari restricts Workers on file:// in some versions; Blob URL fallback pattern exists but untested on Pardha's Safari version  
**Mitigation**: Tech Lead MUST spike this in Stage 1 before Gate A. If Blob URL fails, fallback options: (a) require localhost-only for Monte Carlo, (b) chunked sync compute with `requestIdleCallback` (but violates "fully background" contract), (c) warn user "Safari file:// not supported, use Chrome or localhost." Surface at Gate A if spike shows blockers.  
**Owner**: Tech Lead

**Risk 2: Historical CPI dataset quality (structural breaks post-2014)**  
**Impact**: High — if Indian CPI methodology changed in 2014 (base year rebasing, basket changes), pre-2014 vs post-2014 data are not apples-to-apples; bootstrap resampling would mix incompatible inflation regimes  
**Likelihood**: Medium — RBI rebased CPI-IW to 2012 base in 2014; urban vs combined CPI series may differ  
**Mitigation**: Tech Lead validates dataset source in Stage 1 (cite RBI official series, check for breaks). If break confirmed, either (a) use post-2014 data only (reduces sample size to ~10 years, increases sampling variance), (b) adjust pre-2014 data via splicing factor, or (c) use two separate inflation pools (pre/post-2014) and document assumption. Decision at Gate A.  
**Owner**: Tech Lead

**Risk 3: Multi-chart layout density clutters Projections tab**  
**Impact**: Medium — Pardha B4 requested "multiple charts" (primary + 2 supporting); if all 3 render full-size, mobile viewport becomes a scroll marathon; if shrunk, charts become unreadable  
**Likelihood**: Medium — Phase 1 Projections tab already has 4 summary cards + Year-by-Year table; adding 3 more charts risks cognitive overload  
**Mitigation**: UI Designer in Stage 1 wireframes must solve for density. Options: (a) tabs/accordion within Monte Carlo view ("Success Rate | Median Corpus | Percentiles"), (b) progressive disclosure (primary chart always visible, "+ Show More Charts" expands), (c) drop to 1 primary chart for v1, defer supporting charts to v2. Design decision at Gate A.  
**Owner**: UI Designer

**Risk 4: Performance budget miss (>8s on slower hardware)**  
**Impact**: High — violates success metric #1; if Pardha's actual machine (not just "2020+ MacBook Air" assumption) takes 12s, user will perceive Monte Carlo as broken/slow  
**Likelihood**: Low-Medium — 10K sims with 4 asset classes + 60 years × 10K = 600K year-steps is compute-heavy; Chrome V8 JIT helps but older Intel chips or thermal throttling could exceed 8s  
**Mitigation**: Tech Lead implements perf measurement in Stage 1 spike (log sims/sec, profile hot loops). If >8s on target hardware: (a) reduce to 5K sims (still statistically valid for 1% precision), (b) SIMD optimization via WebAssembly (overkill but possible), (c) document "close other tabs for best performance" warning. Measure on Pardha's ACTUAL machine during Stage 8 bug bash, not just dev machine.  
**Owner**: Tech Lead + QA Lead (bug bash validation)

**Risk 5: Share-link URL length cap (browser/server limits)**  
**Impact**: Low — if Monte Carlo state (seed + view flag + existing plan base64) exceeds ~2000 chars, URL becomes uncopyable or breaks on paste  
**Likelihood**: Low — Phase 1 sharelinks are ~800 chars; adding `&view=montecarlo&mcseed=1714521234` adds ~35 chars; well below 2K limit  
**Mitigation**: If edge case user has extremely long profile name or notes, warn at sharelink generation "URL too long, shorten profile name." No code change needed unless discovered in testing.  
**Owner**: QA Lead (edge case testing)

**Risk 6: Phase 1 regression (toggle/new code breaks existing Ideal Scenario)**  
**Impact**: CRITICAL — violates hard constraint #1 ("don't disturb Phase 1 work") and success metric #4  
**Likelihood**: Medium — adding toggle logic + new JS files risks namespace collision, CSS bleed, or accidental mutation of shared state (e.g., corpus calculation shared between deterministic and MC)  
**Mitigation**: (a) Namespace all Monte Carlo code (`window.MonteCarloEngine = {}`) to avoid globals collision, (b) run full Phase 1 test suite (`test-projections.html`) after every Stage 4 implementation checkpoint, (c) visual regression test via screenshot diff (Ideal Scenario table Phase 1 vs Phase 2), (d) QA Lead includes "Phase 1 smoke test" in Stage 8 task list. Zero tolerance for regression — if found, MUST fix before Gate B.  
**Owner**: Tech Lead (isolation) + QA Lead (regression suite)

**Risk 7: PRNG seed collision / non-determinism despite seeding**  
**Impact**: Medium — if seeded mulberry32 PRNG produces different results across browsers (due to floating-point rounding differences), sharelinks become non-reproducible ("I see 85% success, you see 87% success")  
**Likelihood**: Low — mulberry32 is integer-based, deterministic; but bootstrap resampling + corpus math involves floats; IEEE 754 differences between Chrome/Firefox/Safari could cause divergence  
**Mitigation**: (a) Use integer arithmetic where possible (store corpus in paise not rupees to avoid decimals), (b) include browser + version in sharelink metadata (not in URL, just in UI footer: "Simulated with Chrome 120"), (c) document "results may vary slightly across browsers" in help text. Acceptable tolerance: ±1% success rate difference. Test cross-browser in Stage 8.  
**Owner**: Tech Lead + QA Lead (cross-browser validation)
