# FE Task Plan — Phase 2 Monte Carlo

Author: orchestrator (lean Stage 3 — direct write per Pardha's directive)
Date: 2026-04-30

## Task partitioning (disjoint files = parallelizable)

| ID | Subject | Files (disjoint) | Blocks | Blocked by |
|---|---|---|---|---|
| fe-001 | Historical-returns dataset | `js/historical-returns-data.js` | fe-002 | — |
| fe-002 | Monte Carlo Worker engine | `js/calc-montecarlo-worker.js` | fe-003 | fe-001 |
| fe-003 | Main-thread MC orchestrator + PRNG | `js/calc-montecarlo.js` | fe-004, fe-005 | fe-001, fe-002 |
| fe-004 | Bar + Line chart renderer | `js/chart-montecarlo.js` | fe-006 | — (parallel with 1/2/3) |
| fe-005 | Toggle UI + tab-projections HTML + CSS | `pages/tab-projections.html`, `css/tabs/projections.css` | fe-006 | — (parallel with 1/2/3) |
| fe-006 | Wire toggle → MC engine → charts (integration) | none new — modifies fe-005's HTML/JS hooks | fe-007 | fe-003, fe-004, fe-005 |
| fe-007 | Share-link extension (`&view=montecarlo&mcseed=N`) | `js/sharelink.js` | — | fe-006 |
| fe-008 | build.sh wiring + index.html script tags | `build.sh` | — | fe-001..fe-006 |

Wave 1 (parallel): fe-001, fe-004, fe-005 (no dependencies)
Wave 2 (parallel): fe-002 (after fe-001), fe-003 may start (waits on fe-002)
Wave 3 (sequential): fe-006 → fe-007 → fe-008
QA (parallel with all): qa-001, qa-002

## Conventions to honor (from Tech Spec + my-conventions)

- Vanilla JS, namespace under `window.RP` (Phase 1 convention)
- No `Math.random()` — use seeded mulberry32 PRNG (fe-003)
- Reuse Phase 1 design tokens (no new colors); use semantic `--color-success/--color-info/--color-warning/--color-danger`
- Reuse Phase 1 `.alert` callout pattern, segmented-control button pattern, sr-only utility
- Persist toggle state in `localStorage['rp_projection_view']` ('ideal' default | 'montecarlo')
- All Phase 1 tabs/files **byte-identical** after our changes — only `tab-projections.html`, `css/tabs/projections.css`, `sharelink.js`, `build.sh`, `index.html` (auto via build.sh) are touched
- Test fixtures captured from REAL Worker output before writing test mocks (per global rule — no fictional shapes)
