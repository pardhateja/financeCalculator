# Component Specifications — Multi-Goal Early Retirement Planner

**Source:** Extracted patterns from existing retirement-planner CSS + NEW components per A24-A27  
**Version:** 1.0.0  
**Last updated:** 2026-04-27

---

## Component: Phase Card

**Purpose**: Displays summary metrics for a single life phase (age range, total cost, funding status).  
**Used in screens**: Multi-Goal tab main view (summary row below phase list)  
**Extends**: `.summary-card` (cards.css:9-24)

### Visual
- **Layout**: Block container, same as existing summary card
- **Background**: `{color.neutral.white}` (light mode), `{color.dark.section-bg}` (dark mode)
- **Border**: 
  - Top: `{border.width-accent}` solid `{color.phase.N}` (where N = phase index 1-6, rotates)
  - **NEW left border**: `{border.width-section}` solid `{color.phase.N}` (extends existing card pattern)
- **Padding**: `{spacing.16}` `{spacing.20}`
- **Border-radius**: `{radii.card}`
- **Shadow**: `{shadow.default}` (light mode), `{shadow.dark-card}` (dark mode)
- **Typography**: 
  - Label (phase name): `{typography.size.label}`, `{color.neutral.text-secondary}`, margin-bottom `{spacing.6}`
  - Age range: `{typography.size.sm}`, `{color.neutral.text-secondary}`
  - Value (total cost): `{typography.size.card-value}`, `{typography.weight.bold}`, `{color.neutral.text-primary}`
  - Sub-text (funded ₹X / needed ₹Y): `{typography.size.sm}`, `{color.neutral.text-secondary}`, margin-top `{spacing.4}`

### States
| State | Visual change |
|-------|---------------|
| default | Base styling as above |
| overlapping | Small badge in top-right corner: `.badge-overlap` with orange background `{color.semantic.warning}`, white text, `border-radius: {radii.card}`, padding `4px 8px`, font-size `{typography.size.xs}`, position absolute top `{spacing.8}` right `{spacing.8}` |
| underfunded | No border change (use health indicator below card instead) |
| hover | No hover effect (card is not clickable itself; Edit/Delete buttons inside are) |
| focus | N/A (card is not interactive; child buttons receive focus) |

### Behavior
- **Non-interactive container**: Card itself is not clickable
- **Contains interactive children**: Edit button, Delete button (both `.btn-secondary` variants)
- **Click action**: None on card; buttons trigger edit/delete modals or inline forms
- **Keyboard**: Card is not in tab order; buttons inside are tabbable

### Accessibility
- **Semantic HTML**: `<div class="summary-card phase-card">` (non-semantic container is appropriate; interactivity is in child buttons)
- **ARIA**: 
  - No `role` needed (not interactive)
  - Phase color border is NOT the only signal — phase name text label always present
  - Overlapping badge has `aria-label="Overlaps with N other phases"` if present
- **Focus**: Card itself not focusable; child buttons have visible focus ring per existing pattern

### Anti-pattern (do NOT do)
- Do NOT make the entire card clickable (existing pattern reserves clicks for explicit buttons)
- Do NOT use only border color to signal overlap — always include text/icon badge
- Do NOT use phase color alone without phase name label (color-blind users need text)

## Component: Allocation Pre-Flight Table Row

**Purpose**: Shows per-phase funding allocation in the pre-flight check table (how retirement corpus allocates across phases).  
**Used in screens**: Multi-Goal tab allocation pre-flight section (below phase cards, above projection table)  
**Extends**: `.projection-table tbody tr` pattern (existing table row styling)

### Visual
- **Layout**: Table row `<tr>` with 4-5 columns (Phase Name, Age Range, Total Cost, Allocated Amount, Status)
- **Background**: 
  - Default: alternating row pattern per existing `.projection-table` (white / `{color.neutral.bg}`)
  - **NEW deficit modifier**: `.deficit` class adds red tint `{color.domain.danger-row}` background (light mode), `#3b1010` (dark mode per dark.css:63)
