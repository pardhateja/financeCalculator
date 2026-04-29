# Test Plan — Phase 2 Monte Carlo

Author: orchestrator (lean Stage 3)
Date: 2026-04-30

## Unit tests (in `test-montecarlo.html`)

| ID | Test | Asserts |
|---|---|---|
| ut-1 | mulberry32 reproducibility | seed=42 → identical 100-sample sequence across 5 runs |
| ut-2 | bootstrap sampling fairness | 100K samples from NIFTY history → mean within 1% of historical mean |
| ut-3 | single-sim corpus trajectory determinism | Same inputs + seed → identical year-by-year corpus path |
| ut-4 | success% convergence | 100-sim success% within 5% of 10K-sim ground truth at age 80 |
| ut-5 | success metric (corpus > 6mo buffer) | At age X, sim with corpus = 5mo buffer → fail; corpus = 7mo buffer → success |
| ut-6 | CPI bootstrap correlation | Resampled year applies same year's CPI AND same year's returns (preserves correlation) |
| ut-7 | age points clamping | retAge=35, lifeExp=85 → ages [45,55,65,75,85]; retAge=55, lifeExp=95 → [60,70,80,90,95] |
| ut-8 | color tier mapping | success=87 → 'green'; success=80 → 'blue'; success=60 → 'amber'; success=40 → 'red' |
| ut-9 | plain-English message generation | mixed tiers → "great until X, OK from X-Y, risky after Z" |
| ut-10 | localStorage round-trip | set 'montecarlo' → reload → toggle restored to 'montecarlo' |

## Integration tests (Stage 4i smoke via Playwright)

| ID | Scenario | Assert |
|---|---|---|
| it-1 | Cold-start Stress Test toggle | Click toggle → progress bar appears → wait for completion → bar chart canvas has bars |
| it-2 | Tab-independent execution | Start sim → switch to Calculator tab → wait 8s → switch back → results visible |
| it-3 | Cancel mid-sim | Click Cancel during sim → UI returns to Ideal Scenario in <1s |
| it-4 | Toggle persistence | Switch to Stress Test → reload → toggle starts on Stress Test |
| it-5 | Share-link reproducibility | Generate link with seed → open in fresh window → identical chart |
| it-6 | Empty state | Clear retirementAge → toggle Stress Test → "Configure inputs" message + CTA |
| it-7 | Phase 1 regression | Toggle Ideal → Year-by-Year table identical to main branch screenshot |
| it-8 | Mobile 375px reflow | Resize to 375px → toggle stacks, charts narrow, no horizontal scroll |
| it-9 | A11y keyboard navigation | Tab through entire MC view, verify focus-visible on each control |
| it-10 | A11y data-table fallback | "Show data table" button reveals sr-only table with 5 age rows |

## Adversarial cases (Stage 6 bug-bash)

- retirementAge > lifeExpectancy
- lifeExpectancy = 200 (gracefully clamp or reject)
- monthlyInvestment = 0
- Spam Stress Test toggle 50× rapidly
- Open dev tools, throw in worker postMessage
- Run on Safari file:// (Worker fallback path)
- Network airplane mode mid-sim (no effect — pure client-side)
