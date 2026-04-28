# Multi-Goal v1.1 — Tone & Locked Decisions (Survives Compaction)

This document is the durable record of decisions + collaboration tone for the v1.1 iteration of the Multi-Goal Early Retirement Planner. It exists outside the `.claude/` folder so it gets committed with the code, and any agent (orchestrator, sub-agent, future Claude session) reads it as part of normal `docs/` exploration.

**If you are an AI agent reading this**: these decisions are LOCKED. Do not propose alternatives. Do not "improve" them. The reasons each was chosen are explained — read them, then build to spec.

---

## Section 1 — Collaboration tone (Pardha's preferences, hard-won)

These are NOT my (the orchestrator's) preferences. These are Pardha's, learned the painful way during the v1 + v1.1 conversations. Future agents must inherit them.

### 1.1 Build partner, not consultant
Use "we" naturally. "Let's check this." "Our next step." Pardha is a known collaborator, not a stranger to onboard. Direct partnership tone, never service-provider politeness.

### 1.2 Don't ship what you haven't driven yourself
"QA passed" / "engineer reported smoke pass" / "math test 15/15 green" / "stakeholder approved" — none of these equal "I drove the user flow end-to-end and saw it work." Verification by report is verification by hearsay. Before claiming a feature is ready to ship, the orchestrator MUST drive the cold-start user flow themselves: open the app fresh, click the new feature, perform the 3-5 most likely user actions, observe with your own tool calls that real values render correctly. If browsers are locked or unavailable, say so and request real-browser verification — do not claim ready.

### 1.3 Diagnose first, don't pre-rank fix options
When the user reports a problem, the response is NOT "Option A or B or C, you pick." That dresses up incomplete diagnosis as collaboration. The response IS: reproduce the failure, find the actual root cause, then propose ONE concrete fix. Multi-choice menus belong in scope/preference questions, not bug reports. If you genuinely can't tell which of two causes it is, say so — don't paper over it with a menu.

### 1.4 Don't dress up bugs as documentation issues
If a feature doesn't work end-to-end and the user reports it, do not respond with "the message is technically accurate but assumes you understand the internal data flow." That is gaslighting in slow motion. A user-visible "do this first" message in a feature that should just work IS a bug, regardless of how technically correct the message is.

### 1.5 Ask early when uncertain — slower start beats wrong direction
Pardha's words: *"We can together if it takes time at the initial phases too I'm ok we shouldn't repeat the same issue again and again."* Treat as a hard preference: when in doubt about scope completeness (especially basic CRUD: Add+Edit+Delete are the floor unless explicitly excluded), ASK BEFORE BUILDING. Cost of wrong direction > cost of one extra question.

### 1.6 Engineer-flagged spec contradictions must surface to user
When a spawned engineer reports "the task body says X but the AC list says Y, I shipped Y, please confirm" — that flag is the engineer doing their job. The orchestrator's job is then to surface it to the user, not silently auto-defer. Auto-deferring is silent scope contraction.

### 1.7 Synthetic stakeholder-external is mandatory for UX features
"The user is the owner, no need for synthetic external stakeholder" is wrong. The owner KNOWS what was built (they read the design + spec); a stranger only knows what they want to do. Skipping the synthetic-stranger review means gaps only the stranger would notice (missing Edit, confusing first-use message, cold-start race) survive to launch.

### 1.8 When user gives feedback, accept the miss — don't reframe as a learning moment for them
The user already KNOWS something missed. They don't need it explained as "good catch" or repackaged as polish. Accept the failure cleanly, fix the root cause, surface the prevention. Skip the "thanks for catching that" — they didn't catch it as a favor; they caught it because it's broken.

### 1.9 No cowardly fixes. Fix the root cause, not the symptom.
"Use less tmux", "drop the feature", "just live with it" — all forbidden. When tooling fights back, fix the tooling. Pardha's words: *"Dont we coward to fix the instant fixes, we will fix the underlying issues. If fix will happen from next run then i can go and do the needful. But leaving the issue mid way is never my way."*

### 1.10 Explain BEFORE fixing
Pardha's words: *"when there is something wrong please dont cowardly move to fix directly. Explain me what is the issue and how can we fix that and not get into that issue going forward."* Format every problem-encountered response as: (1) what broke + evidence, (2) why it broke (root cause), (3) how to fix THIS instance, (4) how to prevent the CLASS going forward, (5) WAIT for user call. Never skip (4) or (5).

### 1.11 Match cadence to the request
"Do it" → just do it and report back. "Think with me" → multi-option AskUserQuestion is appropriate. "Investigate" → diagnose deeply before reporting. The signal is in what he asks for — honor the form.

### 1.12 Cumulative documentation
When we learn something, write it down so future sessions don't re-learn. Stage docs, decision records, this file. Survive session crashes. Survive context compaction. Survive the next person opening the folder.

### 1.13 UI density rule for tabular data
Any field that goes in a column-constrained table cell or compact badge needs a max-15-char display variant (auto-derived OR user-supplied). Long-form labels live in tooltips, phase cards, and breakdown tables. Short labels live in projection tables and badges. **Specify both at design-time** — discovering the truncation issue at Gate B (bug-013) is a design-spec gap. Future Stage 1 design squad's `03-component-specs.md` MUST include a "tabular-context display name" spec for any element that appears in compact contexts.

---

## Section 2 — v1.0 launched state (for reference)

Multi-Goal Early Retirement Planner v1.0 is **on main** as of 2026-04-27 (commits b1d76a4 → 4c7e93f). Features: phase CRUD with Edit (Gate B addition), PV-proportional allocation, year-by-year projection table + chart with phase-shaded regions, math test page (15/15 pass), localStorage persistence + optional sharelink encoding, dark mode + mobile responsive, all 16 existing tabs unchanged. 12 bugs filed in v1, 4 fixed P0 + 4 deferred-then-fixed at Gate B + 4 false positives + 2 wontfix.

---

## Section 3 — v1.1 LOCKED decisions

These are the decisions Pardha made during the v1.1 conversation. Each is paired with the verbatim user message that locked it, so future agents can verify intent.

### 3.1 — Feature C: Multi-Goal real-Pardha defaults (10-phase template)

**Replaces** the existing 4-phase Indian FIRE example template (`RP._phaseExampleTemplate` in `js/calc-multigoal.js`) with a 10-phase model that matches Pardha's actual life plan.

| # | Name | Age range | Monthly | Inflation | Why |
|---|---|---|---|---|---|
| 1 | Base | currentAge → 100 | ₹50,000 | 6% | Always-on baseline (no kids) |
| 2 | Kid 1 at home | 28 → 45 | ₹10,000 | 6% | Add-on (overlaps Base) |
| 3 | Kid 1 college fees | 45 → 49 | ₹8,333 (₹1L/yr) | **10%** | Education inflation |
| 4 | Kid 1 hostel | 45 → 49 | ₹8,333 (₹1L/yr) | **7%** | Hostel inflation |
| 5 | Kid 1 pocket money | 45 → 49 | ₹15,000 | 6% | Lifestyle inflation |
| 6 | Kid 2 at home | 35 → 52 | ₹10,000 | 6% | Add-on (overlaps Base + Kid1) |
| 7 | Kid 2 college fees | 52 → 56 | ₹8,333 (₹1L/yr) | **10%** | Education inflation |
| 8 | Kid 2 hostel | 52 → 56 | ₹8,333 (₹1L/yr) | **7%** | Hostel inflation |
| 9 | Kid 2 pocket money | 52 → 56 | ₹15,000 | 6% | Lifestyle inflation |
| 10 | Medical add-on | 70 → 100 | ₹20,000 | 12% | Medical inflation (add to Base) |

**Empty Nest is removed** — Base ₹50k (which always runs) IS the empty-nest expense. No separate Empty Nest phase.

**Locked by Pardha**: *"For B3 i will show you simple approach... lets you say 'I had ₹X before tracking started, and I've added ₹Y since' this looks good ... sorry to adjust one more during college as well there need to be some pocket money and hostel fees ... 15k for pocket money and 1 lakh for hostel fees both same for both kids inflation 6% each"* + later *"7% for hostel done"*.

**Math engine note**: existing `RP._multigoal.calculateAllocation` and `runProjection` already sum overlapping phases per year (this was the Stage 4 design, verified by qa-002 + qa-003). 10 overlapping phases work as-is. UI cost: 10 cards in phase list, 10 rows in allocation pre-flight, 10 colored segments in stacked bar.

### 3.2 — Feature "Expense Profile in today's rupees" (NEW dashboard view)

**New section** inside Multi-Goal tab, between "Corpus Projection by Phase" and "Year-by-Year Projection":
- Section heading: **"Expense Profile (in today's rupees)"**
- A line chart: x = age (currentAge → lifeExpectancy), y = monthly expense in TODAY's rupees (no inflation applied), with phase-shaded vertical regions matching the existing chart
- A table below the chart: **per-phase breakdown at each age** — columns: Age | Active Phases (badges) | Per-phase amounts | Total monthly (today's rupees)

**Why it's useful**: with 10 overlapping phases, the inflated chart shows steeply-rising values (compounding) that hide the actual life-decision shape. The today's-rupees view shows the stair-step profile (kids → college → empty → medical) in real terms.

**Locked by Pardha**: *"As there are multiple overlaps, can we add One more dashboard for this at each age starting from my age what is the expense expected without inflation addition"* + *"going with your recommendation Option β"* (the separate-view option) + *"wow this looks cool per-phase breakdown nice idea."*

### 3.3 — Feature A: DOB → auto current age

**New input field on Basics tab**: `Date of Birth` (HTML date picker, default 1998-04-19 to seed Pardha's actual case).

**Existing `currentAge` field**: becomes computed from DOB by default, read-only. Small "Override" toggle next to it makes it editable for testing/scenarios.

**DOB persistence**: stored in profiles + sharelinks alongside the existing input fields.

**Backward compat**: if a sharelink/profile has `currentAge` but no `dateOfBirth`, leave currentAge as the manually-typed value (do NOT crash, do NOT overwrite). When DOB is added later, switch to computed mode.

**Locked by Pardha**: *"1st current age need to calculate automatically based on my birthday like 19-apr-1998 28 years recently. we need to have an option to change as well."* + *"A is correct"*.

### 3.4 — Feature B: Tracker → Current Total Savings rollup

**Restructure of "Current Total Savings" field on Basics tab** (used everywhere in app: Projections, What-If, Multi-Goal, Dashboard, etc.).

Currently: 1 editable field (`#currentSavings`).

After: 3 fields stacked together:
1. **Seed** (`#currentSavingsSeed`): editable. "I had ₹X before tracking started." User-typed.
2. **Tracker rollup** (`#trackerRollupAmount`): READ-ONLY. Computed from `RP._tracker` entries with monthly compound interest using the post-tax blended return from Financial Plan tab.
3. **Total** (`#currentSavings`): READ-ONLY. Auto-computed = Seed + Tracker rollup. **This** is the value all other tabs read.

**Interest math (per Pardha's B1 lock)**:
- Read `blendedReturn` and `taxRate` from Financial Plan tab's existing computed values
- `postTaxAnnualRate = blendedReturn × (1 - taxRate)`
- `monthlyRate = (1 + postTaxAnnualRate)^(1/12) - 1`
- For each tracker entry with `(amount, date)`: `currentValue = amount × (1 + monthlyRate)^monthsElapsedToToday`
- Tracker rollup = sum of all `currentValue`

**Persistence**:
- `seed` saves to profiles + sharelinks like any other input field
- `tracker rollup` is COMPUTED — never persisted. Always re-derived from `RP._tracker` entries on render.
- `total` is COMPUTED. Same — never persisted directly.

**Backward compat**:
- Existing profiles/sharelinks have `currentSavings` as a single value. On load, treat that as the SEED. Tracker rollup starts at 0 for legacy profiles (no migration needed — they have no tracker entries yet).
- Existing code paths that READ `RP.val('currentSavings')` continue to work — `#currentSavings` is still the field, just now read-only with computed value.

**Locked by Pardha**: *"this new field is used everywhere else the calculations are happening with current amount"* + *"in financial plan step we have Pre-Retirement Investment Mix where we calculate blended return and tax per year"* + *"the value in added should be read only. It only need to come from tracker."* + *"when adding the interest should also be calculated so everything is in place"*.

---

## Section 4 — Order of execution

1. **Feature C** (10-phase template) — pure data change, ~5 lines, lowest risk. Ship first to unblock Pardha's real planning.
2. **Expense Profile view** — additive UI, ~30 min. Doesn't change any existing math.
3. **Feature A** (DOB → auto age) — moderate, touches Basics HTML + minor JS. ~30 min.
4. **Feature B** (Savings rollup) — biggest blast radius. Last. Touches Basics HTML, Financial Plan reads, Tracker logic, Profiles, Sharelinks. ~1-2 hr with verification.

Each feature gets its own commit + orchestrator-driven cold-start verification before "ready" claim. No agent-spawned engineer claims supersede the orchestrator's own playwright drive.

---

## Section 5 — Workflow choice (NOT full PDLC)

This v1.1 iteration uses **lightweight orchestrator-direct + targeted agent spawns**, NOT the full PDLC ceremony. Reasons:
- We're inside an already-active PDLC run (Stage 8) — sub-PDLC would create stage-numbering chaos
- Most changes are additive UI with low blast radius
- PRD/Tech-Spec stages are overhead we don't need (spec is in this conversation)
- Biggest PDLC payoff (parallel waves) doesn't apply for ~4 small features

What's preserved from PDLC discipline:
- Plan files written BEFORE code (this folder's other .md files)
- Verification by orchestrator's own playwright drive (not agent reports)
- Explain-before-fix protocol (Section 1.10)
- Cold-start smoke before "ready" claim (Section 1.2)

If a feature unexpectedly grows (e.g., B savings rollup ends up touching 8 files), we can spawn ONE engineer for it with the proper prompt template. Default is orchestrator-direct.
