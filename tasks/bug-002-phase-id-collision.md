# bug-002: Phase ID collision via Date.now() breaks delete/allocation/projection

**Priority:** P0  
**Component:** Multi-Goal Planner (calc-multigoal.js)  
**Severity:** CRITICAL  

## Problem

All phase IDs use `'phase-' + Date.now()` (or with suffix). If phases are created within the same millisecond, they get **identical IDs**, breaking:

1. Delete button (findIndex returns first match, leaves orphans)
2. Allocation table row lookups (wrong phase gets colored dot)
3. Projection rendering (wrong phase badges shown)

## Impact

- **High probability** during "Load Example" (creates 4 phases in tight loop)
- **Medium probability** when user spams Add Phase button
- **Low probability** during normal use, but non-zero on fast machines

## Files

- `retirement-planner/js/calc-multigoal.js:151,160,169,178` (Load Example)
- `retirement-planner/js/calc-multigoal.js:755` (Add Phase)
- `retirement-planner/js/calc-multigoal.js:829` (Load Phase Example)

## Reproduction

1. Open Multi-Goal tab
2. Click "Load Example"
3. Open browser console
4. Run: `RP._multigoal.phases.map(p => p.id)`
5. Observe IDs:
   - `phase-1714089234567-1`
   - `phase-1714089234567-2`
   - `phase-1714089234567-3`
   - `phase-1714089234567-4`
6. Now rapidly click "Add Phase" 3 times (hold Enter key on focused button)
7. Observe: 2+ phases have identical `phase-1714089234568` ID (no suffix)
8. Try deleting one → both disappear from UI, but one remains in localStorage

## Fix Option 1: Counter-based IDs

```javascript
// At top of file after line 30
RP._multigoal._phaseIdSeq = 0;

// Replace all Date.now() calls with:
id: 'phase-' + (++RP._multigoal._phaseIdSeq)
```

## Fix Option 2: crypto.randomUUID()

```javascript
// Replace all Date.now() calls with:
id: crypto.randomUUID ? crypto.randomUUID() : 'phase-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)
```

## Existing Codebase Pattern

Checked all existing calc-*.js files:
- **Zero uses** of `Date.now()` for ID generation
- Existing IDs are either input field names or hardcoded strings
- This pattern is new to multi-goal and inconsistent with repo conventions

## Notes

- Load Example template (lines 151-178) tries to work around this with `-1`, `-2` suffixes, but addPhase (line 755) has no guard
- Collision probability increases with faster CPUs (M1/M2 Macs can execute tight loop in <1ms)
