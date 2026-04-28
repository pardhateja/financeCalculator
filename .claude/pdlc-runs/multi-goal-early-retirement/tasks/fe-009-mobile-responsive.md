---
id: fe-009
title: Mobile responsive
type: implementation
status: completed
owner: "eng-fe-009"
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T18:00:00Z
attempts: 1
merged_at: 2026-04-27T18:00:00Z
branch: feat/fe-009
notes: "CSS-only diff (115 lines), scoped to #tab-multigoal. Engineer fell back to grep verification (browser locked); orchestrator merged on low-risk basis. Visual mobile smoke deferred to qa-006."
files:
  - css/multigoal.css
  - css/responsive.css
contract_refs: []
design_refs:
  - design/02-wireframes.md#responsive-behavior
  - design/03-a11y-defaults.md#keyboard-navigation
blocked_by:
  - fe-002
  - fe-004
  - fe-005
blocks: []
attempts: 1

[REVIEW] branch: feat/fe-009
---

## Description

Make all Multi-Goal UI components responsive on mobile devices (viewport width <768px). Inputs stack vertically, tables scroll horizontally, allocation bar remains full-width, touch targets meet 44×44px minimum.

**What to build**:

### 1. Mobile Form Layout

Add to `css/responsive.css`:
```css
@media (max-width: 767px) {
  /* Phase input form: stack fields vertically */
  #multigoal-tab .input-row-5 {
    grid-template-columns: 1fr; /* Override 5-column desktop grid */
    gap: 12px;
  }
  
  #multigoal-tab .input-group input {
    font-size: 16px; /* Prevent iOS zoom on focus */
    height: 48px; /* Larger touch target */
  }
  
  #multigoal-tab .btn-primary,
  #multigoal-tab .btn-secondary {
    width: 100%; /* Full-width buttons on mobile */
    min-height: 44px; /* WCAG touch target minimum */
  }
}
```

### 2. Mobile Phase Cards

```css
@media (max-width: 767px) {
  .phase-card {
    padding: 16px; /* Slightly smaller than desktop 16px/20px */
  }
  
  .phase-card h4 {
    font-size: 1rem; /* Smaller phase name on mobile */
  }
  
  .phase-card .phase-meta {
    flex-direction: column; /* Stack age range + expense info vertically */
    gap: 8px;
  }
  
  .phase-card button {
    min-width: 44px; /* Ensure Edit/Delete icons meet touch target */
    min-height: 44px;
  }
}
```

### 3. Mobile Tables (Horizontal Scroll)

```css
@media (max-width: 767px) {
  .projection-table-wrapper {
    overflow-x: auto; /* Enable horizontal scroll */
    -webkit-overflow-scrolling: touch; /* Smooth iOS scrolling */
  }
  
  .projection-table {
    min-width: 600px; /* Prevent column collapse */
    font-size: 0.85rem; /* Smaller text to fit more columns */
  }
  
  .projection-table th,
  .projection-table td {
    padding: 8px 6px; /* Tighter spacing on mobile */
    white-space: nowrap; /* Prevent text wrapping in cells */
  }
  
  /* Sticky first column (Age) for easier reading while scrolling */
  .projection-table th:first-child,
  .projection-table td:first-child {
    position: sticky;
    left: 0;
    background: var(--panel-bg); /* Matches table bg */
    z-index: 1;
    box-shadow: 2px 0 4px rgba(0,0,0,0.1); /* Subtle depth */
  }
  
  body.dark-mode .projection-table th:first-child,
  body.dark-mode .projection-table td:first-child {
    background: #1e293b; /* Dark mode panel bg */
  }
}
```

### 4. Mobile Allocation Bar (Keep Horizontal)

Per design/02-wireframes.md lines 259-260, allocation bar stays horizontal on mobile (does NOT rotate to vertical). Just ensure it fills width:
```css
@media (max-width: 767px) {
  .alloc-bar {
    height: 32px; /* Slightly shorter than desktop 40px */
  }
  
  .alloc-bar__segment {
    min-width: 4px; /* Same as desktop, ensures tiny phases visible */
  }
}
```

**Note**: Wireframes mention "vertical stacked bar" as an option, but PRD/screen-specs don't require it for v1. Horizontal is simpler and works well on mobile.

### 5. Mobile Chart (Smaller Canvas)

```css
@media (max-width: 767px) {
  .chart-container {
    overflow-x: auto; /* Allow horizontal scroll if chart exceeds viewport */
  }
  
  #multigoal-chart {
    max-width: 100%;
    height: auto; /* Maintain aspect ratio */
  }
}
```

Adjust canvas size in JS (`js/calc-multigoal.js`):
```javascript
RP.renderMultiGoalChart = function() {
  const canvas = document.getElementById('multigoal-chart');
  const isMobile = window.innerWidth < 768;
  
  canvas.width = isMobile ? 600 : 800;
  canvas.height = isMobile ? 300 : 400;
  
  // ... rest of rendering logic ...
};
```

### 6. Mobile Deficit Banner

```css
@media (max-width: 767px) {
  .alert {
    padding: 12px 16px; /* Tighter padding */
    font-size: 0.9rem;
  }
  
  .alert-message br {
    display: none; /* Remove line breaks, let text wrap naturally */
  }
}
```

