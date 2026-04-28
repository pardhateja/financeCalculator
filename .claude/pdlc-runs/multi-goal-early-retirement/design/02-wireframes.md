# Wireframes — Multi-Goal Age-Phased Early Retirement Planner

**Run:** multi-goal-early-retirement  
**Author:** UI Designer  
**Date:** 2026-04-27

---

## Overview

The Multi-Goal tab extends the existing retirement planner with per-phase expense modeling. Layout follows existing tab patterns: header → summary cards → input form → data visualization → projection table. All wireframes reuse existing component patterns (section groups, summary cards, input rows, tables) per EXTEND-EXISTING design mode.

---

## Screen: Multi-Goal Tab (Desktop, ≥1024px)

**Route**: `#tab-multigoal` (existing hash-based tab navigation)  
**Serves journey step**: *[Will link to UX Researcher's 01-user-journeys.md once available]*  
**Auth required**: No (existing planner is client-side only)  
**Primary action**: Define life phases, validate allocation, review projection

### Wireframe (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header (gradient background, white text)                                   │
│ Multi-Goal Planner                                                          │
│ Plan multiple life-phase expenses with per-phase inflation                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ .panel (white card, border-radius 16px)                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ .section-group (gray background, 4px blue left border)              │   │
│  │ Add Life Phase                                                      │   │
│  │                                                                     │   │
│  │ ┌────────────┬────────────┬────────────┬────────────┬───────────┐  │   │
│  │ │ Phase Name │ Start Age  │ End Age    │ Monthly ₹  │ Inflation%│  │   │
│  │ ├────────────┼────────────┼────────────┼────────────┼───────────┤  │   │
│  │ │ [input]    │ [input]    │ [input]    │ [input]    │ [input]   │  │   │
│  │ │ e.g. Kids  │ e.g. 35    │ e.g. 50    │ e.g. 80000 │ e.g. 6    │  │   │
│  │ │ at Home    │            │            │            │           │  │   │
│  │ └────────────┴────────────┴────────────┴────────────┴───────────┘  │   │
│  │                                                                     │   │
│  │ [Add Phase] button (btn-primary gradient)                          │   │
│  │ [Load Example] button (btn-secondary outline) ← India FIRE 4-phase │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ .section-group.green-accent (green 4px left border)                 │   │
│  │ Your Life Phases (3)                                                │   │
│  │                                                                     │   │
│  │ ┌─────────────────────────────────────────────────────────────┐    │   │
│  │ │ .phase-card (white, 3px blue top border, 12px radius)       │    │   │
│  │ │ ┌─ blue accent bar (4px left)                               │    │   │
│  │ │ │ Kids at Home                              [Edit] [Delete] │    │   │
│  │ │ │ Age 35-50 (15 years)                                      │    │   │
│  │ │ │ ₹80,000/mo · 6% inflation                                 │    │   │
│  │ │ └─                                                           │    │   │
│  │ └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                     │   │
│  │ ┌─────────────────────────────────────────────────────────────┐    │   │
│  │ │ .phase-card (emerald 3px top border, emerald 4px left)      │    │   │
│  │ │ Kids in College                               [Edit] [Delete]│    │   │
│  │ │ Age 50-55 (5 years)                                         │    │   │
│  │ │ ₹1,20,000/mo · 10% inflation                                │    │   │
│  │ │ ⚠️ Overlaps with Kids at Home (age 50)                       │    │   │
│  │ └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                     │   │
│  │ ┌─────────────────────────────────────────────────────────────┐    │   │
│  │ │ .phase-card (amber 3px top border, amber 4px left)          │    │   │
│  │ │ Empty Nest                                    [Edit] [Delete]│    │   │
│  │ │ Age 55-70 (15 years)                                        │    │   │
│  │ │ ₹50,000/mo · 6% inflation                                   │    │   │
│  │ └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                     │   │
│  │ ℹ️ Gap detected: ages 71-100 have no phase coverage (₹0 assumed)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ .section-group.orange-accent                                        │   │
│  │ Allocation Pre-Flight                                               │   │
│  │                                                                     │   │
│  │ ┌──────────────┬──────────┬──────────┬──────────┬──────────────┐   │   │
│  │ │ Phase        │ PV Needed│ Allocated│ Deficit  │ Status       │   │   │
│  │ ├──────────────┼──────────┼──────────┼──────────┼──────────────┤   │   │
│  │ │ Kids at Home │ ₹1.8 cr  │ ₹1.73 cr │ -₹0.07cr │ 🔴 Underfunded│   │   │
│  │ │ Kids College │ ₹0.9 cr  │ ₹0.87 cr │ -₹0.03cr │ 🔴 Underfunded│   │   │
│  │ │ Empty Nest   │ ₹2.5 cr  │ ₹2.40 cr │ -₹0.10cr │ 🔴 Underfunded│   │   │
│  │ ├──────────────┼──────────┼──────────┼──────────┼──────────────┤   │   │
│  │ │ TOTAL        │ ₹5.2 cr  │ ₹5.0 cr  │ -₹0.2 cr │ 🔴 Shortfall  │   │   │
│  │ └──────────────┴──────────┴──────────┴──────────┴──────────────┘   │   │
│  │                                                                     │   │
│  │ ┌─────────────────────────────────────────────────────────────┐    │   │
│  │ │ .suggestion-banner (light red background, red left border)  │    │   │
│  │ │ ⚠️ Your plan is underfunded by ₹20 lakhs. To close the gap:  │    │   │
│  │ │ • Increase monthly SIP by ₹8,500                             │    │   │
│  │ │ • OR reduce "Kids in College" from ₹1.2L to ₹1.08L/mo (10%) │    │   │
│  │ └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Allocation Breakdown (stacked horizontal bar, CSS-only)             │   │
│  │ ┌─────────────────────────────────────────────────────────────┐    │   │
│  │ │███████████████ 34.6% ██████████ 17.3% ████████████████ 48.1%│    │   │
│  │ │ Kids at Home          Kids College      Empty Nest          │    │   │
│  │ │ (blue)                (emerald)         (amber)             │    │   │
│  │ └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ .chart-container                                                    │   │
│  │ ┌───────────────────────────────────────────────────────────────┐  │   │
│  │ │ Canvas chart: Corpus projection over time                     │  │   │
│  │ │ (existing Chart.js chart + phase-shaded vertical regions)     │  │   │
│  │ │                                                                │  │   │
│  │ │   ₹ 6cr ┤                                                      │  │   │
│  │ │   ₹ 5cr ┤━━━━━━━━━━━━━━━━━┓                                   │  │   │
│  │ │   ₹ 4cr ┤                 ┗━━━━━━━━━━━━━━━━━━━━━┓            │  │   │
│  │ │   ₹ 3cr ┤                                       ┗━━━━━━━━━━━┓│  │   │
│  │ │   ₹ 2cr ┤                                                   ┗│  │   │
│  │ │         └──────────────────────────────────────────────────── │  │   │
│  │ │         35  40  45  50  55  60  65  70  75  80  85  90  95 100│  │   │
│  │ │         ├──Kids──┤├College┤├─Empty Nest─┤├─Medical─┤          │  │   │
│  │ │         (blue    (emerald) (amber)      (purple)              │  │   │
│  │ │          tint)                                                 │  │   │
│  │ └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ .projection-table-wrapper (horizontal scroll on mobile)             │   │
│  │ ┌────┬────────────┬────────┬──────────┬────────┬────────┬─────┐   │   │
│  │ │Age │Active Phase│Expense │Corpus    │Withdraw│Growth  │Ended│   │   │
│  │ ├────┼────────────┼────────┼──────────┼────────┼────────┼─────┤   │   │
│  │ │ 35 │🔵 Kids Home│₹9.6L   │₹5.0 cr   │₹9.6L   │₹39.2L  │₹5.3 │   │   │
│  │ │ 50 │🔵🟢 2 phases│₹24.8L  │₹4.8 cr   │₹24.8L  │₹36.0L  │₹4.7 │   │   │
│  │ │ 52 │🟢 College  │₹18.2L  │₹4.1 cr   │₹18.2L  │₹31.4L  │₹4.2 │   │   │
│  │ │ 71 │⚠️ (gap)    │₹0      │₹2.5 cr   │₹0      │₹20.0L  │₹2.7 │   │   │
│  │ │ 100│🟣 Medical  │₹95.6L  │₹15.2L    │₹15.2L  │₹0      │₹0   │   │   │
│  │ └────┴────────────┴────────┴──────────┴────────┴────────┴─────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### States this screen has (must spec each)

#### 1. Empty (no phases configured)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ .section-group.green-accent                                                 │
│ Your Life Phases (0)                                                        │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ .empty-state (centered, gray text)                                  │    │
│ │                                                                     │    │
│ │         📊                                                           │    │
│ │                                                                     │    │
│ │    No phases added yet                                              │    │
│ │    Add your first life phase above,                                 │    │
│ │    or load an example template.                                     │    │
│ │                                                                     │    │
│ │    [Load Example] (btn-primary, prominent)                          │    │
│ │                                                                     │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

(No allocation table, no chart, no projection table — all hidden until at least 1 phase exists)

#### 2. Loading

**Not applicable** — calculation is synchronous. On "Add Phase" click:
- Phase card appears immediately in list (no spinner)
- Allocation table recalculates synchronously (<100ms)
- Chart redraws synchronously
- Projection table rebuilds synchronously

If future version adds async calculation (unlikely given existing planner pattern), use skeleton cards in phase list + skeleton rows in allocation table (not a spinner).

#### 3. Error (validation errors, inline)

Validation errors appear **inline** below the input field with the problem:

```
┌────────────────────────────────────────────────────────────────────┐
│ Add Life Phase                                                     │
│                                                                    │
│ ┌────────────┬────────────┬────────────┬────────────┬───────────┐ │
│ │ Phase Name │ Start Age  │ End Age    │ Monthly ₹  │ Inflation%│ │
│ ├────────────┼────────────┼────────────┼────────────┼───────────┤ │
│ │ [Kids Home]│ [50]       │ [45] ⚠️    │ [80000]    │ [6]       │ │
│ │            │            │ ▲          │            │           │ │
│ │            │            │ End age must be        │           │ │
│ │            │            │ greater than start age │           │ │
│ └────────────┴────────────┴────────────┴────────────┴───────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

Other validation errors (per 02-screen-specs.md):
- Inflation < 0 or > 25 → red text below input
- Monthly expense ≤ 0 → red text below input
- Overlap warning → informational badge on phase card (amber, not blocking)
- Gap warning → informational banner below phase list (blue, not blocking)

#### 4. Success (≥1 phase, fully funded)

Green `.health-indicator.good` badge appears at top of allocation section:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Allocation Pre-Flight                            🟢 All phases funded│
│ ┌──────────────┬──────────┬──────────┬──────────┬──────────────┐   │
│ │ Phase        │ PV Needed│ Allocated│ Surplus  │ Status       │   │
│ ├──────────────┼──────────┼──────────┼──────────┼──────────────┤   │
│ │ Kids at Home │ ₹1.8 cr  │ ₹1.85 cr │ +₹0.05cr │ 🟢 Funded     │   │
│ │ Empty Nest   │ ₹2.5 cr  │ ₹2.65 cr │ +₹0.15cr │ 🟢 Funded     │   │
│ ├──────────────┼──────────┼──────────┼──────────┼──────────────┤   │
│ │ TOTAL        │ ₹4.3 cr  │ ₹4.5 cr  │ +₹0.2 cr │ 🟢 Surplus    │   │
│ └──────────────┴──────────┴──────────┴──────────┴──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

No suggestion banner. Allocation bar shows all phases in color. Projection table shows no depletion.

#### 5. Success (≥1 phase, deficit — AC6 scenario)

Red `.health-indicator.bad` badge + suggestion banner (shown in main wireframe above).

### Responsive behavior

#### Desktop (≥1024px)
- Two-column layout for panels (if multiple panels in future)
- Phase input form: 5-column grid (Name | Start | End | Monthly | Inflation)
- Phase cards: single column, full width
- Allocation table: all columns visible, no scroll
- Allocation bar: horizontal, full width
- Chart: 800px width, full container
- Projection table: horizontal scroll if >8 columns

#### Tablet (768-1023px)
- Single-column panels
- Phase input form: 3 rows:
  - Row 1: Phase Name (full width)
  - Row 2: Start Age | End Age
  - Row 3: Monthly ₹ | Inflation %
- Phase cards: same as desktop (full width)
- Allocation table: horizontal scroll
- Allocation bar: horizontal, full width
- Chart: 600px width
- Projection table: horizontal scroll

#### Mobile (<768px)
- Phase input form: 5 rows (each field full width, stacked vertically)
- Phase cards: same as desktop, but taller (metadata stacks)
- Allocation table: horizontal scroll with sticky "Phase" column (left-pinned)
- Allocation bar: becomes **vertical stacked bar** (top to bottom: Phase 1 segment, Phase 2, etc.)
- Chart: 350px width, touch-pan enabled
- Projection table: collapses to card view (one card per year row, all fields vertical)

**Touch targets**: All buttons ≥44px height. Input fields ≥48px height. Delete icon buttons ≥36px tap area.

---

## Component Reuse Map

| New element | Existing component pattern | File reference |
|---|---|---|
| Phase input form | `.input-row-3` grid | tab-goals.html `.input-row-3` |
| Phase card | `.summary-card` with colored top border | tab-projections.html `.summary-card` |
| Allocation table | `.inv-table` structure | tab-financial-plan.html `.inv-table` |
| Suggestion banner | `.health-indicator` but block-level | tab-dashboard.html `.health-indicator` |
| Allocation bar | Custom CSS grid/flexbox (no existing match) | NEW — CSS-only, no Chart.js |
| Chart with phase shading | Extend existing Chart.js canvas | tab-projections.html `#projectionChart` |
| Projection table | `.projection-table` + new "Active Phase" column | tab-projections.html `.projection-table` |

---

## Navigation Integration

**Tab button** (added to existing nav row):

```html
<button class="tab-btn" data-tab="multigoal">Multi-Goal</button>
```

Insert position: Between "Goals" and "Emergency" tabs (existing tab order: Basics → Expenses → Savings → Income → Projections → Dashboard → What-If → Goals → **[NEW: Multi-Goal]** → Emergency → ...).

Active state: Same as existing tabs (white background, blue text, rounded top corners).

---

## Next Steps

- **From Design System Engineer**: Extract/define tokens for phase color palette (6 colors minimum: blue, emerald, amber, purple, teal, pink — cycling pattern)
- **To FE Lead**: Each wireframe element maps to a task (e.g., "Build phase input form", "Build allocation table", "Extend Chart.js with phase shading")
- **To UX Researcher**: Validate phase card information hierarchy matches user mental model (phase name most prominent, age range secondary, expense + inflation tertiary)
