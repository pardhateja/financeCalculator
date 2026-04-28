---
feature: Multi-Goal Age-Phased Early Retirement Planner
stage: pre-tech-spec (question gathering)
date: 2026-04-27
author: tech-lead
---

# Tech Spec Blockers & Open Questions

## BLOCKERS (must answer before writing Tech Spec)

### B1. Architecture: Where does this live?

**Observed existing pattern** (from build.sh + pages/):
- 15 tabs in current retirement-planner: Basics, Expenses, Investments, Financial Plan, Projections, Dashboard, WhatIf, Goals, Emergency, SIP, Tracker, Milestones, Loan, Expense Log, Net Worth, Profiles
- Each tab = `pages/tab-{name}.html` + `js/calc-{name}.js` (some tabs share calc modules)
- All tabs share the same global `RP` namespace, same input fields, same `calculateAll()` orchestrator
- No precedent for "mutually exclusive modes" within the planner — all tabs coexist

**Options**:
1. **New tab in existing retirement-planner** (RECOMMENDED based on pattern consistency):
   - Add `pages/tab-multigoal.html` + `js/calc-multigoal.js`
   - Update build.sh: add to nav-tabs loop (line 58), add script tag (line 82)
   - Tab shows phase CRUD UI + phase-specific projections
   - **Coexistence question**: Does multi-goal tab REPLACE Projections tab data when active, or run side-by-side?
   
2. **Separate sub-page** (`retirement-planner/multi-goal.html`):
   - Standalone HTML file, separate nav, own build process
   - Pro: complete isolation, no interference with single-bucket flow
   - Con: duplicates header, footer, utils, chart, profiles, sharelink — maintenance burden
   - Con: breaks existing pattern (everything is tabs, not separate pages)
   
3. **Top-level calculator** (alongside `multi-method-calculator.html`):
   - Entirely separate app, own folder structure
   - Pro: clean slate, no shared state concerns
   - Con: massive code duplication (pre/post return blending, inflation calc, chart rendering, profiles, sharelink)
   - Con: user has to switch between two separate apps for single-bucket vs multi-goal planning

**Decision criteria**:
- **Existing tabs (Goals, WhatIf, Projections)** all extend/augment the shared input model without replacing it. Multi-goal is similar in spirit (augments retirement planning with phased expenses).
- **If tab (Option 1)**: Multi-goal and single-bucket projections can coexist — user can compare "what if I model as single bucket" vs "what if I model as 4 phases". This is valuable.
- **If standalone (Option 2/3)**: User must choose upfront which planning mode to use, can't easily compare.

**Recommendation**: **Option 1** (new tab). Rationale:
- Matches existing architecture pattern (15 tabs already, adding 16th is natural)
- Reuses all existing infrastructure (utils, chart, profiles, sharelink, darkmode, responsive.css)
- Allows side-by-side comparison (run single-bucket Projections tab, then switch to Multi-Goal tab with phased data — both results visible in session)
- Minimal build changes (3 lines in build.sh)

**Required from Pardha or Director-Eng**:
- Confirm architecture: tab (Option 1) vs standalone (Option 2) vs top-level (Option 3)
- If tab: should multi-goal and single-bucket projections coexist (both tabs independently runnable) or mutually exclusive (activating multi-goal disables Projections tab)?

---

### B2. Data model: Phase/bucket structure

**Core shape** (proposed):
```javascript
RP._phases = [
  {
    id: 'early-retire-kids',
    name: 'Active early-retirement w/ kids',
    startAge: 35,
    endAge: 50,
    baseMonthlyExpense: 150000,
    inflationRate: 6.0  // % per year
  },
  {
    id: 'kids-college',
    name: 'Kids in college',
    startAge: 18,  // relative to kid's age? Or user's age?
    endAge: 22,
    baseMonthlyExpense: 200000,
    inflationRate: 10.0  // education inflation
  },
  // ...
]
```

**Open questions**:
1. **Age semantics**: Are `startAge` and `endAge` the user's age, or relative to some event (kid's birth)? 
   - User's brief mentions "children are in college" and "once they land into a proper job" — these are lifecycle events relative to user's age, not kid's age.
   - Proposed: absolute user age only (e.g., "College phase: age 50-54" = user is 50-54, which maps to kid being 18-22 if kid was born when user was 32).
   - Alternative: support relative age syntax ("kid[0].age 18-22") but this requires multi-entity modeling (kids as separate entities) — likely out of scope for v1.