- **Border**: Bottom border `1px solid {color.neutral.border}` between rows
- **Padding**: `{spacing.12}` vertical per existing table row pattern
- **Typography**: 
  - Phase name cell: `{typography.size.base}`, `{typography.weight.medium}`, includes small colored dot (8px circle, `background: {color.phase.N}`)
  - Numeric cells: `{typography.size.base}`, right-aligned
  - Status cell: Uses `.health-indicator` inline variant (scaled down: padding `{spacing.6}` `{spacing.10}`)

### States
| State | Visual change |
|-------|---------------|
| default (funded) | White/light gray alternating background, `.health-indicator.good` in status cell |
| deficit (underfunded) | `.deficit` class: `background: {color.domain.danger-row}` (light), `#3b1010` (dark), `.health-indicator.bad` in status cell |
| hover | Slight background lighten (existing table pattern: `background: rgba(37, 99, 235, 0.02)` on hover) |
| focus | N/A (row is not interactive; if we add row-click later, blue outline per standard focus pattern) |

### Behavior
- **Non-interactive (v1)**: Row is read-only display
- **Click action**: None in v1 (future: click row to jump to phase edit form)
- **Keyboard**: Not in tab order (read-only table)
- **Touch**: No touch target (read-only)

### Accessibility
- **Semantic HTML**: `<tr>` inside `<tbody>` inside `<table>` (proper table markup)
- **ARIA**: 
  - No additional ARIA needed (semantic table is sufficient)
  - Status column combines color + text (e.g., "Fully Funded" or "Deficit ₹2.5L") — not color alone
  - Colored dot in phase name cell paired with text name
- **Focus**: Not focusable (read-only)
- **Screen reader**: Table headers provide context via `<th scope="col">`; status text announces clearly

### Anti-pattern (do NOT do)
- Do NOT use only background color to signal deficit — always include text in status cell ("Deficit ₹X")
- Do NOT make rows clickable without visible affordance (existing pattern has no row-level interaction)
- Do NOT skip the colored dot's paired text label in phase name cell

## Component: Stacked Bar Segment

**Purpose**: Visual representation of phase funding allocation as a horizontal stacked bar (CSS-only, no Chart.js).  
**Used in screens**: Multi-Goal tab allocation visualization (directly above or below pre-flight table per A25)  
**Pattern**: NEW (no existing equivalent in retirement-planner)

### Visual
- **Container**: `.alloc-bar` — horizontal flexbox
  - `display: flex`, `flex-direction: row`, `gap: 0` (segments touch)
  - `width: 100%`, `height: 40px` (desktop), `32px` (mobile <768px)
  - `border-radius: {radii.sm}`, `overflow: hidden` (clips child segment corners)
  - `background: {color.neutral.border}` (shows through if total allocation < 100%)
  - `box-shadow: inset 0 2px 4px rgba(0,0,0,0.06)` (subtle depth)
- **Segment**: `.alloc-bar__segment` — individual phase slice
  - `flex-grow: 0`, `flex-shrink: 0`, `flex-basis: calc(<percentage>%)` (e.g., `33.5%` for ₹33.5L of ₹100L corpus)
  - **Min-width constraint**: `min-width: 4px` (ensures very small phases stay visible)
  - `background: {color.phase.N}` (light mode) or `{color.dark.phase.N}` (dark mode)
  - `position: relative` (for optional tooltip on hover)
  - `transition: flex-basis 0.3s ease` (smooth reflow when phases update)
- **Typography** (optional tooltip on hover):
  - Tooltip div: `position: absolute`, `bottom: 100%`, `left: 50%`, `transform: translateX(-50%)`, `margin-bottom: 8px`
  - Background: `{color.neutral.text-primary}`, `color: white`, `padding: {spacing.6} {spacing.10}`, `border-radius: {radii.sm}`, `font-size: {typography.size.sm}`, `white-space: nowrap`
  - Arrow: CSS triangle via `::after` pseudo-element
  - Content: "Phase Name: ₹X.XL (Y.Y%)"

### States
| State | Visual change |
|-------|---------------|
| default | Base styling, no tooltip visible |
| hover | Segment brightens slightly (`filter: brightness(1.1)`), tooltip appears after 300ms delay |
| focus | If keyboard-accessible (future enhancement), outline `2px solid {color.brand.primary}`, offset `2px` |
| too-small (<4px natural width) | `min-width: 4px` forces visibility; tooltip still shows full amount on hover |

