---
id: fe-005
type: feature
priority: P0
status: pending
owner:
created_by: orchestrator
files: [retirement-planner/pages/tab-projections.html, retirement-planner/css/tabs/projections.css]
blocks: [fe-006]
blocked_by: []
---

# fe-005 — Toggle UI + tab-projections HTML structure + CSS

## Description

Add a segmented-control toggle at the top of the existing Projections tab that switches between "Ideal Scenario" (existing year-by-year table — UNTOUCHED) and "Stress Test (Monte Carlo)" (new section). Add the new MC section's HTML skeleton (placeholders only — wiring is fe-006). Add CSS for toggle, MC section layout, callout, progress bar, and chart containers.

## HTML structure to add (in `retirement-planner/pages/tab-projections.html`)

ABOVE the existing `<div class="projection-summary" id="projectionSummary">`:

```html
<div class="mc-toggle" role="tablist" aria-label="Projection view">
  <button id="mc-toggle-ideal" role="tab" class="mc-toggle__btn mc-toggle__btn--active"
          aria-selected="true" aria-controls="mc-panel-ideal">Ideal Scenario</button>
  <button id="mc-toggle-mc" role="tab" class="mc-toggle__btn"
          aria-selected="false" aria-controls="mc-panel-mc">Stress Test (Monte Carlo)</button>
</div>
```

WRAP the existing summary cards + chart + table in:
```html
<div role="tabpanel" id="mc-panel-ideal" aria-labelledby="mc-toggle-ideal">
  ...existing content unchanged...
</div>
```

ADD AFTER the wrapped Ideal panel:
```html
<div role="tabpanel" id="mc-panel-mc" aria-labelledby="mc-toggle-mc" hidden>
  <div id="mc-empty-state" class="mc-empty-state" hidden>
    <p>Set your retirement age in the Calculator tab to run Monte Carlo analysis.</p>
    <button class="btn-primary" id="mc-empty-cta">Go to Calculator</button>
  </div>
  <div id="mc-progress" class="mc-progress" hidden>
    <div class="mc-progress__label">Running Monte Carlo simulation</div>
    <div class="mc-progress__bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Running Monte Carlo simulation">
      <div class="mc-progress__fill" id="mc-progress-fill" style="width:0%"></div>
    </div>
    <div class="mc-progress__count" id="mc-progress-count">Running 0 / 10,000</div>
    <button class="btn-secondary" id="mc-cancel-btn">Cancel</button>
  </div>
  <div id="mc-results" hidden>
    <div class="alert" id="mc-callout" role="status">
      <span class="alert__icon" id="mc-callout-icon" aria-hidden="true"></span>
      <p class="alert__text" id="mc-callout-text"></p>
      <button class="alert__cta" id="mc-callout-cta" hidden>Adjust Investment →</button>
    </div>
    <h3>Success Probability by Age</h3>
    <div class="chart-container"><canvas id="mc-bar-chart" tabindex="0" aria-label="Success probability by age" aria-describedby="mc-bar-table"></canvas></div>
    <button class="btn-link" id="mc-bar-table-toggle" aria-expanded="false" aria-controls="mc-bar-table">Show data table</button>
    <table id="mc-bar-table" class="mc-data-table" hidden>
      <caption>Success probability by age</caption>
      <thead><tr><th scope="col">Age</th><th scope="col">Success %</th><th scope="col">Risk Level</th></tr></thead>
      <tbody id="mc-bar-table-body"></tbody>
    </table>
    <h3>Corpus Trajectory (10th / 50th / 90th percentile)</h3>
    <div class="chart-container"><canvas id="mc-line-chart" tabindex="0" aria-label="Corpus trajectory percentiles" aria-describedby="mc-line-table"></canvas></div>
    <button class="btn-link" id="mc-line-table-toggle" aria-expanded="false" aria-controls="mc-line-table">Show data table</button>
    <table id="mc-line-table" class="mc-data-table" hidden>
      <caption>Corpus trajectory percentiles</caption>
      <thead><tr><th scope="col">Age</th><th scope="col">P10</th><th scope="col">P50 (Median)</th><th scope="col">P90</th></tr></thead>
      <tbody id="mc-line-table-body"></tbody>
    </table>
    <p class="mc-footer" id="mc-perf-footer"></p>
  </div>
</div>
```

## CSS to add (in `retirement-planner/css/tabs/projections.css`)

```css
/* Toggle */
.mc-toggle { display:inline-flex; gap:0; border:1px solid var(--color-border); border-radius:8px; overflow:hidden; margin-bottom:16px; }
.mc-toggle__btn { padding:8px 16px; background:transparent; border:none; cursor:pointer; font-weight:500; color:var(--color-text-secondary); }
.mc-toggle__btn--active { background:var(--color-brand-primary); color:#fff; }
.mc-toggle__btn:focus-visible { outline:2px solid var(--color-brand-primary); outline-offset:2px; }

/* Progress bar */
.mc-progress { padding:24px; text-align:center; }
.mc-progress__bar { width:100%; height:12px; background:var(--color-bg-subtle); border-radius:6px; overflow:hidden; margin:12px 0; }
.mc-progress__fill { height:100%; background:var(--color-brand-primary); transition:width 200ms ease; }
.mc-progress__count { color:var(--color-text-secondary); margin-bottom:12px; }

/* MC results */
#mc-results .alert { margin-bottom:16px; }
#mc-results h3 { margin:24px 0 8px; font-size:16px; }
.mc-data-table { width:100%; margin-top:8px; border-collapse:collapse; }
.mc-data-table th, .mc-data-table td { padding:6px 12px; border-bottom:1px solid var(--color-border); text-align:left; }
.mc-footer { margin-top:16px; color:var(--color-text-secondary); font-size:12px; }

/* Empty state */
.mc-empty-state { padding:32px; text-align:center; color:var(--color-text-secondary); }

/* Mobile */
@media (max-width:600px) {
  .mc-toggle { display:flex; flex-direction:column; }
  .mc-toggle__btn { width:100%; text-align:center; }
}
```

## Acceptance criteria

1. Toggle visible above summary cards, defaults to "Ideal Scenario" active
2. Clicking toggle does NOT yet swap panels (wiring in fe-006)
3. The `mc-panel-mc` panel renders all skeleton elements but `hidden` attribute defaults to true
4. Clicking the toggle (later via JS) toggles `aria-selected` + `aria-pressed` on the buttons + `hidden` on the panels
5. CSS styles render correctly in both light and dark mode (verified by toggling theme)
6. Mobile 375px: toggle stacks vertically, full-width buttons
7. **CRITICAL: existing year-by-year table content is BYTE-IDENTICAL** — only wrapped in a `<div role="tabpanel">` div, no inner edits

## Conventions to honor

- Match Phase 1 BEM-ish CSS naming (`.mc-toggle__btn--active`, etc.)
- Reuse Phase 1 design tokens (CSS vars `--color-*`)
- Reuse Phase 1 `.alert` callout pattern (no new styles for the callout body)
- All ARIA roles + attributes per Phase 2 design/03-a11y-defaults.md

## Test plan

Stage 4i smoke verifies: toggle rendered, buttons clickable, default state correct.
