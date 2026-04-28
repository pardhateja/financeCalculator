# Screen Specs — Multi-Goal Age-Phased Early Retirement Planner

**Run:** multi-goal-early-retirement  
**Author:** UI Designer  
**Date:** 2026-04-27

---

## Overview

This document specifies copy, microcopy, error messages, edge case handling, and all state variations for the Multi-Goal tab. Companion to `02-wireframes.md`.

---

## Screen: Multi-Goal Tab

### Copy

| Element | Text | Notes |
|---------|------|-------|
| Page title (H2) | "Multi-Goal Planner" | Sentence case, matches existing tab naming convention |
| Page subtitle | "Plan multiple life-phase expenses with per-phase inflation" | Gray text, 0.9rem, explains the feature purpose |
| Section: Phase input form | "Add Life Phase" | H3, matches "Add Financial Goals" pattern from Goals tab |
| Section: Phase list | "Your Life Phases ({count})" | H3, dynamic count, matches "Your Goals" pattern |
| Section: Allocation | "Allocation Pre-Flight" | H3, "pre-flight" = before running full projection |
| Section: Chart | "Corpus Projection by Phase" | H3, above chart |
| Section: Projection table | "Year-by-Year Projection" | H3, above table |
| Button: Add phase | "Add Phase" | Action verb first, not "Save" or "Create" |
| Button: Load example | "Load Example" | Simple, not "Load Template" or "Load Indian FIRE Template" (that's tooltip content) |
| Button: Edit phase | "Edit" | Icon + text, or icon only with `title="Edit"` |
| Button: Delete phase | "Delete" | Icon + text, or trash icon with `title="Delete"` |
| Empty state heading | "No phases added yet" | Friendly, not "No data" |
| Empty state body | "Add your first life phase above, or load an example template." | Calls out two actions: manual add OR load example |
| Empty state CTA | "Load Example" | Same button as in form section, but prominent placement |

### Form Field Labels & Placeholders

| Field | Label | Placeholder | Unit/Suffix |
|-------|-------|-------------|-------------|
| Phase name | "Phase Name" | "e.g. Kids at Home" | None |
| Start age | "Start Age" | "e.g. 35" | None (bare number) |
| End age | "End Age" | "e.g. 50" | None (bare number) |
| Monthly expense | "Monthly ₹" | "e.g. 80000" | None (₹ in label, no suffix) |
| Inflation rate | "Inflation %" | "e.g. 6" | None (% in label, no suffix) |

**Note**: Existing planner uses "Monthly Expense" but we shorten to "Monthly ₹" to fit 5-column mobile layout. If space allows, use full "Monthly Expense (₹)".

### Phase Card Metadata

| Element | Format | Example |
|---------|--------|---------|
| Phase name | Title case, bold, 1.15rem | "Kids at Home" |
| Age range | "Age {start}-{end} ({duration} years)" | "Age 35-50 (15 years)" |
| Expense + inflation | "₹{amount}/mo · {rate}% inflation" | "₹80,000/mo · 6% inflation" |
| Overlap badge | "⚠️ Overlaps with {otherPhaseName} (age {overlapAge})" | "⚠️ Overlaps with Kids in College (age 50)" |
| Color indicator | 4px left border, color from phase palette | Blue, emerald, amber, purple, teal, pink (cycle) |

### Allocation Table Copy

| Column Header | Tooltip (if hover supported) |
|---------------|------------------------------|
| Phase | Life phase name |
| PV Needed | Present value required to fund this phase (discounted to retirement age) |
| Allocated | Corpus allocated to this phase (proportional to PV %) |
| Deficit / Surplus | Difference between needed and allocated (negative = underfunded) |
| Status | 🟢 Funded / 🔴 Underfunded / 🟡 Partially funded |

**Footer row** (TOTAL):
- Phase: "TOTAL" (bold)
- PV Needed: Sum of all PV
- Allocated: Total corpus at retirement (from existing planner)
- Deficit/Surplus: Total shortfall or excess
- Status: 🟢 Surplus / 🔴 Shortfall / 🟡 Breakeven

### Suggestion Banner Copy (Deficit scenario)

**Template** (when deficit exists):

```
⚠️ Your plan is underfunded by ₹{deficit} lakhs. To close the gap:
• Increase monthly SIP by ₹{sipIncrease} (assumes {yearsToRetirement} years, {preRetireReturn}% return)
• OR reduce "{highestCostPhase}" from ₹{current}/mo to ₹{reduced}/mo ({reductionPercent}% reduction)
```

**Example** (AC6 scenario):

```
⚠️ Your plan is underfunded by ₹20 lakhs. To close the gap:
• Increase monthly SIP by ₹8,500 (assumes 15 years, 12% return)
• OR reduce "Kids in College" from ₹1.2L/mo to ₹1.08L/mo (10% reduction)
```

**When surplus exists** (no banner, but show green health indicator):

```
🟢 All phases funded
```

### Allocation Bar Labels

Horizontal stacked bar (desktop/tablet):
- Each segment labeled with phase name + percentage
- Hover shows tooltip: "{Phase Name}: ₹{allocated} ({percent}%)"

Vertical stacked bar (mobile <768px):
- Each segment labeled with phase name only (percentage in legend below bar)

### Chart Annotations

**Phase-shaded vertical regions**:
- Light tint (10% opacity of phase color) as vertical background strip
- Phase name label at top of strip (rotated -90° if narrow phase)
- Age range labeled on X-axis below

**Legend**:
- Existing legend: "Corpus Balance" (line chart)
- New legend items: Phase 1 (blue tint), Phase 2 (emerald tint), etc.

### Projection Table Copy

**New column: "Active Phase"**

| Value | Display |
|-------|---------|
| Single phase active | Colored badge: "🔵 Kids at Home" |
| Multiple phases active (overlap) | Two badges: "🔵🟢 2 phases" (hover shows names) |
| No phase active (gap year) | Gray badge: "⚠️ (gap)" |
| Multiple phases (>2) | Stacked badges or "🔵🟢🟡 3 phases" |

**Colored badges**:
- Use small pill-shaped badge (8px height, 4px horizontal padding, 6px border-radius)
- Background: light tint of phase color (blue-50, emerald-50, etc.)
- Text: phase color (blue-600, emerald-600, etc.)
- Icon: colored circle emoji (🔵 blue, 🟢 green, 🟡 amber, 🟣 purple, etc.) OR CSS circle dot

**Existing columns** (unchanged from current Projections tab):
- Age, Starting Corpus, Annual Savings, Growth, Ending Corpus, Status, Expenses

---

## Error Messages (from user's perspective, not server's)

### Validation Errors (inline, below input field)

| Error Condition | Message | Recovery Action |
|----------------|---------|-----------------|
| End age ≤ Start age | "End age must be greater than start age" | User corrects end age field, error clears on blur |
| Start age < current age | "Start age cannot be before your current age ({currentAge})" | User corrects start age |
| End age > life expectancy | "End age cannot exceed your life expectancy ({lifeExpectancy})" | User corrects end age OR increases life expectancy in Basics tab |
| Inflation rate < 0 | "Inflation rate must be at least 0%" | User corrects inflation field |
| Inflation rate > 25 | "Inflation rate above 25% is unrealistic" | User corrects inflation field (soft warning, not blocking) |
| Monthly expense ≤ 0 | "Monthly expense must be greater than zero" | User corrects monthly expense field |
| Monthly expense > 10,00,000 | "Monthly expense above ₹10L seems high — please verify" | Soft warning (yellow), not blocking |
| Phase name empty | "Phase name is required" | User enters a name |
| Phase name > 40 chars | "Phase name is too long (max 40 characters)" | User shortens name |

**Visual treatment**:
- Error text: Red (`#ef4444`), 0.85rem, appears below input field
- Input border: Red (`2px solid #ef4444`) when error exists
- Clear error: On input blur or form submit retry

### Informational Warnings (non-blocking)

| Condition | Message | Display Location |
|-----------|---------|------------------|
| Overlapping phases | "⚠️ Overlaps with {otherPhaseName} (age {age})" | Badge on phase card, amber background |
| Gap years | "ℹ️ Gap detected: ages {startGap}-{endGap} have no phase coverage (₹0 expense assumed)" | Banner below phase list, blue background |
| Very high inflation (>15%) | "ℹ️ {rate}% inflation is high — typical medical inflation is 10-12%" | Inline below inflation input, blue text |

**Note**: Overlaps and gaps are ALLOWED per AC3 and AC4. Warnings are informational only, not blocking.

### Calculation Errors (rare, but possible)

| Error Condition | Message | Recovery Action |
|----------------|---------|-----------------|
| Corpus = 0 | "Cannot allocate phases — no corpus available. Run the main planner first (Projections tab)." | User navigates to Projections tab, configures inputs |
| Life expectancy < retirement age | "Cannot plan phases — life expectancy must be greater than retirement age. Fix in Basics tab." | User navigates to Basics tab |
| No phases configured | (Empty state, not an error) | User adds phase or loads example |
| Math overflow (PV > Number.MAX_SAFE_INTEGER) | "Phase duration or inflation rate is too extreme — calculation overflow" | User reduces phase duration or inflation |

---

## Microcopy

### Tooltips (for icon buttons, if hover supported)

| Element | Tooltip Text |
|---------|-------------|
| Edit icon | "Edit this phase" |
| Delete icon | "Delete this phase" |
| Load Example button | "Load Indian FIRE template (4 phases: Kids at Home, College, Empty Nest, Medical)" |
| Allocation table "PV Needed" header | "Present value: amount needed at retirement (discounted)" |
| Allocation table "Allocated" header | "Corpus allocated to this phase (proportional split)" |
| Chart phase region hover | "{Phase Name} (Age {start}-{end}): ₹{monthlyExpense}/mo @ {inflation}%" |

### Help Text (if inline help icons added in future)

| Field | Help Text (popover or expandable) |
|-------|-----------------------------------|
| Phase Name | "Give this life phase a descriptive name (e.g. 'Kids in College', 'Empty Nest', 'Medical Needs')" |
| Start Age | "Your age when this phase begins (must be after current age, usually at or after retirement age)" |
| End Age | "Your age when this phase ends (must be before life expectancy)" |
| Monthly Expense | "Average monthly expense during this phase (in today's ₹, before inflation adjustment)" |
| Inflation Rate | "Annual inflation rate for this phase (General: 6%, Education: 10%, Medical: 12%)" |

### Confirmation Dialogs

**Delete phase**:

If using modal confirmation (fallback if toast undo is too costly):

```
Delete "{phaseName}"?

This phase will be removed from your plan. Allocation and projections will recalculate.

[Cancel] [Delete]
```

If using toast undo (preferred per A15):

```
Toast (appears top-right, 5 seconds):
"{PhaseName}" deleted. [Undo]
```

**Load Example** (confirmation if user already has phases):

```
Load Example Template?

This will replace your {count} existing phases with 4 pre-configured Indian FIRE phases.

[Cancel] [Load Example]
```

---

## Loading & Empty States

### Loading State

**Not applicable for v1** — all calculations are synchronous JavaScript. No network calls.

Future async calculation (if added):
- **Skeleton placeholder**: Phase cards → gray rectangles (12px border-radius, pulse animation)
- **Allocation table**: Skeleton rows (5 rows, gray bars in each cell)
- **Chart**: Axes-only skeleton (no line, no shading)
- **Duration**: If calculation takes >200ms, show skeleton. If >5s, show reassurance text: "Still calculating... complex phases take a moment."

### Empty State (no phases configured)

**Primary empty state** (shown in wireframes):

```
┌───────────────────────────────────────┐
│            📊                         │
│                                       │
│       No phases added yet             │
│   Add your first life phase above,    │
│   or load an example template.        │
│                                       │
│       [Load Example]                  │
│                                       │
└───────────────────────────────────────┘
```

**Text style**:
- Emoji: 📊 (2rem font size)
- Heading: "No phases added yet" (1rem, text-secondary color)
- Body: 0.9rem, text-secondary color
- Button: btn-primary (gradient blue)

**Alternative empty state** (if user deletes all phases):

Toast (top-right, 3 seconds):
```
All phases removed. Add a phase or load the example to start planning.
```

---

## Copy Guidelines (for future edits)

1. **Use active voice**: "Add your first phase" not "Your first phase can be added"
2. **Button labels start with verbs**: "Add Phase", "Load Example", "Edit", "Delete" (not "Phase Addition" or "Example Template")
3. **Error messages from user perspective**: "End age must be greater than start age" not "Invalid age range detected"
4. **Natural language for confirmations**: "Delete this phase?" not "Confirm phase deletion operation"
5. **Numbers use Indian lakh/crore convention**: "₹20 lakhs", "₹5.2 crore" (not "₹2,000,000" or "₹52,000,000")
6. **Percentages without space**: "6% inflation" not "6 % inflation"
7. **Rupee symbol before amount**: "₹80,000" not "80,000 ₹" or "Rs 80,000"
8. **Sentence case for headings**: "Your Life Phases" not "Your Life Phases" or "YOUR LIFE PHASES"
9. **No placeholder text like "Lorem ipsum"** — all copy is intentional and real
10. **Avoid jargon**: "Present value" gets a tooltip; "PV" alone is unclear to non-finance users

---

## State Transition Examples

### Scenario 1: New user, first visit to Multi-Goal tab

1. **State**: Empty (no phases)
2. **Action**: User clicks "Load Example"
3. **Transition**: 
   - Toast appears: "4 phases loaded from Indian FIRE template"
   - Phase list populates with 4 cards (sorted by age)
   - Allocation table appears below phase list
   - Chart redraws with 4 phase-shaded regions
   - Projection table rebuilds with "Active Phase" column
4. **Final state**: Success (4 phases, may be underfunded or funded depending on user's corpus)

### Scenario 2: User adds overlapping phase

1. **State**: Success (3 phases: 35-50, 55-70, 70-100)
2. **Action**: User adds phase "Part-time Travel" (age 48-58, ₹60k/mo, 6%)
3. **Transition**:
   - New phase card appears between first and second phase (sorted by startAge=48)
   - Amber overlap badge appears on both "Kids at Home" (overlaps 48-50) and "Part-time Travel" (overlaps 48-50, 55-58)
   - Toast: "ℹ️ This phase overlaps with 2 other phases (expenses will combine)"
   - Allocation table recalculates (4 phases now, PV sums increase)
   - Chart adds 4th shaded region (amber tint, spans 48-58)
4. **Final state**: Success (4 phases, with overlap warnings)

### Scenario 3: User deletes a phase (toast undo)

1. **State**: Success (4 phases)
2. **Action**: User clicks delete icon on "Kids in College" phase
3. **Transition**:
   - Phase card fades out (300ms CSS transition)
   - Toast appears: "'Kids in College' deleted. [Undo]"
   - Allocation table recalculates (3 phases, deficit may change)
   - Chart removes emerald-shaded region
   - Projection table "Active Phase" column updates (age 50-55 now shows gap or different phase)
4. **If user clicks [Undo] within 5s**:
   - Phase card fades back in
   - Toast: "'Kids in College' restored"
   - All calculations revert to 4-phase state
5. **If user waits 5s** (toast expires):
   - Deletion is permanent (until user manually re-adds)
   - Toast fades out

### Scenario 4: Validation error → correction

1. **State**: Form open, user entering new phase
2. **Action**: User enters Start Age 50, End Age 45, clicks "Add Phase"
3. **Transition**:
   - "End Age" input border turns red
   - Error text appears below "End Age" input: "End age must be greater than start age"
   - "Add Phase" button remains enabled (not disabled — user can retry)
   - No phase card added, no table recalculation
4. **Action**: User corrects End Age to 55, tabs away (blur event)
5. **Transition**:
   - Red border clears
   - Error text fades out
   - User can now click "Add Phase" successfully

---

## Accessibility Notes (from UX Researcher — to be validated)

- **Error messages**: Use ARIA live region (`aria-live="polite"`) for inline validation errors
- **Toast notifications**: Use ARIA live region (`aria-live="assertive"`) for delete confirmation toasts
- **Phase cards**: Each card is a `<div role="article">` with heading (phase name) as `<h4>`
- **Allocation table**: Standard `<table>` with `<thead>` and `<tbody>`, screen readers announce row/column context
- **Chart**: Canvas element with `aria-label` describing the chart + fallback to projection table (table IS the accessible alternative)
- **Colored badges**: Do not rely on color alone — use icon (emoji or SVG) + text label (e.g., "🔴 Underfunded" not just red background)
- **Focus management**: On phase delete, focus returns to previous phase card or "Add Phase" button (not lost to body)
- **Keyboard navigation**: All buttons, inputs, and delete icons are keyboard-accessible (tab order: form fields → Add Phase → phase cards → Edit/Delete per card)

---

## Dark Mode Parity

All elements must render correctly in `body.dark-mode`:

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Panel background | `#ffffff` | `#1e293b` (slate-800) |
| Section group background | `#f8fafc` (slate-50) | `#0f172a` (slate-900) |
| Input field background | `#ffffff` | `#1e293b`, border `#334155` (slate-700) |
| Phase card background | `#ffffff` | `#0f172a` |
| Allocation table header | `#1e40af` (blue-800) | Same (bright accent) |
| Allocation table row background | Alternating white / `#f8fafc` | Alternating `#1e293b` / `#0f172a` |
| Suggestion banner background | `#fee2e2` (red-100) | `#7f1d1d` (red-900), text `#fca5a5` (red-300) |
| Chart canvas | White background | `#1e293b` background, white grid lines → gray |
| Projection table | Same structure as light, darker backgrounds | Same as existing dark mode `.projection-table` |

**Test**: Toggle dark mode while on Multi-Goal tab — no flash of unstyled content, all colors remain readable (WCAG AA contrast).

---

## Next Steps

- **To UX Researcher**: Validate error messages are user-friendly (especially "PV allocation" terminology — is this clear to non-finance users?)
- **To Design System Engineer**: Define phase color palette tokens (6+ colors, light/dark mode variants)
- **To FE Lead**: Copy table is ready for implementation — all button labels, error messages, tooltips, and placeholders defined
