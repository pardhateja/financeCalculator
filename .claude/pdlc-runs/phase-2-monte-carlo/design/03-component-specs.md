# Component Specifications — Phase 2 Monte Carlo Stress Test

**Source:** Extends Phase 1 component library with probabilistic visualization components  
**Version:** 2.0.0  
**Last updated:** 2026-04-30

**Reused Phase 1 components:** `.summary-card`, `.section-group`, `.projection-table`, `.chart-container`, `.input-group`, `.btn-primary`, `.btn-secondary`, `.alert` pattern. All existing components documented in `../multi-goal-early-retirement/design/03-component-specs.md` remain unchanged.

**New Phase 2 components:** 6 components added for Monte Carlo stress test visualization + interaction.

---

## Component: SegmentedControl (Toggle)

**Purpose**: Two-option toggle to switch between "Ideal Scenario" (deterministic projection) and "Stress Test (Monte Carlo)" views.  
**Used in screens**: Projections tab, positioned above summary cards at top of tab content  
**Pattern**: NEW (iOS-style segmented control, not present in Phase 1)

### Visual
- **Layout**: Inline-flex container with two button segments
  - `display: inline-flex`, `gap: 0` (segments touch)
  - Container padding: `{spacing.toggle-padding}` (4px)
  - Container background: `{color.toggle.container-bg}` light mode (#f8fafc), `{color.dark.toggle.container-bg}` dark mode (#0f172a)
  - Container border: `1px solid {color.neutral.border}`
  - Container border-radius: `{radii.md}` (10px)
- **Segment button**: Each option is a `<button>` element
  - Padding: `{spacing.10} {spacing.20}` (10px vertical, 20px horizontal)
  - Typography: `{typography.size.base}` (16px), `{typography.weight.medium}` (500)
  - Border-radius: `{radii.sm}` (8px, slightly smaller than container for inset appearance)
  - Transition: `{transition.fast}` (0.2s) on background/shadow changes
- **Inactive state**:
  - Background: transparent
  - Text color: `{color.toggle.inactive-text}` (#64748b)
  - No shadow
- **Active state**:
  - Background: `{color.toggle.active-bg}` light mode (white), `{color.dark.toggle.active-bg}` dark mode (#1e293b)
  - Text color: `{color.toggle.active-text}` (#1e293b light, #e2e8f0 dark)
  - Box-shadow: `{shadow.toggle-active}` (0 1px 3px rgba(0,0,0,0.12))
  - Font-weight: `{typography.weight.semibold}` (600)

### States
| State | Visual change |
|-------|---------------|
| default | One segment active (default: "Ideal Scenario"), one inactive |
| hover (inactive segment) | Text color darkens to `{color.neutral.text-primary}`, background: rgba(0,0,0,0.02) |
| hover (active segment) | No change (already visually distinct) |
| focus | Blue outline `2px solid {color.brand.primary}`, offset `2px` (per Phase 1 focus pattern) |
| active/pressed | Brief scale animation `transform: scale(0.98)` during click |
| disabled | Entire control: `opacity: 0.5`, `cursor: not-allowed` (rare — only if inputs incomplete) |

### Behavior
- **Click action**: Switch between views — toggle state, swap displayed content (Ideal table ↔ Monte Carlo charts)
- **State persistence**: Selection saved to localStorage `rp_projection_view` ('ideal' | 'montecarlo')
- **Keyboard**: Tab to focus control → arrow keys (Left/Right) to switch between options → Enter/Space to activate focused option
- **Touch**: Minimum 44×44 CSS pixels per segment (exceeds WCAG with 10px vertical + 20px horizontal padding at 16px font)

### Accessibility
- **Semantic HTML**: `<div role="tablist">` container with two `<button role="tab">` children
- **ARIA**: 
  - Each button: `aria-selected="true|false"` (true for active segment)
  - Each button: `aria-controls="<id-of-content-panel>"` linking to corresponding view container
  - Container: `aria-label="Projection view selector"`
- **Keyboard**: Full arrow-key navigation (roving tabindex pattern — only active segment is tabbable initially)
- **Focus**: Visible focus ring required (NEVER `outline: none` without alternative)

### Anti-pattern (do NOT do)
- Do NOT use radio inputs styled to look like toggle — `role="tablist"` is semantically correct for view switching
- Do NOT skip `aria-selected` — screen readers need it to announce active state
- Do NOT make both segments tabbable simultaneously — use roving tabindex (Tab enters control once, arrows navigate within)
- Do NOT animate view swap with layout shift — crossfade or instant swap only (no vertical slide that causes page jump)

---

## Component: ProgressBar (Simulation Progress)

**Purpose**: Linear progress indicator showing Monte Carlo simulation completion (0-100%) with optional cancel button.  
**Used in screens**: Projections tab, appears in place of charts while simulation runs in Web Worker  
**Pattern**: NEW (Phase 1 has no long-running compute, so no progress UI)

### Visual
- **Container**: `.progress-container`
  - Full-width block within `.chart-container` card
  - Padding: `{spacing.20}` (20px)
  - Background: `{color.neutral.white}` (light), `{color.dark.panel-bg}` (dark)
  - Border-radius: `{radii.card}` (12px)
  - Box-shadow: `{shadow.default}` (light), `{shadow.dark-card}` (dark)
- **Progress bar track**: `.progress-bar`
  - Width: 100%, Height: 8px
  - Background: `{color.neutral.border}` (#e2e8f0)
  - Border-radius: `{radii.sm}` (8px)
  - Overflow: hidden (clips fill)
- **Progress bar fill**: `.progress-bar__fill`
  - Width: `calc(<percent>%)` (0-100%)
  - Height: 8px
  - Background: `linear-gradient(90deg, {color.brand.primary}, {color.brand.primary-dark})` (blue gradient)
  - Border-radius: `{radii.sm}` (8px, left side visible, right grows)
  - Transition: `width 0.3s ease` (smooth fill animation)
- **Label**: Above progress bar
  - Typography: `{typography.size.base}`, `{typography.weight.medium}`, `{color.neutral.text-primary}`
  - Content: "Running Monte Carlo simulation... X%" (X updates every 10% increment)
- **Cancel button**: Below progress bar (optional, shown if simulation >2 seconds)
  - `.btn-secondary` variant (reuses Phase 1 button pattern)
  - Text: "Cancel"
  - Margin-top: `{spacing.16}`

### States
| State | Visual change |
|-------|---------------|
| default (running) | Fill animates left-to-right, label updates 0% → 10% → 20% → ... → 100% |
| complete (100%) | Fill reaches 100%, label changes to "Complete!", bar fades out after 500ms, charts appear |
| error | Fill turns red `{color.semantic.danger}`, label "Simulation failed", error message below |
| cancelled | Fill stops, label "Cancelled", charts remain hidden, "Run again" button appears |

### Behavior
- **Auto-start**: Simulation auto-starts when user switches to "Stress Test" view (no manual "Run" button for v1)
- **Progress updates**: Web Worker posts progress messages every 1000 simulations (~every 10%)
- **Cancel action**: Posts `{type:'CANCEL'}` to worker, worker exits gracefully, UI returns to empty state with "Run Monte Carlo" CTA
- **Keyboard**: Cancel button is tabbable, Enter/Space triggers cancel
- **Touch**: Cancel button meets 44×44px minimum touch target

### Accessibility
- **Semantic HTML**: `<div class="progress-container" role="progressbar" aria-valuenow="<percent>" aria-valuemin="0" aria-valuemax="100" aria-label="Monte Carlo simulation progress">`
- **ARIA**: 
  - `aria-valuenow` updates dynamically (0-100) as simulation runs
  - `aria-label` provides context (otherwise screen reader just says "progress bar 42%")
  - **Live region**: Progress label has `aria-live="polite"` — announces percent at 25%, 50%, 75%, 100% (not every 1%)
- **Focus**: Cancel button has visible focus ring
- **Screen reader**: Announces "Running Monte Carlo simulation, 25 percent complete" at quartile milestones

### Anti-pattern (do NOT do)
- Do NOT update `aria-valuenow` more than once per second (screen reader spam)
- Do NOT use indeterminate spinner when progress is measurable — show actual percent
- Do NOT auto-hide cancel button — user must have escape hatch for entire duration
- Do NOT block UI thread — progress bar itself must stay responsive (animate via CSS, not JS interval)

---

## Component: MonteCarloBarChart (Success% by Age)

**Purpose**: Vertical bar chart showing success probability at key ages (70, 80, 90, 95, 100), color-coded by threshold tiers.  
**Used in screens**: Projections tab "Stress Test (Monte Carlo)" view, primary visualization above line chart  
**Pattern**: NEW Canvas 2D chart (NOT Chart.js — custom implementation per Phase 1 pattern of lightweight canvas rendering)

### Visual (Canvas Rendering)
- **Container**: `.chart-container.mc-bar-chart`
  - Reuses Phase 1 `.chart-container` card pattern (white bg, 20px padding, 12px radius, default shadow)
  - Title inside container: "Success Rate by Age" — `{typography.size.h3}`, `{typography.weight.semibold}`
  - Canvas element: `<canvas>` with width/height set via token (no inline styles)
  - Dimensions: `{layout.chart-canvas.bar-height}` (300px desktop, 240px mobile)
- **Canvas layout**:
  - **Bars**: 5-7 vertical bars (one per age milestone: 70, 80, 90, 95, 100), width `{layout.chart-canvas.bar-width}` (40px desktop, 32px mobile)
  - **Bar gap**: `{layout.chart-canvas.bar-gap}` (12px between bars)
  - **Bar color**: Maps success% to probability token:
    - ≥85%: `{color.probability.high}` (green #10b981)
    - 75-84%: `{color.probability.medium}` (blue #2563eb)
    - 50-74%: `{color.probability.borderline}` (amber #f59e0b)
    - <50%: `{color.probability.low}` (red #ef4444)
  - **Bar height**: Proportional to success% (0-100% → 0-100% of chart height minus axis space)
  - **Rounded tops**: `border-radius: 4px` on top of bars (canvas arc drawing)
- **Axis labels**:
  - **X-axis** (bottom): Age labels (70, 80, 90, 95, 100) centered below each bar
    - Typography: `{typography.size.label}` (13.6px), `{color.neutral.text-secondary}`
  - **Y-axis** (left): Percent labels (0%, 25%, 50%, 75%, 100%) at gridline ticks
    - Typography: `{typography.size.label}`, `{color.neutral.text-secondary}`
  - **Gridlines**: Horizontal lines at 25%, 50%, 75% — `1px solid {color.neutral.border}`, `opacity: 0.5`
- **Data labels** (on bars):
  - Typography: `{typography.size.label}`, `{typography.weight.bold}`, white text
  - Content: "XX%" centered on each bar (e.g., "87%")
  - Shadow: `text-shadow: 0 1px 2px rgba(0,0,0,0.3)` for legibility on light bars
- **Tooltip** (hover):
  - Appears above hovered bar
  - Background: `{color.neutral.text-primary}`, text: white, padding `{spacing.6} {spacing.10}`, radius `{radii.sm}`
  - Content: "Age XX: YY% success (ZZZ of 10,000 sims had ≥6mo buffer)"
  - Arrow: CSS triangle pointing down to bar

### States
| State | Visual change |
|-------|---------------|
| default | All bars rendered, no tooltip visible |
| hover (bar) | Hovered bar brightens slightly (`filter: brightness(1.1)` applied to bar region), tooltip appears |
| loading | Gray placeholder bars at 50% opacity with skeleton shimmer effect |
| empty (no data) | Gray card with icon + "Configure inputs to run Monte Carlo" message |

### Behavior
- **Render trigger**: Canvas draws when Monte Carlo results available (after 100% progress)
- **Hover interaction**: Mouse move over canvas detects bar regions, shows tooltip
- **Click action**: None for v1 (future: click bar to drill into age-specific details)
- **Keyboard**: Chart itself not interactive (data table fallback is keyboard-accessible)
- **Touch (mobile)**: Tap bar to toggle sticky tooltip (stays visible until tap elsewhere)
- **Responsive**: Bar width shrinks on mobile (40px → 32px), height shrinks (300px → 240px)

### Accessibility
- **Semantic HTML**: `<canvas id="mc-bar-chart" role="img" aria-label="Success rate by age chart showing probability of having funds remaining at ages 70 through 100">`
- **ARIA**: 
  - `role="img"` + descriptive `aria-label` on canvas element
  - **REQUIRED data table fallback**: See DataTableFallback component spec below — table with toggle button immediately after canvas
  - `aria-describedby="mc-bar-table"` links canvas to table ID
- **Focus**: Canvas not focusable (decorative); table is keyboard-accessible
- **Screen reader**: Reads `aria-label`, then navigates to data table for actual values

### Anti-pattern (do NOT do)
- Do NOT render canvas without data table fallback — WCAG 1.1.1 violation
- Do NOT use `aria-hidden="true"` on canvas (it provides visual context; screen readers correctly skip via table)
- Do NOT make canvas interactive without keyboard alternative (if click-to-drill added in v2, must add keyboard nav)
- Do NOT use only color to distinguish bars — data labels ("87%") required on each bar

---

## Component: MonteCarloLineChart (Corpus Percentiles by Age)

**Purpose**: Line chart with confidence band showing 10th/50th/90th percentile corpus values over time.  
**Used in screens**: Projections tab "Stress Test (Monte Carlo)" view, secondary visualization below bar chart  
**Pattern**: NEW Canvas 2D chart (custom, not Chart.js)

### Visual (Canvas Rendering)
- **Container**: `.chart-container.mc-line-chart`
  - Reuses Phase 1 `.chart-container` card pattern
  - Title: "Corpus Range by Age" — `{typography.size.h3}`, `{typography.weight.semibold}`
  - Subtitle: "Shaded area shows 10th-90th percentile range" — `{typography.size.sm}`, `{color.neutral.text-secondary}`
  - Canvas dimensions: `{layout.chart-canvas.line-height}` (320px desktop, 260px mobile)
- **Canvas layout**:
  - **X-axis**: Age range (current age → life expectancy), labels every 5 years
  - **Y-axis**: Corpus amount in ₹L (rupees lakh), auto-scaled to max 90th percentile value
  - **Gridlines**: Both axes — `1px solid {color.neutral.border}`, `opacity: 0.5`
  - **Confidence band** (10th-90th percentile range):
    - Fill: `{color.brand.primary}` at `opacity: 0.15` (light blue translucent)
    - Border: none (soft visual element)
  - **Median line** (50th percentile):
    - Stroke: `{color.brand.primary}`, width `3px`
    - Smooth curve (Catmull-Rom spline, not jagged line-segments)
  - **Percentile labels** (at final age):
    - "90th" above upper bound, "50th" on median line, "10th" below lower bound
    - Typography: `{typography.size.xs}`, `{typography.weight.semibold}`, `{color.brand.primary}`
    - Small marker dot (6px circle) at line termination points
- **Axis labels**:
  - **X-axis**: Age labels (e.g., 60, 65, 70, 75, 80) — `{typography.size.label}`, `{color.neutral.text-secondary}`
  - **Y-axis**: Currency labels (e.g., ₹0L, ₹50L, ₹100L) — `{typography.size.label}`, `{color.neutral.text-secondary}`
- **Tooltip** (hover):
  - Vertical crosshair line at hovered age
  - Tooltip box: white bg, shadow, rounded corners
  - Content: "Age XX: 10th %ile ₹YYL | 50th ₹ZZL | 90th ₹AAL"

### States
| State | Visual change |
|-------|---------------|
| default | Chart rendered, no crosshair/tooltip |
| hover | Vertical crosshair at mouse X position, tooltip follows cursor |
| loading | Gray placeholder with skeleton shimmer |
| empty | Gray card with "No data" message |

### Behavior
- **Render trigger**: Draws after Monte Carlo completion (same as bar chart)
- **Hover interaction**: Mouse move shows crosshair + tooltip at nearest age point
- **Click action**: None for v1
- **Keyboard**: Not interactive (data table fallback is accessible)
- **Touch (mobile)**: Tap chart to toggle sticky tooltip at nearest age
- **Responsive**: Height shrinks on mobile (320px → 260px), axis labels may rotate or thin

### Accessibility
- **Semantic HTML**: `<canvas id="mc-line-chart" role="img" aria-label="Corpus percentile range chart showing 10th, 50th, and 90th percentile wealth over retirement timeline">`
- **ARIA**: 
  - `role="img"` + descriptive `aria-label`
  - **REQUIRED data table fallback**: See DataTableFallback component — table with Age, 10th %ile, Median, 90th %ile columns
  - `aria-describedby="mc-line-table"` links canvas to table
- **Focus**: Canvas not focusable; table is keyboard-accessible
- **Screen reader**: Reads label, navigates to table for actual data

### Anti-pattern (do NOT do)
- Do NOT render without data table fallback
- Do NOT use spaghetti chart (individual sim paths) — illegible and inaccessible
- Do NOT skip percentile labels — chart alone doesn't explain what the band represents
- Do NOT use only the band without median line — median is the primary signal

---

## Component: CalloutBox (Plain-English Interpretation)

**Purpose**: Styled message box displaying plain-English summary of Monte Carlo results (e.g., "Your plan is great until 80, risky after").  
**Used in screens**: Projections tab "Stress Test (Monte Carlo)" view, above charts  
**Extends**: Phase 1 `.alert` pattern (similar to suggestion banner from Phase 1 multi-goal feature)

### Visual
- **Layout**: Full-width block within `.section-group`
  - Padding: `{spacing.16}` `{spacing.20}`
  - Border-radius: `{radii.card}` (12px)
  - Margin-bottom: `{spacing.20}` (separates from charts below)
- **Variants** (maps to overall plan health based on earliest-risky age):
  - **Info** (no critical issues detected): 
    - Background: `{color.brand.primary-light}` (#dbeafe light blue)
    - Border-left: `{border.width-section}` solid `{color.brand.primary}`
    - Icon: ℹ️ info circle, `{color.brand.primary}`
  - **Success** (high success% across all ages):
    - Background: `{color.semantic.secondary-light}` (#d1fae5 light green)
    - Border-left: `{border.width-section}` solid `{color.semantic.secondary}`
    - Icon: ✓ checkmark, `{color.semantic.secondary}`
  - **Warning** (borderline success% at late ages):
    - Background: `{color.semantic.warning-light}` (#fef3c7 light amber)
    - Border-left: `{border.width-section}` solid `{color.semantic.warning}`
    - Icon: ⚠️ warning triangle, `{color.semantic.warning}`
  - **Danger** (low success% before life expectancy):
    - Background: `{color.semantic.danger-light}` (#fee2e2 light red)
    - Border-left: `{border.width-section}` solid `{color.semantic.danger}`
    - Icon: ❌ error circle, `{color.semantic.danger}`
- **Typography**:
  - Message text: `{typography.size.base}`, `{typography.weight.normal}`, `{color.neutral.text-primary}`
  - Optional CTA link (e.g., "Increase monthly investment by ₹X →"): `{typography.weight.semibold}`, `{color.brand.primary}`, underline on hover

### States
| State | Visual change |
|-------|---------------|
| default | Visible, variant determined by Monte Carlo results |
| hover (CTA link) | Link underlines, color darkens to `{color.brand.primary-dark}` |
| focus (CTA link) | Blue outline `2px solid {color.brand.primary}`, offset `2px` |

### Behavior
- **Display logic**: Shows one of 4 messages based on earliest age where success% drops below threshold:
  - Success: "Your retirement plan has high confidence (≥85% success) through age XX."
  - Info: "Your plan is solid until age XX (75-84% success). Consider modest adjustments for longevity."
  - Warning: "Your plan shows risk after age XX (50-74% success). Review spending or investment allocation."
  - Danger: "Your plan is likely to fail before age XX (<50% success). Significant changes needed."
- **CTA action** (if present): Link to Calculator tab Income section with auto-focus on monthly investment input
- **Keyboard**: CTA link is tabbable, Enter triggers navigation
- **Touch**: CTA link meets 44×44px touch target (inline padding)

### Accessibility
- **Semantic HTML**: `<div class="callout-box callout-<variant>" role="status">` (info/success/warning) or `role="alert"` (danger only)
- **ARIA**: 
  - `role="status"` for info/success/warning (polite live region)
  - `role="alert"` for danger (assertive — critical information)
  - Icon is decorative (`aria-hidden="true"`) — message text conveys urgency
- **Focus**: CTA link has visible focus ring
- **Screen reader**: Announces message when callout appears (via role="status"/"alert")

### Anti-pattern (do NOT do)
- Do NOT use only color/icon to convey urgency — message text must be explicit ("risky", "likely to fail")
- Do NOT use `role="alert"` for all variants — reserve for critical danger messages only
- Do NOT auto-dismiss — callout stays visible (user can scroll past but it persists on page)
- Do NOT link to external docs/help when a direct in-app action is possible (link to Calculator tab, not to a blog post)

---

## Component: DataTableFallback (Accessible Data Table)

**Purpose**: HTML data table with toggle button providing keyboard/screen-reader-accessible version of canvas chart data.  
**Used in screens**: Immediately below each Monte Carlo chart (bar chart and line chart each have their own table)  
**Pattern**: Extends Phase 1 `.projection-table` pattern with collapsible/expandable behavior

### Visual
- **Toggle button**: `.btn-secondary.table-toggle`
  - Text: "Show data table" (collapsed) / "Hide data table" (expanded)
  - Icon: ▼ chevron-down (collapsed) / ▲ chevron-up (expanded)
  - Positioned below chart canvas, margin-top `{spacing.12}`
  - Full width on mobile, inline-block on desktop (left-aligned)
- **Table** (when expanded): `.projection-table.mc-data-table`
  - Reuses Phase 1 table styling (alternating row backgrounds, borders, padding)
  - **Bar chart table** columns: Age | Success% | Sims with Buffer | Sims Failed
  - **Line chart table** columns: Age | 10th Percentile | Median (50th) | 90th Percentile
  - Typography: `{typography.size.base}` for cell values, `{typography.size.label}` for headers
  - Max-height when expanded: `400px` with vertical scroll if rows exceed (unlikely with 5-7 age points)
- **Collapsed state**: Table has `display: none`, toggle button shows "Show data table"
- **Expanded state**: Table visible, toggle button shows "Hide data table"
- **sr-only variant** (Phase 1 pattern): Table can be visually hidden but screen-reader-accessible via `.sr-only` class if designer prefers charts-only visual layout (toggle button becomes "Access data table" and un-hides for all users when clicked)

### States
| State | Visual change |
|-------|---------------|
| collapsed (default) | Table hidden, button shows "Show data table ▼" |
| expanded | Table visible below button, button shows "Hide data table ▲" |
| hover (button) | Button background lightens (existing `.btn-secondary` hover state) |
| focus (button) | Blue outline per Phase 1 focus pattern |

### Behavior
- **Toggle action**: Click button → table expands/collapses with smooth CSS transition (`max-height` animation, 0.3s)
- **State persistence**: Expansion state saved to sessionStorage `mc_table_<chart-id>_expanded` (boolean)
- **Keyboard**: Button is tabbable, Enter/Space toggles expansion
- **Touch**: Button meets 44×44px minimum touch target
- **Screen reader**: Table always present in DOM (not dynamically generated), toggle just controls visibility

### Accessibility
- **Semantic HTML**: 
  ```html
  <button class="btn-secondary table-toggle" aria-expanded="false" aria-controls="mc-bar-table">
    Show data table ▼
  </button>
  <table class="projection-table mc-data-table" id="mc-bar-table" hidden>
    <caption>Monte Carlo success rate by age (10,000 simulations)</caption>
    <thead><tr><th scope="col">Age</th><th scope="col">Success %</th>...</tr></thead>
    <tbody>...</tbody>
  </table>
  ```
- **ARIA**: 
  - Toggle button: `aria-expanded="true|false"` (updates when clicked)
  - Toggle button: `aria-controls="<table-id>"` (links button to table it reveals)
  - Table: `<caption>` describes data source and context
  - Table headers: `<th scope="col">` for column headers, `<th scope="row">` if row headers present
- **Focus**: Toggle button has visible focus ring; table cells not tabbable (read-only data)
- **Screen reader**: When collapsed, announces "Show data table, button, collapsed". When expanded, "Hide data table, button, expanded".

### Anti-pattern (do NOT do)
- Do NOT generate table dynamically on toggle (breaks screen reader discovery) — table must exist in DOM, toggle just controls `hidden` attribute
- Do NOT use `aria-hidden="true"` on table when collapsed — use `hidden` attribute or `display: none` instead (they remove from a11y tree AND visual tree)
- Do NOT skip `aria-controls` — screen reader users need to know what the toggle button affects
- Do NOT make table the ONLY way to access data — chart + table are dual representations, both should be present

---

