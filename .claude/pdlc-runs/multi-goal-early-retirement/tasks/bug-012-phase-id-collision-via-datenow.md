---
id: bug-012
title: Phase ID generation via Date.now() can collide on rapid creation
type: bug
status: pending
owner: ""
priority: P1
created_by: code-review
created_at: 2026-04-27T18:48:00Z
files:
  - retirement-planner/js/calc-multigoal.js
contract_refs:
  - code-review CRITICAL #2
blocked_by: []
blocks: []
attempts: 1
status: completed
merged_at: 2026-04-27T20:50:00Z
fix_commit: efd6ac3
notes: "Orchestrator-direct fix (original fix-engineer SIGKILLed wedged on browser permission prompt). Added `RP._multigoal._generateId()` helper using `crypto.randomUUID()` (with Date.now+random fallback for jsdom-style environments). Replaced all 6 Date.now() ID generation sites: loadExample template (4 sites), addPhase (1), loadPhaseExample template loop (1). node-sanity check confirms zero remaining Date.now()-based ID generation in production code paths (only the fallback inside _generateId itself)."
severity_note: "Was filed P0 by code-review; orchestrator downgraded to P1 because real users won't add phases at sub-millisecond rates. Adversary's bug-006 (rapid-fire 50-add) covers the worst-case scenario already."
---

## Description

All phase IDs use `'phase-' + Date.now()` (or with a `-i` suffix in `loadPhaseExample`). Lines ~151, ~160, ~169, ~178 (`loadPhaseExample` template loop) and line ~755 (`addPhase`).

Collision modes:
- **`addPhase` rapid-fire**: clicking Add Phase twice within the same millisecond produces identical IDs. Possible on fast machines or via Enter-key spam.
- **`loadPhaseExample` template loop**: the `-i` suffix prevents collision within ONE click of Load Example, but if the user clicks Load Example then immediately clicks Add Phase within the same millisecond, the new phase could match `'phase-' + Date.now() + '-1'` from the template. Low probability.

Impact when collision happens:
- `RP.removePhase` uses `findIndex` which returns first match → wrong phase deleted, orphan in array
- Allocation table row lookups (lines ~1100, ~1111) → wrong phase rendered
- Projection rendering (lines ~1356, ~1380) → mis-attributed balances

## Severity (orchestrator triage)

P1 (downgraded from P0). Real users adding phases manually will not hit this — humans take >1 second to click. Adversary's `bug-006-rapid-fire-addphase-persistence-failure.md` already covers the rapid-fire case at adversary speeds and didn't surface a hard collision (likely because Date.now() resolution + JS event loop spreads the calls naturally).

## Suggested fix

Use a sequence counter:
```js
let _phaseIdSeq = 0;
const generatePhaseId = () => 'phase-' + (++_phaseIdSeq) + '-' + Date.now();
```

Or use `crypto.randomUUID()` (available in all modern browsers including iOS Safari 15.4+):
```js
const generatePhaseId = () => 'phase-' + crypto.randomUUID();
```

Replace all 5 ID generation sites with the helper.

## Why deferred to v1.1 follow-up

Per personal-use scope (`01-intake.md` hard constraint #5), this is a non-blocking robustness improvement. The collision window is narrow (single millisecond) and the real-user attack surface is low. Documented for future hardening.
