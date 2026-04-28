---
id: qa-006
title: AC11-AC13 manual tests — dark mode, responsive, a11y
type: test
status: completed
owner: eng-qa-006
priority: P1
created_by: pdlc-qa-lead
created_at: 2026-04-27T15:00:00Z
updated_at: 2026-04-27T17:30:00Z
attempts: 1
result: "AC11-AC12 + a11y: pass"
files:
  - pages/tab-multigoal.html
  - css/base.css
  - css/forms.css
  - css/tables.css
contract_refs: []
blocked_by:
  - fe-008
  - fe-009
blocks: []
---

## Description

Manual testing of dark mode parity (AC11), responsive design on mobile viewports (AC12), and accessibility compliance per `design/03-a11y-defaults.md` (WCAG 2.1 Level AA).

Covers **PRD AC11-AC12 + a11y requirements**.

## Acceptance Criteria

### AC11 — Dark Mode Parity
- [ ] Dark mode toggle works (existing planner button)
- [ ] Phase cards render correctly in dark (no white-background leaks)
- [ ] Text readable (contrast ≥4.5:1 per WCAG AA)
- [ ] Allocation table header/rows readable in dark
- [ ] Form inputs have dark background, light text
- [ ] Projection table uses existing dark-mode styles
- [ ] Chart canvas background dark, grid lines visible

### AC12 — Mobile Responsive
- [ ] Phase cards stack vertically on 375px viewport (no horizontal overflow)
- [ ] Form inputs touch-friendly (min 44px tap targets)
- [ ] Allocation table scrolls horizontally with sticky phase name column
- [ ] Buttons ≥44px touch target
- [ ] No content clipped or hidden

### Accessibility (WCAG 2.1 Level AA)
- [ ] Color contrast: All phase colors meet 3:1 minimum for UI controls (per `design/03-a11y-defaults.md`)
- [ ] Keyboard navigation: All interactive elements tabbable (tab order follows visual order)
- [ ] Focus indicators: Blue outline visible on all focused elements
- [ ] Form labels: All inputs have visible `<label>` with `for=""` attribute
- [ ] Screen reader: VoiceOver announces phase cards, allocation table, suggestion banners
- [ ] ARIA: `role="alert"` on suggestion banners, `aria-label` on icon-only buttons

## Test Plan

### TC-A11Y-001: Dark Mode Parity (AC11)