**What NOT to do**:
- Do NOT hide content on mobile (all tables/charts must remain accessible, even if scrollable)
- Do NOT reduce touch targets below 44×44px (WCAG 2.5.5 requirement)
- Do NOT break dark mode (test responsive + dark mode combination)

## Acceptance Criteria

- [ ] Open Multi-Goal tab on 375px viewport (iPhone SE size)
- [ ] Phase input form: all 5 fields stacked vertically, each ≥48px height
- [ ] "Add Phase" and "Load Example" buttons: full width, ≥44px tap targets
- [ ] Phase cards: readable, Edit/Delete buttons ≥44×44px touch areas
- [ ] Allocation table: horizontal scroll enabled, first column (Age) sticky on left
- [ ] Allocation bar: horizontal, full width, 32px height
- [ ] Projection table: horizontal scroll enabled, readable text
- [ ] Chart: scaled to fit viewport width, scrollable if needed
- [ ] Deficit banner: text wraps naturally, dismiss button ≥44×44px
- [ ] All interactive elements tappable without zooming (no accidental mis-taps)

## Conventions to honor

**Pattern 1: Responsive breakpoints** (from existing responsive.css)
```css
/* File: css/responsive.css (existing patterns) */
@media (max-width: 1023px) { /* Tablet */ }
@media (max-width: 767px) { /* Mobile */ }
@media (max-width: 479px) { /* Small mobile */ }
```
**Action**: Use `@media (max-width: 767px)` for primary mobile breakpoint (matches existing convention).

**Pattern 2: Touch target sizing** (from existing responsive.css if present)
```css
@media (max-width: 767px) {
  button {
    min-height: 44px; /* WCAG 2.5.5 Level AAA minimum */
  }
}
```
**Action**: Apply to all buttons in Multi-Goal tab (phase card buttons, form submit, banner dismiss).

**Pattern 3: Horizontal scroll wrapper** (from existing tables)
```css
/* Check if existing Projections tab table uses this pattern: */
.projection-table-wrapper {
  overflow-x: auto;
}
```
**Action**: Reuse existing wrapper class if present; if not, create it in multigoal.css and apply to both allocation + projection tables.

## Test plan

**Manual smoke test** (real device or Chrome DevTools device emulation):
1. Open Chrome DevTools (Cmd+Opt+I)
2. Toggle device toolbar (Cmd+Shift+M)
3. Select "iPhone SE" (375×667px)
4. Navigate to Multi-Goal tab
5. Load Example
6. Verify:
   - Form fields stack vertically, inputs large enough to tap
   - Phase cards readable, delete icons tappable
   - Allocation table scrolls horizontally, Age column stays visible
   - Allocation bar spans full width
   - Projection table scrolls horizontally
   - Chart visible (may need horizontal scroll)
   - Deficit banner readable, dismiss button tappable
7. Switch to "iPad" (768×1024px)
8. Verify: Layout switches to tablet/desktop (form grid, wider tables)
9. Rotate to landscape (667×375px)
10. Verify: Still readable, no overflow issues

**Touch target verification**:
Use Chrome DevTools "Show rulers" + manually measure button dimensions:
- All buttons: ≥44×44px bounding box
- Input fields: ≥48px height (prevents iOS zoom)

**Dark mode + mobile**:
1. Enable dark mode
2. Switch to mobile viewport
3. Verify: All responsive styles work in dark mode (sticky column bg matches dark panel bg, text readable)

## Build verification

```bash
cd retirement-planner

# Verify responsive rules added
grep -c "@media (max-width: 767px)" css/responsive.css
# Expected: ≥1 (new Multi-Goal mobile section)

grep -c "multigoal-tab" css/responsive.css
# Expected: ≥1

# Test build
./build.sh
# No errors
```

## Notes

**Re: iOS zoom prevention**:
iOS Safari auto-zooms on `<input>` focus if font-size <16px. Always set `font-size: 16px` (or larger) on mobile inputs to prevent this jarring behavior.

**Re: sticky column**:
The sticky Age column uses `position: sticky` + `left: 0`. This is supported in all modern browsers. If older browser support needed (unlikely for personal tool), fallback is horizontal scroll without sticky (still usable).

**Re: chart canvas sizing**:
Canvas dimensions set via HTML `width` / `height` attributes control internal resolution. CSS `max-width: 100%` scales display size. Both are needed for crisp rendering + responsive fit.

**Re: testing without real device**:
Chrome DevTools device emulation is 90% accurate. Final verification on real iPhone/Android recommended but not blocking for v1 (Pardha's device will be the real test during bug bash).

**Re: tablet breakpoint (768-1023px)**:
Wireframes mention tablet layout (3-row form instead of 5-column). If time allows, add:
```css
@media (min-width: 768px) and (max-width: 1023px) {
  #multigoal-tab .input-row-5 {
    grid-template-columns: 1fr 1fr; /* 2 columns on tablet */
  }
}
```
But this is OPTIONAL for v1 — desktop (≥1024px) and mobile (<768px) are priorities.

**Integration point**:
After this task, Multi-Goal tab works on all viewport sizes:
- Desktop (≥1024px): full 5-column form, wide tables, large chart
- Tablet (768-1023px): 2-column form (optional), scrollable tables
- Mobile (<768px): stacked form, horizontal scroll tables, scaled chart
Combined with fe-008 (dark mode), UI is fully polished. fe-010 (math tests) validates correctness.
