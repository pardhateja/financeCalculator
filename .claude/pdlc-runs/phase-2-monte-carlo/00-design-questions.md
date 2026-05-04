# Design Lead questions — Phase 2 Monte Carlo

Author: design-lead
Date: 2026-04-29
Note: Design mode already declared in 00-design-mode.md (BROWNFIELD-EXTEND).

Format per question:
- **Severity**: BLOCKER | NICE-TO-RESOLVE
- **Why**: ...
- **Default if NICE**: ...
- **Options if BLOCKER**: ...

---

## Q1 — Visualization Type for Success% vs Age

- **Severity**: BLOCKER
- **Why**: Chart type dictates mobile layout, a11y fallback strategy, and user comprehension speed.
- **Recommendation**: Vertical bar chart with color gradient (green→yellow→red)
  - Height = success %
  - Color = severity (green ≥85%, blue 75-84%, amber 50-74%, red <50%)
  - Easy to scan, mobile-friendly (bars shrink width, ages render below if needed)
  - Familiar pattern (Phase 1 already uses Chart.js bar charts)
- **Alternative considered**: Lollipop chart (dot at top of stick) — rejected, less familiar to non-technical users

---

## Q2 — Toggle UX Pattern

- **Severity**: NICE-TO-RESOLVE
- **Why**: Toggle controls switch between Ideal Scenario and Stress Test views.
- **Default**: Segmented control (iOS-style) — "Ideal Scenario | Stress Test (Monte Carlo)"
  - Sits above existing summary cards at top of Projections tab
  - Tokens already defined in 00-design-mode.md (toggle bg, active bg, shadow)
  - Follows Phase 1 principle: minimal new patterns
- **Alternatives**: Radio buttons (too form-like), tab interface (conflicts with existing Project/Tracker/Dashboard tabs)

---

## Q3 — Color Threshold Mapping

- **Severity**: BLOCKER
- **Why**: Color conveys risk level; must align with user mental model + Phase 1 semantic colors + WCAG AA contrast.
- **Recommendation**:
  - **Green** (`#10b981`) for ≥85% success — "safe, plan works"
  - **Blue** (`#2563eb`) for 75-84% success — "acceptable, some risk"
  - **Amber** (`#f59e0b`) for 50-74% success — "risky, borderline"
  - **Red** (`#ef4444`) for <50% success — "likely fail, needs major adjustment"
- **Rationale**: Reuses Phase 1 semantic colors → contrast already verified. 85% threshold matches common Monte Carlo "high confidence" standard.

---

## Q4 — Plain-English Message Placement

- **Severity**: NICE-TO-RESOLVE
- **Why**: Message like "Your plan is great until 80, risky after" is the punchline — user should see it before diving into chart details.
- **Default**: Callout box ABOVE chart
  - Uses Phase 1 `.alert` pattern (reuse existing info/warning/success alert styles)
  - Info variant (blue) when plan is solid, warning variant (amber) when borderline, danger variant (red) when risky
  - Example: "Your plan has 95% confidence through age 80, but drops to 42% by age 95. Consider increasing savings or adjusting retirement age."
- **Alternative**: Below chart (rejected — users might miss it if chart is long)

---

## Q5 — Loading UX During 5-8s Simulation

- **Severity**: BLOCKER
- **Why**: 10K Monte Carlo sim takes 5-8 seconds. UI must stay responsive and communicate progress, or user will think app froze.
- **Recommendation**: Progress bar with % + cancel button + status text
  - Web Worker runs simulation (non-blocking)
  - Progress bar updates every 1,000 simulations (0% → 10% → … → 100%)
  - Status text: "Running 10,000 simulations..." (top) + "Completed 3,500 / 10,000" (below bar)
  - Cancel button stops worker and shows partial results (or reverts to Ideal Scenario)
- **Rationale**: Progress bar > spinner for long tasks (gives time estimate). Cancel = user control (Phase 1 principle: never trap user).

---

## Q6 — Empty State (Missing Inputs)

- **Severity**: NICE-TO-RESOLVE
- **Why**: If user hasn't filled required inputs (current age, retirement age, savings), Monte Carlo can't run.
- **Default**: Reuse Phase 1 empty-state pattern
  - Gray placeholder card with icon + text: "Configure your retirement plan in the Dashboard tab to see Monte Carlo projections."
  - CTA button: "Go to Dashboard" (links to Dashboard tab)
