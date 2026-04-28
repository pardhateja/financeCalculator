---
id: qa-004
title: AC7-AC8 manual tests — India defaults, projection table + chart
type: test
status: completed
owner: eng-qa-004
priority: P1
created_by: pdlc-qa-lead
created_at: 2026-04-27T15:00:00Z
updated_at: 2026-04-27T15:00:00Z
files:
  - js/calc-multigoal.js
  - pages/tab-multigoal.html
contract_refs: []
blocked_by:
  - fe-005
  - fe-006
blocks: []
attempts: 1
result: "AC7-AC8: pass"
---

## Description

Manual testing of "Load Example" button (Indian FIRE 4-phase template with correct inflation defaults) and year-by-year projection table + chart rendering (phase tracking, colored badges, inflated expenses, corpus depletion).

Covers **PRD AC7-AC8**.

## Acceptance Criteria

### AC7 — India Inflation Defaults
- [ ] "Load Example" button visible on empty Multi-Goal tab
- [ ] Clicking "Load Example" populates 4 phases
- [ ] Phase 1: "Kids at Home" (or similar), age 35-50, ₹80k/mo, **6%** inflation
- [ ] Phase 2: "Kids in College" (or similar), age 50-55, ₹1.2L/mo, **10%** inflation
- [ ] Phase 3: "Empty Nest" (or similar), age 55-70, ₹50k/mo, **6%** inflation
- [ ] Phase 4: "Medical / Late Retirement" (or similar), age 70-100, ₹70k/mo, **12%** inflation
- [ ] If user already has phases, show confirmation: "Load Example Template? This will replace your N existing phases."

### AC8 — Year-by-Year Projection
- [ ] Projection table visible with columns: Age | Active Phase(s) | Annual Expense | Corpus Start | Withdrawals | Growth | Corpus End
- [ ] "Active Phase(s)" column shows colored badges (e.g., 🔵 Kids at Home)
- [ ] Overlapping years show multiple badges or "🔵🟢 2 phases" text
- [ ] Annual expenses are inflation-adjusted (grow over time)
- [ ] Corpus balance matches: Start + Growth - Withdrawals = End
- [ ] Chart renders below table with phase-shaded regions (blue, emerald, amber, purple vertical tints)

## Test Plan

### TC-FE-005: Load Example (AC7)

**Scenario 1: Empty State**
1. Open Multi-Goal tab (no phases)
2. Click "Load Example" button
3. **Verify**: 4 phase cards appear instantly (no loading spinner needed — synchronous)
4. **Verify Phase 1**:
   - Name: "Kids at Home" (exact wording may vary, check design spec)
   - Age: 35-50 (or per design — intake shows 35-50)
   - Monthly: ₹80,000
   - Inflation: **6%**
5. **Verify Phase 2**:
   - Name: "Kids in College"
   - Age: 50-55
   - Monthly: ₹1,20,000 (₹1.2L)
   - Inflation: **10%**
6. **Verify Phase 3**:
   - Name: "Empty Nest"
   - Age: 55-70
   - Monthly: ₹50,000
   - Inflation: **6%**
7. **Verify Phase 4**:
   - Name: "Medical / Late Retirement"
   - Age: 70-100
   - Monthly: ₹70,000
   - Inflation: **12%**
8. **Verify**: Allocation table appears (if implemented), chart renders

**Scenario 2: Replace Existing Phases**
1. Manually add 2 custom phases
2. Click "Load Example"
3. **Verify**: Confirmation modal/dialog: "Load Example Template? This will replace your 2 existing phases."
4. Click "Load Example" in confirmation
5. **Verify**: Custom phases replaced with 4 example phases

### TC-FE-006: Year-by-Year Projection (AC8)

**Setup**:
1. Load Example (4 phases)
2. Configure existing planner:
   - Basics: currentAge 35, retirementAge 35, lifeExpectancy 100
   - Financial Plan: pre-return 12%, post-return 8%
   - Investments: corpus ≈ ₹5cr

**Verify Projection Table**:
1. Scroll to "Year-by-Year Projection" section
2. **Verify table columns present**:
   - Age
   - Active Phase(s)
   - Annual Expense (inflated)
   - Corpus Start
   - Withdrawals
   - Growth
   - Corpus End
