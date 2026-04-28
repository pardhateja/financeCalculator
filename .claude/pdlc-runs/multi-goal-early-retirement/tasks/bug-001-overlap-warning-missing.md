---
id: bug-001
title: Overlap warning UI missing — AC3 violation
type: bug
status: completed
owner: "fix-bug-001"
priority: P0
created_by: eng-qa-002
created_at: 2026-04-27T11:40:00Z
updated_at: 2026-04-27T18:21:00Z
attempts: 1
merged_at: 2026-04-27T18:21:00Z
branch: fix/bug-001
notes: "Added _detectOverlaps + _detectOverlapRanges helpers + per-card badges + banner. Smoke verified in playwright. Merge resolved banner-ordering conflict with bug-002 (overlap above gap)."
files:
  - retirement-planner/pages/tab-multigoal.html
  - retirement-planner/js/calc-multigoal.js
  - retirement-planner/css/multigoal.css
  - retirement-planner/index.html
contract_refs:
  - qa-002 / PRD AC3
blocked_by: []
blocks: []
attempts: 1
---

[REVIEW] branch: fix/bug-001
- Added `RP._multigoal._detectOverlaps(phases)` — per-phase descriptors `[{phaseId, overlapsWith:[{otherPhaseId, otherPhaseName, fromAge, toAge}]}]`
- Added `RP._multigoal._detectOverlapRanges(phases)` — banner-aggregate `[{fromAge, toAge, phaseNames}]` (groups consecutive ages with the same active set into one range)
- `RP.renderPhases` now calls `_renderOverlapBanner` (above the list) and decorates each card with `.phase-overlap-badge` per overlap partner
- New `.alert-info` CSS variant + `.phase-overlap-badge` + dark-mode parity in `multigoal.css`
- New `<div id="overlapBanner" class="alert alert-info" role="status">` in `tab-multigoal.html` (regenerated into `index.html` via build.sh)

Smoke (playwright, file:// → http://localhost:8766):
1. Phase A "Early" 35-50 + Phase B "College" 48-54 → banner: "Years 48-50 are covered by multiple phases. Expenses will be summed.", Early card shows "Overlaps with College", College card shows "Overlaps with Early" ✅
2. Remove phase B → banner hidden, Early card has 0 badges ✅

## Description

PRD AC3 requires that when two phases have overlapping age ranges:
1. An info banner shows: "⚠️ Years X-Y are covered by multiple phases. Expenses will be summed."
2. Each overlapping phase card displays an overlap badge: "Overlaps with [other phase]"

Neither is implemented. The math for overlapping phases works correctly (expenses summed), but the user has no visual indication that an overlap exists.

## Steps to Reproduce

1. Open `retirement-planner/index.html` → Multi-Goal tab
2. Add Phase A: name "Mid-life Hobbies", startAge 51, endAge 64, monthlyExpense 20000, inflation 5
3. Add Phase B: name "Overlap Test", startAge 60, endAge 70, monthlyExpense 30000, inflation 5
4. Observe phases list and projection area

## Expected

- Info banner near phases list: "⚠️ Years 60-64 are covered by multiple phases. Expenses will be summed."
- Both Mid-life Hobbies and Overlap Test cards show a badge: "Overlaps with [other phase]"

## Actual

- No banner appears anywhere in the Multi-Goal tab
- No overlap badges on either phase card
- Phase cards render only with name, age range, expense — no overlap indicator
- DOM scan confirms zero `[class*="overlap"]` elements with content

## Evidence

```js
// Run in browser console after step 3 above
document.getElementById('tab-multigoal').innerText.match(/overlap/gi)
// → null (only matches the phase name itself, no warning text)
```

## Source Code Check

`grep -ni "overlap" retirement-planner/js/calc-multigoal.js` shows overlap referenced only in the `test-multigoal.html` math scenarios (line 536-548). No overlap-detection or warning-rendering code in the production tab.

## Severity Justification

P0 — directly violates a documented Acceptance Criterion (AC3) listed in the PRD and qa-002 task. Without an overlap warning, users may be unaware their expenses are being doubled.

## Suggested Fix

In `renderMultiGoalPhases()` (or equivalent render function in `calc-multigoal.js`):
1. After sorting phases by startAge, compute pairwise overlaps: `phaseA.endAge >= phaseB.startAge && phaseA.startAge <= phaseB.endAge`
2. For each overlap, append a badge to both phase cards: `<span class="phase-overlap-badge">Overlaps with {otherPhaseName}</span>`
3. Render an info banner above the phases list summarizing overlapping age ranges

## Notes

(Tech Lead reviews + assigns to engineer)
