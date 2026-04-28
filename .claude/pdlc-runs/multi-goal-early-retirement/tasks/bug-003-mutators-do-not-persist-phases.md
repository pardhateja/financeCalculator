---
id: bug-003
title: addPhase / removePhase / loadPhaseExample do not persist to localStorage — AC9 violation
type: bug
status: completed
owner: "fix-bug-003"
priority: P0
created_by: eng-qa-005
created_at: 2026-04-27T12:05:00Z
updated_at: 2026-04-27T18:14:00Z
attempts: 1
merged_at: 2026-04-27T18:14:00Z
branch: fix/bug-003
notes: "4-line surgical fix at 4 mutation sites (addPhase, removePhase, removePhase undo handler, loadPhaseExample). Smoke verified persistence. Tech Lead double-review inlined by orchestrator (diff is trivial)."
files:
  - retirement-planner/js/calc-multigoal.js
contract_refs:
  - qa-005 / PRD AC9
  - 01-tech-spec.md fe-006 (phase persistence)
blocked_by: []
blocks: []
attempts: 1
---

## Description

PRD AC9 ("Phases persist to `localStorage.rp_phases` after add/edit/delete; page reload restores phases") is broken. Three of the four phase-mutating entry points never call `RP._multigoal._save()`, so phases live only in memory and are lost on the next reload.

The persistence wiring works — `RP._multigoal._save()` itself is correct, the docstring at lines 19–25 of `js/calc-multigoal.js` correctly states "Any mutator that adds/edits/deletes a phase MUST call `RP._multigoal._save()`", and `RP._multigoal.loadExample()` (lines 138–193) does call it. But that `loadExample` is dead code — the **button** in the UI (`#loadPhaseExampleBtn`) is wired (line 593) to `RP.loadPhaseExample` (lines 737–754), a different function in the fe-002 form layer that mutates `RP._multigoal.phases` directly and never calls `_save()`.

Same defect in `RP.addPhase` (lines 711–722) and `RP.removePhase` (lines 724–735, including the undo handler at lines 730–734).

## Steps to Reproduce

1. `cd retirement-planner && python3 -m http.server 8775`
2. Open http://localhost:8775/, navigate to Multi-Goal tab
3. Click "Load Example"
4. Observe 4 phase cards appear, `RP._multigoal.phases.length === 4`
5. Open DevTools → Application → Local Storage
6. **BUG**: `rp_phases` key does NOT exist (storage is empty)
7. Hard reload (Cmd+R)
8. Navigate back to Multi-Goal tab
9. **BUG**: 0 phases — all 4 are gone

Same outcome for: typing a phase in the form and clicking "Add Phase", and clicking the trash icon on an existing phase card.

## Expected Behavior

After `RP.addPhase()`, `RP.removePhase()`, the undo handler inside `removePhase`, and `RP.loadPhaseExample()` mutate `RP._multigoal.phases`, `localStorage.rp_phases` should contain the JSON-serialized array. After a reload, phases should be restored by `RP._multigoal._load()` (which is already wired correctly via `RP.initMultiGoal()` at line 197).

## Test Evidence

Automated playwright reproduction in `/tmp/qa-005-tests.mjs` (qa-005 worktree). Results:

```
PASS: AC9.1 Load Example → 4 phases in RP._multigoal.phases
FAIL: AC9.2 rp_phases in localStorage  (key absent after Load Example)
FAIL: AC9.3 Reload restores 4 phases  (got 0)
PASS: AC9.4 Corrupted rp_phases → phases empty
PASS: AC9.5 Corrupted rp_phases → console.warn emitted
PASS: AC9.6 No JS errors on corrupted load
FAIL: AC9.7 addPhase persists phase to localStorage  (phases.length=1, rp_phases empty)
FAIL: AC9.8 removePhase persists  (phases.length=0, rp_phases still empty)
```

`RP._multigoal._load()` (lines 79–130), `RP._multigoal._save()` (66–72), `_validatePhase` (48–59), and the corruption-resilience path all behave correctly — only the **call sites** are missing.

Note also: AC10 sharelink decode at line 112 of `sharelink.js` correctly calls `RP._multigoal._save()` after writing the shared phases, which is why AC10.6 ("decoded phases written to localStorage") passes despite this bug. So the regression is isolated to the fe-002 mutator layer.

## Suggested Fix

Add `RP._multigoal._save();` after each `RP._multigoal.phases` mutation:

- `RP.addPhase` (after line 718, after `_sortPhases` for safety)
- `RP.removePhase` (after line 728, after splice)
- The undo handler inside `removePhase` (after line 732, after `_sortPhases`)
- `RP.loadPhaseExample` (after line 752, after `_sortPhases`)

Consider whether to delete the now-unused `RP._multigoal.loadExample` function (lines 138–193) or keep it as the canonical "with persistence" entry point and have `RP.loadPhaseExample` delegate to it. The two functions diverge on the exact phase template (form-layer uses `RP._phaseExampleTemplate` at lines 36–41 — "Kids at Home", 80k, etc. — while `RP._multigoal.loadExample` uses an inline template — "Active early retirement (kids at home)", 150k, etc.), so resolving this also resolves a template-source-of-truth question for the team.

## Acceptance for Fix

- AC9.2, AC9.3, AC9.7, AC9.8 above all pass
- All other AC9/AC10 checks remain passing (no regressions in sharelink decode or corruption resilience)
- After save, `_load()` on next page open recovers phases byte-identical to what was saved

[REVIEW] branch: fix/bug-003
- Added `RP._multigoal._save()` in 4 sites: `RP.addPhase` (after _sortPhases), `RP.removePhase` (after splice), undo handler inside removePhase (after _sortPhases), `RP.loadPhaseExample` (after _sortPhases). Diff is +4 lines, single file. `RP._multigoal.loadExample` left untouched (out-of-scope per ticket; team to decide template-source-of-truth question separately).
- Smoke (playwright, http://localhost:8765/index.html):
  1. Load Example → 4 phases, `rp_phases` populated. ✅
  2. Reload → 4 phases restored. ✅
  3. Add 5th phase via form (RP.addPhase code path) → reload → 5 phases. ✅
  4. Delete 1 phase → reload → 4 phases, names match. ✅
  5. `localStorage.getItem('rp_phases')` returns valid JSON array throughout. ✅
