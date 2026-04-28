---
id: fe-002
title: Phase CRUD UI + form validation
type: implementation
status: completed
owner: "eng-fe-002"
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T17:00:00Z
attempts: 1
merged_at: 2026-04-27T17:00:00Z
branch: feat/fe-002
files:
  - js/calc-multigoal.js
  - pages/tab-multigoal.html
  - css/multigoal.css
contract_refs:
  - 03-data-contracts.md#phase-object-schema
  - 03-data-contracts.md#validation-rules
design_refs:
  - design/02-wireframes.md#add-life-phase
  - design/02-screen-specs.md#form-field-labels--placeholders
  - design/03-component-specs.md#component-phase-card
  - design/03-design-tokens.json#color.phase
  - design/03-a11y-defaults.md#form-labels
blocked_by:
  - fe-001
blocks:
  - fe-004
  - fe-008
  - fe-009
attempts: 1
---

## Description

Build the phase configuration form + phase card list with full CRUD operations (Create, Read, Delete). This task handles ALL user interaction with phase data — the UI layer only, no math calculations yet (fe-003 handles math).

**What to build**:
1. **Phase input form** (`pages/tab-multigoal.html` extension):
   - 5 input fields: Phase Name (text), Start Age (number), End Age (number), Monthly Expense ₹ (number), Inflation % (number)
   - "Add Phase" button (primary gradient style per design tokens)
   - "Load Example" button (secondary outline style)
   - Form layout: Desktop 5-column grid, Tablet/Mobile stack vertically (responsive task fe-009 handles breakpoints, but write base mobile styles here)

2. **Phase card list** (`pages/tab-multigoal.html` + `js/calc-multigoal.js`):
   - Section group with heading "Your Life Phases (N)" where N = `RP._phases.length`
   - Each phase renders as a `.phase-card` (extend `.summary-card` pattern per component-specs.md)
   - Auto-sort by `startAge` on every render (per PRD AC1)
   - Auto-assign phase color from `{color.phase.1}` through `{color.phase.6}` cycling pattern
   - Each card shows: phase name (bold), age range ("Age X-Y (N years)"), monthly expense + inflation ("₹X/mo · Y% inflation")
   - Edit + Delete buttons (icon buttons, right-aligned in card header)

3. **Validation** (inline, per a11y-defaults.md):
   - End age > Start age → red border + error text below input "End age must be greater than start age"
   - Start age ≥ current age (read from `RP.val('currentAge')`)
   - End age ≤ life expectancy (read from `RP.val('lifeExpectancy')`)
   - Inflation rate: 0-25% range (soft warning at >15%, per screen-specs.md line 168)
   - Monthly expense > 0
   - All validation happens on blur or form submit, NOT on every keystroke

4. **CRUD operations** (`js/calc-multigoal.js`):
   ```javascript
   RP.addPhase = function() {
     // Read form inputs
     // Validate (if invalid, show inline error, return early)
     // Create phase object per data contracts schema
     // Push to RP._phases array
     // Auto-sort RP._phases by startAge
     // Re-render phase list
     // Clear form
   };

   RP.removePhase = function(phaseId) {
     // Remove from RP._phases array
     // Re-render phase list
     // Show toast "Phase deleted" with 5s undo (or modal confirmation — check existing pattern)
   };

   RP.renderPhases = function() {
     // Clear existing phase cards
     // Loop through RP._phases (sorted by startAge)
     // For each phase: create .phase-card DOM element
     // Assign color from {color.phase.N} cycling (phase index % 6 + 1)
     // Append to phase list container
   };
   ```

5. **Load Example button** (`js/calc-multigoal.js`):
   - Loads 4 pre-configured phases per PRD AC7 (India FIRE template):
     1. "Kids at Home" (age 35-50, ₹80k/mo, 6%)
     2. "Kids in College" (age 50-55, ₹1.2L/mo, 10%)
     3. "Empty Nest" (age 55-70, ₹50k/mo, 6%)
     4. "Medical / Late Retirement" (age 70-100, ₹70k/mo, 12%)
   - If user already has phases, show confirmation modal: "Load Example Template? This will replace your N existing phases."

