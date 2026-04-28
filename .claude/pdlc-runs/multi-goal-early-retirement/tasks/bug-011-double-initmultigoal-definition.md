---
id: bug-011
title: Double RP.initMultiGoal definition orphans first body
type: bug
status: pending
owner: ""
priority: P1
created_by: code-review
created_at: 2026-04-27T18:48:00Z
files:
  - retirement-planner/js/calc-multigoal.js
contract_refs:
  - code-review CRITICAL #1
blocked_by: []
blocks: []
attempts: 1
status: completed
merged_at: 2026-04-27T20:50:00Z
fix_commit: efd6ac3
notes: "Orchestrator-direct fix (original fix-engineer SIGKILLed wedged on browser permission prompt). Removed orphaned `RP.initMultiGoal` at line 195. Canonical definition at line ~671 already merges localStorage load + button wiring. node-sanity check confirms exactly 1 RP.initMultiGoal definition remains."
severity_note: "Was filed P0 by code-review; orchestrator downgraded to P1 because the SECOND definition (which wins at script load) is the active one and works. The orphan is dead code, not a runtime defect — but is a real maintainability smell."
---

## Description

`retirement-planner/js/calc-multigoal.js` defines `RP.initMultiGoal` twice (lines ~195 and ~671) and `RP.renderPhases` three times (lines ~852, ~1465, ~1574). The two `initMultiGoal` bodies have different responsibilities:

- **Line 195 (fe-006 origin)**: calls `RP._multigoal._load()` to hydrate phases from localStorage at boot.
- **Line 671 (fe-002 redefinition)**: wires up the Add Phase + Load Example buttons, calls `RP.renderPhases()`.

Because line 671's definition runs LATER in script-load order, it overwrites line 195. The `_load()` call from line 195's body is **orphaned** — but `_load()` does run because line 671's `RP.renderPhases()` indirectly triggers it via the wrapper chain (the live behavior happens to work).

The 3 `renderPhases` definitions: line 852 is the canonical definition. Lines 1465 and 1574 are intentional IIFE wrappers (allocation re-render for fe-004; gap+overlap banner re-render for fe-002+bug-004 fix). The wrapper chain is intentional and documented in commit messages.

## Severity (orchestrator triage)

P1 (downgraded from P0). The redundant `initMultiGoal` is a maintainability smell — if a developer later moves the script load order or splits the file, the orphaned `_load()` call could matter. But at present everything works. fe-002 + fe-006 ran in parallel and merged with this overlap; neither engineer noticed because their respective bodies don't conflict at runtime.

## Suggested fix

Merge both bodies into one canonical `RP.initMultiGoal`:
```js
RP.initMultiGoal = function () {
    // From fe-006 line 195
    RP._multigoal._load();
    // From fe-002 line 671
    const addBtn = document.getElementById('addPhaseBtn');
    const exampleBtn = document.getElementById('loadPhaseExampleBtn');
    if (addBtn) addBtn.addEventListener('click', () => RP.addPhase());
    if (exampleBtn) exampleBtn.addEventListener('click', () => RP.loadPhaseExample());
    RP.renderPhases();
};
```

## Why deferred to v1.1 follow-up

Per `01-intake.md` hard constraint #5 ("personal-use scope: ship if it makes Pardha happy and clear"), and per Pardha's global rule #2 ("change the minimum"), this cleanup is non-blocking polish that can land in v1.1 without affecting the v1 ship. Documented for future maintenance.
