# PM questions — Phase 2 Monte Carlo

Author: pm-q
Date: 2026-04-29

Format per question:
- **Severity**: BLOCKER | NICE-TO-RESOLVE
- **Why**: ...
- **Default if NICE**: ...
- **Options if BLOCKER**: ...

---

## Q1 — Success definition for Monte Carlo runs

**Severity**: BLOCKER

**Why**: Each of the 10,000 simulated paths reaches different ages. We need a clear definition of "success" to count toward the success% shown at each age. Pardha said "I need best" when asked. The orchestrator recommended "corpus > 6-month expense buffer at given age" but this must be validated by PM.

**Options**:
1. **Corpus > 0 at age X** (simplest) — binary survive/fail. Problem: even ₹1 left counts as success, not realistic.
2. **Corpus > 6-month expense buffer at age X** (RECOMMENDED) — safe margin, accounts for sequence risk. A 70-year-old with ₹0 corpus is different from one with ₹3L when monthly expenses are ₹50k. This gives breathing room.
3. **Corpus > 50% of remaining lifetime expenses** — more conservative. Problem: expensive to compute mid-sim, needs full lookahead.
4. **Dual metric** — "survived to age X" AND "corpus > 1-year expenses" — combines both. Problem: complicates UI messaging.

**PM recommendation**: Option 2 (6-month buffer). Rationale: aligns with emergency fund best practices, computationally cheap (6 × monthly expense at age X), actionable ("you need buffer, not just ₹1 left"). Plain English: "At age 80, in 85% of simulations, you still had at least 6 months' expenses saved."

## Q2 — Age points for success% display

**Severity**: NICE-TO-RESOLVE

**Why**: The intake says "show success% at age 70, 80, 90, 100" but users may have `lifeExpectancy` set to 85 or 95. Do we always show those 4 fixed ages (even if they exceed life expectancy), or adapt the list to the user's inputs?

**Default**: Clamp age points to range `[retirementAge+1, lifeExpectancy]` and pick 4-5 evenly spaced milestones. Example: if retirementAge=35, lifeExpectancy=85, show ages 45, 55, 65, 75, 85. If lifeExpectancy=100, show 50, 65, 80, 95, 100. This keeps the chart relevant to the user's actual timeline.

**Alternative**: Always show 70/80/90/100 regardless of inputs, graying out ages beyond lifeExpectancy. Simpler code but less personalized.

**PM default for PRD**: Adaptive age points, clamped to user's retirement-to-life-expectancy range, 4-5 milestones evenly spaced.

## Q3 — Plain-English interpretation thresholds

**Severity**: NICE-TO-RESOLVE

**Why**: The intake says show "Your plan is great until 80, risky after that." We need concrete % thresholds that trigger each message tier (great / OK / risky / likely fail).

**Default** (opinionated but rooted in financial planning norms):
- **≥90% success** → "Great" (green) — exceeds industry standard for safe withdrawal planning
- **75-89% success** → "OK" (yellow) — acceptable risk for early retirees who can adjust, but monitor closely
- **50-74% success** → "Risky" (orange) — coin-flip territory, action required (work longer, spend less, de-risk)
- **<50% success** → "Likely to fail" (red) — plan is underfunded at this age, high chance of depletion

**Example message**: "Your plan is **great until age 75** (92% success), **risky from 80-90** (68% success), and **likely to fail after 95** (38% success). Consider working 2 more years or reducing empty-nest expenses by 15%."

**PM default for PRD**: Use these 4 tiers. Tech can bikeshed exact % cutoffs, but the principle holds: high bar for "great", actionable middle tier, urgent red zone.

## Q4 — Empty and error states

**Severity**: NICE-TO-RESOLVE

**Why**: What should the UI show when: (a) retirementAge is not set, (b) Monte Carlo sim is running (0-100% progress), (c) Web Worker crashes mid-sim?

**Default**:
- **No retirementAge set**: Show placeholder message in Stress Test view: "Set your retirement age in the Calculator tab to run Monte Carlo analysis." (Same pattern as existing Projections tab when inputs are incomplete.)
- **Sim running**: Replace chart/table with spinner + progress bar ("Running 10,000 simulations… 47%"). Cancel button to abort if user changes inputs.
- **Sim crashed**: Toast error: "Simulation failed. Please refresh and try again. If issue persists, contact support." (No "support" contact exists, so realistically: "refresh and try again"). Log error to console for Pardha's debugging.

**PM default for PRD**: Standard progressive-disclosure pattern. Match existing Calculator tab's "complete inputs first" messaging style for consistency.

## Q5 — Inflation behavior in Monte Carlo sims

**Severity**: BLOCKER

**Why**: Phase 1 uses deterministic inflation (user inputs 6% or 10% per phase, applied uniformly). Monte Carlo randomizes asset returns via historical bootstrap. Should inflation ALSO be randomized (e.g., resample historical CPI years), or kept deterministic (same as Phase 1)?

**Options**:
1. **Deterministic inflation (RECOMMENDED for v1)** — use user's input inflation rates exactly as Phase 1 does. Only asset returns vary across sims. Simpler, matches existing mental model, one less variable to explain.
2. **Randomized inflation** — resample Indian CPI history (1991-2025) for each sim draw. More rigorous but adds complexity: need historical CPI dataset, need to explain "inflation varied across sims", harder to validate results.

