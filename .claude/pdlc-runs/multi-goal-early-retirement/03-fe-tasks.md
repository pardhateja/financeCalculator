# Frontend Task Breakdown — Multi-Goal Early Retirement Planner

**FE Lead**: pdlc-fe-lead  
**Date**: 2026-04-27  
**Status**: Published

---

## Summary

| ID | Title | Files Touched | Blocked By | Estimate (hrs) |
|----|-------|---------------|------------|----------------|
| fe-001 | Scaffold Multi-Goal tab structure | `pages/tab-multigoal.html` (new), `js/calc-multigoal.js` (new), `build.sh`, `index.html` (regen) | — | 0.5 |
| fe-002 | Phase CRUD UI + form validation | `js/calc-multigoal.js`, `pages/tab-multigoal.html`, `css/multigoal.css` (new) | fe-001 | 1.5 |
| fe-003 | Math engine: PV allocation + projection loop | `js/calc-multigoal.js` | fe-001 | 2.0 |
| fe-004 | Pre-flight allocation table + stacked bar | `js/calc-multigoal.js`, `pages/tab-multigoal.html`, `css/multigoal.css` | fe-002, fe-003 | 1.5 |
| fe-005 | Projection table extension + chart phase regions | `js/calc-multigoal.js`, `js/chart.js` (READ-ONLY extend) | fe-003 | 1.5 |
| fe-006 | Persistence: localStorage + Load Example | `js/calc-multigoal.js` | fe-002 | 1.0 |
| fe-007 | Sharelink optional encoding (Option C) | `js/sharelink.js`, build.sh HEAD section | fe-006 | 1.0 |
| fe-008 | Dark mode parity | `css/multigoal.css`, `css/dark.css` | fe-002, fe-004, fe-005 | 0.75 |
| fe-009 | Mobile responsive | `css/multigoal.css`, `css/responsive.css` | fe-002, fe-004, fe-005 | 1.0 |
| fe-010 | Math test page | `test-multigoal.html` (new, sibling of `index.html`), `js/test-multigoal-fixtures.js` (new) | fe-003 | 1.5 |

**Total estimate**: ~12.25 hours (1.5–2 engineer-days)  
**Parallel waves**:
- Wave 1: fe-001 (no blockers)
- Wave 2: fe-002, fe-003, fe-006 (all blocked by fe-001 only)
- Wave 3: fe-004, fe-005, fe-007, fe-010 (blocked by Wave 2)
- Wave 4: fe-008, fe-009 (blocked by Wave 3)

**Longest path**: fe-001 → fe-003 → fe-005 → fe-008 = 4 tasks deep

---

## Atomicity Check

Each task touches a **disjoint set of files** (or mutually exclusive sections of shared files):
- **Shared file: `js/calc-multigoal.js`** — tasks partition by function blocks (CRUD UI vs Math engine vs Persistence)
- **Shared file: `css/multigoal.css`** — fe-002 writes base styles, fe-008/fe-009 add dark/mobile overrides (non-conflicting)
- **No file modified by >1 task in same wave** (enforced by `blocked_by` frontmatter)

---

## Notes for Engineers

### Design Token Usage (MANDATORY)
Every task referencing colors, spacing, or typography MUST cite specific tokens from `design/03-design-tokens.json`:
- Phase colors: `{color.phase.1}` through `{color.phase.6}` (auto-rotate, NO raw hex codes)
- Spacing: `{spacing.16}`, `{spacing.20}`, etc. (NO magic numbers like `14px`)
- Typography: `{typography.size.h3}`, `{typography.weight.bold}`, etc.

### Convention Checker Requirement
Before writing ANY new component, run:
```bash
grep -r "summary-card" retirement-planner/css/
grep -r "\.btn-primary" retirement-planner/css/
grep -r "localStorage\.setItem" retirement-planner/js/
```
Match the EXACT patterns found. If uncertain, spawn `convention-checker` agent.

### Test Coverage Rule (Per Global Rule #8)
Every `v-if` / conditional render MUST have TWO tests:
1. `expect(...exists()).toBe(true)` when condition met
2. `expect(...exists()).toBe(false)` when condition NOT met

**Why**: Vue composable mocks with plain objects `{ value: false }` always evaluate to truthy in `v-if` checks unless you use real `ref()`.

### Mock-First Workflow
There is NO backend for this feature — all data is client-side. No mocks needed, no BE swap. Every task works with real data from the start (localStorage + in-memory `RP._phases` array).

---

## Contract Changes Protocol
If Tech Lead publishes updates to `03-data-contracts.md` after tasks are assigned:
1. FE Lead reads the diff
2. Greps `tasks/fe-*.md` for tasks consuming the changed schema field
3. SendMessages affected engineers with the diff + what to update
4. If task already `completed`, opens a `bug-NNN.md` to track the fix

---

## Final Pre-Ship Checklist (fe-008, fe-009, fe-010 must all pass)
- [ ] All 10 FE tasks marked `completed`
- [ ] `test-multigoal.html` shows 100% pass rate (all scenarios green)
- [ ] Dark mode toggle: no white-background leaks, text readable
- [ ] Mobile 375px viewport: all inputs ≥44px tap targets, tables scroll horizontally
- [ ] Keyboard-only navigation: Tab through all interactive elements, Enter/Space triggers actions
- [ ] VoiceOver / NVDA: phase cards, allocation table, projection table all readable