### Behavior
- **Non-interactive (v1)**: Segments are display-only
- **Hover action**: Show tooltip with phase name + amount + percentage
- **Click action**: None in v1 (future: click to highlight corresponding phase card)
- **Keyboard**: Not in tab order (read-only visualization)
- **Touch (mobile)**: Tap segment to toggle tooltip (sticky until tap elsewhere)

### Accessibility
- **Semantic HTML**: `<div class="alloc-bar">` with child `<div class="alloc-bar__segment">` elements (non-semantic presentational elements)
- **ARIA**: 
  - Container has `role="img"` + `aria-label="Retirement corpus allocation across N phases"` (treats entire bar as one image)
  - **REQUIRED data table fallback**: The allocation pre-flight table (rows above/below the bar) serves as the accessible data source
  - Screen readers skip the visual bar and read the table instead
- **Focus**: Not focusable (decorative visualization; data table is the accessible equivalent)
- **Color contrast**: Each `{color.phase.N}` must meet 3:1 against white background (verified in 03-a11y-defaults.md)

### Anti-pattern (do NOT do)
- Do NOT make the bar the only representation of allocation data — always pair with the pre-flight table
- Do NOT use `aria-label` on individual segments — the container's label covers the entire visualization
- Do NOT set `aria-hidden="true"` (the bar provides visual context for sighted users; screen readers correctly skip it via table fallback)
- Do NOT rely on hover tooltips for critical info — table must contain all data

## Component: Phase Timeline Strip

**Purpose**: Horizontal Gantt-style timeline showing all phases along a continuous age axis (e.g., age 35-85).  
**Used in screens**: Multi-Goal tab, below phase cards and above allocation section (per A24)  
**Pattern**: NEW (inspired by existing table-based age display in Projections tab, but visual timeline is new)

### Visual (Desktop / Tablet ≥768px)
- **Container**: `.phase-timeline` — horizontal flex container
  - `display: flex`, `flex-direction: row`, `gap: 0`
  - `width: 100%`, `min-height: 80px`
  - `background: {color.neutral.bg}`, `border-radius: {radii.card}`, `padding: {spacing.16}`
  - `position: relative` (for age axis labels)
- **Age axis**: Horizontal ruler at bottom of container
  - Tick marks every 5 years: `border-left: 1px solid {color.neutral.border}`, `height: 8px`
  - Age labels: `{typography.size.xs}`, `{color.neutral.text-secondary}`, positioned below ticks
  - Rendered via CSS grid or absolute-positioned spans (NOT canvas/SVG)
