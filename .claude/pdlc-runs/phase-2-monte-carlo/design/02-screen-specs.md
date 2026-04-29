# Screen Specs — Phase 2 Monte Carlo Stress Test

**Run:** phase-2-monte-carlo  
**Author:** UI Designer  
**Date:** 2026-04-30

---

## Overview

Companion to 02-wireframes.md. Specifies copy, microcopy, error messages, component behavior, and edge cases for all new UI elements introduced in Phase 2. All specs trace back to brownfield-extend mode: reuse existing Phase 1 patterns where possible.

---

## Component: SegmentedControl (Toggle)

### HTML Structure (Reference)

```html
<div class="segmented-control" role="tablist">
  <button 
    role="tab" 
    aria-selected="true" 
    aria-controls="ideal-scenario-panel"
    data-view="ideal"
    class="segment-button active">
    Ideal Scenario
  </button>
  <button 
    role="tab" 
    aria-selected="false" 
    aria-controls="montecarlo-panel"
    data-view="montecarlo"
    class="segment-button">
    Stress Test (Monte Carlo)
  </button>
</div>
```

### Copy

| Element | Text | Notes |
|---------|------|-------|
| Left segment | "Ideal Scenario" | Sentence case (not "Ideal scenario") — "Ideal" is capitalized like a proper noun |
| Right segment | "Stress Test (Monte Carlo)" | Parenthetical clarifies the method for power users; casuals can ignore |

### States