2. **Overlapping phases**: Can two phases overlap (e.g., medical costs rising while kids are still in college)? If yes, how do we sum expenses in the projection loop?
   - Real-world: overlaps are common (kid in college + parent's medical + general living).
   - Proposed: ALLOW overlaps, sum expenses in projection loop for any year covered by multiple phases.
3. **Gaps in coverage**: If user defines phases 35-50 and 70-85, what happens to ages 51-69? Use a default low-cost phase? Validation error? Auto-interpolate?
   - Real-world: gaps are valid (maybe user expects zero/minimal expenses during those years, or will add later).
   - Proposed: ALLOW gaps, treat as zero expense for uncovered years. Show informational warning "Ages X-Y: no expenses configured" but don't block.
4. **Minimum/maximum phases**: Limit to N phases (e.g., 5 max for UX simplicity)? Or unbounded array?
   - Similar to Goals tab (currently unbounded array, no max).
   - Proposed: unbounded for v1, add soft cap (e.g., 10 phases) only if performance degrades.

**Required from Pardha or PM**:
- **CRITICAL**: Confirm age semantics (absolute user age vs relative/event-based). If relative is needed, this is a major data model change.
- Confirm overlapping phases: allowed (with expense summing) or validation error?
- Confirm gap behavior: allow with warning, or require full coverage?
- Confirm phase count limit (unbounded vs hard cap).

---

### B3. Corpus allocation algorithm

The single most important math question: **how do we allocate the accumulated corpus at retirement across N expense buckets?**

**Proposed options**:
1. **Proportional to present value (PV)** — RECOMMENDED:
   - For each phase, calculate PV of all inflation-adjusted withdrawals from phase start to phase end, discounted back to retirement age using post-return rate.
   - Formula for phase `i`:
     ```
     PV[i] = Σ (year=startAge to endAge) [
       monthlyExpense[i] * (1 + phaseInflation[i])^(year - retirementAge) * 12
       / (1 + postReturn)^(year - retirementAge)
     ]
     ```
   - Allocate corpus proportionally: `phase[i].allocation = totalCorpus * (PV[i] / Σ PV)`
   - Pro: mathematically rigorous, ensures each phase gets funding proportional to its true cost in today's money
   - Con: more complex to explain (but can abstract as "fair allocation based on need")
   - **Key insight**: A ₹1L/mo phase lasting 5 years at 6% inflation is NOT the same cost as a ₹1L/mo phase lasting 5 years at 10% inflation — PV captures this.

2. **Sequential / waterfall**:
   - Fund phases in chronological order: fully fund phase 1, then phase 2, etc., until corpus exhausted
   - Pro: dead simple mental model
   - Con: chronologically late phases (e.g., medical at age 75+) get starved even if their PV need is high — bad outcome for early retirees
   - Con: doesn't account for inflation differences (low-inflation phase funded before high-inflation phase regardless of true cost)

3. **User-defined percentages**:
   - User manually inputs "allocate X% to phase 1, Y% to phase 2, ..."
   - Pro: full user control, useful for advanced users who have specific priorities
   - Con: requires user to do allocation math themselves; most won't understand what % to assign
   - Con: no validation that allocation matches need (user could assign 10% to college phase that needs 40%)

4. **Hybrid**: Default to PV-proportional (Option 1), with optional manual override (Option 3) for advanced users
   - Pro: best of both worlds (smart default + power-user flexibility)
   - Con: added UI complexity (allocation % inputs + toggle to enable manual mode)

**Edge cases**:
- **Insufficient corpus** (Σ PV > corpus): Allocate proportionally anyway → each phase gets partial funding. Show deficit in allocation table + warning message.
- **Over-funded** (Σ PV < corpus): Allocate proportionally, leftover corpus remains. Show surplus in allocation table ("₹X surplus available for emergency or legacy").
- **Zero-cost phase**: If a phase has `baseMonthlyExpense = 0`, its PV = 0, gets 0% allocation (valid for "gap year" phases).

**Required from Pardha or Director-Eng**:
- **CRITICAL**: Preferred default allocation strategy (recommend Option 1: PV-proportional for v1, defer manual override to v2 unless requested)
- Whether to show allocation breakdown to user (pre-flight table from B6) or keep internal
- Deficit handling: show partial-funded results (recommended) vs block projection run until corpus sufficient

---

### B4. Integration with existing Financial Plan tab

**Current state**: `calc-financial-plan.js` computes blended pre/post returns, stores in `RP._preReturn` and `RP._postReturn`, uses single `postRetireMonthly` for inflation-adjusted expense at retirement.

**Multi-goal needs**:
- Pre-return blending: unchanged (applies to accumulation phase, same for single-bucket and multi-goal)
- Post-return blending: still needed for growth of allocated sub-corpora
- Expense modeling: **fundamentally different** — multiple buckets with per-bucket inflation vs single bucket

**Options**:
1. **Extend existing Financial Plan tab**: Add a toggle "Single-goal vs Multi-goal mode", show different expense input sections based on toggle
2. **Separate Financial Plan for Multi-Goal**: Duplicate the blended-return inputs, add phase-specific expense inputs
3. **Shared pre-return, separate post-expense modeling**: Financial Plan tab stays as-is for pre-return; multi-goal tab has its own post-return expense section

**Required from Pardha or PM**:
- Should Financial Plan tab be shared or duplicated for multi-goal?
- If shared, how do we indicate which mode is active (toggle, radio buttons, automatic based on active tab)?

---

### B5. Projections tab behavior when multi-goal is configured

**Current state**: Projections tab shows single-bucket year-by-year corpus decline with one `postRetireMonthly` expense inflated uniformly.

**When multi-goal is active**:
1. **Disable single-bucket Projections tab**, show message "Switch to Multi-Goal Projections tab"
2. **Show both tabs side-by-side**: Single-bucket uses `postRetireMonthly` from Basics, Multi-Goal uses phased buckets
3. **Replace Projections tab content dynamically**: If multi-goal data exists, render multi-goal projections; else render single-bucket

**Required from Pardha or Director-Eng**:
- Preferred UX when both single-bucket and multi-goal data are present

---

### B6. Phase allocation breakdown: when/how to display to user

**Current state**: Projections engine runs math silently, shows results table + summary cards. No pre-flight validation or allocation breakdown shown.

**Multi-goal needs a decision**: The corpus-to-phase allocation (via PV-proportional or other algorithm from B3) is critical for user understanding ("why did my college bucket only get ₹X when I need ₹Y?").

**Options**:
1. **Pre-flight allocation table** (recommended): Before running projections, show allocation breakdown in a summary section:
   ```
   Phase                    Age Range    PV Required    Allocation    % of Corpus
   Early retire (35-50)     35-50        ₹4.2 Cr        ₹2.52 Cr      42%
   College (50-54)          50-54        ₹3.0 Cr        ₹1.8 Cr       30%
   ...
   ```
   User clicks "Run Projections" after reviewing this.
   
2. **Post-calculation only**: Allocation happens internally, summary shows "Phase X ran out at age Y" but doesn't explain the allocation math.

3. **Hybrid**: Show allocation table AFTER first projection run, let user adjust and re-run.

**Edge case**: If corpus is insufficient (total PV > available corpus), do we:
- Show deficit in allocation table with red highlighting + actionable message ("Increase investment by ₹X/mo OR reduce Phase Y by Z%")?
- Block projection run until user acknowledges shortfall?
- Run projections anyway and show partial funding?

**Required from Pardha or PM**:
- Display strategy: pre-flight vs post-calculation vs hybrid
- Deficit UX: block vs warn vs show partial results

---

## NICE-TO-RESOLVE (can propose defaults, confirm during spec review)

### N1. Module split strategy

**Proposed**: Single new file `calc-multigoal.js` (~150-200 lines, similar to `calc-whatif.js` at 117 lines or `calc-dashboard.js` at 143 lines).

**Rationale**:
- Projection logic for multi-goal is ~60 lines (loop + allocation + inflation per phase)
- Phase CRUD (add/remove/edit) is ~40 lines (similar to `calc-goals.js` at 73 lines)
- Rendering (table + summary cards) is ~50 lines
- Total fits comfortably in one module without bloating

**Alternative**: Split into `calc-phases.js` (CRUD) + `calc-multigoal-projections.js` (math engine), but adds complexity for no clarity gain given the size.

**Proposed default**: Single `calc-multigoal.js` file.

---

### N2. Persistence and backward compatibility

**Existing patterns** (verified from codebase):
- Profiles: `localStorage.getItem('rp_profiles')` stores `{ profileName: { data: {...}, savedAt: ISO } }` where `data` = all input field values by ID
- Share links: `?plan=<base64(JSON)>` encodes `data` object (same shape as profiles)
- Goals: stored in `RP._goals` array — **in-memory only, NOT persisted in profiles or sharelinks** (lost on reload unless user manually re-adds goals)

**Proposed for multi-goal phases**:
- **In-memory state**: `RP._phases = []` (same pattern as `RP._goals`)
- **Persistence decision needed**: Should phases be persisted or in-session-only like goals?
  
  **Option A: Persist (recommended)**:
  - Profiles: extend profile object to `{ data: {...}, _phases: [...], savedAt: ISO }`
  - Share links: extend encoded payload to include `_phases` array alongside input field values
  - Rationale: Phases are more effort to configure than goals (age ranges, inflation rates, multiple buckets). Losing them on reload is painful.
  
  **Option B: In-session only (match goals)**:
  - `RP._phases` cleared on reload, user must re-add
  - Profiles/sharelinks unchanged
  - Rationale: simpler, no backward compat concerns
  
- **Backward compat** (if Option A):
  - Loading a profile/sharelink that lacks `_phases` field → default to empty array (graceful)
  - Old profiles continue to work (single-bucket mode)

**Proposed default**: **Option A** (persist phases in profiles + sharelinks). Add `_phases` as optional field; presence = multi-goal data available, absence = single-bucket mode.

**Versioning**: Unversioned for now (detect via field presence). Add schema version only if we need breaking changes later.

---

### N3. Validation rules

**Proposed validation**:
1. **Phase age ranges**:
   - `startAge` must be >= `retirementAge` (can't have pre-retirement phases in this model)
   - `endAge` must be <= `lifeExpectancy`
   - `endAge` must be > `startAge`
2. **Overlapping phases**: ALLOWED. In projection loop, sum all active phases' expenses for that age.
3. **Gaps**: ALLOWED. Ages not covered by any phase have zero post-retirement expense for that year.
4. **Inflation rate**: 0-20% range (same as existing `inflationRate` input validation)
5. **Monthly expense**: Must be > 0

**UI feedback**:
- Highlight overlapping phases in summary table with a badge "Overlaps with [other phase name]"
- Show gap years in a summary card "Ages 51-69: No expenses configured"

**Proposed default**: Validation as above, with informational warnings (not blocking errors) for overlaps and gaps.

---

### N4. State namespace

**Existing pattern**: `RP._goals`, `RP._projectionRows`, `RP._chartData`, etc. — underscore-prefixed properties in global `RP` namespace for internal state.

**Proposed for multi-goal**:
- `RP._phases` — array of phase objects
- `RP._multiGoalProjectionRows` — projection results (separate from `RP._projectionRows` for single-bucket)
- `RP._phaseAllocations` — computed allocation breakdown (for debugging/display)

**Alternative**: Namespace under `RP.multiGoal = { phases: [], projectionRows: [], allocations: {} }` to keep it cleaner.

**Proposed default**: Flat `RP._phases` pattern (matches existing `RP._goals` convention). Only move to sub-namespace if we add 5+ multi-goal-specific state properties.

---

### N5. Testing strategy

**Current state**: No test runner. Existing codebase has no automated tests — all validation is manual via UI.

**Proposed for multi-goal**:
1. **Manual fixture**: Add a "Load Multi-Goal Demo" button in Profiles tab that populates 4 example phases (early retire, college, empty nest, medical) with realistic values. Pardha can verify math by hand.
2. **Dev console logging**: Add a debug mode (e.g., `RP._debug = true`) that logs allocation breakdown, per-phase PV, and year-by-year expense sum to console.
3. **Optional lightweight test harness**: If Pardha wants, add a `test-multigoal.html` page that imports `calc-multigoal.js` and runs 3-5 hardcoded scenarios with known expected outputs (corpus, allocation %, runout age). No framework, just inline JS assertions + DOM output.

**Proposed default**: Manual fixture + dev console logging. Defer test harness unless Pardha requests it.

---

### N6. Build/deploy changes

**Proposed changes to `build.sh`**:
1. Add `tab-multigoal.html` to the `for tab in ...` loop (line 58)
2. Add `<script src="js/calc-multigoal.js"></script>` to the FOOT heredoc (after `calc-goals.js`, before `profiles.js`)
3. Add nav-tab button: `<button class="nav-tab" data-tab="multigoal">Multi-Goal</button>` (line 44, between "Goals" and "Emergency")

**No CI/CD changes needed** — project is static HTML, no server, no deployment pipeline.

**Proposed default**: Minimal build.sh changes as above.

---

### N7. Chart rendering for multi-goal projections

**Existing chart** (verified from `chart.js`): Pure Canvas 2D rendering, no external library. Current features:
- Single line chart (corpus over time) with gradient fill
- Retirement age vertical marker (dashed orange line)
- Zero line (dashed red) if corpus goes negative
- Grid lines + Indian ₹ formatted Y-axis labels
- Age labels on X-axis

**Proposed for multi-goal**:
1. **Stacked area chart**: Show corpus breakdown by allocated bucket over time (e.g., "Early retire" bucket in blue, "College" in green, stacked vertically).
   - Pro: shows allocation visually
   - Con: requires significant Canvas 2D code changes (path clipping, multiple gradients, legend)
   
2. **Single total line with phase shaded regions**: Reuse existing line chart, add vertical shaded regions for each phase age range.
   - Pro: minimal code change, clear visual separation of life phases
   - Con: doesn't show per-phase allocation breakdown (only age ranges)
   - Example: Age 35-50 = light blue shaded region labeled "Early Retire", 50-54 = light green "College", etc.
   
3. **Two separate charts**: Total corpus (existing chart) + new stacked area for phase breakdown
   - Pro: best of both worlds
   - Con: doubles chart real estate, may clutter on mobile

**Proposed default**: **Option 2** (single total line + phase shaded regions). Add to existing `renderChart()`:
- Loop through `RP._phases`, draw vertical `fillRect` for each phase's age range with 10% opacity color
- Add phase name label at top of each shaded region
- Reuse retirement marker logic

**Alternative if Pardha wants allocation visibility**: Option 3 (two charts stacked vertically in multi-goal tab).

---

### N8. Income side (explicit out-of-scope confirmation)

**From intake**: "User notes that if they go to higher levels in job there might be additional income as well, but explicitly does NOT want to take this into the wealth journey."

**Confirmation needed**: Multi-goal feature will NOT model:
- Mid-retirement income (part-time work, consulting, rental income during retirement)
- Windfall events (inheritance, property sale)
- Dynamic income adjustments based on life phase

All income modeling stays in the accumulation phase (pre-retirement) only, same as current single-bucket planner.

**Proposed default**: Confirmed out-of-scope. Document in Tech Spec explicitly to avoid scope creep.

---

### N9. Mobile/responsive considerations

**Existing app**: Has `css/responsive.css` — existing tabs work on mobile (nav-tabs scroll horizontally, tables scroll, cards stack).

**Multi-goal UI**: Phase CRUD will have a table or card list (similar to Goals tab). Need to ensure:
- Phase add/edit form is mobile-friendly (stacked inputs, not side-by-side)
- Phase summary table scrolls horizontally on small screens
- Allocation breakdown (if shown) uses card layout on mobile

**Proposed default**: Follow existing responsive patterns from Goals tab and Dashboard tab. No new CSS framework needed.

---

### N10. Error messaging for corpus deficit

**Scenario**: User configures 4 phases with total PV = ₹10 Cr, but projected corpus at retirement = ₹6 Cr (40% shortfall).

**Proposed UX**:
1. **Pre-flight check**: Before running projections, show allocation breakdown with deficit highlighted:
   ```
   Phase                    PV Required    Allocated    Deficit
   Early retire (35-50)     ₹4.2 Cr        ₹2.52 Cr     ₹1.68 Cr (RED)
   College (50-54)          ₹3.0 Cr        ₹1.8 Cr      ₹1.2 Cr (RED)
   ...
   Total                    ₹10 Cr         ₹6 Cr        ₹4 Cr (RED)
   ```
2. **Projections show partial funding**: Run projections with whatever allocation is available, show "Runs out at Age X" for each phase
3. **Actionable suggestions**: "Increase monthly investment by ₹X, or reduce Phase Y expenses by Z%"

**Proposed default**: Options 1 + 2. Defer option 3 (actionable suggestions) to future enhancement unless Pardha wants it in v1.

---

### N11. Phase CRUD UI pattern

**Existing Goals tab pattern** (verified from `calc-goals.js` + `tab-goals.html`):
- Input form at top: 3 fields (name, amount, year) + "Add Goal" button
- Goals list below: card-based layout, each goal shows name + details + "Remove" button
- No edit-in-place — user must remove + re-add to change a goal
- Summary cards show totals (total amount, monthly SIP needed, impact on retirement investment)

**Multi-goal phases need more fields** than goals:
- Name (text)
- Start Age, End Age (numbers)
- Base Monthly Expense (currency)
- Inflation Rate (%, per phase)

**Proposed Phase UI pattern**:
1. **Match Goals pattern** (simple add/remove, no edit):
   - Input form: 5 fields (name, startAge, endAge, baseMonthly, inflationRate) + "Add Phase" button
   - Phase list: card-based, each phase shows age range + expense + inflation + "Remove" button
   - Pro: consistent with existing UX, simple implementation
   - Con: no edit-in-place (must remove + re-add to fix a typo)

2. **Inline edit pattern** (each phase card is editable):
   - Phase list shows each phase as a form card with inline inputs (all 5 fields editable in-place)
   - "Save" button per phase, or auto-save on blur
   - Pro: better UX for multi-field entities (less tedious than remove + re-add)
   - Con: more complex state management (edit mode per phase)

3. **Table-based with edit modal**:
   - Phase list as table (columns: Name, Age Range, Expense, Inflation, Actions)
   - "Edit" button opens modal with form, "Remove" button deletes immediately
   - Pro: compact display, good for 5+ phases
   - Con: modal interrupts flow, feels heavier than card-based

**Proposed default**: **Option 1** (match Goals pattern) for v1 simplicity and consistency. Add inline edit (Option 2) in v2 if user feedback requests it.

---

## Summary

**Must answer before Tech Spec** (6 critical blockers):
1. **B1**: Architecture (tab vs standalone vs top-level) — determines file structure + nav changes
2. **B2**: Data model age semantics (absolute user age vs relative/event-based) — **MOST CRITICAL**, affects entire data schema and UX
3. **B2 cont'd**: Overlapping phases (allow + sum vs validation error), gaps (allow vs require coverage), phase count limit
4. **B3**: Allocation algorithm (PV-proportional vs sequential vs user-defined percentages) — core math engine
5. **B4**: Integration with Financial Plan tab (shared vs separate inputs for pre/post returns)
6. **B5**: Projections tab behavior (disable single-bucket vs show both vs dynamic replace)
7. **B6**: Allocation breakdown display strategy (pre-flight table vs post-calc only vs hybrid) + deficit UX (block vs warn vs partial results)

**Can propose defaults** (11 items with recommended answers):
- **N1**: Single `calc-multigoal.js` module (~150-200 lines, matches existing calc-*.js size pattern)
- **N2**: **Persist phases** in profiles + sharelinks (unlike goals which are in-session only) — phases are higher effort to configure, unversioned via field presence
- **N3**: Validation rules: overlaps ALLOWED (sum expenses), gaps ALLOWED (zero expense + warning), inflation 0-20%, monthly > 0
- **N4**: Flat `RP._phases` namespace (matches `RP._goals` pattern unless 5+ multi-goal state properties emerge)
- **N5**: Manual fixture ("Load Multi-Goal Demo" button) + dev console logging (`RP._debug = true`), defer test harness unless requested
- **N6**: Minimal build.sh changes (add tab-multigoal.html to loop, add script tag, add nav button)
- **N7**: Single line chart + phase shaded regions (minimal Canvas 2D changes, clear visual separation) — verified chart.js is pure Canvas, no library dependency
- **N8**: Income side **explicitly out-of-scope** (confirmed from user brief: "does NOT want to take this into the wealth journey")
- **N9**: Follow existing responsive.css patterns from Goals + Dashboard tabs (no new framework)
- **N10**: Pre-flight allocation table + partial-funded projections (warn on deficit, don't block, show actionable suggestion)
- **N11**: Phase CRUD UI matches Goals tab pattern (add form + card list + remove, no inline edit) for v1 consistency

**Key refinements from codebase review**:
- Chart is pure Canvas 2D, not a library — phase markers feasible with `fillRect` + labels
- Goals are NOT persisted (in-memory only) — phases should be different (persist) due to config complexity
- Profiles store `{ data, savedAt }`, sharelinks encode same `data` object — extend both for `_phases`
- Age semantics MUST be clarified — user brief implies absolute user age, but "kids 18-22" phrasing is ambiguous

Once blockers **B1-B6** are resolved (especially B2 age semantics — this determines if we need entity modeling or simple age ranges), I can write a complete Tech Spec with architecture diagram, data flow, projection loop pseudocode, and allocation math formulas.