- **Phase block**: `.timeline-phase` — individual phase rectangle
  - `flex-grow: 0`, `flex-shrink: 0`, `flex-basis: calc(<age-range>/<total-range> * 100%)` (e.g., ages 40-50 in 35-85 range = 10/50 = 20%)
  - `background: linear-gradient(135deg, {color.phase.N}, <darker variant>)` (subtle gradient for depth)
  - `border-left: 3px solid {color.phase.N}` (slightly darker shade)
  - `padding: {spacing.8}`, `border-radius: {radii.sm}` (only if first/last block)
  - `min-width: 40px` (ensures narrow phases stay clickable/visible)
  - **Content**: Phase name (truncated with ellipsis if <60px wide), age range in smaller text below
  - `position: relative`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`
- **Gap indicator**: `.timeline-gap` — shows uncovered age ranges
  - `flex-basis: calc(<gap-years>/<total-range> * 100%)`
  - `background: repeating-linear-gradient(45deg, transparent, transparent 10px, {color.neutral.border} 10px, {color.neutral.border} 20px)` (diagonal stripes)
  - Small warning icon + "Gap" label centered
- **Overlap indicator**: When two phases cover same ages, render both blocks stacked vertically within the timeline row (increase container `min-height` to 120px)
  - Second overlapping block offset downward by 40px
  - Thin connecting line between overlapping blocks' edges

### Visual (Mobile <768px)
- **Layout rotation**: Timeline rotates 90° to vertical stack
  - `flex-direction: column` instead of row
  - Age axis runs vertically on left side (rotated labels)
  - Phase blocks stack top-to-bottom (earliest age at top)
  - Each block: `height: calc(<age-range>/<total-range> * 400px)` (400px = total mobile timeline height)
  - Horizontal scrolling disabled; vertical scroll if phases exceed viewport

### States
| State | Visual change |
|-------|---------------|
| default | Base styling |
| hover | Phase block brightens (`filter: brightness(1.08)`), slight shadow lift |
| active (clicked) | Highlight with `box-shadow: 0 0 0 3px {color.brand.primary}`, scroll corresponding phase card into view |
| focus | Keyboard focus ring: `outline: 2px solid {color.brand.primary}`, `outline-offset: 2px` |
| gap-present | Gap block shows diagonal stripes + warning icon |
| overlap | Overlapping blocks stack vertically, connector line visible |

### Behavior
- **Click action**: Clicking a phase block scrolls the page to the corresponding phase card + highlights it briefly (3s blue glow)
- **Keyboard**: Each phase block is tabbable (`tabindex="0"`), Enter/Space triggers click behavior
- **Touch**: Tap phase block (minimum 44×44px touch target per WCAG)
- **Responsive**: Auto-rotates to vertical layout on mobile

### Accessibility
- **Semantic HTML**: 
  - Container: `<div class="phase-timeline" role="group" aria-label="Life phases timeline from age X to Y">`
  - Each phase block: `<button class="timeline-phase">` (interactive element)
  - Gap block: `<div class="timeline-gap" aria-label="No phases defined for ages X-Y">`
- **ARIA**: 
  - Phase buttons: `aria-label="Phase Name, ages X to Y, click to view details"`
  - Container has descriptive `aria-label` summarizing the full timeline
- **Focus**: Phase blocks are keyboard-accessible, visible focus ring required
- **Screen reader**: Announces "N phases defined. Phase 1: [name], ages X-Y. [next phase]..." when navigating
- **Color**: Phase color is NOT the only signal — phase name text always visible (unless block <40px wide, then tooltip on hover/focus)

### Anti-pattern (do NOT do)
- Do NOT render as `<canvas>` or `<svg>` without proper ARIA labels and keyboard access
- Do NOT use only color to distinguish phases — text labels required
- Do NOT make the timeline read-only — each block should be clickable/tappable for navigation
- Do NOT let narrow phase blocks become unclickable — enforce `min-width: 40px` (desktop) / `min-height: 44px` (mobile)
- Do NOT hide gap indicators — they communicate critical information (uncovered years)

## Component: Suggestion Banner

**Purpose**: Displays actionable suggestions when system detects common issues (gaps, overlaps, underfunding, unallocated corpus).  
**Used in screens**: Multi-Goal tab, appears contextually below phase timeline or allocation section  
**Extends**: Existing alert pattern if present in codebase; if none exists, create NEW as `.alert.alert-warning` (matches Bootstrap convention many projects use)

### Visual
- **Layout**: Block container, full-width within parent section
- **Background**: `{color.semantic.warning-light}` (light mode), `#451a03` (dark mode per dark.css:82 category-tag pattern)
- **Border**: Left accent `{border.width-section}` solid `{color.semantic.warning}`
- **Padding**: `{spacing.16}` `{spacing.20}`
- **Border-radius**: `{radii.card}`
- **Icon**: Warning triangle icon (Material Icons `warning` or similar), `{color.semantic.warning}`, `font-size: 20px`, positioned left of text
- **Typography**:
  - Message text: `{typography.size.base}`, `{color.neutral.text-primary}` (light mode), `#fcd34d` (dark mode per dark.css:82)
  - Actionable link (if present): `{typography.weight.semibold}`, `{color.brand.primary}`, underline on hover
- **Dismiss button**: Small `×` button top-right corner
  - `{typography.size.lg}`, `{color.neutral.text-secondary}`, `background: transparent`, `border: none`, `cursor: pointer`
  - Hover: `{color.neutral.text-primary}`
  - Size: `24×24px` (meets minimum touch target)

### States
| State | Visual change |
|-------|---------------|
| default | Visible, full opacity |
| hover (dismiss button) | Button color darkens |
| focus (dismiss button) | Blue outline `2px solid {color.brand.primary}`, offset `2px` |
| dismissed | Fade out over 200ms, then `display: none` |

