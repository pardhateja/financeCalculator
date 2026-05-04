---
id: fe-001
type: feature
priority: P0
status: pending
owner:
created_by: orchestrator
files: [retirement-planner/js/historical-returns-data.js]
blocks: [fe-002]
blocked_by: []
---

# fe-001 — Historical returns dataset (NIFTY + Debt + Gold + CPI 1991-2025)

## Description

Create `retirement-planner/js/historical-returns-data.js` that exports `window.RP._historicalReturns` containing 35 years of annual returns (1991-2025) for 4 series: NIFTY 50, Indian debt index, gold, and Indian CPI.

## Source citations (must be inline JS comments next to each array)

- **NIFTY 50**: NSE annual returns — Wikipedia "NIFTY 50" historical performance page + NSE official data
- **Debt**: CRISIL Composite Bond Fund Index annual returns — CRISIL official data, fallback to 10-yr GoI bond yields
- **Gold**: MCX gold annual returns in INR — MCX historical + Wikipedia "Gold prices in India"
- **CPI**: India CPI annual % change — RBI Database on Indian Economy + World Bank India CPI data

Use credible publicly-cited approximations. If exact data unavailable for early-1990s years, use reasonable historical proxies and document the proxy in inline comments.

## Acceptance criteria

1. File exports `window.RP._historicalReturns = { years: [1991, ..., 2025], nifty50: [...35 numbers], debt: [...35], gold: [...35], cpi: [...35] }`
2. Each array has exactly 35 elements (1991 through 2025 inclusive)
3. Numbers are decimal fractions (e.g., 0.124 = 12.4% return)
4. NIFTY array contains years with negative returns (2008 = -0.52, 2011 = -0.25 approximately)
5. CPI array values in 0.04 to 0.12 range (4-12% annual inflation, with structural breaks acknowledged in comments)
6. File is plain JS, no dependencies, namespaced under `window.RP`
7. File size < 5KB minified (it will be ~140 numbers + comments)

## Conventions to honor

- Vanilla JS, no ES6 modules (project doesn't bundle)
- IIFE wrapper to avoid polluting global scope: `(function(){ window.RP = window.RP || {}; window.RP._historicalReturns = {...}; })();`
- Comments cite source for each year-range or anomaly
- No external network calls — all data inline

## Test plan (handled by qa)

`test-montecarlo.html` ut-2 will sample from this dataset; just need it to load cleanly via `<script>` tag.
