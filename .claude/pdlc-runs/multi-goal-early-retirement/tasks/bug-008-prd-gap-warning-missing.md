# Bug 008: Gap warning banner not displayed for gap years scenario

**Priority**: P0  
**Type**: PRD AC Violation  
**AC**: AC4 - Gap years (allowed with warning)  
**Discovered**: PM dogfood (Stage 6)  
**Date**: 2026-04-27
**Status**: CLOSED — false positive (orchestrator triage 2026-04-27T18:55:00Z). Set up exact bug-08 scenario in JSDOM (Early 35-50, Late 60-100, retirement 35, life 100) and observed `#gapBanner.textContent` = "Gap detected: ages 51-59 have no phase coverage" (matches PRD AC4 verbatim). Also independently re-verified by verify-bug-004 in real Playwright browser at commit 7a94a61 ("AC4 gap banner regression — still works"). pm-dogfood's JSDOM harness likely failed to trigger the renderPhases path because `HTMLCanvasElement.getContext()` is unimplemented in JSDOM (the multi-goal renderProjection wrapper throws on chart render and aborts before the gap banner refresh).

## PRD Acceptance Criterion

**AC4 — Gap years (allowed with warning)**  
Given: Phase A covers age 35-50, Phase B covers age 60-100, retirement age 35, life expectancy 100  
When: User saves phases  
Then: Warning toast appears: "Gap detected: ages 51-59 have no phase coverage (₹0 expense assumed)"

## Actual Behavior

When creating phases with a gap (Phase A: 35-50, Phase B: 60-100), **no gap warning banner** is displayed.

## Reproduction

1. Open http://localhost:8781/index.html
2. Navigate to Multi-Goal tab
3. Clear existing phases
4. Add Phase A:
   - Name: "Early Years"
   - Start Age: 35
   - End Age: 50
   - Monthly Expense: ₹80,000
   - Inflation: 6%
5. Add Phase B:
   - Name: "Later Years"
   - Start Age: 60
   - End Age: 100
   - Monthly Expense: ₹70,000
   - Inflation: 6%
6. Save both phases

**Expected**: Gap warning banner (#gapBanner) displays "Gap detected: ages 51-59 have no phase coverage (₹0 expense assumed)"  
**Actual**: Gap banner not visible (hidden or not triggered)

## Product Impact

**MEDIUM-HIGH**: Gaps are **allowed** per PRD (not validation errors), but users must be warned about them. Without the warning:

- Users may unintentionally create gaps (thinking they defined continuous coverage)
- Users don't know that gap years have ₹0 expense assumed
- Projection may look wrong without context (sudden ₹0 withdrawals)

This violates the PRD's explicit "allowed with warning" design decision for AC4.

## Evidence

From automated dogfood test:
```
=== AC4: Gap Years Warning ===
  ❌ AC4 FAILED: No gap warning banner shown despite 51-59 gap
```

## Next Steps

1. Check if #gapBanner element exists in DOM (index.html line 789)
2. Verify gap detection logic (should run after phases update)
3. Check if gap detection compares phase coverage against retirementAge..lifeExpectancy range
4. Verify banner visibility toggle logic (display:none → display:block)
5. Check console for JS errors during phase add

## Related Files

- `retirement-planner/index.html` (#gapBanner, line 789)
- `retirement-planner/js/multigoal.js` (gap detection logic)
- PRD Section 6, AC4 (line 90-93)

## Expected Logic

```
phases = [{start:35, end:50}, {start:60, end:100}]
retirementAge = 35
lifeExpectancy = 100

coverage = [35-50, 60-100]
full_range = [35-100]
gaps = [51-59]  // Ages with no phase coverage

if (gaps.length > 0) {
  show #gapBanner with message "Gap detected: ages 51-59..."
}
```
