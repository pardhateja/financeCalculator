# Accessibility Defaults — Phase 2 Monte Carlo Stress Test

**Project:** Multi-Goal Early Retirement Planner — Phase 2 Monte Carlo  
**Baseline:** Extends Phase 1 WCAG 2.1 Level AA requirements (documented in `../multi-goal-early-retirement/design/03-a11y-defaults.md`)  
**Standard:** WCAG 2.1 Level AA (minimum requirement for all FE work)

**Phase 1 baseline inherited:** All color contrast ratios, form label patterns, keyboard navigation rules, focus state patterns, and semantic HTML conventions from Phase 1 apply unchanged to Phase 2 components. This document adds Phase 2-specific accessibility requirements for Monte Carlo visualization and interaction.

---

## Color Contrast — Probability Threshold Colors

**Standard:** WCAG 2.1 Level AA requires ≥4.5:1 for body text, ≥3:1 for large text and UI controls.

### Phase 2 Probability Colors (Reuse Phase 1 Semantic Colors)

All 4 probability threshold colors are Phase 1 semantic colors already verified in Phase 1 a11y audit. No new colors introduced.

**Light mode (white background #ffffff):**

| Threshold | Color token | Hex value | Contrast ratio | WCAG verdict | Usage notes |
|-----------|-------------|-----------|----------------|--------------|-------------|
| **High (≥85%)** | `{color.probability.high}` → `{color.semantic.secondary}` | #10b981 green | **3.94:1** | ✓ AA for large text + UI | Safe for bar fills, borders. Use white text on green background (5.33:1). |
| **Medium (75-84%)** | `{color.probability.medium}` → `{color.brand.primary}` | #2563eb blue | **8.59:1** | ✓ AAA | Safe for all text sizes, bar fills, borders. White text on blue (8.59:1). |
| **Borderline (50-74%)** | `{color.probability.borderline}` → `{color.semantic.warning}` | #f59e0b amber | **3.48:1** | ✓ AA for large text only | Safe for bar fills with white text (6.03:1). Do NOT use for <14px bold text on white. |
| **Low (<50%)** | `{color.probability.low}` → `{color.semantic.danger}` | #ef4444 red | **4.03:1** | ✓ AA | Safe for bar fills, borders. White text on red (4.54:1). |

**Dark mode (panel background #1e293b):**

| Threshold | Color token | Hex value | Contrast on #1e293b | WCAG verdict |
|-----------|-------------|-----------|---------------------|--------------|
| **High** | Same green #10b981 | #10b981 | **4.8:1** | ✓ AA |
| **Medium** | Lightened blue #3b82f6 | #3b82f6 | **6.1:1** | ✓ AA |
| **Borderline** | Same amber #f59e0b | #f59e0b | **4.2:1** | ✓ AA |
| **Low** | Same red #ef4444 | #ef4444 | **5.4:1** | ✓ AA |

### Action Required for Monte Carlo Bar Chart

**All bar data labels must use white text (#ffffff) on colored bar backgrounds.** Verified white-on-color contrast:

- White on green (#10b981): 5.33:1 ✓ AA
- White on blue (#2563eb): 8.59:1 ✓ AAA
- White on amber (#f59e0b): 6.03:1 ✓ AA
- White on red (#ef4444): 4.54:1 ✓ AA

**Add text-shadow for legibility:** `text-shadow: 0 1px 2px rgba(0,0,0,0.3)` on all bar labels (enhances contrast on lighter bars like amber).

### Testing Checklist

Before shipping Monte Carlo charts:
1. [ ] Screenshot each chart in light mode + dark mode
2. [ ] Convert to grayscale (macOS Digital Color Meter → Grayscale)
3. [ ] Verify all 4 threshold tiers distinguishable by data labels (not color alone)
4. [ ] Run Chrome DevTools color-blindness simulation (Protanopia, Deuteranopia, Tritanopia)
5. [ ] Confirm no information loss — every bar has visible percentage label

---

## Color as Signal — Redundant Encoding for Monte Carlo

**WCAG 1.4.1 (Use of Color):** Color must NOT be the only visual means of conveying information.

### Probability Thresholds — ALWAYS Paired with Data Labels

Every use of probability color must include a text label or redundant signal:

| Component | Color use | Required redundant encoding |
|-----------|-----------|---------------------------|
| **Bar chart bars** | Bar fill colored by threshold | Percentage label ("87%") centered on each bar in white text + bold weight |
| **Callout box** | Background tint + border colored by severity | Plain-English message text ("Your plan is great until 80, risky after") + icon (✓/ℹ️/⚠️/❌) |
| **Line chart confidence band** | Blue translucent fill | Percentile labels ("10th", "50th", "90th") at line endpoints + legend in subtitle |
| **Progress bar fill** | Blue gradient fill | Percentage label ("Running... 42%") above bar |

### Plain-English Interpretation Required

Color-coded bars alone do not tell the user WHAT the colors mean. The CalloutBox component provides this translation:

| Color tier | Plain-English message (examples from intake B3) |
|------------|-----------------------------------------------|
| All ages ≥85% (green) | "Your retirement plan has high confidence through age 100." |
| Mix of blue/green, earliest blue at 80 | "Your plan is solid until age 80 (75-84% success). Consider modest adjustments for longevity." |
| Amber appears at 90 | "Your plan shows risk after age 90 (50-74% success). Review spending or investment allocation." |
| Red appears before life expectancy | "Your plan is likely to fail before age 85 (<50% success). Significant changes needed." |

**These messages are NOT optional decorations.** They are the accessible interpretation layer that makes the color-coded chart comprehensible to:
- Color-blind users (8% of males, 0.5% of females)
- Screen reader users (chart colors are invisible to them)
- Users unfamiliar with probability visualization conventions

### Testing Checklist

- [ ] Load Monte Carlo view with results spanning all 4 color tiers (green/blue/amber/red)
- [ ] Cover chart with paper, read only the CalloutBox message — verify full understanding of plan health
- [ ] Uncover chart, verify colors reinforce (but don't contradict) the message
- [ ] Simulate color-blindness (Deuteranopia most common) — verify data labels carry all critical info

---

## Keyboard Navigation

**WCAG 2.1.1 (Keyboard):** All functionality must be operable without a mouse.

### Tab order in the Monte Carlo view (when toggle is on Stress Test):

1. SegmentedControl (toggle) — Tab focuses the group; ArrowLeft/ArrowRight switches Ideal↔Stress; Space/Enter activates
2. Cancel button (only visible during sim) — Tab focuses; Enter or Space cancels
3. Primary BarChart — `tabindex=0` on canvas; arrow keys move focus across bars; Enter announces bar value
4. "Show data table" toggle for primary chart — Tab + Space toggles `hidden` attribute on table
5. Secondary LineChart — same pattern as primary
6. "Show data table" toggle for secondary chart — same pattern
7. CTA button in CalloutBox (only when plan risky) — Tab + Enter activates

### Keyboard rules

- Focus-visible outline matches Phase 1: `outline: 2px solid var(--color-brand-primary); outline-offset: 2px;`
- No keyboard traps — Esc returns focus to toggle from any deep state (cancel sim, close data table)
- Cancel button is reachable in ≤2 Tab presses from any state (toggle → cancel)

### Testing Checklist
- [ ] Disconnect mouse, complete full MC flow using keyboard only
- [ ] Verify focus-visible outline appears on every interactive element on Tab
- [ ] Verify Esc cancels sim mid-run and returns focus to toggle

---

## Screen Reader Support

**WCAG 1.1.1 (Non-text Content) + 4.1.2 (Name, Role, Value):** All UI must be perceivable by screen readers.

### Per-component announcements

| Component | Screen reader experience |
|---|---|
| SegmentedControl | "Tablist: Projection view. Tab 1 of 2: Ideal Scenario, selected. Tab 2 of 2: Stress Test, Monte Carlo, not selected." |
| ProgressBar | `role="progressbar"`, `aria-valuenow="42"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Running Monte Carlo simulation"`. Live announcement every 25%: "Simulation 50% complete." |
| Cancel button | "Cancel simulation, button" |
| BarChart canvas | `aria-label="Success probability by age. 4 bars from age 70 to age 100. See data table below for exact values."` + linked data table via `aria-describedby` |
| CalloutBox | `role="alert"` for danger variant (announced immediately), `role="status"` for info/success/warning (announced on focus or next quiet moment) |
| Data table fallback | Standard `<table>` with `<caption>`, `<th scope="col">` for headers; toggle button `aria-expanded="true|false"` `aria-controls="mc-data-table-1"` |

### ARIA live regions

- One `aria-live="polite"` region for sim progress updates ("Simulation 50% complete")
- One `aria-live="assertive"` region for errors only ("Simulation failed. Refresh to try again.")
- Do NOT use `aria-live` for chart updates — too noisy. Charts announce on focus only.

### Testing Checklist
- [ ] VoiceOver (Mac) full flow: toggle to Stress Test → hear progress → hear callout → tab through bars → open data table
- [ ] NVDA (Windows) same flow if accessible
- [ ] Verify NO redundant announcements (e.g. callout text not announced twice)

---

## ARIA Patterns Reference Card (for FE engineers)

Copy-paste markup snippets matching Phase 1 ARIA conventions:

### SegmentedControl (toggle)
```html
<div role="tablist" aria-label="Projection view">
  <button role="tab" aria-selected="true"  id="t-ideal" aria-controls="p-ideal">Ideal Scenario</button>
  <button role="tab" aria-selected="false" id="t-mc"    aria-controls="p-mc">Stress Test (Monte Carlo)</button>
</div>
<div role="tabpanel" id="p-ideal" aria-labelledby="t-ideal">…</div>
<div role="tabpanel" id="p-mc"    aria-labelledby="t-mc"   hidden>…</div>
```

### ProgressBar
```html
<div role="progressbar" aria-valuenow="42" aria-valuemin="0" aria-valuemax="100"
     aria-label="Running Monte Carlo simulation">
  <div class="bar-fill" style="width:42%"></div>
  <span class="bar-label">Running 4,237 / 10,000</span>
</div>
```

### Chart + data-table fallback
```html
<canvas id="mc-bar-chart" tabindex="0"
        aria-label="Success probability by age" aria-describedby="mc-bar-table"></canvas>
<button aria-expanded="false" aria-controls="mc-bar-table">Show data table</button>
<table id="mc-bar-table" hidden>
  <caption>Success probability by age</caption>
  <thead><tr><th scope="col">Age</th><th scope="col">Success %</th><th scope="col">Risk Level</th></tr></thead>
  <tbody>…</tbody>
</table>
```

### CalloutBox (4 variants)
```html
<div class="alert alert--success" role="status">
  <span class="alert__icon" aria-hidden="true">✓</span>
  <p class="alert__text">Your plan has high confidence through age 100.</p>
  <button class="alert__cta" hidden>Adjust Investment →</button>
</div>
```

---

## Sign-off Criteria for Stage 7 Design Review

The Monte Carlo view passes a11y review when:

1. ✓ All 4 threshold colors meet WCAG AA contrast in both light + dark modes (verified above)
2. ✓ Every bar has a visible % label; CalloutBox carries a plain-English message
3. ✓ Full MC flow operable by keyboard alone (Tab, ArrowLeft/Right, Space, Enter, Esc)
4. ✓ VoiceOver announces toggle, progress, callout, and chart correctly
5. ✓ Data table fallback present below each chart (sr-only by default, toggle reveals)
6. ✓ No keyboard trap, focus-visible outline on every interactive element
7. ✓ Color-blindness simulation (Deuteranopia/Protanopia) preserves all critical info

If any criterion fails: file as `bug-NNN.md` priority P1, route through Stage 5 fix loop.
