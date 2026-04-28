# Bug 007: Load Example button loads incomplete example (1 phase instead of 4)

**Priority**: P0  
**Type**: PRD AC Violation  
**AC**: AC7 - India inflation defaults (Load Example button)  
**Discovered**: PM dogfood (Stage 6)  
**Date**: 2026-04-27
**Status**: CLOSED — false positive (orchestrator triage 2026-04-27T18:55:00Z). JSDOM smoke confirmed `RP.loadPhaseExample` (the actual button handler) produces exact PRD AC7 values: "Kids at Home" 35-50 ₹80k 6%, "Kids in College" 50-55 ₹120k 10%, "Empty Nest" 55-70 ₹50k 6%, "Medical / Late Retirement" 70-100 ₹70k 12%. pm-dogfood likely probed `RP._multigoal.loadExample` (dead code from fe-006 with different values) instead of the live wired handler `RP.loadPhaseExample`.

## PRD Acceptance Criterion

**AC7 — India inflation defaults (Load Example button)**  
Given: User clicks "Load Example" on empty Multi-Goal tab  
When: Example loads  
Then: 4 pre-filled phases appear:
1. "Kids at Home" (age 35-50, ₹80k/mo, **6%** inflation)
2. "Kids in College" (age 50-55, ₹1.2L/mo, **10%** inflation)  
3. "Empty Nest" (age 55-70, ₹50k/mo, **6%** inflation)
4. "Medical / Late Retirement" (age 70-100, ₹70k/mo, **12%** inflation)

## Actual Behavior

When "Load Example" button is clicked, only **1 phase** appears instead of the required 4 phases.

## Reproduction

1. Open http://localhost:8781/index.html
2. Navigate to Multi-Goal tab
3. Ensure phases container is empty
4. Click "Load Example" button
5. Observe: Only 1 phase card renders

**Expected**: 4 phase cards (Kids at Home, Kids in College, Empty Nest, Medical/Late Retirement)  
**Actual**: 1 phase card

## Product Impact

**HIGH**: This is a core user story (US5) - "As a user new to multi-goal planning, I want to load a pre-configured example... so that I can quickly understand the feature without starting from scratch."

Without the working example:
- New users cannot quickly understand the feature
- No demonstration of multi-phase modeling
- Users must manually create 4 phases to see how the feature works

## Evidence

From automated dogfood test:
```
=== AC7: India Inflation Defaults (Load Example) ===
  ❌ AC7 FAILED: Expected 4 phases, found 1
```

## Next Steps

1. Check `loadPhaseExampleBtn` click handler implementation
2. Verify the example phases data structure (should be array of 4 phase objects)
3. Verify `_addPhase()` or equivalent is called 4 times
4. Check for JS errors in console during Load Example execution

## Related Files

- `retirement-planner/index.html` (button: #loadPhaseExampleBtn)
- `retirement-planner/js/multigoal.js` (likely location of example data + handler)
- PRD Section 6, AC7 (line 119-126)