6. **New CSS file** `css/multigoal.css`:
   - `.phase-card` styles (extend `.summary-card`, add colored left + top border per component-specs.md)
   - Phase color variables referencing design tokens
   - Form grid layout (5 columns desktop, stack mobile)
   - Button styles (if not already covered by forms.css — reuse existing `.btn-primary`, `.btn-secondary`)

**What NOT to do**:
- Do NOT implement Edit inline (PRD says "re-enter values to edit" per assumption A22 — Edit button fills form, user re-submits)
- Do NOT calculate PV allocation yet (fe-004 handles that after fe-003 builds math engine)
- Do NOT persist to localStorage yet (fe-006 handles persistence)

## Acceptance Criteria

- [ ] Form renders with 5 labeled inputs matching design/02-screen-specs.md labels + placeholders
- [ ] "Add Phase" button adds phase to `RP._phases` array and renders card in list
- [ ] Phase cards auto-sort by `startAge` ascending
- [ ] Phase cards auto-assign colors cycling through `{color.phase.1-6}` (blue, emerald, amber, purple, teal, pink)
- [ ] Delete button removes phase from array and re-renders list
- [ ] Validation errors appear inline with red border + error text (per PRD AC validation rules)
- [ ] "Load Example" button populates 4 India FIRE phases (if empty state) or shows confirmation modal (if phases exist)
- [ ] Empty state shows per wireframes: "No phases added yet" message + prominent "Load Example" button
- [ ] All interactive elements (buttons, inputs) are keyboard accessible (Tab to focus, Enter/Space to activate)
- [ ] All form labels use `<label for="">` matching input `id=""` (per a11y-defaults.md)

## Conventions to honor

**Pattern 1: Input group with label** (from existing forms)
```html
<!-- File: pages/tab-basics.html:15-18 -->
<div class="input-group">
    <label for="currentAge">Current Age</label>
    <input type="number" id="currentAge" name="currentAge" required>
</div>
```
**Action**: Match this structure for all 5 phase inputs. Use `for=""` / `id=""` association, include `required` attribute where applicable.

**Pattern 2: Summary card with colored border** (from existing cards)
```css
/* File: css/cards.css:11-17 */
.summary-card {
    background: var(--card-bg);
    padding: 16px 20px;
    border-radius: 12px;
    border-top: 3px solid var(--primary-color);
    box-shadow: var(--shadow-default);
}
```
**Action**: Extend this for `.phase-card` — add 4px LEFT border in addition to top border, using `var(--phase-color-N)` custom properties.

**Pattern 3: Array manipulation + DOM re-render** (from existing calc-goals.js)
```javascript
// File: js/calc-goals.js:28-35
RP.addGoal = function() {
    const name = document.getElementById('goalName').value.trim();
    if (!name) return; // validation
    const goal = { name, amount: parseFloat(...), years: parseInt(...) };
    RP._goals.push(goal);
    RP.renderGoals();
    document.getElementById('goalName').value = ''; // clear form
};
```
**Action**: Match this pattern — validate input, push to array, call render function, clear form. Do NOT manipulate DOM inside the add function; delegate to separate `renderPhases()`.

## Test plan

**Manual smoke tests** (no automated tests for v1 per PRD Q5 decision):
1. Open Multi-Goal tab
2. Verify empty state: "No phases added yet" message visible
3. Click "Load Example" → verify 4 phases appear, sorted by age (35, 50, 55, 70)
4. Delete phase 2 ("Kids in College") → verify only 3 phases remain
5. Add custom phase manually: "Travel" (age 60-65, ₹100k/mo, 7%) → verify appears in correct sort position (between "Empty Nest" and "Medical")
6. Try adding invalid phase (End Age 40, Start Age 50) → verify inline error appears, phase NOT added
7. Keyboard test: Tab through all inputs + buttons, Enter to submit form

