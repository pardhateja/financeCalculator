# Design Strategy — Phase 2 Monte Carlo

Owner: design
Date: 2026-04-30

## 1. Direction (one paragraph)

Phase 2 extends the data-dense utilitarian calculator from Phase 1 with a probabilistic confidence layer. The tone is **calm authority — honest probability without doom**: we're adding rigor (Monte Carlo simulation), not fear. Density is **medium** — one punchline chart (success% by age) that answers "when does my plan start to fail?" supported by deeper explorations (confidence bands, optional heatmap). Constraints are strict: **no new colors** beyond the 4 semantic tokens already verified for WCAG AA (green/blue/amber/red map to ≥85% / 75-84% / 50-74% / <50% success thresholds); **reuse Phase 1 segmented-control pattern** for the toggle; **mobile-first** reflow (charts degrade gracefully at <600px); **dark-mode parity** for every new component. This is brownfield-extend, not redesign — the existing "Ideal Scenario" year-by-year table stays pixel-identical; Monte Carlo is an optional overlay the user chooses via toggle.

## 2. Hierarchy of charts (B4 = multiple charts)

Pardha locked "include multiple" in B4. The hierarchy answers the user's mental journey from punchline → confidence → what-if exploration:

### PRIMARY (always visible at top): Bar chart "Success % by Age"
- **What it shows**: 4-5 vertical bars (one per age milestone: 70, 80, 90, 95, 100 — adaptive based on user's life expectancy input), height = success%, color-coded by threshold (≥85% green / 75-84% blue / 50-74% amber / <50% red).
- **Why primary**: This IS the answer to the brief's core question — "Your plan is great until 80, risky after." One glance gives the verdict.
- **Placement**: Immediately below the toggle, above all other charts. Callout box with plain-English interpretation sits directly above bars ("Your plan shows 99% success until 70, declining to 42% by 95").

### SECONDARY (visible below primary): Line chart with confidence band
- **What it shows**: Corpus trajectory over time (age on X-axis, corpus value on Y-axis), with 10th/50th/90th percentile lines. Shaded ribbon between 10th-90th shows the confidence band. Adds "how much, not just whether" context.
- **Why secondary**: Supports the primary verdict with "here's what the range of outcomes looks like." Shows both upside (90th percentile) and downside (10th percentile).
- **Placement**: Below primary bar chart. Data table (sr-only by default, "Show data table" toggle for sighted users) sits below this chart.

### TERTIARY (collapsed by default, "Show more" expander): Heatmap — success% across age × allocation-mix matrix
- **What it shows**: Preview of "what if I shifted to more debt / more equity?" — Y-axis = age milestones, X-axis = allocation mix (e.g., 50/50, 60/40, 70/30 equity/debt), cell color = success% at that age × allocation.
- **Why tertiary**: Advanced exploration for power users. Optional v1; if scope tight, defer to v1.1.
- **Placement**: Below "Show more" toggle at bottom of Monte Carlo view.

### DOM order in `tab-projections.html`
1. Toggle (Ideal Scenario | Stress Test)
2. Callout box (plain-English summary)
3. Primary bar chart (success% by age)
4. Primary data table (sr-only by default, toggle-visible)
5. Secondary line chart (confidence band)
6. Secondary data table (sr-only by default, toggle-visible)
7. "Show more" expander (if tertiary heatmap in v1)
8. Tertiary heatmap chart (collapsed by default)
9. Tertiary data table (sr-only by default)

## 3. New tokens needed (vs reused from Phase 1)

### REUSE from Phase 1 (zero new tokens in these categories):
- **4 semantic colors**: `color.semantic.secondary` (#10b981 green), `color.brand.primary` (#2563eb blue), `color.semantic.warning` (#f59e0b amber), `color.semantic.danger` (#ef4444 red) — map directly to ≥85% / 75-84% / 50-74% / <50% success thresholds. WCAG AA contrast already verified in Phase 1 (`03-a11y-defaults.md` lines 10-34).
- **Callout pattern**: Phase 1 `.alert` (info/warning/danger variants) — reuse for plain-English interpretation box.
- **Segmented control**: Phase 1 documented toggle pattern in `00-design-mode.md` lines 116-159 (iOS-style segmented control for Ideal | Stress Test toggle).
- **Data table styles**: Phase 1 `.projection-table` from `tables.css` — reuse for sr-only data fallback.
- **sr-only utility class**: Phase 1 existing pattern for screen-reader-only content.
- **Focus outline**: Phase 1 `box-shadow: 0 0 0 3px rgba(37,99,235,0.1)` pattern — apply to toggle segments and "Show more" button.
- **Spacing tokens**: `spacing.16` (16px gap between toggle and chart), `spacing.20` (20px chart container padding), `spacing.24` (24px bottom margin).
- **Shadow, radii, transitions**: `shadow.default`, `radii.card` (12px), `transition.fast` (0.2s) — all reused.

### ADD (minimal extensions, no new color/spacing/radius values):
- **Progress bar component** (5-line CSS, no new tokens):
  - Uses `color.brand.primary` for fill
  - Uses `color.neutral.bg` for track
  - Uses existing `spacing.20` for height, `radii.sm` (8px) for rounded corners
  - Example: `.mc-progress { height: 20px; background: var(--neutral-bg); border-radius: 8px; } .mc-progress__fill { background: var(--primary); transition: width 0.2s; }`
- **Confidence band fill opacity** (reuses existing color token at 0.2 alpha):
  - Phase 1 already uses alpha variants (e.g., `rgba(37,99,235,0.1)` for focus glow)
  - Confidence band ribbon: `rgba(37,99,235,0.2)` — no new token, just alpha application of `color.brand.primary`

### DO NOT ADD:
- ❌ Any new color hue (purple, teal, etc.) — Phase 2 has no phase-rotation need; 4 semantic colors suffice
- ❌ New font, font-size, or font-weight token — reuse `typography.size.label` (0.85rem) for chart axis labels, `typography.size.base` (1rem) for bar % labels
- ❌ New spacing/radius/shadow token — existing set covers all needs

## 4. Constraints for UX/UI/DS specialists

### For UX Researcher:
- **Persona focus**: "first-time Monte Carlo user" — Pardha is technical, but most future users won't know what "Monte Carlo" means. Plain-English copy must teach, not assume. Avoid jargon ("stochastic inflation", "bootstrap resampling") in UI; reserve for tooltips or docs.
- **User journey**: cold-start sequence = user toggles → sees progress bar + cancel button during 5s sim → sees callout with punchline → sees primary bar chart → understands "great until 80, risky after 90" → optionally drills into secondary confidence-band chart → optionally clicks "Adjust Investment →" CTA if risky.
- **Copy thresholds** (from B3):
  - ≥85% success → "Your plan shows strong confidence"
  - 75-84% → "Your plan is OK but has some risk"
  - 50-74% → "Your plan is risky"
  - <50% → "Your plan is likely to fail"
- **Empty state**: "Configure inputs in Calculator tab to run Monte Carlo" (matches Phase 1 empty-state pattern).
- **Error state**: "Simulation failed, please refresh" (console.log error + UI toast — reuse Phase 1 `.alert.alert-danger` pattern).
- **A11y audit**: extend Phase 1 baseline (WCAG 2.1 AA). Verify 4 threshold colors meet contrast in both themes (already done in Phase 1, but double-check bar labels). Data-table sr-only fallback for both charts. Progress bar must have `aria-live="polite"` + `aria-valuenow` for screen-reader progress announcements.

### For UI Designer:
- **8 wireframe states required** (ASCII acceptable):
  1. Toggle position above existing summary cards in Projections tab
  2. Progress bar layout during sim (horizontal bar + "4,231 / 10,000 sims (42%)" text + Cancel button to right)
  3. Primary bar chart with callout above (show 5 bars colored green/blue/amber/red per thresholds, callout text "Your plan shows 99% success until 70…")
  4. Secondary line+confidence-band chart (X=age, Y=corpus, 3 lines for 10th/50th/90th percentile, shaded ribbon between 10th-90th)
  5. Cancel button placement (to right of progress bar, red `.btn-secondary` style with "Cancel" text)
  6. Empty state (gray placeholder card + "Configure inputs…" message + "Go to Calculator" link)
  7. Error state (red `.alert` banner above toggle with "Simulation failed" + retry/refresh CTA)
  8. Mobile 375px reflow (primary bar chart: bars narrower, rotate age labels 45° if needed; secondary chart: reduce height, consider stacking legend below)
- **Component reuse map**: which existing patterns reused (`.section-group`, `.summary-card`, `.chart-container`, `.alert`, `.btn-primary`, `.btn-secondary`).
- **Responsive behavior**: what changes at 1024px, 768px, 600px, 375px breakpoints (match Phase 1 `responsive.css`).

### For Design System Engineer:
- **Token extraction**: extend `03-design-tokens.json` from Phase 1 ONLY where absolutely needed. Current assessment: **zero new tokens** (progress bar reuses existing primitives, confidence-band opacity is alpha variant).
- **If any new tokens needed**, list each with:
  - Token name (e.g., `color.probability.high`)
  - Value (e.g., `{color.semantic.secondary}` alias)
  - Justification ("Maps ≥85% success to existing green semantic color")
- **Component specs to update** in `03-component-specs.md`:
  - SegmentedControl (toggle pattern)
  - ProgressBar (horizontal bar + text + cancel button)
  - MonteCarloChart (bar variant for primary, line+confidence-band variant for secondary)
  - CalloutBox (plain-English interpretation — reuses `.alert` pattern but document MC-specific copy templates)
  - DataTableFallback (sr-only table pattern for charts)
- **A11y verification** in `03-a11y-defaults.md`: confirm 4 threshold colors (green/blue/amber/red) meet WCAG AA in both light + dark themes. Already verified in Phase 1 lines 16-62; copy those rows into Phase 2 a11y doc with note "reused from Phase 1, no new verification needed."
- **Dark mode override spec**: every new component must have `body.dark-mode` CSS. Progress bar: dark track = `#0f172a`, fill = `#3b82f6`. Chart container: `#1e293b` background. Callout: reuse Phase 1 dark `.alert` variants.

## 5. Sign-off criteria

Design squad's deliverables (user journeys, wireframes, tokens, component specs, a11y audit) are accepted iff:

1. ✅ **Primary bar chart wireframe matches brief**: success% per age (vertical bars for 70, 80, 90, 95, 100), color-coded by B3 thresholds (green/blue/amber/red), plain-English callout above chart with punchline ("great until X, risky after Y").

2. ✅ **At least 2 charts spec'd**: primary (bar) + secondary (line+confidence-band). Tertiary heatmap is optional v1; if deferred, note in wireframes doc with "v1.1 candidate."

3. ✅ **All 8 wireframe states covered**: toggle, progress bar, primary chart, secondary chart, cancel button, empty state, error state, mobile 375px reflow. Each state has ASCII wireframe or description sufficient for FE to implement without guessing.

4. ✅ **Zero new color tokens added** (or if any added, each has explicit justification + WCAG AA contrast verification). Reuse of Phase 1's 4 semantic colors (green/blue/amber/red) is the baseline expectation.

5. ✅ **WCAG AA contrast confirmed for all 4 threshold colors** in both light + dark themes. UX Researcher's a11y audit must include: bar label text-on-color contrast (e.g., white "85%" text on green bar background), chart axis labels on panel background, callout text on alert background. If any fail, propose alternative (e.g., use white text on all bars, not colored text).

6. ✅ **Data-table sr-only fallback spec'd for both primary + secondary charts**. Tables must have `<caption>` describing content, `<th scope="col">` for column headers, `role="table"` if using divs instead of semantic HTML. "Show data table" toggle button spec'd for sighted users who prefer tabular view.

7. ✅ **Component reuse documented**: wireframes explicitly note which Phase 1 patterns are reused (`.alert`, `.chart-container`, `.section-group`, `.btn-primary`, segmented control from `00-design-mode.md` lines 116-159). If a new pattern is introduced (e.g., confidence-band ribbon), Design System Engineer must provide CSS structure + token mappings.

8. ✅ **Mobile responsive behavior explicit**: wireframes show what happens at <600px (bar chart: narrower bars? rotated labels? stacked layout?), <375px (minimum supported width per Phase 1). No horizontal scroll hell. Charts must degrade gracefully (reduce height, simplify labels, hide gridlines if needed).

9. ✅ **Dark mode accounted for every new component**: progress bar (dark track + bright fill), chart container (dark panel bg), callout (dark alert variants), toggle (dark segmented control bg). Design System Engineer's dark-mode spec must list every new CSS class with its `body.dark-mode` override.

10. ✅ **Progress bar + cancel UX spec'd**: progress bar shows "X / 10,000 sims (Y%)" during run, updates every 500ms (to avoid flicker). Cancel button to right of bar, red secondary button style, click sends `{type:'CANCEL'}` to worker. Progress bar disappears on completion or cancel.