**PM recommendation**: Option 1 (deterministic) for Phase 2 v1. Rationale: the user is already learning "returns are random" as a new concept. Adding "inflation is also random" doubles the cognitive load. Phase 1 shipped with fixed inflation; Phase 2 should match. Randomized inflation can be a Phase 3 enhancement if user requests it post-launch.

**If Pardha disagrees**: needs historical CPI data (1991-2025 Indian CPI annual %), same bootstrap resampling as equity/debt/gold returns, and updated success% messaging ("accounts for both return variability AND inflation variability").

## Q6 — Asset class scope for Monte Carlo

**Severity**: NICE-TO-RESOLVE

**Why**: Phase 1 models a 3-asset portfolio mix (equity % / debt % / gold %, user-configurable per life phase). Should Monte Carlo randomize all 3 asset classes, or simplify to equity-only?

**Default**: Match Phase 1's 3-asset mix (equity + debt + gold). For each sim draw, resample one historical year for each asset class, apply the user's allocation % (e.g., 60% equity, 30% debt, 10% gold), compute weighted return. This keeps parity with the Ideal Scenario's assumptions.

**Alternative**: Equity-only MC (ignore debt/gold). Simpler, fewer data requirements, but inconsistent with Phase 1 (which explicitly models debt as a de-risking mechanism for late retirement). Would force user to mentally map "MC says risky" when they've actually allocated 40% to debt.

**PM default for PRD**: 3-asset Monte Carlo, matching Phase 1 allocation inputs. Requires `historical-returns-data.js` to bundle equity/debt/gold annual returns (1991-2025). Bootstrap samples one year across all 3 classes (preserves correlation), applies user's %s, sums to annual portfolio return.

## Q7 — Toggle state persistence

**Severity**: NICE-TO-RESOLVE

**Why**: User switches Projections tab view from "Ideal Scenario" to "Stress Test (Monte Carlo)". When they reload the page or open a sharelink, should the toggle default to Ideal or remember their last choice?

**Default**: Persist toggle state to localStorage (same key as profile data, e.g., `_lastProjectionView: "ideal" | "montecarlo"`). On fresh load with no saved state, default to "Ideal" (since that's the original Phase 1 view, less jarring for returning users). Sharelinks include the toggle state in URL params so recipient sees the same view the sender was looking at.

**Alternative**: Always default to Ideal, never persist. Simpler but forces user to re-toggle every session if they prefer Monte Carlo view.

**PM default for PRD**: Persist to localStorage, default to Ideal on cold start. Small UX win, matches existing profile-save behavior (multi-goal phases, asset allocation %s all persist).

## Q8 — Beyond success%: show median/percentiles?

**Severity**: NICE-TO-RESOLVE

**Why**: Success% at age X tells you "in 85% of sims, you had ≥6mo expenses left." It doesn't tell you HOW MUCH you had left. For financially literate users (Pardha is one), showing median corpus, P10 (worst 10%), and P90 (best 10%) adds insight: "median ending corpus at 80 is ₹2.1 crore, but worst case is ₹30 lakh."

**Default for v1**: Success% only. Keep the UI simple, one number per age. The intake example ("Age 80: 85% Success") matches this. Adding 3 more numbers per age (median, P10, P90) risks cognitive overload for first-time Monte Carlo users.

**Deferred to v2**: If Pardha uses the feature and requests "I want to see the distribution, not just pass/fail %", add a detail-expand mode: click an age row, see histogram or percentile table for that age's corpus distribution.

**PM default for PRD**: Success% only for Phase 2 v1. Flag median/P10/P90 as "considered but deferred" in Out-of-Scope section.

## Q9 — Mobile layout for Stress Test view

**Severity**: NICE-TO-RESOLVE

**Why**: Phase 1's Projections tab is responsive (stacks summary cards, horizontal-scroll table on mobile). The new Stress Test view will likely have: toggle buttons, success% chart, age-by-age breakdown table. How should these adapt to 375px viewport?

**Default**: Match Phase 1 responsive patterns:
- Toggle buttons stack vertically on mobile (full-width "Ideal Scenario" / "Stress Test" buttons, one above the other)
- Success% chart: Chart.js responsive mode (shrinks to fit, readable on mobile)
- Age breakdown table: horizontal scroll with sticky first column (Age), same as existing Projections table
- Plain-English summary ("Your plan is great until 75…") wraps naturally, readable on mobile

**PM default for PRD**: Mobile-first responsive, matching existing Projections tab's layout strategy. No separate mobile-only view, just CSS flex/grid adjustments. AC includes 375px viewport test (iPhone SE).

## Q10 — Telemetry / analytics

**Severity**: NICE-TO-RESOLVE

**Why**: Should we instrument Monte Carlo usage (how often run, avg sim count, toggle Ideal↔MC frequency) for future product decisions? Phase 1 PRD noted "no analytics integration" but didn't explicitly forbid it.

**Default for v1**: No telemetry. The app is vanilla HTML/CSS/JS with no backend, no analytics SDK currently integrated. Adding Google Analytics or Plausible just for Monte Carlo is scope creep. Pardha's usage is the success metric (personal validation, per Phase 1 PRD § 9).

**Deferred**: If Pardha later decides to share the tool publicly (Indian FIRE subreddit, ProductHunt), THEN consider privacy-respecting analytics (Plausible, self-hosted). Not a Phase 2 concern.

**PM default for PRD**: No telemetry in Phase 2 v1. Success measured via Pardha's direct feedback, same as Phase 1.

---

**END OF QUESTIONS** — 10 total (1 BLOCKER, 9 NICE-TO-RESOLVE). Ready for PRD authoring.
