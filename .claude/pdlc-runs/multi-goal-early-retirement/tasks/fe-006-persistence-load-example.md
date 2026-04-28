---
id: fe-006
title: Persistence — localStorage + Load Example
type: implementation
status: completed
owner: "eng-fe-006"
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T16:55:30Z
attempts: 1
merged_at: 2026-04-27T16:55:30Z
branch: feat/fe-006
files:
  - js/calc-multigoal.js
  - pages/tab-multigoal.html
  - index.html
contract_refs:
  - 03-data-contracts.md#persistence-strategy
  - 02-approval.md#blocker-1-option-c
design_refs:
  - 01-prd.md#ac9-persistence-to-localstorage-profiles
  - 01-tech-spec.md#persistence-strategy
blocked_by:
  - fe-002
blocks:
  - fe-007
attempts: 1
---

[REVIEW] branch: feat/fe-006

## Description

Implement phase data persistence using localStorage under a separate key `rp_phases` (per Gate A approval of Option C). Phases ALWAYS persist locally; sharelink encoding is optional (fe-007 handles that).

**What to build**:

### 1. localStorage Read/Write Functions

Add to `js/calc-multigoal.js`:
```javascript
RP.savePhasesData = function() {
  try {
    localStorage.setItem('rp_phases', JSON.stringify(RP._phases));
    console.log('Phases saved to localStorage:', RP._phases.length);
  } catch (e) {
    console.error('Failed to save phases:', e);
    // Quota exceeded or private browsing — show warning banner (optional for v1)
  }
};

RP.loadPhasesData = function() {
  try {
    const saved = localStorage.getItem('rp_phases');
    if (saved) {
      RP._phases = JSON.parse(saved);
      console.log('Phases loaded from localStorage:', RP._phases.length);
      return true;
    }
  } catch (e) {
    console.error('Failed to load phases:', e);
    RP._phases = []; // Reset to empty on parse error
  }
  return false;
};

RP.clearPhasesData = function() {
  localStorage.removeItem('rp_phases');
  RP._phases = [];
  console.log('Phases cleared');
};
```

### 2. Auto-Save on Phase Mutations

Update existing CRUD functions in `js/calc-multigoal.js` (from fe-002):
```javascript
RP.addPhase = function() {
  // ... existing validation + add logic ...
  RP._phases.push(newPhase);
  RP._phases.sort((a, b) => a.startAge - b.startAge);
  
  RP.savePhasesData(); // ← ADD THIS
  RP.renderPhases();
  // ... rest of function ...
};

RP.removePhase = function(phaseId) {
  RP._phases = RP._phases.filter(p => p.id !== phaseId);
  
  RP.savePhasesData(); // ← ADD THIS
  RP.renderPhases();
  // ... rest of function ...
};

RP.loadExample = function() {
  // If user has existing phases, show confirmation modal first
  if (RP._phases.length > 0) {
    if (!confirm(`Load Example Template? This will replace your ${RP._phases.length} existing phases.`)) {
      return; // User canceled
    }
  }
  
  // Load 4 India FIRE phases per PRD AC7
  RP._phases = [
    { id: 'ex1', name: 'Kids at Home', startAge: 35, endAge: 50, baseMonthlyExpense: 80000, inflationRate: 6 },
    { id: 'ex2', name: 'Kids in College', startAge: 50, endAge: 55, baseMonthlyExpense: 120000, inflationRate: 10 },
    { id: 'ex3', name: 'Empty Nest', startAge: 55, endAge: 70, baseMonthlyExpense: 50000, inflationRate: 6 },
    { id: 'ex4', name: 'Medical / Late Retirement', startAge: 70, endAge: 100, baseMonthlyExpense: 70000, inflationRate: 12 }
  ];
  
  RP.savePhasesData(); // ← Persist example to localStorage
  RP.renderPhases();
  RP.calculateMultiGoal(); // Trigger full recalculation
  
  console.log('Example template loaded (India FIRE 4-phase)');
};
```

### 3. Load on Page Boot

Update `RP.initMultiGoal()` (from fe-001):
```javascript
RP.initMultiGoal = function() {
  console.log('Multi-Goal tab initialized');
  
  // Load saved phases from localStorage
  const loaded = RP.loadPhasesData();
  
  if (loaded && RP._phases.length > 0) {
    RP.renderPhases();
    RP.calculateMultiGoal(); // Auto-calculate if phases exist
  } else {
    // Show empty state (fe-002 already handles this in renderPhases)
    RP.renderPhases();
  }
};
```

### 4. Reset Button Integration (Optional)

If existing planner's "Reset" button (in header) clears all data, extend it:
```javascript
// In js/app.js (or wherever reset button handler is)
document.getElementById('resetBtn').addEventListener('click', function() {
  if (confirm('Reset all data? This will clear all inputs, profiles, tracker data, AND multi-goal phases.')) {
    // ... existing reset logic ...
    
    RP.clearPhasesData(); // ← ADD THIS
    if (typeof RP.initMultiGoal === 'function') {
      RP.initMultiGoal(); // Re-initialize multi-goal tab
    }
  }
});
```