### Behavior
- **Display logic**: Shows when conditions met (e.g., gap detected, overlap >2 phases, underfunded by >10%)
- **Dismiss action**: Click `×` button dismisses banner (persists dismissal in session storage per banner type; doesn't re-show same suggestion in same session)
- **Link action** (if present): Clicking "Auto-fill gaps" or similar link triggers corresponding action (e.g., opens modal to add phase, scrolls to specific form field)
- **Keyboard**: Dismiss button is tabbable, Enter/Space dismisses
- **Touch**: Dismiss button has 24×24px touch target minimum

### Accessibility
- **Semantic HTML**: `<div class="alert alert-warning" role="alert">`
- **ARIA**: 
  - `role="alert"` makes it a live region — screen readers announce immediately when banner appears
  - `aria-live="polite"` (implicit with `role="alert"`)
  - Dismiss button: `aria-label="Dismiss suggestion"` (no visible text, icon only)
- **Focus**: Dismiss button must be tabbable and show visible focus ring
- **Persistent visibility**: Banner stays on-page (not a toast that auto-dismisses) — user controls dismissal
- **Color**: Warning icon + background color are NOT the only signal — text message always present

### Anti-pattern (do NOT do)
- Do NOT auto-dismiss after a timeout — user must explicitly dismiss (or fix the underlying issue, which hides the banner)
- Do NOT use `role="status"` (that's for passive updates) — use `role="alert"` (assertive announcements)
- Do NOT make the entire banner clickable — only the explicit link/button elements should be interactive
- Do NOT use only color to convey warning — icon + text required
- Do NOT skip the dismiss button — always give user control to hide suggestions

## Component: Active-Phase Badge

**Purpose**: Small inline badge in projection table rows showing which phase(s) are active for that year.  
**Used in screens**: Projections tab table (new "Active Phase" column inserted after "Age" column per A26)  
**Extends**: Existing `.row-status` pattern if present; if none, create as inline badge similar to `.category-tag` (forms.css:73-85)

### Visual
- **Layout**: Inline-flex container (can hold multiple badges if year has overlapping phases)
  - `display: inline-flex`, `gap: {spacing.4}`, `flex-wrap: wrap`
- **Badge element**: `.phase-badge`
  - `display: inline-block`
  - `padding: {spacing.2} {spacing.8}` (2px vertical, 8px horizontal)
  - `border-radius: {radii.card}` (12px, fully rounded)
  - `font-size: {typography.size.xs}` (0.75rem / 12px)
  - `font-weight: {typography.weight.semibold}` (600)
  - `background: {color.phase.N}` (light mode) or `{color.dark.phase.N}` (dark mode)
  - `color: white` (for all phase colors — verified contrast in a11y defaults)
  - Small colored dot prefix (6px circle, same color as background but slightly darker shade)
  - Text: Phase name (truncated to 12 chars max + ellipsis if longer)
- **Multiple badges** (overlapping phases): Stack horizontally with `gap: {spacing.4}`
- **Empty state** (no active phase for that year): Display en-dash `—` in gray `{color.neutral.text-secondary}`

### States
| State | Visual change |
|-------|---------------|
| default | Base styling |
| hover | Slight brighten (`filter: brightness(1.1)`) + optional tooltip showing full phase name if truncated |
| focus | N/A (badge is not interactive) |

### Behavior
- **Non-interactive**: Badge is read-only display (no click/tap action)
- **Hover (optional)**: If phase name is truncated, show tooltip with full name
- **Keyboard**: Not in tab order (decorative label)
- **Touch**: No touch interaction

### Accessibility
- **Semantic HTML**: `<span class="phase-badge">` (inline text element)
- **ARIA**: 
  - No additional ARIA needed (plain text)
  - Badge color is NOT the only signal — phase name text always present
  - Colored dot is decorative (color already conveyed by background) — no `aria-label` needed for dot
- **Focus**: Not focusable (decorative)
- **Screen reader**: Reads phase name naturally as part of table cell content
- **Color contrast**: White text on each `{color.phase.N}` background must meet WCAG AA (4.5:1) — verified in a11y defaults

### Anti-pattern (do NOT do)
- Do NOT make badge clickable without visible affordance (existing pattern is read-only labels)
- Do NOT use only background color without text label — phase name must be visible
- Do NOT truncate phase names to <4 characters (unintelligible) — minimum 12 chars before ellipsis
- Do NOT use low-contrast text colors (always white text for consistency + guaranteed contrast)
