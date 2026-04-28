---
id: bug-002
title: Gap warning UI missing — AC4 violation
type: bug
status: completed
owner: "fix-bug-002"
priority: P0
created_by: eng-qa-002
created_at: 2026-04-27T11:40:30Z
updated_at: 2026-04-27T18:16:00Z
attempts: 1
merged_at: 2026-04-27T18:16:00Z
branch: fix/bug-002
notes: "Additive IIFE-wrap pattern (doesn't modify renderPhases). 7-case node smoke verified incl. exact bug repro. Auto-merge clean after bug-003."
files:
  - retirement-planner/pages/tab-multigoal.html
  - retirement-planner/js/calc-multigoal.js
contract_refs:
  - qa-002 / PRD AC4
blocked_by: []
blocks: []
attempts: 1
---

## Description

PRD AC4 requires that when two phases leave a gap in age coverage (e.g., Phase A 35-50 and Phase B 60-100, leaving years 51-59 uncovered), a warning banner is shown:

> "Gap detected: ages 51-59 have no phase coverage"

The gap is allowed (no validation error), but the user must be informed. The math correctly treats gap years as ₹0 expense and lets corpus grow, but the warning UI is missing.

## Steps to Reproduce

1. Open `retirement-planner/index.html` → Multi-Goal tab
2. Add Phase A: "Kids at Home", startAge 35, endAge 50, monthlyExpense 80000, inflation 6
3. Add Phase B: "Healthcare", startAge 76, endAge 100, monthlyExpense 40000, inflation 8
4. Observe phases list area

## Expected

- Warning banner: "Gap detected: ages 51-75 have no phase coverage" (or similar wording)
- Banner is informational, NOT blocking (phase still added)

## Actual

- No gap banner appears anywhere
- DOM scan: `document.getElementById('tab-multigoal').innerText.match(/gap/gi)` → null
- No `[class*="gap"]` elements with content found

## Source Code Check

`grep -ni "gap" retirement-planner/js/calc-multigoal.js` shows "gap" only in:
- The deficit-suggestion text ("close the gap by retirement")
- A test scenario name ("Gap year — age 60 has no phases") in test-multigoal.html data

No gap-detection logic exists in the rendering pipeline.

## Severity Justification

P0 — directly violates documented Acceptance Criterion (AC4). Users planning retirement need to see uncovered years explicitly; silent gaps mean a planning blind spot.

## Suggested Fix

In `renderMultiGoalPhases()`:
1. After sorting phases by startAge, walk consecutive pairs
2. If `phases[i+1].startAge > phases[i].endAge + 1`, record gap range `[phases[i].endAge+1, phases[i+1].startAge-1]`
3. Also check leading gap (`currentAge` → first phase) and trailing gap (last phase → `lifeExpectancy`) per spec
4. Render a yellow info banner listing gap ranges

## Notes

(Tech Lead reviews + assigns to engineer)

[REVIEW] branch: fix/bug-002

Fix summary:
- Added pure helper `RP._multigoal._detectGaps(phases, retAge, lifeExp)` that
  returns `[{fromAge, toAge}]` inclusive ranges for uncovered ages — covers
  leading (retAge → first phase), trailing (last phase → lifeExp), and middle
  gaps. Empty array on no-phases or out-of-range bounds.
- Added `RP._multigoal._renderGapBanner()` that paints `#gapBanner` with
  "Gap detected: ages X-Y have no phase coverage" (or comma-joined list if
  multiple ranges). Hides when none.
- Added `<div id="gapBanner" class="alert alert-warning" role="status">` to
  `tab-multigoal.html` immediately above `#phasesContainer`. Sibling of (and
  precedes) the overlap banner that fix-bug-001 will add.
- Wired via additive IIFE wrapper around `RP.renderPhases` (same pattern as
  the existing `wrapRenderPhasesForAllocation`). Wrapper also calls
  `_renderOverlapBanner` if fix-bug-001's helper exists, so both stay in sync.
- Reused existing `.alert-warning` styling (fe-004); no new CSS.

Smoke (Node-based since browser MCP was busy with parallel agents):
- Bug-002 exact repro (phase A 35-50, phase B 60-100, ret=35, life=100) →
  helper returns `[{fromAge:51, toAge:59}]` → banner text would be
  "Gap detected: ages 51-59 have no phase coverage". PASS.
- Add middle phase 50-60 → helper returns `[]` → banner hidden. PASS.
- Plus 5 other edge cases (leading gap, trailing gap, single-age gap,
  overlapping no-gap, empty phases) all PASS — 7/7.
