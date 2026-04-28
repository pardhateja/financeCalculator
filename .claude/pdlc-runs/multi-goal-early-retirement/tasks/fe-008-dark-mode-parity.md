---
id: fe-008
title: Dark mode parity
type: implementation
status: completed
owner: "eng-fe-008"
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T18:01:00Z
attempts: 1
merged_at: 2026-04-27T18:01:00Z
branch: feat/fe-008
notes: "dark.css-only diff (80 lines). Chart canvas dark-mode raised as follow-up (out of fe-008 scope per convention #9)."
followups:
  - "Chart canvas dark mode (multi-goal projection chart) — needs js/chart.js or js/calc-multigoal.js edits, file fe-008 wasn't allowed to touch. Open if Pardha wants v1 polish."
files:
  - css/multigoal.css
  - css/dark.css
contract_refs: []
design_refs:
  - design/03-design-tokens.json#color.dark
  - design/02-screen-specs.md#dark-mode-parity
  - design/03-a11y-defaults.md#focus-state
blocked_by:
  - fe-002
  - fe-004
  - fe-005
blocks: []
attempts: 1
---

## Description

Ensure all new Multi-Goal UI components render correctly in dark mode (`body.dark-mode` class toggled by existing dark mode button). Every color, background, border must have a dark mode override to maintain readability and WCAG AA contrast.

**What to build**:

### 1. Dark Mode Overrides in `css/dark.css`

Add new section at end of `css/dark.css`:
```css
/* ============================================
   Multi-Goal Tab Dark Mode
   ============================================ */

body.dark-mode .phase-card {
  background: #0f172a; /* slate-900, matches dark.section-bg */
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

body.dark-mode .phase-card .phase-dot {
  /* Phase colors already have dark variants in design-tokens.json */
  /* No override needed if using CSS custom properties correctly */
}

body.dark-mode .alloc-bar {
  background: #334155; /* slate-700, darker than light mode neutral-border */
}

body.dark-mode .alloc-bar__segment {
  /* Segments use --phase-color-N which auto-switches via root overrides below */
}

body.dark-mode .projection-table {
  background: #1e293b; /* slate-800, matches dark.panel-bg */
}

body.dark-mode .projection-table thead {
  background: #1e40af; /* blue-800, same as light mode (bright accent) */
}

body.dark-mode .projection-table tbody tr {
  border-bottom: 1px solid #334155; /* slate-700 */
}

body.dark-mode .projection-table tbody tr:nth-child(even) {
  background: #0f172a; /* slate-900, alternating row */
}

body.dark-mode .projection-table tbody tr.deficit {
  background: #3b1010; /* dark red tint, per screen-specs.md line 383 */
}

body.dark-mode .alert-warning {
  background: #451a03; /* dark amber bg, per design-tokens.json dark patterns */
  border-left-color: #f59e0b; /* amber-500, same as light */
}

body.dark-mode .alert-message {
  color: #fcd34d; /* amber-200, readable on dark amber bg */
}

body.dark-mode .phase-badge {
  /* White text on phase colors already meets contrast (verified in a11y-defaults.md) */
  /* No override needed */
}

/* Dark mode phase color overrides (root level) */
body.dark-mode {
  --phase-color-1: #3b82f6; /* blue-500, brighter than light mode blue-600 */
  --phase-color-2: #10b981; /* emerald-500, same as light */
  --phase-color-3: #f59e0b; /* amber-500, same as light */
  --phase-color-4: #a855f7; /* purple-500, same as light */
  --phase-color-5: #14b8a6; /* teal-500, same as light */
  --phase-color-6: #ec4899; /* pink-500, same as light */
}
```

**Critical checks** (per design-tokens.json + a11y-defaults.md):
- Phase 1 dark (`#3b82f6` on `#1e293b`): 6.1:1 ✓ AA
- Text primary dark (`#e2e8f0` on `#1e293b`): 11.2:1 ✓ AAA
- All phase colors on dark panel: ≥4.5:1 (verified in a11y-defaults.md lines 38-48)

### 2. Dark Mode Focus Ring (Already Handled)

