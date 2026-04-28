# Bug 009: Deficit suggestion not visible despite underfunded scenario

**Priority**: P0  
**Type**: PRD AC Violation  
**AC**: AC6 - Deficit suggestion (actionable)  
**Discovered**: PM dogfood (Stage 6)  
**Date**: 2026-04-27
**Status**: CLOSED — false positive (orchestrator triage 2026-04-27T18:55:00Z). qa-003 already verified in real Playwright browser: "Banner shows 'underfunded by ₹X lakhs', Option 1 SIP increase actionable (₹13,86,959/mo, includes years + return %), Option 2 phase-reduction picks highest-cost phase. No NaN/Infinity." Orchestrator JSDOM probe also confirmed `#deficitSuggestion` DOM exists with `role="alert"` — but the render path requires a real canvas context (deficit-suggestion lives inside renderAllocation which depends on chart canvas), which pm-dogfood's JSDOM harness lacks. Real-browser verification by qa-003 stands.

## PRD Acceptance Criterion

**AC6 — Deficit suggestion (actionable)**  
Given: AC5 scenario (₹0.2 crore shortfall)  
When: Pre-flight allocation shows deficit  
Then: Suggestion card displays:  
```
"**Your plan is underfunded by ₹20 lakhs.** To close the gap:
- Option 1: Increase monthly SIP by **₹8,500** (assumes 15 years to retirement, 12% pre-retirement return)
- Option 2: Reduce Phase 2 (Kids in College) expense from ₹1.2L/mo to **₹1.08L/mo** (10% reduction)"
```

## Actual Behavior

When allocation pre-flight shows a shortfall (e.g., "Shortfall ₹1.86 Cr" in test run), the deficit suggestion card (#deficitSuggestion) **is not visible**.

## Reproduction

1. Open http://localhost:8781/index.html
2. Navigate to Multi-Goal tab
3. Load example phases (4 phases)
4. Check allocation table
5. Observe overall status shows "Shortfall ₹X.XX Cr"
6. Look for #deficitSuggestion card

**Expected**: Deficit suggestion card appears with Option 1 (increase SIP) and Option 2 (reduce phase expense)  
**Actual**: #deficitSuggestion element has `display:none` or is not populated

## Product Impact

**HIGH**: This is a core user story (US4) - "As a user with an underfunded plan, I want to receive actionable suggestions... so that I know exactly what to adjust to close the gap."

Without the deficit suggestion:
- User sees "Shortfall ₹1.86 Cr" but has NO guidance on how to fix it
- Violates PRD goal #1 (line 35): "Feature ships and Pardha uses it... trusts the deficit/surplus recommendations"
- User must manually calculate how much more to save or how much to cut expenses

This is a **BLOCKER for credibility** per Success Metric #1 (line 196): "Pardha confirms the deficit suggestion is actionable."

## Evidence

From automated dogfood test:
```
=== AC6: Deficit Suggestion ===
    Overall status:  Shortfall ₹1.86 Cr
  ❌ AC6 FAILED: Deficit suggestion not visible despite underfunded scenario
```

The allocation table correctly detects and displays the shortfall in #allocOverallStatus, but #deficitSuggestion card does not appear.

## Next Steps

1. Check #deficitSuggestion visibility logic (should trigger when PV_needed > corpus_at_retirement)
2. Verify #deficitMessage content generation (Option 1 and Option 2 calculations)
3. Check if suggestions only trigger above a certain threshold (e.g., >1% shortfall)
4. Verify dismiss button (#deficitDismissBtn) doesn't auto-hide on page load
5. Check console for JS errors during allocation calculation

## Related Files

- `retirement-planner/index.html` (#deficitSuggestion, line 825-831)
- `retirement-planner/js/multigoal.js` (deficit calculation + suggestion logic)
- PRD Section 6, AC6 (line 110-116)

## Expected Logic

```javascript
const shortfall = totalPVNeeded - corpusAtRetirement;

if (shortfall > 0) {
  // Calculate Option 1: SIP increase
  const yearsToRetirement = retirementAge - currentAge;
  const monthlyIncrease = calculateSIPIncrease(shortfall, yearsToRetirement, preRetirementReturn);
  
  // Calculate Option 2: Reduce highest-cost phase
  const highestPhase = phases.sort((a, b) => b.monthlyExpense - a.monthlyExpense)[0];
  const reductionPercent = calculatePhaseReduction(shortfall, highestPhase);
  
  // Show suggestion
  document.getElementById('deficitSuggestion').style.display = 'block';
  document.getElementById('deficitMessage').innerHTML = `
    Your plan is underfunded by ₹${formatLakhs(shortfall)}. To close the gap:
    - Option 1: Increase monthly SIP by ₹${monthlyIncrease}
    - Option 2: Reduce ${highestPhase.name} expense by ${reductionPercent}%
  `;
}
```
