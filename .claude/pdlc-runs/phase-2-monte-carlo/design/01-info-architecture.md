# Information Architecture — Phase 2 Monte Carlo Stress Test

## Sitemap

**No new top-level pages or tabs.** Phase 2 is purely additive within the existing Projections tab.

```
/ (index.html)
├── /calculator (tab-calculator.html) — UNCHANGED
├── /multi-goal (tab-multi-goal.html) — UNCHANGED
├── /tracker (tab-tracker.html) — UNCHANGED
├── /dashboard (tab-dashboard.html) — UNCHANGED
├── /projections (tab-projections.html) — ENHANCED
│   ├── [Toggle: Ideal Scenario] ← existing year-by-year table (UNCHANGED)
│   └── [Toggle: Stress Test (Monte Carlo)] ← NEW
│       ├── Empty state ("Run Simulation" CTA)
│       ├── Loading state (progress bar + cancel)
│       └── Results view
│           ├── Plain-English callout (above charts)
│           ├── Primary chart: Success Rate vs Age (bar chart)
│           ├── Secondary chart 1: (UI Designer specifies — line/lollipop/heatmap per B4)
│           ├── Secondary chart 2: (UI Designer specifies — optional, collapsed by default)
│           └── Data table fallback (sr-only, toggle to show for sighted users)
└── /financial-plan (tab-financial-plan.html) — UNCHANGED
```

**URL schema extension**:
- Existing: `index.html?plan=base64encodedInputs`
- Phase 2 adds: `&view=montecarlo&mcseed=1714406392847`
  - `view=montecarlo` → auto-opens Projections tab in Stress Test mode (default: `ideal`)
  - `mcseed=N` → seeds PRNG for reproducible sim results (default: `Date.now()` if omitted)

## Navigation structure

### Primary nav (top-level tabs)
**UNCHANGED** — Phase 1 tabs remain:
- Calculator
- Multi-Goal
- Tracker
- Dashboard
- **Projections** ← enhanced, but same tab name
- Financial Plan

### Secondary nav (within Projections tab only)
**NEW** — Segmented control toggle at top of Projections tab content area:

```
┌─────────────────────────────────────────────────┐
│  [ Ideal Scenario | Stress Test (Monte Carlo) ] │  ← segmented control (iOS-style)
└─────────────────────────────────────────────────┘
```

- **Ideal Scenario** (default on first load) — shows existing Phase 1 year-by-year deterministic projection table
- **Stress Test (Monte Carlo)** — shows new Monte Carlo success-rate charts

Toggle state persists to `localStorage.rp_projection_view` (`'ideal'` | `'montecarlo'`). On subsequent app loads, tab opens to last-selected view.

### Auth-aware
**N/A** — app has no auth (fully client-side, no login). All features visible to all users.

## Object model (what users think about)

These are the user's mental nouns, NOT the database schema or code variable names.

- **Ideal Scenario** — "The year-by-year plan if everything goes perfectly (expected returns, steady inflation)." User's existing mental model from Phase 1.
- **Stress Test** — "What happens if markets crash or inflation spikes." User thinks of this as testing whether the Ideal Scenario survives bad luck.
- **Simulation** — "Running 10,000 random versions of my retirement to see how often I run out of money." User may not know the term "Monte Carlo" but understands "stress test by randomness."
- **Success Rate** — "Percent of random scenarios where I still have money left at age X." User interprets this as "confidence" or "odds of being OK."
- **Age Milestone** — "Key ages I care about: when I retire, when kids leave, when I'm very old (90+)." Chart shows 4-5 ages; user mentally maps these to life events.
- **Risk Zone** — "Ages where the bars turn amber/red." User sees this as "danger zone where I might run out of money."
- **Suggested Fix** — "The number the app tells me to add to monthly investment to make the red bars turn green." User treats this as a prescription, not just information.

**Contrast with what Phase 1 called things**:
- Phase 1 had no "Stress Test" concept — only deterministic projection
- Phase 1 "Projections" tab showed ONE outcome; Phase 2 "Stress Test" shows RANGE of outcomes (via success%)
- User already knows "corpus", "monthly investment", "retirement age" from Phase 1 — those nouns stay identical

## Naming

For each object/action above, the EXACT label users see. Avoid jargon. Match user's vocabulary, not the team's.

