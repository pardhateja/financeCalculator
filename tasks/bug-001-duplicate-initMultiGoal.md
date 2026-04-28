# bug-001: Duplicate RP.initMultiGoal definitions cause button wiring race condition

**Priority:** P0  
**Component:** Multi-Goal Planner (calc-multigoal.js)  
**Severity:** CRITICAL  

## Problem

`RP.initMultiGoal` is defined twice in calc-multigoal.js:
- Line 195: Loads from localStorage + wires Load Example button
- Line 671: Wires Add/Example buttons (overwrites first definition)

The second definition **completely replaces** the first, making the localStorage load work but orphaning the Load Example button wiring from the first init.

## Impact

- Dead code path (first init's button wiring is clobbered)
- Button wiring race condition if script load order changes
- Violates single-responsibility principle
- Future refactors could break Load Example functionality

## Files

- `retirement-planner/js/calc-multigoal.js:195` (first definition)
- `retirement-planner/js/calc-multigoal.js:671` (second definition)

## Reproduction

1. Open browser console
2. Load retirement planner
3. Run: `console.log(RP.initMultiGoal.toString())`
4. Observe: function body matches line 671 definition only
5. Check: Load Example button still works (because line 208 calls the lost wiring)

## Fix

Merge both function bodies into one canonical definition:

```javascript
RP.initMultiGoal = function () {
    // Load persisted phases first
    RP._multigoal._load();
    
    // Wire all buttons
    const addBtn = document.getElementById('addPhaseBtn');
    const exampleBtn = document.getElementById('loadPhaseExampleBtn');
    const loadExampleBtn = document.getElementById('multigoalLoadExampleBtn');
    
    if (addBtn && !addBtn._wired) {
        addBtn.addEventListener('click', () => RP.addPhase());
        addBtn._wired = true;
    }
    if (exampleBtn && !exampleBtn._wired) {
        exampleBtn.addEventListener('click', () => RP.loadPhaseExample());
        exampleBtn._wired = true;
    }
    if (loadExampleBtn && !loadExampleBtn._wired) {
        loadExampleBtn.addEventListener('click', () => RP._multigoal.loadExample());
        loadExampleBtn._wired = true;
    }
    
    // Initial render
    if (typeof RP.renderPhases === 'function') RP.renderPhases();
};
```

Remove the duplicate definition at line 671.

## Notes

- Comment at line 668 acknowledges "fe-002 redefines RP.initMultiGoal" but doesn't warn about clobbering
- This pattern doesn't exist elsewhere in the codebase (all other calc-*.js files have single init functions)