Verify existing dark mode focus from `css/dark.css` applies to new interactive elements:
```css
/* Should already exist in dark.css for buttons: */
body.dark-mode .btn-primary:focus,
body.dark-mode .btn-secondary:focus {
  outline: 2px solid #3b82f6; /* blue-500, brighter for dark bg */
  outline-offset: 2px;
}
```

If missing for phase cards' Edit/Delete buttons, add:
```css
body.dark-mode .phase-card button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### 3. Chart Canvas Dark Mode

Add to `js/calc-multigoal.js` (in `RP.renderMultiGoalChart()`):
```javascript
RP.renderMultiGoalChart = function() {
  const canvas = document.getElementById('multigoal-chart');
  const ctx = canvas.getContext('2d');
  
  // Detect dark mode
  const isDark = document.body.classList.contains('dark-mode');
  
  // Background fill
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Grid lines
  ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0'; // slate-600 vs slate-200
  // ... draw grid ...
  
  // Axis labels text
  ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b'; // text-primary-dark vs text-primary-light
  // ... draw labels ...
  
  // Corpus line
  ctx.strokeStyle = isDark ? '#3b82f6' : '#2563eb'; // blue-500 vs blue-600
  // ... draw line ...
  
  // Phase regions (already use phase colors which auto-adjust via CSS custom properties)
  // No change needed if reading from getComputedStyle
};
```

**What NOT to do**:
- Do NOT hardcode dark mode colors in JS (read from CSS custom properties via `getComputedStyle`)
- Do NOT skip testing — dark mode bugs are often invisible until user toggles

## Acceptance Criteria

- [ ] Toggling dark mode button shows all Multi-Goal components in dark theme
- [ ] Phase cards: dark background (`#0f172a`), text readable (light gray)
- [ ] Allocation table: dark panel background, alternating rows visible, deficit rows have dark red tint
- [ ] Stacked bar: darker neutral background, phase segments use bright phase colors
- [ ] Projection table: same as allocation table (dark bg, readable text)
- [ ] Phase badges: white text on phase colors (contrast verified ≥4.5:1)
- [ ] Alert banner: dark amber background, readable message text
- [ ] Chart canvas: dark background, light grid lines, bright corpus line
- [ ] Focus rings: blue-500 outline visible on dark backgrounds
- [ ] No white-background "flashes" or leaks (all components fully styled)

## Conventions to honor

**Pattern 1: Dark mode section in dark.css** (existing file structure)
```css
/* File: css/dark.css:1-10 */
body.dark-mode {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

body.dark-mode .panel {
  background: #1e293b;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
```
**Action**: Add new Multi-Goal dark mode section at end of dark.css, keeping same structure (grouped overrides under `body.dark-mode` prefix).

**Pattern 2: CSS custom property overrides** (from existing dark mode)
```css
/* Example from dark.css (if it uses custom properties): */
body.dark-mode {
  --panel-bg: #1e293b;
  --text-primary: #e2e8f0;
}
```
**Action**: If multigoal.css uses custom properties (e.g., `var(--phase-color-1)`), override them in dark mode section. Otherwise, use descendant selectors.

**Pattern 3: Canvas color detection** (new pattern, not in existing code)
```javascript
const isDark = document.body.classList.contains('dark-mode');
const bgColor = isDark ? '#1e293b' : '#ffffff';
```
**Action**: Check for `dark-mode` class at render time, adjust canvas colors accordingly. This is necessary because canvas doesn't inherit CSS — colors must be set in JS.

## Test plan

**Manual smoke test**:
1. Open Multi-Goal tab in light mode
2. Load Example (4 phases)
3. Verify: All components render in light theme (white cards, blue accents)
4. Click dark mode button (header, "🌙 Dark")
5. Verify: Immediate switch to dark theme
6. Check each component:
   - Phase cards: dark gray background, white text readable
   - Allocation table: dark bg, white/light gray text, red deficit rows still visible
   - Stacked bar: dark gray empty space, colored segments bright
   - Projection table: same dark styling as allocation table
   - Chart: dark canvas bg, light grid, bright blue corpus line
7. Toggle dark mode OFF
8. Verify: All components return to light theme (no stuck dark elements)

