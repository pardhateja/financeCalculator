---
id: bug-004
title: Overlap warning banner overwritten by gap-banner wrapper — AC3 regression after bug-002 merge
type: bug
status: completed
owner: orchestrator-direct-fix
priority: P0
created_by: verify-qa-002
created_at: 2026-04-27T18:30:00Z
attempts: 1
merged_at: 2026-04-27T18:34:00Z
branch: main (orchestrator-direct, no feature branch — 1-line fix per verify-qa-002's exact suggestion)
fix_commit: 7a94a61
notes: "Bug-001 fix sets the overlap banner from inside RP.renderPhases (line 863, with correct `phases` arg). Bug-002 fix wraps RP.renderPhases (lines 1571–1595) and then re-invokes _renderOverlapBanner() with NO arguments (line 1584). _detectOverlapRanges(undefined) returns [] → banner is hidden again immediately. Per-phase badges still render (they live in the original renderPhases body, not in the banner function). The merge commit 35acd70 claimed to resolve this but did not."
files:
  - retirement-planner/js/calc-multigoal.js
contract_refs:
  - qa-002 / PRD AC3
blocked_by: []
blocks: []
---

## Summary
PRD AC3 (overlap-warning banner) regressed after bug-002 merged. The per-phase "Overlaps with X" badges still appear, but the **aggregate banner above the phase list never shows**, even when overlaps exist.

## Root cause (verified by JSDOM probe)
`retirement-planner/js/calc-multigoal.js`:

- **Line 863** (inside the original `RP.renderPhases` body): `RP._multigoal._renderOverlapBanner(phases);` — passes the actual phases. Banner renders correctly.
- **Lines 1571–1595** (`wrapRenderPhasesForGapBanner` IIFE, added by bug-002): wraps `RP.renderPhases`. After the original runs, the wrapper executes:

  ```js
  if (typeof RP._multigoal._renderOverlapBanner === 'function') {
      try {
          RP._multigoal._renderOverlapBanner();   // ← NO ARG
      } catch (e) { ... }
  }
  ```

  `_renderOverlapBanner(undefined)` → `_detectOverlapRanges(undefined)` returns `[]` (defensive `Array.isArray ? phases : []` on line 280) → the banner is hidden and its message cleared.

The wrapper runs AFTER the original `renderPhases` body, so the empty-state call always wins.

## Reproduction (JSDOM, no browser needed)
Setup: `retirementAge=30`, `lifeExpectancy=100`. Add Phase A (Early, 35–50, ₹100k/mo, 6%) and Phase B (College, 48–54, ₹150k/mo, 10%).

Observed:
- `#overlapBanner` `style.display === "none"`
- `#overlapBannerMessage.textContent === ""`
- `.phase-overlap-badge` × 2 with correct text — **only the badges work**

Expected (PRD AC3): banner visible with text "Years 48-50 are covered by multiple phases. Expenses will be summed."

Probe output (proves the banner DOES render correctly when the wrapper's no-arg call is bypassed):
```
After addPhase: display= none msg= ""
After explicit _renderOverlapBanner(phases): display=  msg= "Years 48-50 are covered by multiple phases. Expenses will be summed."
After _renderOverlapBanner() no-arg: display= none msg= ""
```

## Suggested fix (one-line)
In `wrapRenderPhasesForGapBanner` (line 1582–1588), pass the phases:

```diff
-            RP._multigoal._renderOverlapBanner();
+            RP._multigoal._renderOverlapBanner(RP._multigoal.phases || []);
```

Alternative (defensive, also acceptable): change `_renderOverlapBanner`'s signature to default to `RP._multigoal.phases` when no arg is supplied — but the caller-site fix is smaller and matches how `_renderGapBanner` already reads `RP._multigoal.phases` itself (line 1537).

## Tests to add (regression guard)
Add to `test-multigoal.html` or wherever the multigoal unit suite lives:
1. Render two overlapping phases → assert `#overlapBanner` has `display !== 'none'` AND its message contains "Years <fromAge>-<toAge>".
2. Delete the second phase → assert banner hidden.
3. Run gap+overlap together (Phase 35–40 + Phase 48–54 with retirement 35 / life 100) → assert BOTH `#overlapBanner` and `#gapBanner` are visible simultaneously.

## What still works (do not regress)
- Per-phase `.phase-overlap-badge` decorations (set inside `renderPhases` body before the wrapper runs)
- `_detectOverlaps` and `_detectOverlapRanges` helpers themselves are correct
- AC4 gap banner (verified pass: appears for 51–59 gap, clears when Middle phase added)
- AC3 banner-clear-on-delete path (also passes — both code paths agree on "no overlaps → hide")
