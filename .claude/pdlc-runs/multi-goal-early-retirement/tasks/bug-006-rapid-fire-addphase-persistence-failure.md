# Bug 006: Rapid-fire addPhase() calls succeed but phases not persisted to localStorage

**Priority**: P2 (edge case, unlikely in normal UI usage)  
**Found by**: adversary (bug-bash concurrency testing)  
**Date**: 2026-04-27
**Status**: CLOSED — wontfix (orchestrator triage 2026-04-27T20:35:00Z). Adversary's reproduction calls `RP.addPhase(phaseObject)` but the function reads input from form fields with NO arguments (verified: `RP.addPhase = function () { const result = _readPhaseForm(); ... }`). The 50 calls each read empty form, fail validation silently, return early without push or _save. This is a programmatic API contract mismatch in the adversary's test, NOT a real persistence bug. bug-003 already proved persistence works for the UI path (verify-qa-005 confirmed all 7 sub-tests). If we ever add a bulk-import feature, that feature should use `RP._multigoal.phases.push()` directly + `RP._multigoal._save()`. **Closed wontfix because the reported behavior is correct (the API doesn't accept programmatic args by design).**

## Reproduction steps

1. Open browser console on Multi-Goal tab
2. Run:
```javascript
localStorage.setItem('rp_phases', '[]');
for (let i = 0; i < 50; i++) {
  RP.addPhase({
    name: `Phase ${i}`,
    startAge: 35 + i,
    endAge: 36 + i,
    baseMonthlyExpense: 50000,
    inflationRate: 6
  });
}
console.log(JSON.parse(localStorage.getItem('rp_phases')).length);
```

## Expected behavior

- `localStorage.getItem('rp_phases')` should contain 50 phases
- Console log should print `50`

## Actual behavior

- All 50 `addPhase()` calls return success (no exceptions thrown)
- `localStorage.getItem('rp_phases')` is `[]` (empty array)
- Console log prints `0`

## Root cause hypothesis

Likely a race condition or synchronous overwrite issue:

**Theory 1**: `addPhase()` doesn't actually call `_save()` after adding to in-memory array, and `_save()` is only called by UI-triggered events (click handler)

**Theory 2**: Rapid calls overwrite localStorage before previous write completes (localStorage is synchronous, so less likely)

**Theory 3**: `addPhase()` is designed for UI use and expects validation + render cycle, not programmatic rapid-fire

## Impact

- **Low for normal users**: UI button prevents rapid-fire clicks (user would need to fill form 50 times manually)
- **Medium for programmatic use**: Sharelink with 50 phases, profile restore with many phases, or future bulk-import feature could trigger this
- **Zero data loss risk for existing feature**: Current UI doesn't expose bulk add

## Suggested fix

1. Verify `addPhase()` implementation calls `_save()` at end
2. If not, add `this._save();` after phase is added to in-memory array
3. Add debounce/throttle if many sequential calls are expected (optional)

## Acceptance test

After fix:
1. Run reproduction steps
2. Console log should print `50`
3. Reload page, phases should persist

## Notes

- This is a **programmatic API usage bug**, not a UI bug
- Flagged as P2 because normal UI usage is unaffected
- May become P1 if bulk import or profile restore uses `addPhase()` internally