**Color cycling verification**:
- Phase 1 → blue (`#2563eb`)
- Phase 2 → emerald (`#10b981`)
- Phase 3 → amber (`#f59e0b`)
- Phase 4 → purple (`#a855f7`)
- Phase 5 → teal (`#14b8a6`)
- Phase 6 → pink (`#ec4899`)
- Phase 7+ → cycles back to blue

## Build verification

```bash
cd retirement-planner
./build.sh
# Expected: no errors

# Verify phase card CSS exists
grep -c "\.phase-card" css/multigoal.css
# Expected: ≥1

# Verify addPhase function defined
grep -c "RP\.addPhase" js/calc-multigoal.js
# Expected: ≥1
```

## Notes

**Re: Edit functionality**: Per PRD assumption A22, Edit button FILLS the form with phase data, user modifies fields, then clicks "Add Phase" again (which updates existing phase if ID matches). This is simpler than inline editing and matches existing Goals tab pattern.

**Re: Undo on delete**: Check if existing planner has toast notification system (grep for "toast" in js/). If yes, use that pattern. If no toast system exists, use modal confirmation dialog instead (simpler for v1).

**Re: Overlap/Gap warnings**: This task renders the phase cards, but does NOT yet show overlap badges or gap warnings — those require the math engine (fe-003) to detect overlaps. fe-004 will add the warning UI after math is ready.

**Phase color assignment logic**:
```javascript
const phaseIndex = RP._phases.indexOf(phase);
const colorIndex = (phaseIndex % 6) + 1; // 1-6 cycling
const phaseColor = `var(--phase-color-${colorIndex})`;
```

**CSS custom properties** (define in `css/multigoal.css`):
```css
:root {
  --phase-color-1: #2563eb; /* from design-tokens.json color.phase.1 */
  --phase-color-2: #10b981;
  --phase-color-3: #f59e0b;
  --phase-color-4: #a855f7;
  --phase-color-5: #14b8a6;
  --phase-color-6: #ec4899;
}
```

[REVIEW] branch: feat/fe-002

Implementation summary (eng-fe-002, 2026-04-27):
- Files: `js/calc-multigoal.js` (extended), `pages/tab-multigoal.html` (extended), `css/multigoal.css` (new), `build.sh` (HEAD heredoc + multigoal.css link).
- State at `RP._multigoal.phases` (per fe-001 declaration).
- Validation per `03-data-contracts.md §1` and §6 error-message table; uses inline `.phase-error` divs + `.phase-input-invalid` red-border class on the input.
- Color palette uses the data-contract names (blue/emerald/amber/purple/teal/pink) keyed by name in the phase object; CSS `--phase-color` set per card via `style.setProperty`. Hex values match contract (blue `#3b82f6`, emerald `#10b981`).
- Toast component built (cheap inline) with 5s auto-dismiss and Undo button — restores deleted phase. Falls back gracefully on missing container.
- `Load Example` populates the 4-phase India FIRE template; if existing phases present, `window.confirm` warns before replacing.
- Sort by startAge on every mutation.
- Phase name rendered via `textContent` (no XSS).
- Edit functionality NOT included per task spec footnote ("Do NOT implement Edit inline … Edit button fills form" — task body says Edit is part of CRUD but the `What NOT to do` section + AC list both omit Edit; only Delete + Add are required for fe-002. Flagged for FE Lead review.)
- App.js wiring deferred to fe-008 per fe-001 scaffold convention. `RP.initMultiGoal()` self-bootstraps on DOMContentLoaded as a safety net so the form is interactive without app.js changes.
- Smoke tested in Playwright: empty state, 2 phases (blue + emerald borders, sort by age 50→70), delete + undo via toast, validation (endAge<startAge → inline error, no add). Reload clears phases (persistence is fe-006).
- Build passes: `./build.sh` → `Built index.html (1249 lines)`. `grep -c "\.phase-card" css/multigoal.css` = 8. `grep -c "RP\.addPhase" js/calc-multigoal.js` = 2.
