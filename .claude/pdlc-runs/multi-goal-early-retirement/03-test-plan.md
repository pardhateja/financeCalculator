# Test Plan — Multi-Goal Age-Phased Early Retirement Planner

**Owner**: pdlc-qa-lead
**Status**: scaffolded
**Date**: 2026-04-27

## 1. Scope

### In Scope
- **Multi-Goal tab UI**: Phase CRUD (add, edit, delete), validation, empty states, dark mode, responsive design
- **Phase allocation math**: PV-proportional allocation algorithm, deficit/surplus detection, actionable suggestions
- **Persistence**: localStorage (`rp_phases` key) + sharelink encoding (optional via checkbox)
- **Year-by-year projection**: Multi-phase expense modeling, overlapping phases, gap years, phase exhaustion detection
- **Integration with existing planner**: Reading corpus from Financial Plan/Projections tabs, no modifications to existing tabs
- **Test harness**: `test-multigoal.html` math validation (10-15 scenarios)
- **Accessibility**: WCAG 2.1 Level AA per `design/03-a11y-defaults.md` (color contrast, keyboard nav, ARIA labels, focus states)
- **Cross-browser**: Chrome (desktop + mobile emulation), Safari (desktop + mobile), dark mode toggle
- **Sharelink round-trip**: Encode phases → share → decode in incognito

### Out of Scope (unchanged from existing planner)
- **Existing tabs**: Basics, Projections, Dashboard, Goals, Emergency, Investments, etc. — regression only, no new features
- **Backend/API**: No server-side components (client-only feature)
- **Automated test framework**: No Vitest/Jest (per Q5 decision — `test-multigoal.html` is the test harness)
- **Other browsers**: Firefox, Edge, Opera not tested (follows existing planner convention)
- **Performance testing**: No load testing (personal-use tool, single user)

## 2. Test approach

**No automated test framework** — per Q5 commitment, this feature uses manual QA + in-browser math validation only.

### Math Validation (test-multigoal.html)
- **What**: Standalone HTML page with 10-15 hardcoded scenarios testing PV allocation algorithm, deficit detection, year-by-year projection loop
- **Who**: FE engineer writes this alongside implementation (task `fe-010`)
- **When**: Stage 4 (parallel to feature dev)
- **Pass criteria**: All scenarios show ✅ green (expected vs actual match within ±0.01% tolerance for floating-point)

### Manual QA (Playwright MCP + Chrome DevTools)
- **What**: Manual test execution of all 13 PRD acceptance criteria + browser smoke tests + accessibility checks
- **Who**: QA Lead (me) during Stage 5
- **Tools**: 
  - Playwright MCP for UI automation (navigate, fill forms, click, snapshot DOM)
  - Chrome DevTools MCP for live DOM inspection (computed styles, bounding rects)
  - VoiceOver (macOS) for screen-reader testing
  - Chrome DevTools → Rendering → Color-blindness emulation for a11y
- **When**: Stage 5 (after each FE task completes and engineer marks `status: review`)

### Regression Testing
- **What**: Verify existing tabs (Basics, Projections, Dashboard, Goals, etc.) remain unchanged
- **How**: Load app, navigate to each existing tab, verify UI renders + no console errors
- **When**: Stage 5, after Multi-Goal tab is complete (task `qa-007`)

### Cross-tab Integration Testing
- **What**: Verify Multi-Goal tab correctly reads `RP._preReturn`, `RP._postReturn`, corpus from existing tabs
- **How**: Configure Basics tab (ages), Financial Plan tab (returns), Investments tab (SIP), then navigate to Multi-Goal and verify allocation uses correct values
- **When**: Stage 5, part of AC5-AC6 tests (task `qa-003`)

## 3. Test environments

**Local filesystem only** (no staging/production servers — static HTML app).

| Environment | Purpose | How to access |
|-------------|---------|---------------|
| **Chrome Desktop** (latest stable) | Primary test environment | Open `index.html` in Chrome |
| **Chrome Mobile Emulation** (375px, iPhone SE) | Responsive design testing | Chrome DevTools → Toggle device toolbar → iPhone SE |
| **Safari Desktop** (macOS latest) | Cross-browser smoke testing | Open `index.html` in Safari |
| **Safari Mobile** (iOS Simulator or real device) | Mobile Safari testing | Transfer `index.html` + assets to iOS device or use Simulator |
| **Dark Mode** | Dark mode parity testing | Toggle dark mode via app's existing dark-mode button |

**No CI/CD pipeline** — tests run locally by QA Lead before bug bash.

