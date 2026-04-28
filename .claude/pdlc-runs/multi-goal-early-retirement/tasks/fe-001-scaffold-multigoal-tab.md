---
id: fe-001
title: Scaffold Multi-Goal tab structure
type: chore
status: completed
owner: eng-fe-001
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T16:30:00Z
attempts: 1
merged_at: 2026-04-27T16:30:00Z
branch: feat/fe-001
files:
  - pages/tab-multigoal.html
  - js/calc-multigoal.js
  - build.sh
  - index.html
contract_refs: []
design_refs:
  - design/02-wireframes.md#screen-multi-goal-tab-desktop
  - design/02-screen-specs.md#screen-multi-goal-tab
blocked_by: []
blocks:
  - fe-002
  - fe-003
  - fe-006
attempts: 0
---

## Description

Create the skeleton for the new Multi-Goal tab with NO logic — just structure that loads cleanly. This task sets up the foundation for all other FE tasks.

**What to create**:
1. **`pages/tab-multigoal.html`** — Minimal tab content container with header, empty section groups for phase list, allocation, and projection. Follow existing `tab-goals.html` pattern (lines 1-15: wrapper div with `id="multigoal-tab"` + `class="tab-content"`).
2. **`js/calc-multigoal.js`** — IIFE skeleton with empty `RP.initMultiGoal()` function. No math, no DOM manipulation yet. Just: `(function() { 'use strict'; RP.initMultiGoal = function() { console.log('Multi-Goal tab initialized'); }; })();`
3. **`build.sh`** modifications:
   - Line 58: Add `multigoal` to the `for tab in ...` loop (after `goals`, before `emergency`)
   - Line 82: Add `<script src="js/calc-multigoal.js"></script>` after `calc-goals.js`, before `profiles.js`
4. **Re-run build** to regenerate `index.html` with the new nav button

**What NOT to do**:
- Do NOT add phase CRUD form yet (fe-002's job)
- Do NOT add math functions (fe-003's job)
- Do NOT add any interactive behavior beyond tab switching (existing app.js handles that)

## Acceptance Criteria

- [ ] `pages/tab-multigoal.html` exists with proper wrapper `<div id="multigoal-tab" class="tab-content">` matching existing tab pattern
- [ ] File contains header with title "Multi-Goal Planner" and subtitle from design/02-screen-specs.md line 22
- [ ] `js/calc-multigoal.js` exists with IIFE structure + `RP.initMultiGoal` stub
- [ ] `build.sh` line 58 includes `multigoal` in tab loop
- [ ] `build.sh` line 82 includes `<script src="js/calc-multigoal.js"></script>`
- [ ] Running `./build.sh` succeeds without errors
- [ ] Opening `index.html` in browser shows "Multi-Goal" nav button (between "Goals" and "Emergency")
- [ ] Clicking "Multi-Goal" button shows the tab content (header + empty sections)
- [ ] Console shows "Multi-Goal tab initialized" on page load

## Conventions to honor

**Pattern 1: Tab content wrapper** (from existing tabs)
```html
<!-- File: pages/tab-basics.html:1-3 -->
<div id="basics-tab" class="tab-content active">
    <div class="panel">
        <h2>Basic Information & Income</h2>
```
**Action**: Match this structure — `<div id="multigoal-tab" class="tab-content">` (NOT active initially), then `<div class="panel">`, then `<h2>`.

**Pattern 2: IIFE module structure** (from existing calc-*.js)
```javascript
// File: js/calc-goals.js:1-5
(function() {
    'use strict';

    RP.initGoals = function() {
        // init code here
```
**Action**: Match this exactly — IIFE with `'use strict'`, attach function to global `RP` object.

**Pattern 3: build.sh tab loop** (existing pattern)
```bash
# File: build.sh:58
for tab in basics expenses investments financial-plan projections dashboard whatif goals emergency sip tracker milestones loan exptrack networth profiles; do
```
**Action**: Insert `multigoal` after `goals` in this list (alphabetical-ish order, grouped by feature similarity).

## Test plan

**Manual smoke test** (no automated tests for this scaffold task):
1. Run `./build.sh` from `retirement-planner/` directory
2. Verify output: "Built index.html (NNNN lines)" with no errors
3. Open `index.html` in Chrome
4. Open DevTools Console
5. Verify: "Multi-Goal tab initialized" appears in console log
6. Click "Multi-Goal" nav button
7. Verify: Tab switches, header "Multi-Goal Planner" visible, subtitle visible
8. Verify: No JS errors in console

**Expected output**:
- Tab is empty (no forms, no tables) — just the header
- Other tabs still work (click "Basics", "Goals", etc. — all switch correctly)

## Build verification

```bash
cd retirement-planner
./build.sh
# Expected: "Built index.html (NNNN lines)"
# No errors about missing files or syntax issues

# Optional: validate HTML structure (no broken tags)
grep -c '<div id="multigoal-tab"' index.html
# Expected: 1
```

## Notes

**Design reference for header copy** (from design/02-screen-specs.md):
- Page title: "Multi-Goal Planner"
- Subtitle: "Plan multiple life-phase expenses with per-phase inflation"

**Why this task is atomic**:
This sets up the file structure without any complex logic. Other tasks can work in parallel on separate concerns (UI forms, math engine, persistence) once this foundation is in place. The only conflict would be if two tasks tried to modify `build.sh` simultaneously, but the dependency chain (all FE tasks blocked by fe-001) prevents that.

**Re: data contracts**:
Tech Lead is writing `03-data-contracts.md` in parallel. This task doesn't need it yet — we're just scaffolding HTML/JS stubs. fe-002 and fe-003 will consume the contracts when they implement CRUD and math.