- **Rationale**: Consistent with how Phase 1 handles missing data (e.g., Multi-Goal Allocator empty state when no phases defined).

---

## Q7 — Mobile Layout (<600px)

- **Severity**: NICE-TO-RESOLVE
- **Why**: Chart must remain legible on mobile; horizontal scroll is forbidden per Phase 1 responsive rules.
- **Default**: Vertical bars stay vertical, bar width shrinks, ages render vertically below if no horizontal room
  - At <600px: chart height increases to accommodate narrower bars (bars stack tighter)
  - Age labels rotate 0° → remain horizontal (or render below each bar if rotation causes overlap)
  - Y-axis (success %) stays on left side, gridlines remain
- **Alternative**: Switch to horizontal bars at mobile (rejected — less scannable for 5+ ages).

---

## Q8 — Show Median Corpus Path Alongside Success%?

- **Severity**: NICE-TO-RESOLVE
- **Why**: Median corpus path (50th percentile projection) adds context — user sees "what's the middle outcome?" not just "what % success?"
- **Default**: NO for v1 — keep it simple
  - Success% by age is the primary question Phase 2 answers ("when does my plan fail?")
  - Median corpus path is secondary (answers "how much will I likely have?")
  - Defer to Phase 2.1 stretch or Phase 3 if user requests after seeing v1
- **If YES in future**: Add second chart (line chart showing median corpus over time) below success% bar chart.

---

## Q9 — Dark Mode Token Strategy

- **Severity**: NICE-TO-RESOLVE
- **Why**: Phase 1 has mandatory dark mode. Phase 2 chart colors must adapt.
- **Default**: Define light + dark variants for 4 probability threshold colors using CSS custom properties
  - Light mode: green `#10b981`, blue `#2563eb`, amber `#f59e0b`, red `#ef4444` (as defined in Q3)
  - Dark mode: same hues but adjusted for contrast against dark panel (`#1e293b`)
    - Green: `#10b981` (already 4.8:1 on dark panel ✓)
    - Blue: `#3b82f6` (6.1:1 ✓)
    - Amber: `#f59e0b` (4.2:1 ✓)
    - Red: `#ef4444` (4.0:1 ✓)
- **Rationale**: Phase 1 a11y audit already verified these dark mode variants (see Phase 1 03-a11y-defaults.md lines 37-48).

---

## Q10 — Accessibility (WCAG 2.1 AA Compliance)

- **Severity**: BLOCKER
- **Why**: Phase 1 baseline is WCAG 2.1 AA. Phase 2 must extend it, not regress.
- **Requirements**:
  1. **Contrast**: All chart text (success% labels, age labels) must meet 4.5:1 minimum
     - White text on green/blue/amber/red bars: already verified in Phase 1 a11y doc (lines 50-58) ✓
  2. **Screen reader fallback**: Chart must have data table equivalent (WCAG 1.1.1 non-text content)
     - HTML table with columns: Age | Success% | Risk Level (text: "Safe" / "Risky" / etc.)
     - Table is `sr-only` by default (visually hidden, screen-reader accessible)
     - Toggle "Show data table" button for sighted users who prefer table
  3. **Focus states**: All interactive elements (toggle, cancel button) use Phase 1 blue outline (2px solid `#2563eb`, 2px offset)
- **Rationale**: Extends Phase 1 patterns; no new a11y debt.

---

## Q11 — CTA Pattern When Plan Is Risky

- **Severity**: NICE-TO-RESOLVE
- **Why**: If success% drops below 75% at target retirement age, user needs actionable next step — don't just show red bar and leave them stuck.
- **Default**: YES — show "Increase monthly investment by ₹X" suggestion with button that scrolls to Income tab
  - Suggestion appears in the plain-English callout box (Q4) when risk detected
  - Example: "Your plan drops to 42% success at age 95. Increase monthly investment by ₹5,000 to reach 85% confidence."
  - Button: "Adjust Investment →" (links to Dashboard tab, auto-focuses monthly investment input)
- **Rationale**: Matches Phase 1 pattern for deficit suggestions (see Multi-Goal Allocator "Increase monthly SIP" CTA). Closes the feedback loop: diagnose → suggest → act.
