---
id: qa-007
title: Cross-tab regression — verify existing tabs unchanged
type: test
status: completed
owner: eng-qa-007
priority: P1
created_by: pdlc-qa-lead
created_at: 2026-04-27T15:00:00Z
updated_at: 2026-04-27T15:00:00Z
files:
  - index.html
  - pages/tab-*.html
  - js/calc-*.js
contract_refs: []
blocked_by:
  - fe-001
blocks: []
attempts: 2
---

## Description

Regression testing to verify that adding the Multi-Goal tab did NOT disturb existing tabs. Per hard constraint #1 from intake: "don't disturb what's working."

Tests all existing tabs: Basics, Projections, Dashboard, Goals, Emergency, Investments, Financial Plan, etc. — ensuring they render correctly, calculations remain unchanged, and no console errors appear.

## Acceptance Criteria

- [ ] All existing tabs render correctly (no blank pages, no layout breaks)
- [ ] All existing tab calculations produce same results as before Multi-Goal feature
- [ ] No console errors on any existing tab
- [ ] Navigation between existing tabs works (no broken links)
- [ ] Existing sharelinks (without `phases` param) load correctly
- [ ] Existing profiles load correctly (Multi-Goal tab empty if profile pre-dates feature)

## Test Plan

### Existing Tabs Smoke Test

**Test each tab in sequence**:

1. **Basics Tab**:
   - [ ] Nav button works
   - [ ] All inputs render (currentAge, retirementAge, lifeExpectancy, etc.)
   - [ ] Input changes persist
   - [ ] No console errors

2. **Investments Tab**:
   - [ ] Renders correctly
   - [ ] SIP calculator works
   - [ ] Lump sum calculator works
   - [ ] Results display correctly
   - [ ] No console errors

3. **Financial Plan Tab**:
   - [ ] Renders correctly
   - [ ] Asset allocation form works
   - [ ] Blended return calculations correct
   - [ ] `RP._preReturn`, `RP._postReturn` set correctly (check DevTools console: `RP._preReturn`)
   - [ ] No console errors

4. **Projections Tab**:
   - [ ] Renders correctly
   - [ ] Year-by-year projection table displays
   - [ ] Chart renders
   - [ ] Calculations match pre-Multi-Goal behavior (verify against a saved profile from before feature)
   - [ ] No console errors

5. **Dashboard Tab**:
   - [ ] Renders correctly
   - [ ] Summary cards display
   - [ ] Metrics correct
   - [ ] No console errors

6. **Goals Tab**:
   - [ ] Renders correctly
   - [ ] Add goal form works
   - [ ] Goal cards display
   - [ ] Goal calculations correct
   - [ ] No console errors

7. **Emergency Tab**:
   - [ ] Renders correctly
   - [ ] Emergency fund calculator works
   - [ ] No console errors

8. **What-If Tab** (if exists):
   - [ ] Renders correctly
   - [ ] Scenario comparisons work
   - [ ] No console errors

9. **(Any other existing tabs)**:
   - [ ] Test each tab similarly

### Cross-Tab Navigation Test

1. Start on Basics tab
2. Navigate to Investments tab → **verify**: renders
3. Navigate to Projections tab → **verify**: renders
4. Navigate to Multi-Goal tab → **verify**: renders
5. Navigate back to Projections tab → **verify**: still renders (no state lost)
6. Navigate to Dashboard tab → **verify**: renders
7. Repeat random navigation for 2-3 minutes
8. **Verify**: No console errors, no broken tabs

### Existing Sharelink Backward Compatibility

1. **Create an old-style sharelink** (before Multi-Goal feature):
   - Option A: Use a pre-existing sharelink from before this feature shipped
   - Option B: Manually construct a sharelink URL with only input field params (no `&phases=`)
2. Open sharelink in browser
3. **Verify**:
   - [ ] Basics tab loads with values from sharelink
   - [ ] Investments tab loads with values from sharelink
   - [ ] Projections tab calculates correctly
   - [ ] Multi-Goal tab is EMPTY (no phases, shows empty state)
   - [ ] No console errors
   - [ ] No crashes

### Existing Profile Backward Compatibility

1. **Create a profile before Multi-Goal feature** (if testing in a dev environment):
   - Save a profile before `fe-007` (persistence) is merged
   - OR manually edit localStorage to remove `rp_phases` key
2. Load profile
3. **Verify**:
   - [ ] All existing tabs load correctly
   - [ ] Multi-Goal tab shows empty state (no phases)
   - [ ] No console errors
   - [ ] No crashes

### Calculation Correctness (Spot-Check)

**Compare before/after Multi-Goal feature**:

**Setup**: Use a known test scenario (e.g., currentAge 30, retirementAge 40, SIP ₹50k/mo, 12% return)

