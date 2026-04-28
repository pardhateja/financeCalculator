# Bug 005: Excessive monthly expense values cause number formatting overflow and absurd suggestions

**Priority**: P1 (UX broken)  
**Found by**: adversary (bug-bash)  
**Date**: 2026-04-27
**Status**: COMPLETED at commit efd6ac3 (orchestrator-direct fix; original engineer was SIGKILLed wedged on browser_navigate permission prompt, fix was 1-line scope). Cap added to `RP._readPhaseForm` validation: `baseMonthlyExpense > 100000000` → "Monthly expense unrealistically high (max ₹10 crore/mo)". Verified via node-sanity check that the validation message is present in the source.

## Reproduction steps

1. Open Multi-Goal tab
2. Fill phase form:
   - Phase Name: "Test Phase"
   - Start Age: 50
   - End Age: 60
   - Monthly Expense: `1000000000000000` (1e15, 1 quadrillion rupees)
   - Inflation %: 6
3. Click "Add Phase"

## Expected behavior

One of:
- **Option A (recommended)**: Form validation rejects values above a reasonable maximum (e.g., ₹10 crore/month = ₹100,00,00,000) with error: "Monthly expense unrealistically high (max ₹10 crore/mo)"
- **Option B**: App accepts but gracefully degrades (caps calculations, shows warning)

## Actual behavior

✅ Phase is added successfully  
❌ Multiple rendering and math issues:

1. **Phase card displays malformed number**: "₹1,00,00,00,00,00,00,000/mo" (too many digits, no abbreviation)
2. **Allocation table shows nonsensical PV**: "₹11044470174.15 Cr" (number format breaks down)
3. **Deficit suggestion produces absurd values**:
   - "Increase monthly SIP by ₹67,10,58,36,91,07,637"
   - "OR reduce... to ₹16,32,97,71,44,95,109/mo (83.7% reduction)"
4. **Year-by-year projection shows overflow-like values**: "₹45,83,69,95,93,88,76,696" inflated expense at age 50

## Root cause hypothesis

No upper-bound validation on `monthlyExpense` field. JavaScript `Number` can represent 1e15 accurately, but:
- Indian lakh/crore formatting logic breaks down above ~10^12
- PV calculation compounds the large base over 10 years with 6% inflation, producing values that exceed practical display limits
- Suggestion formulas assume reasonable input ranges and produce meaningless output for extreme values

## Suggested fix

Add validation in `addPhase()` similar to inflation validation:

```javascript
// After existing validations
if (baseMonthlyExpense > 10_00_00_000) { // 10 crore/month
  showError('phaseMonthlyExpenseError', 'Monthly expense unrealistically high (max ₹10 crore/mo)');
  return;
}
```

**Rationale for 10 crore/mo cap**: 
- ₹10 crore/month = ₹120 crore/year
- Even for ultra-HNW Indian early retirees, monthly expenses above this threshold are edge-case enough to warrant explicit design (e.g., separate "wealth preservation" calculator)
- Keeps all numbers within Indian lakh/crore formatting comfort zone

## Acceptance test

After fix:
1. Try to add phase with monthly expense = ₹10,00,00,001
2. Should show validation error
3. Try with monthly expense = ₹10,00,00,000 (exactly at limit)
4. Should succeed and display cleanly

## Screenshots

(Phase card and allocation table from snapshot show the malformed numbers - adversary observed via Playwright DOM inspection, no screenshot saved)
