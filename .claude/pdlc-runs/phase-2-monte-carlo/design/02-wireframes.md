# Wireframes — Phase 2 Monte Carlo Stress Test

**Run:** phase-2-monte-carlo  
**Author:** UI Designer  
**Date:** 2026-04-30

---

## Overview

Phase 2 extends the existing Projections tab with a probabilistic "Stress Test" view. A toggle at the top switches between the existing "Ideal Scenario" (deterministic year-by-year table) and the new "Stress Test (Monte Carlo)" view showing success probability by age. All wireframes follow brownfield-extend mode: reuse existing `.summary-card`, `.chart-container`, `.panel`, and `.projection-table-wrapper` patterns from Phase 1.

---

## Screen: Projections Tab — Default State (Ideal Scenario Selected)

**Route**: `#tab-projections` (existing hash-based tab navigation)  
**Serves journey step**: *[Will link to UX Researcher's 01-user-journeys.md once available]*  
**Auth required**: No (existing planner is client-side only)  
**Primary action**: Review deterministic projection OR toggle to stress test

### Wireframe (Desktop, ≥1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│ .panel (white card, 16px border-radius)                             │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .segmented-control (iOS-style toggle, 400px wide)             │ │
│  │ ┌─────────────────────┬─────────────────────────────────────┐ │ │
│  │ │ ◉ Ideal Scenario    │ Stress Test (Monte Carlo)           │ │ │
│  │ │ (white bg, shadow,  │ (gray bg, gray text, inactive)      │ │ │
│  │ │  blue text, active) │                                     │ │ │
│  │ └─────────────────────┴─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .projection-summary (existing 4 summary cards)                │ │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │ │ Corpus   │ │ Years    │ │ Years in │ │ Runs Out │          │ │
│  │ │ ₹5.2 cr  │ │ Earning  │ │ Retire   │ │ Age 87   │          │ │
│  │ │ (green)  │ │ 25       │ │ 40 (warn)│ │ (red)    │          │ │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .chart-container (existing Chart.js line chart)               │ │
│  │ ┌─────────────────────────────────────────────────────────┐  │ │
│  │ │ Canvas: Corpus projection over time (blue line)         │  │ │
│  │ │   ₹ 6cr ┤                                                │  │ │
│  │ │   ₹ 5cr ┤━━━━━━━━━━━━━━━━━┓                            │  │ │
│  │ │   ₹ 4cr ┤                 ┗━━━━━━━━━━━━━━┓            │  │ │
│  │ │   ₹ 2cr ┤                                ┗━━━━━━━━━━━┓│  │ │
│  │ │         └────────────────────────────────────────────── │  │ │
│  │ │         35   45   55   65   75   85   95   100        │  │ │
│  │ └─────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .projection-table-wrapper (existing year-by-year table)       │ │
│  │ ┌────┬─────────┬───────────┬────────┬────────┬────────┐      │ │
│  │ │Age │Starting │Annual Save│Growth  │Ending  │Status  │      │ │
│  │ ├────┼─────────┼───────────┼────────┼────────┼────────┤      │ │
│  │ │ 35 │₹0       │₹12L       │₹0.96L  │₹12.96L │Building│      │ │
│  │ │ 55 │₹3.8cr   │₹12L       │₹30.4L  │₹4.23cr │Building│      │ │
│  │ │ 60 │₹5.0cr   │₹0         │₹40.0L  │₹5.4cr  │Retired │      │ │
│  │ │ 87 │₹15L     │₹0         │₹0      │₹0      │Depleted│      │ │
│  │ └────┴─────────┴───────────┴────────┴────────┴────────┘      │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**User sees:** Toggle at top with "Ideal Scenario" active (raised white button with shadow). Below that, all existing Phase 1 Projections tab content (summary cards, Chart.js line chart, year-by-year table) renders unchanged.

**Interactive:** Toggle is clickable. Clicking "Stress Test (Monte Carlo)" triggers simulation start (see Section 2).

**Data bound:** Toggle state persists in localStorage key `rp_projection_view` (default `'ideal'`).

**Animation:** None on this screen — static display of existing deterministic projection.

---

## Screen: Projections Tab — Stress Test Running

```
┌─────────────────────────────────────────────────────────────────────┐
│ .panel                                                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .segmented-control                                            │ │
│  │ ┌─────────────────────┬─────────────────────────────────────┐ │ │
│  │ │ Ideal Scenario      │ ◉ Stress Test (Monte Carlo)         │ │ │
│  │ │ (gray, inactive)    │ (white bg, shadow, blue, active)    │ │ │
│  │ └─────────────────────┴─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .progress-container (NEW component)                           │ │
│  │                                                                │ │
│  │  Running Monte Carlo Simulation...                            │ │
│  │                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │███████████████████████████────────────────────────────  │  │ │
│  │  │ 62%                                                      │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  4,237 of 10,000 simulations complete                         │ │
│  │                                                                │ │
│  │  [Cancel] (btn-secondary, 120px wide, 44px height)            │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  (Existing summary cards, chart, and table are HIDDEN)            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**User sees:** Toggle switched to "Stress Test (Monte Carlo)". Below that, a progress bar showing simulation progress. All existing Projections content (summary cards, Chart.js chart, year-by-year table) is hidden while simulation runs.

**Interactive:** 
- Progress bar updates ~10x/second (every 1000 sims or every 500ms, whichever is more frequent)
- Cancel button aborts the Web Worker, returns toggle to "Ideal Scenario", shows brief toast "Simulation cancelled"
- User can navigate to other tabs (Calculator, Dashboard, etc.) while simulation continues in background — progress persists via Web Worker

**Data bound:** 
- Progress bar fill width: `(completedSims / totalSims) * 100%`
- Progress text: `completedSims` and `totalSims` from Worker postMessage updates
- Cancel sends `{type: 'CANCEL'}` to Worker

**Animation:** 
- Progress bar fill animates smoothly (CSS transition `width 0.3s ease-out`)
- Count text updates every 500ms (no animation, just text replacement)

---

## Screen: Projections Tab — Stress Test Results (Green Plan)

```
┌─────────────────────────────────────────────────────────────────────┐
│ .panel                                                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .segmented-control                                            │ │
│  │ ┌─────────────────────┬─────────────────────────────────────┐ │ │
│  │ │ Ideal Scenario      │ ◉ Stress Test (Monte Carlo)         │ │ │
│  │ │ (gray, inactive)    │ (white bg, shadow, blue, active)    │ │ │
│  │ └─────────────────────┴─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .callout-box.success (light green bg, green left border, 4px)│ │
│  │ ✓ Your plan looks solid until age 95                         │ │
│  │   In 85% of scenarios, you still have money at 95.           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .chart-container                                              │ │
│  │ Success Rate by Age                                           │ │
│  │                                                                │ │
│  │  100% ┤████ ████ ████ ████ ████ ███▓                          │ │
│  │   90% ┤                                                        │ │
│  │   80% ┤                                                        │ │
│  │   70% ┤                                                        │ │
│  │   60% ┤                                                        │ │
│  │   50% ┤                                                        │ │
│  │       └──────────────────────────────────────────             │ │
│  │        70   75   80   85   90   95  100                       │ │
│  │       (All bars green ≥85% except age 100: 82% blue)          │ │
│  │                                                                │ │
│  │  Tooltips on hover: "Age 70: 99% success (9,890 of 10,000)"  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .chart-container                                              │ │
│  │ Projected Corpus Range (P10 / P50 / P90)                      │ │
│  │                                                                │ │
│  │   ₹8cr ┤                                                       │ │
│  │   ₹6cr ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ← P90 (top edge)       │ │
│  │   ₹5cr ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← P50 (median)│ │
│  │   ₹4cr ┤━━━━━━━━━━━━━━━━━━━━━━━┓     ← P10 (bottom edge)    │ │
│  │   ₹2cr ┤                       ┗━━━━━━━━━━━━━━━━━━━━━━━━━┓  │ │
│  │        └────────────────────────────────────────────────────  │ │
│  │        60   65   70   75   80   85   90   95  100            │ │
│  │        (Shaded band between P10 and P90, narrow = low var)   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ [Show data table] (toggle, collapsed by default)             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Last run: 4.2s (10,000 simulations)                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**User sees:** Toggle on "Stress Test". Green callout box with plain-English summary ("solid until 95"). Two charts: (1) bar chart showing success% at each age (all green/blue, no red/amber), (2) line chart with confidence band (narrow band = consistent outcomes).

**Interactive:** 
- Bars: hover shows tooltip with exact % and count
- Line chart: hover shows P10/P50/P90 corpus values at that age
- "Show data table" toggle expands accessibility table below charts (collapsed by default to reduce clutter)
- Clicking "Ideal Scenario" toggle returns to existing projection view (instant, no re-simulation)

**Data bound:** 
- Bar heights: success% per age from MC results array
- Bar colors: thresholds per B3 (≥85% green, 75-84% blue, 50-74% amber, <50% red)
- Line chart: P10/P50/P90 corpus trajectories from MC percentile calculation
- Callout heading: auto-generated from worst age with ≥85% success ("solid until X")

**Animation:** 
- Charts fade in (300ms opacity 0→1) after simulation completes
- Callout slides in from top (200ms translateY -20px→0)

---

## Screen: Projections Tab — Stress Test Results (Risky Plan)

```
┌─────────────────────────────────────────────────────────────────────┐
│ .panel                                                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .segmented-control (same as Section 3)                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .callout-box.danger (light red bg, red left border, 4px)      │ │
│  │ ⚠ Risky after age 80, likely fails after 90                   │ │
│  │   At age 80: only 68% success.                                │ │
│  │   At age 90: only 42% success.                                │ │
│  │                                                                │ │
│  │   [Adjust Investment →] (btn-primary, links to Calculator tab)│ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .chart-container                                              │ │
│  │ Success Rate by Age                                           │ │
│  │                                                                │ │
│  │  100% ┤████ ████ ████ ▓▓▓▓ ▒▒▒▒ ░░░░                          │ │
│  │   90% ┤                                                        │ │
│  │   80% ┤                                                        │ │
│  │   70% ┤                 ▼                                      │ │
│  │   60% ┤                                                        │ │
│  │   50% ┤                               ▼                        │ │
│  │   40% ┤                                                        │ │
│  │       └──────────────────────────────────────────             │ │
│  │        70   75   80   85   90   95  100                       │ │
│  │       Green Green Green Amber Amber Red  Red                  │ │
│  │       (99%) (96%) (93%) (68%) (52%) (42%)(38%)                │ │
│  │                                                                │ │
│  │  Color breakdown: ≥85% green, 75-84% blue, 50-74% amber,      │ │
│  │                   <50% red (per B3 thresholds)                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .chart-container                                              │ │
│  │ Projected Corpus Range (P10 / P50 / P90)                      │ │
│  │                                                                │ │
│  │   ₹8cr ┤                                                       │ │
│  │   ₹6cr ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ← P90              │ │
│  │   ₹4cr ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← P50   │ │
│  │   ₹2cr ┤━━━━━━━━━━━━━━━━┓                 ▼                   │ │
│  │   ₹0   ┤                ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← P10 │ │
│  │        └────────────────────────────────────────────────────  │ │
│  │        60   65   70   75   80   85   90   95  100            │ │
│  │        (Wide shaded band = high variance; P10 hits 0 at 85)  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .suggestion-banner (light amber bg, amber left border)        │ │
│  │ 💡 To reach 85% confidence at age 90:                         │ │
│  │    • Increase monthly SIP by ₹12,500                          │ │
│  │    • OR reduce retirement expenses by 8% (₹6,400/mo)          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [Show data table] (toggle, collapsed by default)                │
│                                                                     │
│  Last run: 5.8s (10,000 simulations)                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**User sees:** Toggle on "Stress Test". Red callout box with warning ("risky after 80") + CTA button. Bar chart shows color gradient from green (early ages) to red (late ages). Line chart shows wide confidence band (P10 hits zero before life expectancy). Suggestion banner below with actionable fixes.

**Interactive:** 
- "Adjust Investment →" button navigates to `#tab-income`, auto-focuses `monthlyInvestment` input, pre-fills +₹12,500 suggestion (user can accept or modify)
- Bars and line chart: same hover tooltips as Section 3
- "Show data table" toggle: same as Section 3

**Data bound:** 
- Callout thresholds: first age with <75% success ("risky after X"), first age with <50% success ("likely fails after Y")
- Bar colors: auto-assigned per B3 thresholds
- Suggestion calculation: binary search to find minimum SIP increase to reach 85% success at target age (e.g., 90), capped at +50% current SIP

**Animation:** 
- Same fade-in as Section 3
- Callout box uses `.danger` variant (red accent) instead of `.success` (green)

---

## Screen: Projections Tab — Empty State

```
┌─────────────────────────────────────────────────────────────────────┐
│ .panel                                                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .segmented-control                                            │ │
│  │ ┌─────────────────────┬─────────────────────────────────────┐ │ │
│  │ │ Ideal Scenario      │ ◉ Stress Test (Monte Carlo)         │ │ │
│  │ │ (gray, inactive)    │ (white bg, shadow, blue, active)    │ │ │
│  │ └─────────────────────┴─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .empty-state (centered, gray bg card, 16px radius)           │ │
│  │                                                                │ │
│  │                   📊                                           │ │
│  │                                                                │ │
│  │            Configure your retirement plan first               │ │
│  │                                                                │ │
│  │   Monte Carlo stress testing requires:                        │ │
│  │   • Retirement age                                            │ │
│  │   • Life expectancy                                           │ │
│  │   • Current savings OR monthly investment                     │ │
│  │                                                                │ │
│  │   [Go to Calculator →] (btn-primary, 180px wide, 48px tall)   │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**User sees:** Toggle on "Stress Test". Gray placeholder card with emoji, heading, bulleted requirements, and CTA button. No charts, no summary cards.

**Interactive:** 
- "Go to Calculator →" button navigates to `#tab-calculator` (existing tab)
- Clicking "Ideal Scenario" toggle shows empty state for that view too (existing Phase 1 behavior — shows empty projection table with message "Enter your details in the Calculator tab")

**Data bound:** 
- Empty state appears when: `retirementAge` is null OR `lifeExpectancy` is null OR (`currentSavings` === 0 AND `monthlyInvestment` === 0)
- Condition checked on toggle click AND on initial Projections tab load

**Animation:** 
- Empty state fades in (200ms opacity 0→1)
- No skeleton loading (empty state is instant)

---

## Screen: Projections Tab — Error State

```
┌─────────────────────────────────────────────────────────────────────┐
│ .panel                                                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .toast.danger (red bg, white text, fixed top-center, 600px w)│ │
│  │ ✕ Simulation failed. Please refresh the page and try again.  │ │
│  │   [Dismiss ✕] (text button, white, right-aligned)            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .segmented-control                                            │ │
│  │ ┌─────────────────────┬─────────────────────────────────────┐ │ │
│  │ │ Ideal Scenario      │ ◉ Stress Test (Monte Carlo)         │ │ │
│  │ │ (gray, inactive)    │ (white bg, shadow, blue, active)    │ │ │
│  │ └─────────────────────┴─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .chart-container (previous MC results, if any, shown faded)   │ │
│  │ ┌─────────────────────────────────────────────────────────┐  │ │
│  │ │ (Previous bar chart, 50% opacity, grayed out)           │  │ │
│  │ │ (Shows last successful run, if available)               │  │ │
│  │ └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │ ┌─────────────────────────────────────────────────────────┐  │ │
│  │ │ .error-overlay (centered, red border, white bg, 400px w)│  │ │
│  │ │                                                          │  │ │
│  │ │   ⚠ Simulation Error                                     │  │ │
│  │ │                                                          │  │ │
│  │ │   The Monte Carlo engine encountered an error.          │  │ │
│  │ │   This may be caused by:                                │  │ │
│  │ │   • Invalid input values                                │  │ │
│  │ │   • Browser memory constraints                          │  │ │
│  │ │                                                          │  │ │
│  │ │   [Try Again] (btn-primary, 120px w, re-runs simulation)│  │ │
│  │ │   [Back to Ideal Scenario] (btn-secondary, 200px w)     │  │ │
│  │ │                                                          │  │ │
│  │ └─────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**User sees:** Toggle on "Stress Test". Red toast at top of screen (auto-dismisses after 8s). Previous MC charts (if any) shown at 50% opacity, grayed out. Centered error overlay with two action buttons.

**Interactive:** 
- Toast "Dismiss" button closes toast immediately
- "Try Again" button re-runs simulation with same inputs (clears error state first)
- "Back to Ideal Scenario" button switches toggle to "Ideal Scenario", hides error overlay, shows deterministic projection
- Error overlay is modal-style (dims background, traps focus until button clicked)

**Data bound:** 
- Error triggered by: Worker postMessage `{type: 'ERROR', message: '...'}` OR Worker crashes (no response after 30s timeout)
- Previous results: if error occurs on 2nd+ run, show previous successful run's charts (faded); if error on 1st run, show empty state instead of faded charts
- Console logs error details for debugging: `console.error('MC simulation failed:', error.message)`

**Animation:** 
- Toast slides down from top (300ms translateY -100%→0)
- Error overlay fades in + scales in (200ms, scale 0.95→1)
- Previous charts fade to 50% opacity (300ms)

---

## Screen: Projections Tab — Cancel Mid-Simulation

```
┌─────────────────────────────────────────────────────────────────────┐
│ .panel                                                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .toast.info (blue bg, white text, fixed top-center, 400px w)  │ │
│  │ ℹ Simulation cancelled                                        │ │
│  │   (Auto-dismisses after 3s)                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .segmented-control                                            │ │
│  │ ┌─────────────────────┬─────────────────────────────────────┐ │ │
│  │ │ ◉ Ideal Scenario    │ Stress Test (Monte Carlo)           │ │ │
│  │ │ (white bg, active)  │ (gray bg, inactive)                 │ │ │
│  │ └─────────────────────┴─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ .projection-summary (existing 4 summary cards, restored)      │ │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │ │ Corpus   │ │ Years    │ │ Years in │ │ Runs Out │          │ │
│  │ │ ₹5.2 cr  │ │ Earning  │ │ Retire   │ │ Age 87   │          │ │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  (Existing Chart.js chart and projection table restored below)    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**User sees:** Brief blue toast at top ("Simulation cancelled"). Toggle automatically returns to "Ideal Scenario" (active left segment). All existing Phase 1 Projections content (summary cards, Chart.js chart, year-by-year table) restores instantly.

**Interactive:** 
- Toast auto-dismisses after 3 seconds (no dismiss button needed — non-blocking info toast)
- User can immediately click "Stress Test (Monte Carlo)" toggle again to restart simulation
- Cancel action does NOT cache partial results — next simulation starts from scratch

**Data bound:** 
- Cancel triggered by: user clicking Cancel button during simulation (see Section 2)
- Worker receives `{type: 'CANCEL'}` postMessage, terminates gracefully, sends ACK `{type: 'CANCELLED'}`
- Toggle state in localStorage reverts to `'ideal'`

**Animation:** 
- Toast slides down from top (200ms translateY -100%→0), auto-slides up after 3s (200ms translateY 0→-100%)
- Toggle active segment slides from right to left (200ms, smooth position transition)
- Existing Projections content fades in (150ms opacity 0→1)

---

## Screen: Projections Tab — Mobile Layout (375px)

```
┌──────────────────────────────────────┐  (375px wide viewport)
│ .panel                               │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ .segmented-control.mobile      │ │
│  │ (vertical stack, full width)   │ │
│  │ ┌────────────────────────────┐ │ │
│  │ │ ◉ Ideal Scenario           │ │ │
│  │ │ (white bg, shadow, active) │ │ │
│  │ │ 48px height                │ │ │
│  │ └────────────────────────────┘ │ │
│  │ ┌────────────────────────────┐ │ │
│  │ │ Stress Test (Monte Carlo)  │ │ │
│  │ │ (gray bg, inactive)        │ │ │
│  │ │ 48px height                │ │ │
│  │ └────────────────────────────┘ │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ .callout-box.danger (mobile)   │ │
│  │ ⚠ Risky after 80,              │ │
│  │   likely fails after 90        │ │
│  │                                │ │
│  │ [Adjust Investment →]          │ │
│  │ (full width, 48px height)      │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ .chart-container.mobile        │ │
│  │ Success by Age (350px w)       │ │
│  │                                │ │
│  │ 100% ┤██ ██ ██ ▓▓ ▒▒ ░░        │ │
│  │  90% ┤                          │ │
│  │  70% ┤                          │ │
│  │  50% ┤                          │ │
│  │      └─────────────────         │ │
│  │      70 75 80 85 90 95 100     │ │
│  │      (age labels below bars,   │ │
│  │       bars 40px wide, 8px gap) │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ .chart-container.mobile        │ │
│  │ Corpus Range (350px w × 300px) │ │
│  │                                │ │
│  │  ₹6cr ┤━━━━━━━━━━━━━━━┓        │ │
│  │  ₹4cr ┤━━━━━━━━━━━━━━━━━━━━    │ │
│  │  ₹2cr ┤━━━━━━┓   ▼             │ │
│  │  ₹0   ┤      ┗━━━━━━━━━━━━     │ │
│  │       └─────────────────        │ │
│  │       60  70  80  90 100       │ │
│  │       (Y-axis 10px font,       │ │
│  │        narrower padding)       │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ [Show data table] (toggle)     │ │
│  │ (expands to card view below)   │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ .data-table-cards (if expanded)│ │
│  │ ┌────────────────────────────┐ │ │
│  │ │ Age 70                     │ │ │
│  │ │ Success Rate: 99%          │ │ │
│  │ │ Risk Level: Safe           │ │ │
│  │ │ (9,890 of 10,000 sims)     │ │ │
│  │ └────────────────────────────┘ │ │
│  │ ┌────────────────────────────┐ │ │
│  │ │ Age 80                     │ │ │
│  │ │ Success Rate: 68%          │ │ │
│  │ │ Risk Level: Risky          │ │ │
│  │ │ (6,800 of 10,000 sims)     │ │ │
│  │ └────────────────────────────┘ │ │
│  │ (one card per age, stacked)  │ │
│  └────────────────────────────────┘ │
│                                      │
│  Last run: 5.8s                    │
│                                      │
└──────────────────────────────────────┘
```

**User sees:** Toggle stacks vertically (two full-width buttons). Callout box narrows, text reflows. Charts shrink to 350px width. Bar chart bars narrow to 40px with 8px gaps. Line chart Y-axis labels shrink to 10px font. Data table (if shown) becomes vertical card layout instead of horizontal scroll table.

**Interactive:** 
- Toggle buttons: 48px height (iOS minimum touch target)
- Charts: touch-pan enabled (swipe left/right to see age labels if overflow)
- "Show data table" expands card view (not horizontal table) — easier to read on mobile
- All CTA buttons: full width, 48px height

**Data bound:** 
- Same data as desktop (Sections 3-4), just responsive layout changes
- Card view: one card per age row, all fields stack vertically (Age → Success Rate → Risk Level → Count)

**Animation:** 
- Toggle segment active state: slides vertically (200ms) instead of horizontally
- Chart touch-pan: native browser smooth scroll behavior
- Data table cards: accordion-style expand (300ms max-height 0→auto)

---

## Component Reuse Map

| New element | Existing component pattern | File reference |
|---|---|---|
| Segmented control toggle | NEW component (iOS-style) | None — extends Phase 1 forms.css |
| Progress bar | NEW component (track + fill + text) | None — NEW pattern |
| Callout box | `.health-indicator` extended to block layout | tab-dashboard.html `.health-indicator` |
| Monte Carlo bar chart | NEW chart (Canvas 2D custom, NOT Chart.js) | None — NEW visualization |
| Monte Carlo line chart | NEW chart (Canvas 2D custom, NOT Chart.js) | None — NEW visualization |
| Data table fallback | `.projection-table` structure | tab-projections.html `.projection-table` |
| Existing summary cards | `.summary-card` (untouched) | tab-projections.html `.projection-summary` |
| Existing year-by-year table | `.projection-table` (untouched when toggle = Ideal) | tab-projections.html `.projection-table-wrapper` |

---

## Responsive Behavior (All States)

### Desktop (≥1024px)
- Toggle: horizontal segmented control, 2 segments side-by-side, ~400px wide
- Charts: 800px width, full container
- Bar chart: bars ~60px wide, 12px gap between
- Line chart: 800px × 400px
- Data table: horizontal scroll if needed, sticky "Age" column

### Tablet (768-1023px)
- Toggle: horizontal, scales to 90% container width (~600px)
- Charts: 600px width
- Bar chart: bars ~48px wide, 10px gap
- Line chart: 600px × 350px
- Data table: horizontal scroll, sticky "Age" column

### Mobile (<768px)
- Toggle: vertical stack (two buttons, full width each, 48px height)
- Charts: 350px width (touch-pan enabled)
- Bar chart: bars ~40px wide, 8px gap, age labels stack below bars (vertical text)
- Line chart: 350px × 300px, Y-axis labels shrink to 10px font
- Data table: collapses to card view (one card per age row, all fields vertical)

**Touch targets**: All interactive elements ≥44px tap area (iOS HIG). Cancel button during simulation ≥48px height.

---

## Next Steps

- **From Design System Engineer**: Extract tokens for segmented control, progress bar, callout box variants, chart color thresholds
- **To FE Lead**: Each wireframe state maps to implementation phases (e.g., "Build segmented control", "Build Web Worker + progress UI", "Render bar chart")
- **To UX Researcher**: Validate plain-English thresholds ("great until 80, risky after") match user mental model for risk communication
