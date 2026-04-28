# Orchestrator-defaulted assumptions

These are decisions the orchestrator made during Stage 0 question consolidation, based on existing project conventions and the intake brief. **Pardha sees this list at Gate A (Stage 2) and can override anything that's wrong** — at which point Stage 1 work updates accordingly.

The principle: don't pause the run for a question whose answer is obvious from the existing project + intake. Pause only for genuinely product-shaping decisions (those went to AskUserQuestion in Stage 0).

| # | Question | Default applied | Why this default |
|---|---|---|---|
| A1 | Target user profile | Indian early-retirement / FIRE community | Existing planner defaults are India-specific (₹3.5L/mo salary, retirementAge 35) |
| A2 | Architecture | New tab "Multi-Goal" between Goals and Emergency in existing retirement-planner | Matches the existing 16-tab pattern; no need to duplicate site chrome |
| A3 | Persistence | Extend existing profiles + sharelinks with `_phases` field; backward-compat by field absence | Phases are higher-effort to configure than goals — losing on reload would be painful |
| A4 | Phase age semantics | Absolute user age (`startAge`/`endAge`). User does kid-age math themselves. | Avoids entity modeling; matches existing planner's `currentAge`/`retirementAge`/`lifeExpectancy` model |
| A5 | Overlapping phases | Allowed; sum expenses for any year covered by multiple phases | Real-world overlaps (medical + lifestyle + still-supporting-kids) are common; warn but don't block |
| A6 | Gap years | Allowed; uncovered years = zero post-retirement expense; show informational warning | User may legitimately model "no expenses years" |
| A7 | Phase count limit | Unbounded for v1 | Matches existing Goals tab convention |
| A8 | Inflation per phase | Single rate per phase (not category-level) | Matches existing single-rate inflation; intake mentions phase-level only |
| A9 | Phase duration model | Start age + end age (absolute years) | Most intuitive for life-phase thinking |
| A10 | Income side scope | Out of scope (intake explicitly excludes mid-retirement income) | Per intake verbatim |
| A11 | Mobile responsiveness | Yes, follow existing `responsive.css` patterns | Existing planner is responsive; new tab must match |
| A12 | Dark mode | Yes, both modes | Project already supports dark mode via `darkmode.js` |
| A13 | Phase color assignment | Auto-assign from extended palette (blue, emerald, amber, purple, teal, rotate) | Avoids color-picker complexity; design system supports semantic palette |
| A14 | Phase reordering | Auto-sort by `startAge`; no drag-and-drop | Time-based ordering is the natural mental model |
| A15 | Phase deletion | No confirmation modal; toast with 5s undo (fall back to confirmation modal if toast component is too costly for v1) | Reduces friction; data is local-storage so recoverable |
| A16 | Comparison view (single vs multi) | Deferred to follow-up | Intake doesn't ask for it |
| A17 | AC detail level | Detailed Given/When/Then with numeric examples | QA needs testable AC |
| A18 | Module split | Single new file `calc-multigoal.js` | Matches existing per-tab pattern |
| A19 | State namespace | Flat `RP._phases` (matches `RP._goals`) | Existing convention |
| A20 | Build.sh changes | Minimal: add tab to nav loop, add script tag, add nav-tab button | Existing build pattern |
| A21 | Phase naming | Freeform text input | Matches Goals tab |
| A22 | Phase config UI | Inline form at top + list of cards below; edit by re-entering values (no inline edit in v1) | Matches Goals tab pattern; avoids new accordion component |
| A23 | Empty state | "No phases added yet" + "Load Example" button pre-filling intake's 4-phase template | Matches Goals empty state + reduces setup friction |
| A24 | Phase visualization | Horizontal scrollable timeline strip (Gantt-style) on desktop, vertical stack on mobile | Best communicates the "lifecycle" concept |
| A25 | Allocation visualization | Horizontal stacked bar (CSS-only) + numeric breakdown table | No Chart.js extension needed; mobile-friendly |
| A26 | Per-phase color in Projection table | Small colored badge in "Active Phase" column | Reuses existing badge pattern |
| A27 | Underfunded indicator | `.health-indicator` colored dot pattern (green funded, red underfunded) | Reuses existing component |

**If any of these is wrong**, raise it at Gate A. The Discovery squad in Stage 1 will treat them as binding inputs unless overridden.
