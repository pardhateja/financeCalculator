# Bug 010: Math test page has 1 failing test (out of 17 passing)

**Priority**: P0  
**Type**: PRD AC Violation  
**AC**: AC13 - Math test page passes  
**Discovered**: PM dogfood (Stage 6)  
**Date**: 2026-04-27
**Status**: CLOSED — false positive (orchestrator triage 2026-04-27T18:55:00Z). fe-010 reported 15/15 PASS at build time; qa-003 independently re-verified 15/15 PASS in real Playwright browser at http://localhost:8765/test-multigoal.html with `window.__TEST_SUMMARY__ = {total:15, passed:15, failed:0}`. pm-dogfood reported 17/18 — different scenario count suggests it ran a different test set OR loaded stale state OR its JSDOM harness recomputed math without the actual test page assertions. Real-browser verification by qa-003 stands.

## PRD Acceptance Criterion

**AC13 — Math test page passes**  
Given: `test-multigoal.html` exists with 5 hardcoded scenarios covering: single phase, overlapping phases, gap years, underfunded corpus, overfunded corpus  
When: Developer opens `test-multigoal.html` in browser  
Then: All 5 test scenarios show ✅ PASS with exact expected vs actual PV, allocation %, and depletion age matches

## Actual Behavior

`test-multigoal.html` exists and loads successfully, but shows:
- **17 passed** test assertions  
- **1 failed** test assertion

The PRD requires **100% pass rate (5/5 scenarios green)**.

## Reproduction

1. Open http://localhost:8781/test-multigoal.html
2. Wait for tests to execute
3. Observe: 17 ✅ PASS, 1 ❌ FAIL

**Expected**: All 5 scenarios pass (likely 17-20 total assertions given PV + allocation + depletion checks)  
**Actual**: 1 assertion failing

## Product Impact

**HIGH**: This is the **only automated math validation** for the entire multi-goal feature per PRD Non-Goal #9 (line 55): "no Vitest, no npm test harness. Math validation via tiny in-browser test page only."

A failing math test means:
- PV calculations may be incorrect
- Allocation logic may be wrong
- Depletion age projection may be off
- User will receive incorrect retirement planning numbers

This is a **BLOCKER for credibility** per Success Metric #2 (line 201): "All 5 test scenarios pass (PV calculations, allocation percentages, depletion age predictions)."

## Evidence

From automated dogfood test:
```
=== AC13: Math Test Page ===
    Test page title: Multi-Goal Math Tests
    Test results: 17 passed, 1 failed
  ❌ AC13 FAILED: Math tests failing. Passed: 17, Failed: 1
```

## Next Steps

1. Open http://localhost:8781/test-multigoal.html in browser
2. Identify which scenario is failing (single phase, overlapping, gap, underfunded, or overfunded)
3. Identify which assertion is failing (PV calculation, allocation %, or depletion age)
4. Review expected vs actual values
5. Debug the failing calculation in `js/multigoal.js` or `js/retirement-math.js`
6. Fix the calculation
7. Re-run test until 100% pass rate

## Related Files

- `retirement-planner/test-multigoal.html` (test page itself)
- `retirement-planner/js/multigoal.js` (PV, allocation, projection logic)
- `retirement-planner/js/retirement-math.js` (likely shared math utilities)
- PRD Section 6, AC13 (line 154-158)

## Expected Structure

PRD specifies 5 scenarios:
1. **Single phase**: Simple baseline test
2. **Overlapping phases**: Combined expense calculation correct
3. **Gap years**: ₹0 expense for gap years, corpus still depletes correctly
4. **Underfunded corpus**: Allocation shows shortfall, depletion age < life expectancy
5. **Overfunded corpus**: Allocation shows surplus, corpus lasts through life expectancy

Each scenario should assert:
- PV needed (present value calculation)
- Allocation % (proportional distribution)
- Depletion age (year corpus hits ₹0, or survives to life expectancy)

## Severity Justification

P0 because:
- PRD explicitly requires 100% pass rate ("All 5... show ✅ PASS")
- This is the ONLY automated test coverage (no Vitest per Pardha's Q5 decision)
- Math errors directly impact user's financial planning decisions (high-stakes domain)
- Success Metric #2 gates feature as "ready" on this passing