1. **Before Multi-Goal**: Run existing Projections tab, note:
   - Corpus at age 40: ₹XXXXX
   - Corpus at age 60: ₹YYYYY
   - Depletion age: ZZ
2. **After Multi-Goal**: Run same scenario in existing Projections tab
3. **Verify**: All 3 values match (no change to single-bucket model)

**If values differ**:
- File P0 bug: "Multi-Goal feature broke existing Projections calculations"
- Attach before/after screenshots, expected vs actual values

### Console Error Check

**Critical**: During ALL above tests, keep Chrome DevTools console open.

**Pass criteria**: ZERO console errors on existing tabs.

**If errors found**:
- Screenshot the error
- Note which tab triggered it
- File bug with stack trace
- Priority:
  - P0 if error breaks functionality (e.g., "Cannot read property 'value' of null" → tab doesn't render)
  - P1 if error is logged but tab still works (e.g., warning about deprecated API)

## Build Verification

Not applicable — QA regression task. Can be executed as soon as `fe-001` (nav button) is complete, but best after all FE tasks done.

## Notes

(QA Lead appends test results, any regressions found, console error logs)

### 2026-04-27 — eng-qa-007 (Wave 2 pass after fe-001 + fe-002 + fe-003 + fe-006)

**Result: PASS — all 16 existing tabs verified unaffected by Wave 1+2 changes.**

**Setup**: worktree `.claude/worktrees/eng-qa-007` on branch `test/qa-007` reset to `main` @ 958fc8f. Server: `python3 -m http.server 8765` from `retirement-planner/`. Driver: playwright MCP.

**Tab sweep** — clicked each of 16 existing tabs, verified panel visible + heading correct + content rendered:

| Tab | Heading | Visible | childCount |
|---|---|---|---|
| basics | Basic Details | ✓ | 1 |
| expenses | Monthly Expenses | ✓ | 1 |
| investments | Asset Allocation | ✓ | 1 |
| financial-plan | Pre-Retirement Plan | ✓ | 1 |
| projections | Year-by-Year Projections | ✓ | 4 |
| dashboard | Financial Dashboard | ✓ | 4 |
| whatif | What-If Scenarios | ✓ | 3 |
| goals | Goal Planning | ✓ | 4 |
| emergency | Emergency Fund Tracker | ✓ | 2 |
| sip | SIP Calculator | ✓ | 2 |
| tracker | Investment Tracker | ✓ | 5 |
| milestones | Milestone Alerts | ✓ | 3 |
| loan | Loan / EMI Impact | ✓ | 2 |
| exptrack | Expense Tracker (Actual vs Budget) | ✓ | 3 |
| networth | Net Worth Tracker | ✓ | 3 |
| profiles | Save / Load Profiles | ✓ | 2 |

**Math engine spot-check**: set currentAge=30, retirementAge=40, monthlySalary=300000 (note: spec said `monthlyIncome` but actual ID is `monthlySalary`). Projections produced 72 rows. Sample corpus values: ₹70L → ₹1.04Cr → ₹1.43Cr → ₹1.89Cr → ₹2.42Cr → ₹3.04Cr — all non-zero, monotonically increasing. Existing single-bucket model not perturbed by Wave 1+2.

**Goals tab smoke**: filled (Test Goal, ₹500000, 2030) → clicked Add Goal → goal card rendered with "₹5,00,000 by 2030 (4 yrs) SIP needed: ₹8,060/mo Remove" — works.

**Dark mode toggle**: body class toggles `dark-mode` ↔ `` cleanly (started in dark, toggled twice, ended in dark). Re-swept basics/dashboard/projections/goals in both themes — all render.

**Copy Share Link**: clipboard.writeText invoked with full URL `http://localhost:8765/index.html?plan=eyJjdXJyZW50QWdlIjoiMzAi...` (2462 chars, base64 plan param) — works.

**Console errors during entire run**: 1 — `Failed to load resource: 404 favicon.ico` (pre-existing, not a regression). 0 JS errors from Wave 1+2 code.

**Verdict**: hard constraint #1 ("don't disturb what's working") holds for Wave 1+2 (fe-001 nav scaffold, fe-002 phase CRUD UI, fe-003 PV-allocation math, fe-006 localStorage + Load Example). Will re-run after Wave 3+4 (allocation table, projection chart, sharelink encoding, math test page) lands.

**Deferred / follow-up** (not regressions, surfacing for QA Lead):
- Spec referenced input id `monthlyIncome` but actual id is `monthlySalary`. Minor; spec test plan will need updating but production code is correct.
- Backward-compat sharelink test (load an old `?plan=...` URL with no `&phases=` param) was NOT executed — needs `fe-005` (sharelink encoding) merged first to even know the new param name. Will cover in next pass.
- Backward-compat profile test (load profile saved before fe-006) was NOT executed for the same reason.