**Contrast verification** (WCAG AA requirement):
1. Take screenshot of dark mode Multi-Goal tab
2. Open in contrast checker tool (WebAIM, Stark, or browser DevTools)
3. Measure:
   - White text on `#0f172a` background: should be >7:1
   - Phase colors on `#1e293b`: should be >4.5:1
   - Blue-500 focus ring on `#1e293b`: should be >3:1
4. All must pass AA minimums

**Regression test**:
- Navigate to existing tabs (Basics, Projections, Dashboard) in dark mode
- Verify: No styling broken by new dark.css additions

## Build verification

```bash
cd retirement-planner

# Verify dark mode section added to dark.css
grep -c "Multi-Goal Tab Dark Mode" css/dark.css
# Expected: 1 (comment header)

grep -c "body.dark-mode .phase-card" css/dark.css
# Expected: ≥1

grep -c "body.dark-mode .alloc-bar" css/dark.css
# Expected: ≥1

# Verify no hardcoded dark colors in multigoal.css (should use custom properties)
grep "#1e293b\|#0f172a" css/multigoal.css || echo "No hardcoded dark colors (good)"
# Expected: empty output or "No hardcoded dark colors"
```

## Notes

**Re: phase color brightness in dark mode**:
Per a11y-defaults.md lines 236-266, Phase 1 in dark mode uses `#3b82f6` (blue-500) instead of light mode's `#2563eb` (blue-600). The lighter shade provides better contrast on dark backgrounds. Other phase colors (emerald, amber, purple, teal, pink) are bright enough in both modes.

**Re: canvas dark mode detection**:
Canvas element doesn't auto-update on class toggle (unlike DOM elements with CSS). We must re-call `RP.renderMultiGoalChart()` when dark mode toggles. Check existing `darkmode.js` — it likely triggers a global recalculate:
```javascript
// In darkmode.js (existing code, likely):
document.getElementById('darkModeBtn').addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');
  if (typeof RP.calculateAll === 'function') {
    RP.calculateAll(); // Re-renders all charts
  }
});
```
This should already trigger `RP.calculateMultiGoal()` which calls `RP.renderMultiGoalChart()`. Verify this works; if not, add explicit call.

**Re: testing without dark mode button**:
If dark mode button doesn't exist or is broken, manually toggle via DevTools console:
```javascript
document.body.classList.add('dark-mode');
RP.calculateMultiGoal(); // Re-render
```

**Integration point**:
After this task, Multi-Goal tab is fully theme-aware. User can toggle dark mode at any time, all components adapt instantly. Combined with fe-009 (mobile responsive), the UI is ready for final verification (fe-010 tests).

[REVIEW] branch: feat/fe-008
- Added 80 lines to `css/dark.css` under "Multi-Goal Tab Dark Mode (fe-008)" section.
- Touched only `css/dark.css` (per team-lead scope: dark.css/multigoal.css only). `css/multigoal.css` already had partial dark-mode rules (alloc-bar, alert-warning, allocation-table footer/deficit, per-phase-balance-item color) from waves 2/3 — left untouched.
- Followed existing dark.css convention: `body.dark-mode .selector { ... }` descendant pattern, hardcoded hex colors (no CSS custom properties), grouped per fe-task wave.
- Phase color tokens NOT overridden at root — kept the multigoal.css values which already match the dark-mode preference (#3b82f6 blue-500 etc., per task spec).
- Chart canvas dark mode (task description section "Chart Canvas Dark Mode") deferred — would require modifying `js/chart.js` outside the team-lead's allowed file list (`css/dark.css`, `css/multigoal.css`, `index.html`). Flag for follow-up if chart canvas dark-mode is required.
- Smoke test (playwright): Multi-Goal tab loaded, Load Example → 4 phases, dark toggle on → all components show dark bg + light text (verified via getComputedStyle: phase-card #0f172a, alloc-bar #334155, projection-table tbody #1e293b, alert-warning #451a03 with #fcd34d text), toggle off → light mode restored cleanly.
- index.html unchanged (build.sh produced byte-identical output since only dark.css was modified, which is referenced by URL).