| Concept | User-facing label | Notes |
|---------|------------------|-------|
| Monte Carlo simulation | **"Stress Test (Monte Carlo)"** | Primary label is "Stress Test" (user's word), "(Monte Carlo)" in parens for FIRE-literate users who know the term. |
| Deterministic projection | **"Ideal Scenario"** | User's word from intake ("Keep the year-by-year table as the 'Ideal Scenario'"). |
| Run simulation | **"Run Simulation"** button | NOT "Start Monte Carlo" or "Calculate". Clear verb. |
| Cancel simulation | **"Cancel"** button | NOT "Stop" or "Abort". Simple, familiar. |
| Success rate metric | **"X% success"** inline in text, **"Success Rate"** as axis label | NOT "probability of success" or "confidence level" (too academic). Plain "X% success" matches user forum language. |
| Age milestones | **"Age 70", "Age 80", etc.** | NOT "Milestone 1" or "T+35 years". Absolute age is user's mental model. |
| Plain-English summary | **"Your plan is great until age 80, risky after age 95."** | NOT "Low risk until T1, high risk after T2". Conversational, mirrors how user would explain to spouse. |
| Suggested action | **"Increase monthly investment by ₹8,500"** | Concrete number, actionable verb. NOT "Consider adjusting contribution parameters". |
| CTA button | **"Adjust Investment →"** | NOT "Go to Calculator" or "Edit Inputs". Specific to the action needed. |
| Progress indicator | **"Simulating... 3,847 / 10,000 (38%)"** | Shows both absolute progress and percent. NOT just a spinner with no numbers. |
| Empty state | **"Configure your retirement plan to run Monte Carlo"** | NOT "No data available" or "Get started". Tells user exactly what's missing. |
| Performance footer | **"Last run: 4.2s"** | Wall-clock time, casual tone. NOT "Execution time: 4200ms". |

**Jargon explicitly AVOIDED**:
- ❌ "Bootstrap resampling" → ✅ (not mentioned in UI at all, implementation detail)
- ❌ "Stochastic inflation" → ✅ "Markets and inflation are random" (callout explainer)
- ❌ "PRNG seed" → ✅ (seed visible in URL for reproducibility, but not labeled in UI)
- ❌ "Percentile bands" → ✅ (deferred to v2, not in Phase 2 scope)
- ❌ "Sequence of returns risk" → ✅ (concept baked into MC, but not named in UI)

## Hierarchy rules

**What's at level 1 (always visible):**
- Toggle control "Ideal Scenario | Stress Test (Monte Carlo)" — present at top of Projections tab whenever tab is active
- Active view content (either Ideal Scenario table OR Stress Test charts, never both simultaneously)

**What's at level 2 (one click):**
- Within Stress Test view:
  - "Run Simulation" button (if no results cached)
  - Plain-English callout box (above charts, always visible once sim completes)
  - Primary chart: Success Rate vs Age (bar chart, always visible once sim completes)
  - "Adjust Investment →" CTA button (in callout, if plan is risky)
  - Performance footer "Last run: 4.2s" (below charts, always visible once sim completes)

**What's at level 3 (multiple clicks / collapsed by default):**
- Secondary supporting charts (line/lollipop/heatmap per UI Designer's layout) — possibly collapsed accordion or tabs below primary chart
- Data table fallback (sr-only by default, "Show data table" toggle reveals for sighted users)
- Tooltip explainers (e.g., hover "85% confidence" to see "In 85 out of 100 random scenarios...")

**What can the user do without auth:**
**Everything.** App has no authentication. All features (Calculator, Multi-Goal, Tracker, Projections/Ideal, Projections/Stress Test, Dashboard, Financial Plan) are accessible to anyone who opens the HTML file.

## Integration with Phase 1 IA

**Additive, not replacement.** Phase 2 does not change any existing Phase 1 IA — it extends one tab.

### What stays identical:
- **Tab structure** — 6 top-level tabs (Calculator, Multi-Goal, Tracker, Dashboard, Projections, Financial Plan) unchanged
- **Projections tab name** — still called "Projections", not renamed to "Projections & Stress Test"
- **Ideal Scenario content** — existing year-by-year table, summary cards, chart (all Phase 1 deliverables) render byte-identical when "Ideal Scenario" toggle is active
- **Input sources** — Stress Test reads the SAME inputs Calculator tab writes to localStorage (`currentAge`, `retirementAge`, `lifeExpectancy`, `currentSavings`, `monthlyInvestment`, asset allocation, life-phase buckets from Multi-Goal). Zero new input fields.
- **localStorage keys** — Phase 1 keys (`rp_current_age`, `rp_retirement_age`, etc.) unchanged. Phase 2 adds ONE new key: `rp_projection_view` (toggle state).
- **Share-link format** — Phase 1 `?plan=base64` unchanged. Phase 2 appends `&view=montecarlo&mcseed=N` as OPTIONAL params. Links without these params still work (load Ideal Scenario).

### What's new:
- **Toggle control** — new UI element at top of Projections tab content area (before existing summary cards)
- **Stress Test view** — new parallel content pane, mutually exclusive with Ideal Scenario view (only one visible at a time)
- **URL params** — `&view=` and `&mcseed=` are new, backward-compatible (old links ignore them)
- **localStorage key** — `rp_projection_view` persists toggle state across sessions

### Interaction with other tabs:
- **Calculator tab** — Stress Test READS Calculator inputs, does NOT write back. If user changes inputs in Calculator, Stress Test must re-run sim to see new results. No automatic sync.
- **Multi-Goal tab** — Stress Test uses life-phase expense buckets if configured, falls back to single flat expense if Multi-Goal not configured (matches Phase 1 logic).
- **Tracker tab** — NO interaction. Tracker is for actual-vs-plan variance; Stress Test is for plan robustness. Orthogonal concerns.
- **Dashboard tab** — Dashboard MAY gain a "Run Stress Test" quick-action card in future (v2), but Phase 2 does not add this. Dashboard unchanged.
- **Financial Plan tab** — NO interaction. Financial Plan is markdown explainer; Stress Test is quantitative. No linking.

### Cross-tab navigation during sim:
- **User starts sim in Projections/Stress Test → switches to Calculator tab** — sim continues in Web Worker (background), progress bar NOT visible on Calculator tab (expected), user can edit inputs, when user returns to Projections/Stress Test, progress bar still updating.
- **User starts sim → switches to Dashboard tab** — same behavior, sim undisturbed.
- **User starts sim → closes app entirely** — Web Worker terminates (browser kills it), sim lost. On next app open, cached result from PREVIOUS successful sim may be visible (if any), or empty state if first-time user.

### Accessibility continuity:
- **Phase 1 A11y patterns** — Stress Test reuses Phase 1 semantic colors (green/blue/amber/red already WCAG AA contrast-verified in `.claude/pdlc-runs/multi-goal-early-retirement/design/03-a11y-defaults.md`), focus states, sr-only patterns.
- **New A11y additions** — data table fallback for charts (sr-only), ARIA live region for progress updates ("Simulating 38%" announced to screen reader), keyboard nav for toggle control (arrow keys switch views).
