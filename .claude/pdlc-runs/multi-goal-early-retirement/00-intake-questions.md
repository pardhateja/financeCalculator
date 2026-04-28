# Consolidated Intake Questions — Multi-Goal Early Retirement Planner

Consolidated from 00-pm-questions.md (8 blockers, 10 nice-to-resolve), 00-tech-questions.md (6 blockers, 11 nice-to-resolve), 00-design-questions.md (5 blockers, 10 nice-to-resolve). Total 19 raw blockers + ~31 nice-to-resolve. Deduplicated below.

---

## Decisions the orchestrator made (NOT asked of Pardha; documented in 00-intake-assumptions.md)

These were "blockers" in one or more agent files but the existing project + intake make the right answer obvious. Pardha can override at Gate A.

| # | Question | Default applied | Source |
|---|---|---|---|
| A1 | Target user profile | Indian early retirees / FIRE community (existing planner defaults — ₹3.5L salary, age 35 retirement — are India-specific) | PM B1 |
| A2 | Architecture: tab vs standalone vs new top-level | New tab in existing retirement-planner ("Multi-Goal" between Goals and Emergency) | Tech B1, PM B5, Design implicit |
| A3 | Persistence | Extend existing profiles + sharelinks with `_phases` field; backward-compat by field absence | Tech N2, PM B7 |
| A4 | Phase age semantics | Absolute user age (startAge=50, endAge=54). User does the kid-age math themselves. Entity modeling deferred. | Tech B2 |
| A5 | Overlapping phases | ALLOWED — sum expenses for any year covered by multiple phases. Show informational badge "Overlaps with [other phase]" | Tech B2, Design #7 |
| A6 | Gaps in age coverage | ALLOWED — uncovered years have zero post-retirement expense. Show informational warning "Ages X-Y: no expenses configured" | Tech B2, Design #7 |
| A7 | Phase count limit | Unbounded for v1 (matches existing Goals tab); soft cap only if performance issue | Tech B2 |
| A8 | Inflation per phase | Single rate per phase (matches existing single-rate input model). Per-category inflation deferred. | Tech implicit, Design #14 |
| A9 | Phase duration model | Start age + end age (absolute years) — easier to reason about life phases | Design #15, Tech B2 |
| A10 | Income side scope | Confirmed OUT-OF-SCOPE (per intake: "does NOT want to take this into wealth journey"). Existing pre-retirement income modeling unchanged. | PM B8, Tech N8 |
| A11 | Mobile responsiveness | YES, follow existing responsive.css patterns | Design #9, PM #7 |
| A12 | Dark mode | YES, must support both modes (project has darkmode.js) | Design #13 |
| A13 | Phase color assignment | Auto-assign from extended palette (Phase 1 = blue, 2 = emerald, 3 = amber, 4 = purple, 5 = teal). User does NOT pick colors. | Design #5 |
| A14 | Phase reordering | No drag-and-drop. Auto-sort by startAge. | Design #12 |
| A15 | Phase deletion | No confirmation modal. Toast notification with 5s undo. (If toast component is too much for v1, fall back to confirmation modal — FE Lead's call.) | Design #11 |
| A16 | Comparison view (single vs multi side-by-side) | NOT in v1 — deferred to follow-up | Design #10 |
| A17 | Acceptance criteria detail | Detailed Given/When/Then with numeric examples (QA Lead needs testable AC) | PM #9 |
| A18 | Module split | Single new file `calc-multigoal.js` (matches existing per-tab pattern) | Tech N1 |
| A19 | State namespace | Flat `RP._phases` (matches existing `RP._goals` convention) | Tech N4 |
| A20 | Build.sh changes | Minimal: add tab to nav loop + add script tag + add nav-tab button | Tech N6 |
| A21 | Phase naming | Freeform text input (matches Goals tab convention) | PM #4 |
| A22 | Phase config UI pattern | Match Goals-tab pattern: inline form at top, list of cards below, edit by re-entering values (no inline edit in v1) | Design #2, PM #4 |
| A23 | Empty state | Plain message "No phases added yet — add your first life phase above" + "Load Example" button that pre-fills the 4 intake-doc phases | Design #6 |
| A24 | Visualization type for phases | Horizontal scrollable timeline strip (Gantt-style) on desktop, vertical stack on mobile | Design #1 |
| A25 | Allocation visualization | Horizontal stacked bar (CSS-only, no Chart.js extension needed) + numeric breakdown table | Design #3 |
| A26 | Per-phase color in projection table | Add small colored badge in "Active Phase" column showing phase name | Design #4 |
| A27 | Underfunded indicator | `.health-indicator` colored dot pattern (existing) — green funded, red underfunded | Design #8 |

---

## Genuinely need Pardha's input (the AskUserQuestion batch)

These are decisions the orchestrator should NOT make — they meaningfully shape the product, scope, or experience. Asked in this turn.

### Q1 — Corpus allocation algorithm (the core math decision)

How should the corpus be allocated across phases when the user defines multiple phases with different ages and inflation rates?

**Options:**
- **Sequential (waterfall)**: One pool. Year-by-year, withdraw inflated expense for whichever phase is active. If pool depletes mid-life, show "runs out at age X". Simplest. Matches existing single-bucket engine. *Risk: late phases may be starved if early phases overspend.*
- **PV-proportional (recommended)**: At retirement, calculate present value of each phase's needs (using post-return discount rate). Split corpus into sub-buckets proportional to PV. Each bucket grows/depletes independently. *Benefit: every phase gets its fair share.*
- **User-defined %**: User manually sets allocation (e.g., "40/30/20/10"). Most control, most cognitive load.
- **Hybrid**: Default to PV-proportional, allow user to override per-phase.

### Q2 — Co-existence with existing single-goal flow

When the user configures multi-goal, what happens to the existing single-bucket Projections / Dashboard / What-If tabs?

**Options:**
- **Separate, both visible**: Multi-goal lives in its own tab. Other tabs stay using `postRetireMonthly`. User can toggle between them mentally.
- **Multi-goal tab + override**: When multi-goal phases exist, Projections/Dashboard/What-If automatically use the multi-goal expense model. Existing single-bucket inputs become "ignored if phases exist" with a small notice.
- **Mode toggle**: Top-level radio button "Single-goal mode | Multi-goal mode" — switches what the entire app calculates.

### Q3 — Allocation deficit handling (under-funded scenario)

If the user's projected corpus < total PV needed across all phases, what do we do?

**Options:**
- **Warn + show partial-funded projection**: pre-flight allocation table with red deficit row(s) + projection runs anyway showing each phase running out at its own age
- **Block with actionable suggestion**: refuse to render projection, show "Increase monthly investment by ₹X OR reduce Phase Y by Z% to balance"
- **Both**: warn + show projection + show actionable suggestion

### Q4 — Success measurement

How will we know the feature is successful? (Drives PRD goals section; also tells us whether we need analytics added.)

**Options:**
- **Personal validation only**: "Pardha uses it for his own early retirement planning and trusts the numbers" — no metrics, no analytics
- **Add lightweight analytics**: Plausible.io / Cloudflare web analytics to track "% of visitors who configure multi-goal vs single-bucket" + "time spent on multi-goal page"
- **Qualitative feedback**: ship + share with FIRE community (Reddit r/FIRE_Ind etc.) + collect feedback informally
- **All of the above**

### Q5 — Test harness

Project has zero automated tests. For multi-goal math correctness:

**Options:**
- **Manual fixture only**: "Load Example" button populates known scenario; Pardha verifies output by hand
- **Tiny test harness page**: New `test-multigoal.html` with hardcoded scenarios + inline JS asserts + DOM output (no test framework, runs in browser)
- **Add a real test runner**: Vitest/Jest, requires npm setup, breaks the "no build tools" convention but enables CI