**What NOT to do**:
- Do NOT extend existing profiles (per Tech Spec Risk #1, Option A chosen at Gate A)
- Do NOT add `_phases` field to profile save/load logic (fe-007 handles sharelinks separately)
- Do NOT persist allocation results or projection rows (those are derived, recalculated on-demand)

## Acceptance Criteria

- [ ] `RP.savePhasesData()` writes `RP._phases` array to `localStorage.rp_phases` as JSON
- [ ] `RP.loadPhasesData()` reads from `localStorage.rp_phases` and populates `RP._phases`
- [ ] Adding a phase calls `RP.savePhasesData()` automatically
- [ ] Deleting a phase calls `RP.savePhasesData()` automatically
- [ ] Loading example template calls `RP.savePhasesData()` automatically
- [ ] Reloading page (Cmd+R / F5) preserves phases (they re-appear in phase list)
- [ ] Opening Multi-Goal tab in new browser tab shows same phases (localStorage is origin-scoped)
- [ ] Clearing browser data or calling `RP.clearPhasesData()` removes phases
- [ ] "Load Example" button shows confirmation modal if user has existing phases
- [ ] Example template loads 4 India FIRE phases per PRD AC7 (correct ages, expenses, inflation rates)

## Conventions to honor

**Pattern 1: Separate localStorage key per feature** (from existing trackers)
```javascript
// File: js/calc-tracker.js:260-263
RP.saveTrackerData = function() {
  const data = { mode: RP._trackerMode, entries: RP._trackerEntries };
  localStorage.setItem('rp_tracker_entries', JSON.stringify(data));
};
```
**Action**: Match this — use dedicated key `rp_phases`, do NOT mix with other data. Existing patterns:
- Tracker: `rp_tracker_entries`
- Expense log: `rp_expense_log`
- Net worth: `rp_networth_log`
- Dark mode: `rp_dark_mode`
- Profiles: `rp_profiles`

**Pattern 2: Try-catch around localStorage** (from existing profiles.js)
```javascript
// File: js/profiles.js:26-32
try {
  const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '{}');
  // ... use profiles ...
} catch (e) {
  console.error('Failed to load profiles:', e);
  // Graceful degradation
}
```
**Action**: Wrap all localStorage calls in try-catch. Private browsing mode or quota exceeded can throw errors.

**Pattern 3: Array deep copy before save** (defensive, prevent ref mutation)
```javascript
// Not in existing code, but best practice:
localStorage.setItem('rp_phases', JSON.stringify(RP._phases.slice())); // slice() creates shallow copy
```
**Action**: Optional for v1, but good practice — ensures external code can't mutate saved data.

## Test plan

**Manual smoke test**:
1. Open Multi-Goal tab
2. Add 2 custom phases manually
3. Reload page (Cmd+R)
4. Verify: 2 phases re-appear in phase list
5. Open browser DevTools → Application → Local Storage → `file://` or `http://localhost`
6. Verify: Key `rp_phases` exists with JSON array value
7. Delete one phase
8. Check localStorage again → verify array now has 1 phase
9. Click "Load Example"
10. Verify: Confirmation modal appears ("Replace your 1 existing phase?")
11. Confirm → verify 4 India FIRE phases load
12. Reload page → verify 4 phases still present

**Cross-tab test**:
1. Open `index.html` in Tab A
2. Add phase "Test Phase"
3. Open `index.html` in Tab B (Cmd+Click link or duplicate tab)
4. Navigate to Multi-Goal tab in Tab B
5. Verify: "Test Phase" appears (localStorage shared across tabs from same origin)

**Quota exceeded test** (edge case):
1. Fill localStorage to near-quota (add ~4MB data via DevTools console)
2. Try adding 10th phase
3. Verify: No crash, error logged to console, phase may not persist but app remains functional

## Build verification

```bash
cd retirement-planner

# Verify save function exists
grep -c "RP\.savePhasesData" js/calc-multigoal.js
# Expected: ≥1

# Verify load function exists
grep -c "RP\.loadPhasesData" js/calc-multigoal.js
# Expected: ≥1

# Verify load called in initMultiGoal
grep -A5 "RP\.initMultiGoal" js/calc-multigoal.js | grep -c "loadPhasesData"
# Expected: ≥1
```

## Notes

**Re: Gate A Option C decision**:
Per `02-approval.md` lines 9-13:
- "Phases ALWAYS persist locally" under `rp_phases` key
- "Sharelinks optionally encode phases" via checkbox (fe-007)
- Default checkbox state: ON
- Backward compat: existing sharelinks without `_phases` still work (single-bucket mode)

**Re: profiles vs phases**:
Profiles (existing feature) save/load INPUT FIELD values only. They do NOT save array/object state. Phases are array state → separate localStorage key. This keeps the convention clean and avoids modifying existing `profiles.js` (which could break other tabs).

**Re: Load Example default ages**:
The example uses retirement age 35, which matches Pardha's personal scenario (early retirement). If user's actual retirement age is different (e.g., 40), the phases may start before/after retirement — this is ALLOWED per Tech Spec validation rules (phases can start at retirement or later, but validation warns if before).

**Re: Phase ID generation**:
Existing CRUD (fe-002) generates IDs via `Date.now().toString()`. Example template uses hardcoded IDs `'ex1'`, `'ex2'`, etc. — this is fine, IDs just need to be unique within `RP._phases` array (no cross-session collisions because localStorage is per-user).

**Integration point**:
After this task, phases persist across sessions. User can:
- Add phases → close browser → reopen → phases still there
- Click Reset button → all phases cleared (along with other data)
- Load Example → 4 phases populate, auto-saved

fe-007 will add the optional sharelink encoding on top of this always-on localStorage persistence.