## 4. Test data

### Scenario 1: Indian FIRE 4-Phase (Happy Path)
**Source**: Intake reframed table (00-intake.md)
- Phase 1: "Active Retirement" | age 35-50 | ₹80k/mo | 6% inflation
- Phase 2: "Kids in College" | age 42-46 | ₹1.2L/mo | 10% inflation (overlaps Phase 1)
- Phase 3: "Empty Nest" | age 51-70 | ₹40k/mo | 6% inflation
- Phase 4: "Medical Years" | age 71-85 | ₹60k/mo | 12% inflation
- **Expected**: All phases funded, corpus lasts to age 85 (from existing planner: ₹8Cr corpus assumed)

### Scenario 2: Deficit (Underfunded Corpus)
- Same 4 phases as Scenario 1
- **Corpus override**: Manually set to ₹6Cr (vs ₹8Cr needed)
- **Expected**: Red deficit indicators, allocation table shows ₹2Cr shortfall, suggestion banner shows "Increase SIP by ₹X or reduce Phase Y by Z%"

### Scenario 3: Single-Phase Degenerate
- Phase 1: "Full Retirement" | age 35-85 | ₹50k/mo | 6% inflation
- **Expected**: Allocation = 100% to Phase 1, projection identical to single-bucket planner

### Scenario 4: 10-Phase Stress Test
- 10 phases, each 5 years, sequential (no overlaps, no gaps)
- **Expected**: UI handles >7 phases gracefully (warning about chart clutter per Tech Spec Risk #4), allocation sums to 100%, table scrolls

### Scenario 5: Phase with 25% Inflation (Boundary)
- Phase 1: "Hyperinflation Phase" | age 35-40 | ₹50k/mo | 25% inflation
- **Expected**: Input validation allows (soft warning: "Inflation above 20% is unusual"), PV calculation extremely high, deficit likely

### Scenario 6: Overlapping Phases (Sum Expenses)
- Phase A: age 35-60 | ₹50k/mo | 6%
- Phase B: age 45-55 | ₹30k/mo | 8%
- **Expected**: Years 45-55 show combined ₹80k/mo expense (inflated), info banner "⚠️ Overlaps with Phase B", projection table "Active Phase" column shows "🔵🟢 2 phases"

### Scenario 7: Gap Years (Allowed with Warning)
- Phase A: age 35-50
- Phase B: age 60-85 (gap: 51-59)
- **Expected**: Warning banner "Gap detected: ages 51-59 have no phase coverage (₹0 expense)", projection table shows gap years with zero expense, corpus grows during gap (no withdrawals)

## 5. Test cases (mapped to PRD acceptance criteria)

### AC1 — Phase CRUD (Add)
**Given**: User opens Multi-Goal tab  
**When**: User clicks "Add Phase", enters name "Kids at Home", startAge 35, endAge 50, monthlyExpense ₹80,000, inflation 6%, and saves  
**Then**:
- Phase card appears with all details visible: "Kids at Home", "Age 35-50 (15 years)", "₹80,000/mo · 6% inflation"
- Phase auto-sorted by startAge (if multiple phases exist)
- Phase assigned a color (blue for first phase)
- Left border of card shows assigned color
- No console errors

**Test ID**: TC-FE-001 | **Linked task**: qa-002

---

### AC2 — Phase Deletion
**Given**: 3 phases exist in the list  
**When**: User clicks delete icon on "Phase 2" (middle card)  
**Then**:
- Phase card fades out (300ms transition)
- Toast appears: "'Phase 2' deleted. [Undo]" (5s duration)
- Remaining phases re-sort by startAge
- Allocation table recalculates (2 phases now)
- If user clicks [Undo] within 5s, phase restores

**Test ID**: TC-FE-002 | **Linked task**: qa-002

---

### AC3 — Overlapping Phases (Allowed)
**Given**: Phase A (age 35-60, ₹50k/mo, 6%) exists  
**When**: User adds Phase B (age 45-55, ₹30k/mo, 8%)  
**Then**:
- Both phases appear in phase list (sorted by startAge)
- Info banner appears: "⚠️ Years 45-55 are covered by multiple phases. Expenses will be summed."
- Overlap badge appears on both phase cards: "Overlaps with [other phase name]"
- Projection table year 50 row shows total expense = (₹50k + ₹30k inflated) × 12

**Test ID**: TC-FE-003 | **Linked task**: qa-002

---

### AC4 — Gap Years (Allowed with Warning)
**Given**: Phase A covers age 35-50, Phase B covers age 60-100, retirement age 35, life expectancy 100  
**When**: User saves both phases  
**Then**:
- Warning toast or banner appears: "Gap detected: ages 51-59 have no phase coverage (₹0 expense assumed)"
- Projection table shows years 51-59 with zero expense, corpus growing (no withdrawals)
- No validation error (gaps are allowed)

**Test ID**: TC-FE-004 | **Linked task**: qa-002

---

### AC5 — PV-Proportional Allocation Pre-Flight
**Given**: Corpus at retirement = ₹5 crore, 3 phases defined per PRD AC5 example  
**When**: User clicks "Calculate Allocation" or allocation auto-runs on phase save  
**Then**: Pre-flight allocation table displays with columns:
- Phase | PV Needed | Allocation % | Allocated Corpus | Status
- Phase 1: PV ₹1.8cr, 34.6%, Allocated ₹1.73cr, Status 🔴 Underfunded (-₹0.07cr)
- Phase 2: PV ₹0.9cr, 17.3%, Allocated ₹0.87cr, Status 🔴 Underfunded (-₹0.03cr)
- Phase 3: PV ₹2.5cr, 48.1%, Allocated ₹2.40cr, Status 🔴 Underfunded (-₹0.10cr)
- **Total row**: PV ₹5.2cr, 100%, Allocated ₹5.0cr, Status 🔴 Shortfall: ₹0.2cr

**Test ID**: TC-MATH-001 | **Linked task**: qa-003

---

### AC6 — Deficit Suggestion (Actionable)
**Given**: AC5 scenario (₹0.2 crore shortfall)  
**When**: Pre-flight allocation shows deficit  
**Then**: Suggestion card/banner displays:
- "**Your plan is underfunded by ₹20 lakhs.** To close the gap:"
- "Option 1: Increase monthly SIP by **₹8,500** (assumes 15 years to retirement, 12% pre-retirement return)"
- "Option 2: Reduce Phase 2 (Kids in College) expense from ₹1.2L/mo to **₹1.08L/mo** (10% reduction)"

**Test ID**: TC-MATH-002 | **Linked task**: qa-003

---

### AC7 — India Inflation Defaults (Load Example)
**Given**: User clicks "Load Example" on empty Multi-Goal tab  
**When**: Example loads  
**Then**: 4 pre-filled phases appear:
1. "Kids at Home" (age 35-50, ₹80k/mo, **6%** inflation)
2. "Kids in College" (age 50-55, ₹1.2L/mo, **10%** inflation)
3. "Empty Nest" (age 55-70, ₹50k/mo, **6%** inflation)
4. "Medical / Late Retirement" (age 70-100, ₹70k/mo, **12%** inflation)

**Test ID**: TC-FE-005 | **Linked task**: qa-004

---

### AC8 — Year-by-Year Projection with Phase Tracking
**Given**: AC7's 4-phase example loaded, corpus ₹5 crore, retirement age 35, pre-ret return 12%, post-ret return 8%  
**When**: User navigates to Multi-Goal Projections table  
**Then**: Table shows columns: Age | Active Phase(s) | Annual Expense (inflated) | Corpus Start | Withdrawals | Growth | Corpus End  
Example row for age 52:
- Age: 52
- Active Phase(s): 🟡 Kids in College (colored badge)
- Annual Expense: ₹18.2L
- Corpus Start: ₹4.1cr
- Withdrawals: ₹18.2L
- Growth: ₹31.4L
- Corpus End: ₹4.23cr

**Test ID**: TC-FE-006 | **Linked task**: qa-004

---

### AC9 — Persistence to localStorage Profiles
**Given**: User creates 3 phases, saves profile as "Pardha FIRE Plan v2"  
**When**: User reloads page and loads profile "Pardha FIRE Plan v2"  
**Then**:
- All 3 phases restore with exact same names, age ranges, expenses, inflation rates, colors
- Multi-Goal tab auto-populates phase list
- Allocation table recalculates
- No data loss

**Test ID**: TC-PERSIST-001 | **Linked task**: qa-005

---

### AC10 — Sharelink Persistence
**Given**: User defines 2 phases, checks "Include phases in shared link", clicks "Generate Sharelink"  
**When**: User opens sharelink URL in incognito browser  
**Then**:
- Multi-Goal tab loads with 2 phases pre-filled
- Phase data identical to original (names, ages, expenses, inflation)
- Phases persist to localStorage after sharelink load

**Test ID**: TC-PERSIST-002 | **Linked task**: qa-005

---

### AC11 — Dark Mode Parity
**Given**: User toggles dark mode on  
**When**: User views Multi-Goal tab  
**Then**:
- All phase cards render correctly (no white-background leaks)
- Phase card text readable (contrast ≥4.5:1 per WCAG AA)
- Allocation table header, rows readable in dark
- Form inputs have dark background, light text
- Projection table uses existing dark-mode `.projection-table` styles
- Chart canvas background dark (`#1e293b`), grid lines visible

**Test ID**: TC-A11Y-001 | **Linked task**: qa-006

---

### AC12 — Mobile Responsive
**Given**: User opens Multi-Goal tab on 375px viewport (iPhone SE)  
**When**: User scrolls through phase cards and allocation table  
**Then**:
- Phase cards stack vertically (no horizontal overflow)
- Form inputs are touch-friendly (min 44px tap targets)
- Allocation table scrolls horizontally with sticky phase name column
- Buttons remain tappable (≥44px touch target)
- No content clipped or hidden

**Test ID**: TC-A11Y-002 | **Linked task**: qa-006

---

### AC13 — Math Test Page Passes
**Given**: `test-multigoal.html` exists with 10-15 hardcoded scenarios  
**When**: Developer opens `test-multigoal.html` in browser  
**Then**:
- All scenarios show ✅ PASS
- Expected vs actual PV, allocation %, depletion age match (±0.01% tolerance)
- No scenarios show ❌ FAIL

**Test ID**: TC-MATH-003 | **Linked task**: qa-003 (verify during implementation review)

## 6. Browser smoke checklist

| Test | Chrome Desktop | Chrome Mobile (375px) | Safari Desktop | Dark Mode | Status |
|------|----------------|----------------------|----------------|-----------|--------|
| Navigate to Multi-Goal tab | | | | | pending |
| Add phase form renders | | | | | pending |
| Load Example populates 4 phases | | | | | pending |
| Phase cards render with colors | | | | | pending |
| Allocation table displays | | | | | pending |
| Projection table displays | | | | | pending |
| Chart renders (no blank canvas) | | | | | pending |
| Edit phase (inline or modal) | | | | | pending |
| Delete phase + undo toast | | | | | pending |
| Generate sharelink with phases | | | | | pending |
| Open sharelink in incognito, phases load | | | | | pending |
| Save profile, reload, phases persist | | | | | pending |
| Navigate away from Multi-Goal tab, return, state intact | | | | | pending |
| Dark mode toggle (no white flashes) | | | | | pending |
| Responsive: cards stack vertically on mobile | | | | | pending |
| Responsive: table scrolls horizontally on mobile | | | | | pending |
| No console errors on page load | | | | | pending |
| No console errors during CRUD operations | | | | | pending |

## 7. Math test page coverage matrix

`test-multigoal.html` must cover these scenarios (engineer implements in `fe-010`):

| Scenario | Covers AC | Expected Outcome | Status |
|----------|-----------|------------------|--------|
| Single phase, zero inflation | AC5 | PV = baseMonthly × 12 × duration, allocation = 100% | pending |
| Two phases, equal PV | AC5 | Allocation = 50/50 split | pending |
| High-inflation (10%) vs low-inflation (6%) phase | AC5, AC6 | High-inflation phase gets MORE allocation (PV math accounts for faster expense growth) | pending |
| Deficit scenario (corpus < total PV) | AC6 | Allocations scale down proportionally, deficit = totalPV - corpus | pending |
| Surplus scenario (corpus > total PV) | AC5 | All phases fully funded, surplus = corpus - totalPV | pending |
| Overlapping phases (years 40-50) | AC3 | Annual expense for overlap years = sum of both phase expenses (inflated) | pending |
| Gap years (no phase coverage 50-60) | AC4 | Gap years show ₹0 expense, corpus grows (no withdrawals) | pending |
| Phase with 25% inflation boundary | AC7 | PV calculation extremely high, no math overflow | pending |
| 50-year projection (age 30→80) | AC8 | No floating-point drift >0.1%, corpus balance matches hand calculation | pending |
| Depletion age detection | AC8 | If phase exhausts before endAge, mark `isExhausted: true`, stop withdrawals | pending |

**Pass criteria**: All 10 scenarios show ✅ green in browser (expected vs actual match).

## 8. Bug intake protocol

### When a test fails

1. **Create bug task file**: `tasks/bug-NNN-<slug>.md` where NNN is next available bug ID
   - Get next ID: `bash ~/.claude/scripts/next-bug-id.sh multi-goal-early-retirement /Users/mpardhateja/PycharmProjects/financeCalculator/.claude/pdlc-runs/multi-goal-early-retirement/tasks`
   - Filename format: `bug-NNN-<2-5-word-slug>.md`

2. **Bug file frontmatter**:
   ```yaml
   ---
   id: bug-NNN
   title: <Brief title>
   type: bug
   status: pending
   owner: <original-engineer-who-wrote-the-code>
   priority: P0 | P1 | P2
   created_by: pdlc-qa-lead
   created_at: <ISO timestamp>
   updated_at: <ISO timestamp>
   files: [<affected files>]
   blocked_by: [<original-task-id>]
   blocks: []
   attempts: 0
   ---
   ```

3. **Bug description MUST include**:
   - **Reproduction steps** (numbered, copy-paste-able)
   - **Expected behavior** (cite AC or test case)
   - **Actual behavior** (screenshot, logs, error message)
   - **Environment** (browser, viewport, dark mode on/off)
   - **Related test**: Link to failed AC or test scenario

4. **Priority levels**:
   - **P0 (blocker)**: App crashes, data loss, cannot proceed with testing
   - **P1 (must-fix)**: AC explicitly fails, math incorrect, a11y violation (WCAG AA failure)
   - **P2 (nice-to-fix)**: Minor UI polish, edge case not covered by AC

5. **Assign to original engineer**:
   - Lookup original task's `owner` field (e.g., `fe-002` owner is `fe-engineer-1`)
   - Set bug's `owner` to same engineer
   - SendMessage engineer: "bug-NNN filed against your <task-id>; pick up when free"

### When a fix comes back

Per Pardha's Stage 5 design: **fixes route through Tech Lead for double deep-review BEFORE re-test**.

1. Engineer marks bug `status: review`, appends Notes: "[REVIEW] branch: ..."
2. Tech Lead picks up, runs deep-review TWICE:
   - Pass 1: Correctness (does the fix actually resolve the bug?)
   - Pass 2: Regression (did the fix break anything else?)
3. Tech Lead appends to Notes: "[REVIEW PASS 1/2] correctness OK" then "[REVIEW PASS 2/2] regression OK"
4. Tech Lead SendMessages QA Lead: "fix verified, please re-test bug-NNN"
5. **QA Lead re-runs the failing test**:
   - If PASS: mark bug `status: completed`, append Notes: "[QA RE-TEST] verified fixed"
   - If FAIL: increment `attempts`, append Notes: "[QA RE-TEST FAIL attempt N] <exact failure>"
6. After 3 failed attempts on same bug: escalate to EM via SendMessage

### Bug intake checklist

Before filing a bug:
- [ ] Re-run the test to confirm it's reproducible (not a one-off flake)
- [ ] Check if bug is already filed (search tasks/ for similar title)
- [ ] Verify bug is in-scope (not an existing-tab regression — those are separate)
- [ ] Screenshot or DOM snapshot attached (use Playwright `browser_snapshot` or DevTools `take_screenshot`)
- [ ] Reproduction steps are copy-paste-able (another QA could reproduce without asking questions)

## 9. Definition of done

### Stage 5 (QA Loop) is complete when:

- [ ] All 13 PRD acceptance criteria tests pass (AC1-AC13)
- [ ] `test-multigoal.html` shows 10/10 scenarios ✅ green (math validation)
- [ ] Browser smoke checklist 18/18 pass (Chrome desktop, Chrome mobile, Safari, dark mode)
- [ ] All P0 bugs fixed and re-tested (verified by QA after Tech Lead double-review)
- [ ] All P1 bugs fixed OR explicitly deferred with PM/Tech Lead sign-off in bug Notes
- [ ] P2 bugs triaged (fix now vs defer to v2)
- [ ] Accessibility spot-check pass (keyboard nav, screen reader, color contrast per `design/03-a11y-defaults.md`)
- [ ] Cross-tab regression pass (existing tabs unchanged, no console errors)
- [ ] Persistence round-trip pass (localStorage + sharelink encode/decode)
- [ ] `05-qa-results.md` written with test summary, bug counts, coverage gaps

### Not in DoD (out of scope):
- ❌ Automated test suite (no Vitest per Q5 decision)
- ❌ Code coverage % (no instrumentation)
- ❌ Performance benchmarks (personal-use tool, no perf requirements)
- ❌ Cross-browser beyond Chrome + Safari (Firefox/Edge/Opera not tested per existing planner convention)
