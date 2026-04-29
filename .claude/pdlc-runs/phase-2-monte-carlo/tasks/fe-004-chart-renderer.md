---
id: fe-004
type: feature
priority: P0
status: pending
owner:
created_by: orchestrator
files: [retirement-planner/js/chart-montecarlo.js]
blocks: [fe-006]
blocked_by: []
---

# fe-004 — Bar + Line chart renderer for Monte Carlo

## Description

Create `retirement-planner/js/chart-montecarlo.js` exporting two render functions: `RP.renderMcBarChart(canvasId, data, opts)` and `RP.renderMcLineChart(canvasId, data, opts)`. Pure Canvas 2D, no library dependencies.

## API contracts

### `RP.renderMcBarChart(canvasId, data, opts)`

```
data = {
  ages: [70, 80, 90, 95, 100],          // age milestones
  successPct: [99, 92, 71, 55, 38],     // success% per age (0-100)
  riskTier: ['high','high','borderline','borderline','low']  // matches color tiers
}
opts = { darkMode: false }
```

Renders vertical bars: height = successPct (Y-axis 0-100%), color by tier:
- `high` (≥85%) → CSS var `--color-success` (green)
- `medium` (75-84%) → CSS var `--color-info` (blue)
- `borderline` (50-74%) → CSS var `--color-warning` (amber)
- `low` (<50%) → CSS var `--color-danger` (red)

Each bar has a centered white % label with text-shadow for legibility. Age labels on X-axis. Y-axis grid at 0/25/50/75/100.

### `RP.renderMcLineChart(canvasId, data, opts)`

```
data = {
  ages: [50, 55, 60, ..., 100],         // every 5 years from retirement
  p10: [...], p50: [...], p90: [...]    // corpus percentiles in INR
}
opts = { darkMode: false }
```

Renders P50 as solid line, P10-P90 range as translucent confidence band (alpha 0.2). Age X-axis, INR Y-axis (₹ formatted with crore/lakh suffixes).

## Acceptance criteria

1. Both functions render to a `<canvas>` element by ID without errors
2. Bar chart colors match the 4 threshold tiers (use `getComputedStyle` to read CSS vars at runtime — works in light + dark)
3. Line chart confidence band visible (translucent fill between P10/P90)
4. Both responsive — re-renders cleanly at 375px width (mobile) and 1200px width (desktop)
5. Both have `aria-label` set on canvas describing chart purpose
6. Bar labels (% values) have white text + `text-shadow: 0 1px 2px rgba(0,0,0,0.3)` for legibility
7. Y-axis values formatted: "0%, 25%, 50%, 75%, 100%" for bar; "₹0, ₹50L, ₹1Cr, ₹2Cr" for line
8. No external dependencies — pure Canvas 2D + getComputedStyle

## Conventions to honor

- Style: match `retirement-planner/js/chart.js` patterns (existing Phase 1 chart wrapper) — same dpr handling, same getBoundingClientRect pattern
- IIFE wrapper, namespace under `window.RP`
- All CSS color values read via `getComputedStyle(document.documentElement).getPropertyValue('--color-success')` — never hardcode hex
- DPR-aware: `canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr)`

## Test plan

Add a smoke test to `test-montecarlo.html` that calls both functions with stub data and verifies canvas has non-zero dimensions + no console errors.