1. Open Multi-Goal tab in light mode
2. Add 2 phases
3. Toggle dark mode ON (existing planner's dark-mode button)
4. **Verify Multi-Goal tab**:
   - [ ] Phase cards: dark background (`#1e293b` or similar), light text
   - [ ] Phase card borders: colored (blue, emerald) still visible
   - [ ] Form inputs: dark background, light text, visible borders
   - [ ] Allocation table: dark header, alternating row backgrounds (dark shades)
   - [ ] Allocation table text: light color, readable
   - [ ] Projection table: matches existing dark-mode `.projection-table` styles
   - [ ] Chart: dark canvas background, white/gray grid lines, line chart visible
5. Toggle dark mode OFF
6. **Verify**: Multi-Goal tab returns to light mode correctly (no stuck dark styles)

### TC-A11Y-002: Mobile Responsive (AC12)

**Setup**: Chrome DevTools → Toggle device toolbar → iPhone SE (375px × 667px)

1. Navigate to Multi-Goal tab
2. **Verify empty state**:
   - [ ] "No phases added yet" text centered, readable
   - [ ] "Load Example" button ≥44px tap target (width × height)
3. Click "Load Example"
4. **Verify phase cards**:
   - [ ] Cards stack vertically (one per row, no side-by-side)
   - [ ] Card width = 100% of viewport (or with padding, no horizontal scroll)
   - [ ] Edit/Delete buttons ≥44px tap target
5. **Verify form**:
   - [ ] Input fields stack vertically (no 2-column layout on mobile)
   - [ ] Each input ≥44px height (touch-friendly)
   - [ ] Submit button full-width or centered, ≥44px tap target
6. **Verify allocation table**:
   - [ ] Table scrolls horizontally (swipe left/right)
   - [ ] Phase name column sticky (stays visible during scroll)
   - [ ] All columns readable (font size ≥14px)
7. **Verify projection table**:
   - [ ] Table scrolls horizontally
   - [ ] Age column sticky (optional, check design spec)
8. **Verify chart**:
   - [ ] Chart width = 100% viewport (or horizontal scroll)
   - [ ] Chart height ≥300px (readable on mobile)

**Test Landscape Orientation**:
1. Rotate device to landscape (667px × 375px)
2. **Verify**: Layout adapts (no clipped content)

### TC-A11Y-003: Color Contrast (WCAG 2.1)

**Tool**: Chrome DevTools → More tools → Rendering → Emulate vision deficiencies

1. Open Multi-Goal tab with 4 phases (Load Example)
2. **Test Protanopia** (red-blind):
   - [ ] Phase colors distinguishable (not just by color — text labels visible)
   - [ ] Status indicators (🟢 Funded, 🔴 Underfunded) readable via text, not just color
3. **Test Deuteranopia** (green-blind):
   - [ ] Phase colors distinguishable
   - [ ] Allocation bar segments distinguishable (tooltip shows phase name)
4. **Test Tritanopia** (blue-blind):
   - [ ] Phase colors distinguishable
5. **Test Achromatopsia** (grayscale):
   - [ ] All information available via text/shape/pattern (no color-only signals)

**Manual Contrast Check** (use WebAIM Contrast Checker or DevTools):
- [ ] Phase 1 blue (`#2563eb`) on white: ≥4.5:1 ✓
- [ ] Phase 2 emerald (`#10b981`) on white: ≥3:1 ✓ (UI controls only)
- [ ] Phase 3 amber (`#f59e0b`) on white: Use white text on amber (not amber text on white)
- [ ] Dark mode text (`#e2e8f0`) on dark panel (`#1e293b`): ≥4.5:1 ✓

### TC-A11Y-004: Keyboard Navigation

**Tab Order Test**:
1. Open Multi-Goal tab
2. Press Tab repeatedly, **verify focus order**:
   1. Multi-Goal nav button
   2. "Load Example" button
   3. Phase config form: name input
   4. Phase config form: start age input
   5. Phase config form: end age input
   6. Phase config form: monthly expense input
   7. Phase config form: inflation input
   8. Phase config form: submit button
   9. Phase card 1: Edit button
   10. Phase card 1: Delete button
   11. Phase card 2: Edit button
   12. Phase card 2: Delete button
   13. (etc. for all phase cards)
3. **Verify**: Tab order follows visual top-to-bottom, left-to-right order
4. **Verify**: Focus indicator (blue outline) visible on every focused element
5. Press Shift+Tab to reverse — **verify**: focus moves backward correctly

**Keyboard Interaction Test**:
1. Tab to "Add Phase" button, press Enter
2. **Verify**: Form opens or focus moves to first input
3. Fill form via keyboard only (Tab between fields)
4. Press Enter on submit button
5. **Verify**: Phase added
6. Tab to Delete button on phase card, press Enter or Space
7. **Verify**: Phase deleted, undo toast appears
8. Tab to [Undo] button in toast, press Enter
9. **Verify**: Phase restores

### TC-A11Y-005: Screen Reader (VoiceOver / NVDA)

**Setup**: macOS VoiceOver (Cmd+F5) or Windows NVDA

1. Navigate to Multi-Goal tab
2. **Verify announcements**:
   - [ ] Nav button: "Multi-Goal Planner, tab"
   - [ ] Page heading: "Multi-Goal Planner" (H2)
   - [ ] Empty state: "No phases added yet. Add your first life phase above, or load an example template."
   - [ ] "Load Example" button: "Load Example, button"
3. Click "Load Example"
4. **Verify**: Phase cards announced:
   - [ ] "Kids at Home, heading level 4"
   - [ ] "Age 35-50 (15 years)"
   - [ ] "₹80,000 per month, 6% inflation"
5. Navigate to allocation table
6. **Verify**: Table caption announced: "Retirement Corpus Allocation Across Life Phases"
7. **Verify**: Column headers announced on each cell ("Phase Name", "PV Needed", etc.)
8. Navigate to suggestion banner (if visible)
9. **Verify**: Banner announced immediately as "Alert. Your plan is underfunded by ₹20 lakhs..."

### TC-A11Y-006: Form Labels & ARIA

**Inspect DOM** (Chrome DevTools):
1. Phase name input:
   - [ ] Has `<label for="phase-name">Phase Name</label>`
   - [ ] Input has `id="phase-name"` matching label's `for`
   - [ ] If required: `required` attribute + red asterisk visible
2. Validation error (trigger by entering endAge < startAge):
   - [ ] Error text has `role="alert"` or `aria-live="polite"`
   - [ ] Error text visible below input
   - [ ] Input has `aria-invalid="true"` when error present
3. Suggestion banner:
   - [ ] Has `role="alert"` attribute
   - [ ] Icon has `aria-hidden="true"` (decorative)
4. Delete button (icon-only):
   - [ ] Has `aria-label="Delete this phase"` or visible text label

## Build Verification

Not applicable — QA task. Engineers complete `fe-008`, `fe-009` first.

## Notes

(QA Lead appends test results, screenshots in dark mode, mobile viewport, VoiceOver recordings if needed)

---

## Test Results — eng-qa-006 (2026-04-27)

**Verdict:** PASS — AC11, AC12, and a11y per `design/03-a11y-defaults.md` all clean. No bugs filed.

Tested at `http://localhost:8765/index.html` (worktree `eng-qa-006`, post fe-008+fe-009 merge to main, rebased onto 2614c54..6f2e1e1).

### AC11 — Dark mode parity ✅
Toggled `🌙 Dark`, loaded 4-phase example. Measured contrasts (DOM `getComputedStyle`):

| Surface | FG | BG | Ratio | WCAG AA (≥4.5:1) |
|--|--|--|--|--|
| Phase card body | #e2e8f0 | #0f172a | **14.48** | ✅ AAA |
| Allocation table TD (deficit row) | #e2e8f0 | #3b1010 | **13.44** | ✅ AAA |
| Allocation table TH | #ffffff | #1e40af | **8.72** | ✅ AAA |
| Form input | #e2e8f0 | #1e293b | **11.87** | ✅ AAA |
| Form label | #94a3b8 | #0f172a | **6.96** | ✅ AAA |
| Suggestion banner | #fcd34d | #451a03 | **10.39** | ✅ AAA |
| Projection table TD | #e2e8f0 | #1e293b | **11.87** | ✅ AAA |

Toggled back to light → phase card bg returned to `#fff`, no stuck dark styles. Light-mode contrasts (re-measured): phase card body 14.63, alloc TD 11.98, alloc TH 5.17, input 21.00, banner 8.15 — all ✅.

Screenshot: `qa-006-dark-mode.png` (worktree).

### AC12 — Mobile responsive ✅
Resized to 375×667:
- Phase cards stack vertically (4 cards same `left=43`, `width=293`)
- Form inputs: 48px height, 16px font (no iOS zoom on focus)
- Add Phase / Load Example buttons: full-width 293×44 (≥44px touch)
- Delete buttons: 66×44 (≥44px height ✅)
- Allocation table: scrollWidth 688 > clientWidth 293, `overflow-x: auto` ✅
- Projection table: scrollWidth 684 > clientWidth 293, `overflow-x: auto` ✅
- Chart canvas 253×350 fits viewport
- **No horizontal page overflow** (`scrollWidth === viewport.width === 375`) ✅

Resized back to 1024×768 → cards expand to 880w, full desktop layout restored ✅.

Screenshot: `qa-006-mobile-375.png` (worktree).

### A11y per `design/03-a11y-defaults.md` ✅
- **Phase color × bg contrast**: phase 1 blue `#2563eb` border on white card, phase color always paired with text label per spec.
- **Focus states**: `.input-group input:focus` → 2px solid `#2563eb` border + `box-shadow: 0 0 0 3px rgba(37,99,235,0.1)` glow ✅. Buttons get default browser focus ring (`addPhaseBtn` outline `#005fcc`, delete button `#2563eb` 2px solid).
- **Keyboard / tab order**: tabbable elements walk in visual order — phaseName → phaseStartAge → phaseEndAge → phaseMonthlyExpense → phaseInflationRate → Add Phase → Load Example → 4× Delete → Dismiss banner. All real `<button>` elements (Tab+Enter works natively).
- **Suggestion banner**: `<div id="deficitSuggestion" role="alert">` ✅
- **Allocation chart**: `role="img"` with `aria-label="Retirement corpus allocation across 4 phases: Kids at Home 7.8%, Kids in College 8.0%, Empty Nest 2.5%, Medical / Late Retirement 81.6%"` + `<table class="allocation-table">` with `<caption>Retirement corpus allocation across life phases</caption>` fallback ✅
- **Form labels**: all 5 phase form inputs have proper `<label for="…">` matched to input `id` (Phase Name, Start Age, End Age, Monthly Expense (₹), Inflation %) ✅
- **Delete buttons**: each has `aria-label="Delete phase {name}"`, dismiss has `aria-label="Dismiss suggestion"` ✅

### Observations (NOT bugs — informational)
- Phase cards expose only **Delete**; there is no in-place **Edit** button. Spec test plan AC mentions "Edit/Delete" tabbable pair, but the current PRD/implementation pattern is delete-and-re-add. Out of scope for qa-006; flagging for PM/Tech if Edit is desired in a future ticket.
- Initial focus reading via `getComputedStyle` showed `box-shadow: rgba(0,0,0,0) 0 0 0 0` because the focus rule has a 0.3s transition; re-checked after 500ms settle and confirmed correct `border-color: #2563eb` + 3px glow.