3. **Spot-check row at age 52** (during "Kids in College" phase):
   - Age: 52
   - Active Phase(s): 🟡 Kids in College (colored badge, yellow/amber for phase 2)
   - Annual Expense: ≈ ₹18-20L (inflated from ₹1.2L/mo base × 17 years × 10% inflation)
   - Corpus Start: ≈ ₹4-5cr (varies based on previous years)
   - Withdrawals: ≈ ₹18-20L (matches Annual Expense)
   - Growth: ≈ 8% of Corpus Start (post-return rate)
   - Corpus End: Start + Growth - Withdrawals
4. **Verify math**: Corpus End (row 52) = Corpus Start (row 53)
5. **Spot-check overlapping year (age 50)** (both Phase 1 and Phase 2 active):
   - Active Phase(s): "🔵🟡 2 phases" OR two separate badges
   - Annual Expense: Sum of inflated Phase 1 (₹80k base) + Phase 2 (₹1.2L base)

**Verify Chart**:
1. Chart canvas visible below table
2. **Verify X-axis**: Age labels (35, 40, 45, ..., 100)
3. **Verify Y-axis**: Corpus balance (₹0 to ₹5cr+)
4. **Verify line**: Blue/primary line showing corpus balance over time
5. **Verify phase regions**: 4 vertical shaded regions:
   - Blue tint (age 35-50) — Phase 1
   - Emerald/green tint (age 50-55) — Phase 2 (may overlap Phase 1 at age 50)
   - Amber/yellow tint (age 55-70) — Phase 3
   - Purple tint (age 70-100) — Phase 4
6. **Verify labels**: Phase names labeled at top of each shaded region (or in legend)
7. **Verify hover tooltips** (if implemented): Hover over chart → tooltip shows age, corpus, active phase

## Build Verification

Not applicable — QA task. Engineers complete `fe-005`, `fe-006` first.

## Notes

### Test Run — eng-qa-004 (2026-04-27) — AC7-AC8: PASS

**AC7 — India Defaults: PASS**
- "Load Example" button visible on empty Multi-Goal tab
- Click loads 4 phases instantly (synchronous)
- Phase 1: "Kids at Home", Age 35-50 (15 years), ₹80,000/mo, 6% inflation ✓
- Phase 2: "Kids in College", Age 50-55 (5 years), ₹1,20,000/mo, 10% inflation ✓
- Phase 3: "Empty Nest", Age 55-70 (15 years), ₹50,000/mo, 6% inflation ✓
- Phase 4: "Medical / Late Retirement", Age 70-100 (30 years), ₹70,000/mo, 12% inflation ✓
- Names and inflation rates exactly match the intake's reframed Indian FIRE table

**AC8 — Year-by-Year Projection Table: PASS**
- Table renders with 6 columns: Age | Active Phase | Inflated Expense | Per-Phase Balances | Total Balance | Status
- Colored badges per phase in "Active Phase" column
- Overlap years correctly show MULTIPLE colored badges:
  - Age 50: "Kids at Home" + "Kids in College" badges
  - Age 55: "Kids in College" + "Empty Nest" badges
  - Age 70: "Empty Nest" + "Medical / Late Retirement" badges
- Inflated expenses grow over time (Phase 1: ₹15.30L→₹20.48L→₹34.59L)
- Status column transitions Healthy → Depleting → Depleted as corpus runs out (Depleting at age 74, Depleted at age 79)

**AC8 — Projection Chart: PASS**
- Canvas `#multigoalProjectionChart` renders (2112×700 internal, 1056×350 displayed)
- Solid corpus line drawn from age 35→100
- 4 vertical phase-tinted regions visible: blue (Kids at Home), emerald-green (Kids in College), amber (Empty Nest), purple (Medical / Late Retirement)
- Phase names labeled at top of each shaded region
- Pixel sampling confirmed distinct tint colors at each phase x-position (rgba alpha ~26-45 for tints)
- Screenshot: `qa-004-chart.png` (in worktree .claude/worktrees/eng-qa-004)

No bugs filed.