| State | Visual | Behavior |
|-------|--------|----------|
| Active (left) | White background, blue text (#2563eb), subtle shadow (0 1px 3px rgba(0,0,0,0.12)), font-weight 600 | Non-interactive (already selected) |
| Inactive (left) | Gray background (#f8fafc), gray text (#64748b), no shadow, font-weight 400 | Clickable — switches to Ideal view |
| Active (right) | Same as active left | Triggers MC simulation on click (if not already run) OR shows cached results (if run within last input change) |
| Inactive (right) | Same as inactive left | Clickable — switches to MC view |
| Focus (keyboard) | 2px blue outline (Phase 1 focus pattern), 4px offset | Tab key navigates left→right, Enter/Space activates |
| Hover | Inactive segment: darken background to #e2e8f0 | Cursor: pointer |
| Disabled | Opacity 0.5, cursor: not-allowed | NOT USED in v1 (toggle always interactive) |

### Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| ≥768px | Horizontal: two segments side-by-side, 200px each, total 400px width, centered in container |
| <768px | Vertical stack: each segment full width (100%), 48px height each, 4px gap between |

### Accessibility

- `role="tablist"` on container, `role="tab"` on buttons
- `aria-selected="true"` on active segment, `false` on inactive
- `aria-controls` links to panel ID (screen reader users hear "controls ideal scenario panel")
- Keyboard: Left/Right arrow keys navigate between segments (in addition to Tab)
- Announce on switch: "Switched to Stress Test view, running simulation" (via live region, see Microcopy section)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Click active segment | No-op (don't re-run simulation, don't flicker) |
| Click MC segment when inputs invalid | Show empty state (see wireframe Section 5), don't run simulation |
| Click MC segment while previous MC still running | Cancel previous simulation, start new one (500ms debounce to avoid double-click race) |
| User changes input (e.g., retirementAge) while viewing MC results | Stale results: show amber banner above charts "Inputs changed — results may be outdated. [Re-run Simulation]" button |

---

## Component: ProgressBar (Simulation Running)

### HTML Structure (Reference)

```html
<div class="progress-container">
  <h3 class="progress-heading">Running Monte Carlo Simulation...</h3>
  <div class="progress-bar-track">
    <div class="progress-bar-fill" style="width: 62%;">
      <span class="progress-percent">62%</span>
    </div>
  </div>
  <p class="progress-count">4,237 of 10,000 simulations complete</p>
  <button class="btn-secondary cancel-simulation">Cancel</button>
</div>
```

### Copy

| Element | Text | Notes |
|---------|------|-------|
| Heading | "Running Monte Carlo Simulation..." | Ellipsis indicates ongoing action |
| Percent text | "62%" (dynamic) | Integer only, no decimal (too noisy during fast updates) |
| Count text | "4,237 of 10,000 simulations complete" | Thousands separator (comma) for readability |
| Cancel button | "Cancel" | Short, action verb. NOT "Stop" or "Abort" |

### Visual Specs

| Element | Dimensions | Colors |
|---------|------------|--------|
| Track | 100% width, 32px height, 16px border-radius | Light gray background (#e2e8f0) |
| Fill | Width = (completed / total) × 100%, 32px height, 16px border-radius (left only) | Blue gradient (#2563eb → #3b82f6), matches Phase 1 btn-primary gradient |
| Percent text | Inside fill bar, 14px font, white color, centered vertically, 8px left padding | Font-weight 600 |
| Count text | Below track, 13px font, gray (#64748b), centered | Font-weight 400 |
| Cancel button | 120px width, 44px height, 8px border-radius | Phase 1 btn-secondary style (white bg, blue border, blue text) |

### Update Frequency

- Progress updates every **500ms OR every 1000 simulations**, whichever is MORE frequent
- Rationale: 10K sims in 5s = 2000 sims/sec → update every 1000 sims = 2 updates/sec (smooth but not frantic)
- If simulation runs slower (e.g., 1000 sims/sec on slower device), 500ms floor ensures UI doesn't freeze

### States

| State | Behavior |
|-------|----------|
| Initial (0%) | Fill width 0%, percent text "0%", count "0 of 10,000" — flashes briefly (<100ms) before first update |
| Running (1-99%) | Fill animates smoothly (CSS transition `width 0.3s ease-out`), percent and count update in sync |
| Completing (100%) | Fill width 100%, percent "100%", count "10,000 of 10,000" — holds for 200ms, then fades out and charts fade in |
| Cancelled (user clicks Cancel) | Fill freezes at current %, entire container fades out (300ms opacity 1→0), toggle returns to "Ideal Scenario" |

### Accessibility

- `role="progressbar"` on track, `aria-valuenow` (0-100), `aria-valuemin="0"`, `aria-valuemax="100"`
- Live region announces progress at 25%, 50%, 75%, 100%: "Simulation 50% complete" (not every update — too noisy)
- Cancel button: `aria-label="Cancel simulation"` (redundant with visible text, but explicit for screen readers)
- Focus: Cancel button receives focus on simulation start (so user can quickly hit Enter to cancel if needed)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Simulation completes faster than first 500ms update | Jump directly from 0% to 100%, skip intermediate states — acceptable (means device is fast) |
| User navigates to another tab mid-simulation | Progress bar hidden (tab inactive), but Worker continues in background. If user returns, progress bar re-appears at current % |
| Browser throttles inactive tab (setTimeout delays) | Worker NOT throttled (Web Workers immune to tab throttling). Progress updates may batch (e.g., 10% → 40% jump) but Worker completes on time |
| Simulation stalls (Worker freezes) | After 30s timeout, show error state (see wireframe Section 6), kill Worker |

---

## Component: CalloutBox (Result Summary)

### HTML Structure (Reference)

```html
<div class="callout-box success"> <!-- or .danger, .warning, .info -->
  <div class="callout-icon">✓</div> <!-- or ⚠, ℹ -->
  <div class="callout-content">
    <h4 class="callout-heading">Your plan looks solid until age 95</h4>
    <p class="callout-body">In 85% of scenarios, you still have money at 95.</p>
    <button class="btn-primary callout-cta">Adjust Investment →</button> <!-- optional -->
  </div>
</div>
```

### Variants (4 Types)

| Variant | Color (bg / border / text) | Icon | When Used |
|---------|---------------------------|------|-----------|
| `.success` | Light green (#d1fae5) / Green (#10b981) / Dark green (#065f46) | ✓ | Worst age ≥ 90 with ≥85% success ("plan is solid") |
| `.info` | Light blue (#dbeafe) / Blue (#2563eb) / Dark blue (#1e3a8a) | ℹ | Worst age 80-89 with ≥85% success ("plan is good until X, then borderline") |
| `.warning` | Light amber (#fef3c7) / Amber (#f59e0b) / Dark amber (#78350f) | ⚠ | Worst age with 50-84% success ("risky after X") |
| `.danger` | Light red (#fee2e2) / Red (#ef4444) / Dark red (#7f1d1d) | ⚠ | Any age with <50% success ("likely fails after X") |

### Copy Templates (Auto-Generated)

**Success variant:**
- Heading: "Your plan looks solid until age {worstGoodAge}"
- Body: "In {worstSuccessRate}% of scenarios, you still have money at {worstGoodAge}."
- CTA: NONE (no action needed)

**Info variant:**
- Heading: "Your plan is good until age {firstBorderlineAge}"
- Body: "After {firstBorderlineAge}, success rate drops to {successRateAtAge}%."
- CTA: NONE (informational only)

**Warning variant:**
- Heading: "Risky after age {firstRiskyAge}, borderline after {firstBorderlineAge}"
- Body: "At age {firstRiskyAge}: only {successRate}% success."
- CTA: "Adjust Investment →" (links to Calculator tab, see Microcopy section for CTA behavior)

**Danger variant:**
- Heading: "Risky after age {firstRiskyAge}, likely fails after {firstFailAge}"
- Body: "At age {firstFailAge}: only {successRate}% success. At age {nextAge}: {nextSuccessRate}%."
- CTA: "Adjust Investment →" (same as warning)

### Thresholds (Maps to B3 Decision)

| Success Rate | Threshold Name | Callout Variant |
|--------------|----------------|-----------------|
| ≥ 85% | "Great" / "Solid" | Success or Info (depending on age) |
| 75-84% | "OK" / "Borderline" | Info |
| 50-74% | "Risky" | Warning |
| < 50% | "Likely fails" | Danger |

### Visual Specs

| Element | Dimensions | Styles |
|---------|------------|--------|
| Container | 100% width, auto height, 16px padding, 12px border-radius, 4px left border | Box-shadow: 0 1px 3px rgba(0,0,0,0.1) |
| Icon | 24px × 24px, positioned top-left, 16px margin-right | Color matches border color |
| Heading | 16px font, font-weight 600, color matches variant dark color | Margin-bottom 8px |
| Body | 14px font, font-weight 400, color matches variant dark color (slightly lighter) | Line-height 1.5, margin-bottom 12px (if CTA present) |
| CTA button | Phase 1 btn-primary style (120px min-width, 40px height) | Positioned bottom-right of callout content area |

### Accessibility

- `role="alert"` if callout appears dynamically after simulation (screen reader announces immediately)
- `aria-live="polite"` on container (not aggressive — doesn't interrupt)
- Heading text must be unique and descriptive (don't just say "Warning" — say "Risky after age 80")
- CTA button: `aria-label="Adjust monthly investment to improve success rate"` (more context than just "Adjust Investment")

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| All ages 100% success | Success variant, heading "Your plan is extremely robust", body "100% success rate at all ages until {lifeExpectancy}." No CTA |
| All ages <50% success | Danger variant, heading "Plan likely fails early", body "Even at age {retirementAge+1}, only {successRate}% success." CTA "Adjust Investment →" |
| Success rate INCREASES at later ages (rare, but possible with legacy) | Use worst success rate in range {retirementAge+10, lifeExpectancy} to avoid misleading "solid" message |
| User has no life expectancy set (edge case) | Callout heading "Configure life expectancy to see age-specific results", no CTA, info variant |

---

## Component: MonteCarloBarChart (Success Rate by Age)

### Chart Type

Custom Canvas 2D bar chart (NOT Chart.js — too rigid for color-per-bar thresholds). Standalone `MonteCarloBarChart.js` (~120 lines).

### Dimensions

| Breakpoint | Canvas Width | Canvas Height | Bar Width | Gap Between Bars |
|------------|--------------|---------------|-----------|------------------|
| ≥1024px | 800px | 400px | 60px | 12px |
| 768-1023px | 600px | 350px | 48px | 10px |
| <768px | 350px | 300px | 40px | 8px |

### Axes

**X-axis (Age):**
- Labels: Age milestones from `retirementAge+1` to `lifeExpectancy`, adaptive (4-5 evenly spaced points)
- Example: retirementAge=60, lifeExpectancy=100 → show ages 70, 75, 80, 85, 90, 95, 100 (7 points, too many) → adaptively skip to 70, 80, 90, 100 (4 points)
- Label position: Below bars, centered on bar, 12px font, gray (#64748b)
- Grid lines: Vertical dashed lines at each age label, light gray (#e2e8f0), 1px stroke

**Y-axis (Success %):**
- Range: 0-100%
- Labels: 0%, 25%, 50%, 75%, 100% (5 labels, fixed)
- Label position: Left of chart, right-aligned, 12px font, gray (#64748b)
- Grid lines: Horizontal solid lines at each label, light gray (#e2e8f0), 1px stroke
- Zero line: Darker gray (#cbd5e1), 2px stroke (emphasizes baseline)

### Bar Rendering

**Bar color rules (per B3 thresholds):**

| Success Rate | Color | Hex |
|--------------|-------|-----|
| ≥ 85% | Green | #10b981 |
| 75-84% | Blue | #2563eb |
| 50-74% | Amber | #f59e0b |
| < 50% | Red | #ef4444 |

**Bar appearance:**
- Fill: Solid color (no gradient — too busy with 5-7 bars)
- Stroke: None (bars touch grid lines directly)
- Border-radius: 4px on top corners only (bottom corners square, touching X-axis)
- Height: Proportional to success% (0% = 0px, 100% = full chart height)

**Data labels (on bars):**
- Text: Success% as integer (e.g., "99%", "68%", "42%")
- Position: Top-center of bar, 2px below top edge (inside bar if bar tall enough, floating above if bar <30px tall)
- Font: 14px, font-weight 700, white color (if inside bar), dark gray (#1e293b) if floating above
- Contrast check: If bar color is amber/red and bar is short, use dark gray text even inside bar (WCAG AA)

### Tooltips (Hover/Touch)

**Desktop hover:**
- Trigger: Mouse over bar (not just data label — entire bar hitbox)
- Content: "Age {age}: {successRate}% success ({successCount} of {totalSims} simulations)"
- Example: "Age 80: 68% success (6,800 of 10,000 simulations)"
- Position: Centered above bar, 8px offset, white background, 1px gray border, 8px padding, 8px border-radius, shadow (0 2px 4px rgba(0,0,0,0.1))
- Timing: Appear after 200ms hover (debounce to avoid flicker), disappear immediately on mouse out

**Mobile touch:**
- Trigger: Tap bar (not hover — mobile has no hover)
- Content: Same as desktop
- Position: Fixed bottom sheet (not floating tooltip — easier to read on small screen)
- Dismiss: Tap outside bottom sheet OR tap "Close" button inside sheet

### Accessibility

**Screen reader support:**
- Each bar: `<rect role="img" aria-label="Age 80: 68% success, 6800 of 10000 simulations">` (inline SVG approach) OR data table fallback (see DataTableFallback section)
- Chart container: `<div role="figure" aria-label="Monte Carlo success rate by age">` with `<figcaption>` containing plain-English summary from callout box

**Keyboard navigation:**
- Tab into chart → focus ring on first bar
- Arrow keys: Left/Right navigate between bars
- Enter/Space: Show tooltip (same content as hover, positioned above bar)
- Escape: Dismiss tooltip

### Animation (On Load)

- Bars grow from bottom (height 0→final) over 400ms, staggered 50ms per bar (left to right cascade)
- Data labels fade in (opacity 0→1) over 200ms, starting after bar reaches 50% height
- No animation on re-render (e.g., window resize) — instant redraw

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| All bars same color (e.g., all green) | Still show all bars — color consistency is good news, not a rendering bug |
| Success rate 100% at all ages | Bars all max height, all green, data labels all "100%" — valid result |
| Success rate <10% (very short bar) | Data label floats above bar (dark gray text), bar itself is visible stub (min 8px height even if 0%) |
| Age milestones >7 (e.g., retirementAge=40, lifeExpectancy=100) | Adaptively skip to 5-6 milestones (e.g., 50, 60, 70, 80, 90, 100) to avoid bar crowding |
| User zooms browser to 200% | Chart scales proportionally (canvas uses CSS width/height + 2x pixel ratio for sharpness) |

---

## Component: MonteCarloLineChart (Corpus Range with Confidence Band)

### Chart Type

Custom Canvas 2D line chart with **shaded confidence band**. Shows P10 (10th percentile), P50 (median), P90 (90th percentile) corpus trajectories.

### Dimensions

| Breakpoint | Canvas Width | Canvas Height |
|------------|--------------|---------------|
| ≥1024px | 800px | 400px |
| 768-1023px | 600px | 350px |
| <768px | 350px | 300px |

### Axes

**X-axis (Age):**
- Range: `retirementAge` to `lifeExpectancy` (NOT retirementAge+1 — chart starts at retirement, showing accumulation phase endpoint)
- Labels: Every 5-10 years (adaptive), 12px font, gray (#64748b)
- Example: retirementAge=60, lifeExpectancy=100 → show 60, 70, 80, 90, 100 (5 labels)
- Grid lines: Vertical dashed, light gray (#e2e8f0), 1px stroke

**Y-axis (Corpus ₹):**
- Range: 0 to max(P90 trajectory) × 1.1 (10% headroom at top)
- Labels: Indian currency format (e.g., "₹2 cr", "₹4 cr", "₹6 cr"), right-aligned, 12px font, gray (#64748b)
- Grid lines: Horizontal solid, light gray (#e2e8f0), 1px stroke
- Zero line: Darker gray (#cbd5e1), 2px stroke

### Line Rendering

**P50 (median) line:**
- Color: Blue (#2563eb), 3px stroke width, solid
- Purpose: "Most likely outcome" — this is the primary trajectory user should focus on
- Label: "Median (P50)" in legend, positioned top-left of chart

**P90 (90th percentile) line:**
- Color: Green (#10b981), 2px stroke width, solid
- Purpose: "Optimistic scenario" — if markets do well
- Label: "Best Case (P90)" in legend

**P10 (10th percentile) line:**
- Color: Red (#ef4444), 2px stroke width, dashed (4px dash, 4px gap)
- Purpose: "Pessimistic scenario" — if markets do poorly
- Label: "Worst Case (P10)" in legend

**Confidence band (shaded region between P10 and P90):**
- Fill: Light gray (#f1f5f9), 30% opacity
- Purpose: Shows spread of outcomes — narrow band = predictable, wide band = high variance
- No stroke (just fill)

### Legend

**Position:** Top-left of chart, 12px below title, horizontal layout

**Format:**
```
━━ Median (P50)  ━━ Best Case (P90)  ╌╌ Worst Case (P10)
(blue, 3px)      (green, 2px)        (red, 2px dashed)
```

**Interactive:** Clicking legend item toggles visibility of that line (standard Chart.js pattern, but custom implementation)

### Tooltips (Hover/Touch)

**Desktop hover:**
- Trigger: Mouse over chart area (not just lines — entire X position triggers vertical crosshair)
- Content: Vertical crosshair (dashed gray line) at hovered age, tooltip box showing:
  ```
  Age 80
  Best Case (P90): ₹6.2 cr
  Median (P50):    ₹4.8 cr
  Worst Case (P10): ₹2.1 cr
  ```
- Position: Tooltip follows mouse horizontally (snaps to nearest age), fixed vertical position (top 20% of chart)
- Timing: Instant (no debounce — crosshair needs to feel responsive)

**Mobile touch:**
- Trigger: Tap chart area (no hover)
- Content: Same as desktop, but tooltip appears at tapped X position and stays until user taps elsewhere
- Crosshair: Persists until next tap (helps user compare two ages by tapping both)

### Accessibility

**Screen reader support:**
- Chart container: `<div role="figure" aria-label="Projected corpus range over time, showing 10th, 50th, and 90th percentiles">`
- Fallback data table (see DataTableFallback section) contains P10/P50/P90 values per age

**Keyboard navigation:**
- Tab into chart → focus on chart container
- Left/Right arrow keys: Move crosshair by 5-year increments, announce values via live region
- Example: "Age 80. Median: 4.8 crore. Best case: 6.2 crore. Worst case: 2.1 crore."

### Animation (On Load)

- Lines draw from left to right (path animation, 600ms ease-out)
- Confidence band fades in (opacity 0→30%) over 400ms, starting after lines reach 50% completion
- No animation on hover/crosshair (instant feedback)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| P10 line hits zero before lifeExpectancy | Line ends at zero (doesn't go negative), dashed line terminates early, tooltip shows "₹0 (depleted)" |
| All three lines overlap (low variance) | Still draw all three, but band is very narrow — this is good news (predictable outcome) |
| P90 line spikes (e.g., lucky market run) | Y-axis scales to fit + 10% headroom — acceptable (shows full range) |
| User has legacy/windfall at age X (input from Phase 1) | Lines show discontinuous jump at age X — valid (corpus increases suddenly) |
| Browser zooms >150% | Reduce font size for Y-axis labels to 10px to avoid overlap |

---

## Component: DataTableFallback (Accessibility Table)

### Purpose
Accessibility fallback for bar chart and line chart. Screen readers read table row-by-row. Sighted users can toggle visibility.

### Data Model
Combined data from bar chart + line chart:
- Columns: Age | Success Rate | Risk Level | P10 Corpus | P50 Corpus | P90 Corpus
- Rows: one per age milestone (same ages as bar chart)

### Copy
| Column Header | Text | Notes |
|---------------|------|-------|
| Age | "Age" | Plain text |
| Success Rate | "Success Rate" | Percentage with count, e.g., "99% (9,890 of 10,000)" |
| Risk Level | "Risk Level" | Text: "Safe" (≥85%) / "OK" (75-84%) / "Risky" (50-74%) / "Likely Fail" (<50%) |
| P10 Corpus | "P10 Corpus" | Formatted ₹, e.g., "₹28 lakhs" |
| P50 Corpus | "P50 Corpus (median)" | Formatted ₹, e.g., "₹45 lakhs" |
| P90 Corpus | "P90 Corpus" | Formatted ₹, e.g., "₹62 lakhs" |

### Behavior
- **Default state**: hidden (collapsed), only `[Show data table]` toggle visible below charts
- **Toggle clicked**: table expands (300ms max-height animation 0→auto), toggle text changes to `[Hide data table]`
- **Toggle clicked again**: table collapses (300ms), toggle text reverts to `[Show data table]`
- **Screen reader**: table is NOT `aria-hidden` when collapsed — screen reader users hear `[Show data table]` button, can activate to expand, then navigate table with arrow keys
- **Keyboard**: Tab focuses toggle, Enter/Space expands/collapses, arrow keys navigate table cells when expanded

### Layout
- Container: 100% width of `.panel`, 20px top margin
- Toggle button: 160px width, 40px height, `btn-secondary` style (existing Phase 1 outline button), center-aligned
- Table: 100% width when expanded, `.projection-table` class (existing Phase 1 table styles — zebra striping, 1px borders, 12px padding per cell)
- Mobile (<768px): table transforms into **card layout** (see wireframe Section 8) — one card per row, all cells stack vertically

### Styling (reuses Phase 1 `.projection-table`)
- Table: `border-collapse: collapse`, `border: 1px solid color.neutral.border`, `border-radius: 12px` (top corners only)
- Header row: `background: color.neutral.bg`, `font-weight: semibold`, `color: color.neutral.text-primary`
- Data rows: zebra striping (odd rows white, even rows 5% gray tint), `color: color.neutral.text-primary`
- Risk Level cell: color-coded text (Safe = green, OK = blue, Risky = amber, Likely Fail = red) matching bar chart colors
- Mobile cards: white bg, 12px border-radius, 16px padding, 12px margin-bottom, 1px border

### Dark mode
- Table: `border-color: color.dark.border`, header `background: color.dark.panel-bg`, text `color: color.dark.text-primary`
- Data rows: zebra striping (odd rows dark panel bg, even rows 5% lighter tint)
- Risk Level text: same colors as light mode (already WCAG AA verified)

### Edge Cases
- **No data**: table hidden entirely (toggle also hidden), only charts + callout shown
- **Partial data** (bar chart only, line chart missing): show Age | Success Rate | Risk Level columns only, omit corpus columns
- **Very long table** (20+ rows if user has long life expectancy): table scrolls vertically within container (max-height 600px, overflow-y auto)

---

## Microcopy & Error Messages

### All User-Visible Strings

#### Toggle Labels
| String ID | Text | Context |
|-----------|------|---------|
| `toggle.ideal` | "Ideal Scenario" | Left segment of toggle |
| `toggle.montecarlo` | "Stress Test (Monte Carlo)" | Right segment of toggle |

#### Callout Headings (Auto-Generated)
| Pattern | Example | Rule |
|---------|---------|------|
| Success | "Your plan looks solid until age 95" | Max age with ≥85% success |
| Info | "Your plan is OK until age 90" | Max age with ≥75% success |
| Warning | "Risky after age 80" | First age with <75% success |
| Danger | "Risky after age 80, likely fails after 90" | First age <75% + first age <50% |

#### Callout Body Text
| Pattern | Example | Notes |
|---------|---------|-------|
| Success | "In 85% of scenarios, you still have money at {age}." | {age} = max age ≥85% success, percentage may vary |
| Info/Warning | "At age {age}, success rate drops to {rate}%. Consider adjusting." | {age} = first risky age, {rate} = exact % |
| Danger | "At age {X}: only {Y}% success. At age {Z}: only {W}% success." | Two ages shown: risky + likely fail |

#### CTA Buttons
| String ID | Text | Action |
|-----------|------|--------|
| `cta.adjust_investment` | "Adjust Investment →" | Navigate to #tab-income, focus monthlyInvestment input |
| `cta.go_to_calculator` | "Go to Calculator →" | Navigate to #tab-calculator (empty state CTA) |
| `cta.try_again` | "Try Again" | Re-run simulation after error |
| `cta.back_to_ideal` | "Back to Ideal Scenario" | Switch toggle to Ideal (error recovery) |

#### Progress UI
| String ID | Text | Notes |
|-----------|------|-------|
| `progress.heading` | "Running Monte Carlo Simulation..." | Ellipsis animates (optional — not required) |
| `progress.count` | "{completed} of {total} simulations complete" | e.g., "4,237 of 10,000 simulations complete" |
| `progress.cancel` | "Cancel" | Button label |

#### Error Messages (User-Facing)
| Error Condition | Message | Recovery Action |
|----------------|---------|-----------------|
| Simulation crashed (Worker error) | "Simulation failed. Please refresh the page and try again." | Toast (8s auto-dismiss) + error overlay with "Try Again" / "Back to Ideal Scenario" buttons |
| Simulation timeout (>30s) | "Simulation is taking too long. Try closing other browser tabs or reducing simulation count." | Toast (persistent until dismissed) + error overlay |
| Invalid inputs (missing retirement age, etc.) | "Configure your retirement plan first. Monte Carlo requires retirement age, life expectancy, and savings/investment." | Empty state (see wireframe Section 5) |
| Web Worker not supported | "Your browser doesn't support background simulations. Please use Chrome, Firefox, Safari, or Edge." | Toast (persistent) + toggle disabled |

#### Toasts
| Type | Example | Duration |
|------|---------|----------|
| Success (not used in v1) | N/A | N/A |
| Info | "Simulation cancelled" | 3s auto-dismiss |
| Error | "Simulation failed. Please refresh the page and try again." | 8s auto-dismiss (or manual dismiss button) |

#### Chart Titles
| String ID | Text |
|-----------|------|
| `chart.bar.title` | "Success Rate by Age" |
| `chart.line.title` | "Projected Corpus Range (P10 / P50 / P90)" |

#### Chart Axis Labels
| Axis | Format | Example |
|------|--------|---------|
| Bar chart X-axis | "{age}" | "70", "75", "80", ... |
| Bar chart Y-axis | "{percentage}%" | "0%", "25%", "50%", "75%", "100%" |
| Line chart X-axis | "{age}" | "60", "65", "70", ... |
| Line chart Y-axis | "₹{amount}" | "₹2cr", "₹4cr", "₹6cr" (use Phase 1 `formatINR()`) |

#### Tooltips
| Chart | Format | Example |
|-------|--------|---------|
| Bar chart | "Age {age}: {rate}% success ({count} of {total} simulations)" | "Age 70: 99% success (9,890 of 10,000 simulations)" |
| Line chart | "Age {age}: P10 ₹{p10} • P50 ₹{p50} • P90 ₹{p90}" | "Age 80: P10 ₹28L • P50 ₹45L • P90 ₹62L" |

#### Data Table
| String ID | Text |
|-----------|------|
| `table.toggle.show` | "Show data table" |
| `table.toggle.hide` | "Hide data table" |
| `table.risk_level.safe` | "Safe" |
| `table.risk_level.ok` | "OK" |
| `table.risk_level.risky` | "Risky" |
| `table.risk_level.fail` | "Likely Fail" |

#### Suggestion Banner (When Plan is Risky)
| Pattern | Example | Notes |
|---------|---------|-------|
| Heading | "💡 To reach 85% confidence at age {targetAge}:" | {targetAge} = user's goal age (default: lifeExpectancy - 5) |
| Option 1 | "• Increase monthly SIP by ₹{amount}" | {amount} = calculated minimum increase |
| Option 2 | "• OR reduce retirement expenses by {percent}% (₹{amount}/mo)" | {percent} and {amount} = calculated alternative |

#### Footer Text
| String ID | Text | Format |
|-----------|------|--------|
| `footer.last_run` | "Last run: {duration}s ({count} simulations)" | e.g., "Last run: 4.2s (10,000 simulations)" |

### Tone & Voice Rules
- **Active voice**: "Your plan looks solid" (NOT "It appears your plan may be solid")
- **Plain English**: "Risky" (NOT "Sub-optimal probability profile")
- **User-centric**: "you still have money" (NOT "corpus remains positive")
- **Action-oriented CTAs**: "Adjust Investment" (NOT "View Investment Settings")
- **No jargon**: "Success rate" (NOT "Monte Carlo confidence interval")
- **Sentence case everywhere** (NOT Title Case): "Ideal Scenario" exception allowed (proper name), but "Success rate by age" for chart title

---

## Loading & Empty States (Per Wireframe Sections)

### Empty State (Wireframe Section 5)
**Trigger**: User clicks "Stress Test (Monte Carlo)" toggle when `retirementAge === null` OR `lifeExpectancy === null` OR (`currentSavings === 0` AND `monthlyInvestment === 0`)

**Visual**:
- Gray placeholder card, 16px border-radius, centered within `.panel`
- Emoji: 📊 (32px size, centered)
- Heading: "Configure your retirement plan first" (18px, semibold, gray text)
- Body: Bulleted list (14px, gray text, 1.5 line-height):
  - "Monte Carlo stress testing requires:"
  - "• Retirement age"
  - "• Life expectancy"
  - "• Current savings OR monthly investment"
- CTA: "Go to Calculator →" button (`btn-primary`, 180px wide, 48px height)

**Behavior**:
- CTA navigates to `#tab-calculator`
- No charts, no summary cards, no data table toggle
- Clicking "Ideal Scenario" toggle shows empty state for that view too (existing Phase 1 behavior — "Enter your details in the Calculator tab")

**Persistence**: Empty state shown on every Stress Test toggle click until user fills required inputs

---

### Loading State (Wireframe Section 2)
**Trigger**: User clicks "Stress Test (Monte Carlo)" toggle with valid inputs → simulation starts

**Visual**:
- Progress bar component (see SPEC 2 - PROGRESS BAR)
- All existing Projections content (summary cards, Chart.js chart, year-by-year table) hidden while simulation runs
- No skeleton cards (progress bar is the loading indicator)

**Behavior**:
- Progress bar fill animates 0% → 100% over ~4-8 seconds (depends on device speed)
- Count text updates ~10x/second
- Cancel button aborts simulation, returns to Ideal Scenario (see Cancel State below)
- User can navigate to other tabs — progress continues in background via Web Worker

**Transition to results**: Progress bar fades out (300ms), charts + callout fade in (300ms), staggered bar chart animation (50ms per bar)

---

### Error State (Wireframe Section 6)
**Trigger**: Web Worker posts `{type: 'ERROR'}` OR Worker crashes (no response after 30s timeout)

**Visual**:
- Red toast at top of screen (600px wide, white text, 8s auto-dismiss): "Simulation failed. Please refresh the page and try again." + Dismiss button
- Previous MC charts (if any) shown at 50% opacity, grayed out
- Error overlay centered on chart area (400px wide, white bg, red border, 24px padding):
  - Heading: "⚠ Simulation Error" (18px, semibold, red)
  - Body: "The Monte Carlo engine encountered an error. This may be caused by:" + bulleted list (14px, gray text)
  - Two buttons: "Try Again" (`btn-primary`, 120px) + "Back to Ideal Scenario" (`btn-secondary`, 200px)

**Behavior**:
- Toast Dismiss button: closes toast immediately
- "Try Again" button: clears error state, re-runs simulation with same inputs
- "Back to Ideal Scenario" button: switches toggle to Ideal, hides error overlay, shows deterministic projection
- Error overlay is modal-style (dims background slightly, traps focus until button clicked)
- Console logs error details: `console.error('MC simulation failed:', error.message, error.stack)`

**Persistence**: Error overlay persists until user clicks a button (doesn't auto-dismiss)

---

### Cancel State (Wireframe Section 7)
**Trigger**: User clicks Cancel button during simulation (see Loading State)

**Visual**:
- Blue info toast at top of screen (400px wide, white text, 3s auto-dismiss): "ℹ Simulation cancelled" (no dismiss button — auto-dismisses)
- Toggle automatically returns to "Ideal Scenario" (active left segment)
- All existing Phase 1 Projections content (summary cards, Chart.js chart, year-by-year table) restores instantly

**Behavior**:
- Worker receives `{type: 'CANCEL'}` postMessage, terminates gracefully, sends ACK `{type: 'CANCELLED'}`
- Toggle state in localStorage reverts to `'ideal'`
- User can immediately click "Stress Test (Monte Carlo)" again to restart simulation
- Partial simulation results NOT cached — next sim starts from scratch

**Animation**:
- Toast slides down from top (200ms), auto-slides up after 3s (200ms)
- Toggle active segment slides right → left (200ms smooth transition)
- Existing Projections content fades in (150ms)

---

### Success State — Green Plan (Wireframe Section 3)
**Trigger**: Simulation completes, all ages ≥85% success OR all ages ≥75% success with max age ≥85%

**Visual**:
- Green callout box (Success variant, see SPEC 3): "✓ Your plan looks solid until age {X}"
- Bar chart: all bars green or blue (no amber/red)
- Line chart: narrow confidence band (P10 and P90 close together)
- No suggestion banner

**Behavior**:
- Charts interactive (hover tooltips)
- Data table toggle available below charts
- No CTA button in callout (no action needed)

---

### Success State — Risky Plan (Wireframe Section 4)
**Trigger**: Simulation completes, any age <75% success OR any age <50% success

**Visual**:
- Red callout box (Danger variant, see SPEC 3): "⚠ Risky after age {X}, likely fails after {Z}" + CTA button "Adjust Investment →"
- Bar chart: gradient from green (early ages) to amber/red (late ages)
- Line chart: wide confidence band (P10 far below P90, P10 may hit zero)
- Suggestion banner below line chart (light amber bg, amber left border): "💡 To reach 85% confidence at age {Y}:" + two bulleted options (increase SIP / reduce expenses)

**Behavior**:
- "Adjust Investment →" button navigates to `#tab-income`, auto-focuses `monthlyInvestment` input, optionally pre-fills suggested +₹X increase
- Charts interactive (hover tooltips)
- Data table toggle available below charts
- Suggestion banner is informational only (no CTA button — main CTA is in callout box)

---

## Next Steps

- **To Design System Engineer**: Extract all copy strings into tokens/constants file for i18n-readiness (even though Phase 1 is English-only, prepare for future)
- **To FE Lead**: Each component spec maps to implementation task (e.g., "Build SegmentedControl.js", "Build MonteCarloBarChart.js")
- **To QA Engineer**: Error message table → test case matrix (one test per error condition)
