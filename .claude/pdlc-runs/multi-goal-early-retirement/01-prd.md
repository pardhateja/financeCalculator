# Product Requirements — Multi-Goal Age-Phased Early Retirement Planner

**Owner**: pdlc-product-manager  
**Status**: draft  
**Date**: 2026-04-27

## 1. Problem
The current retirement planner models retirement as **one** post-retirement monthly expense multiplied by one inflation rate, applied flat from `retirementAge` to `lifeExpectancy`. For early retirees this is wrong because life has **phases** with different cost curves and different inflation behavior:

| Phase example | Years | Cost behavior | Inflation behavior |
|---|---|---|---|
| Active early-retirement w/ kids at home | retAge .. ~50 | High (lifestyle, kids) | General CPI |
| Kids in college | ~18-22 of kids' age | Spike | Education inflation (often 8-10%) |
| Empty nest / kids self-sufficient | ~mid-50s onward | Drops sharply | General CPI |
| Late retirement / medical | ~70+ | Rises | Medical inflation (often 10-12%) |

A single-bucket model forces early retirees to either:
- Over-save (use the highest-cost phase for all years), tying up excess capital unnecessarily
- Under-save (average across phases), risking depletion during high-cost periods

**Source**: Direct user request from Pardha, the app's creator and primary user, based on personal early retirement planning needs.

## 2. Users
**Primary user**: Pardha, Indian FIRE (Financial Independence Retire Early) community member, high-income tech professional planning early retirement (age 30-45 bracket).

**Characteristics**:
- Plans retirement before age 40-45 (not traditional age 60)
- Has or plans to have children (expense modeling includes education phases)
- India-resident (inflation defaults align with Indian CPI, education, and medical inflation rates)
- Financially literate (comfortable with concepts like present value, inflation-adjusted expenses, corpus depletion modeling)

**No additional personas invented** — this is a personal-use tool being built for a specific real user (Pardha) and potentially shared with similar Indian FIRE community members.

## 3. Goals (measurable)
**Goal**: Personal validation — Pardha completes a multi-goal early retirement plan, finds the projected numbers credible, and uses the output to inform his real-world financial planning decisions.

**Measurement**: 
- Metric: Pardha's direct confirmation that the multi-goal model produces more realistic corpus requirements than the single-bucket model for his specific life-phase scenario
- Target: Feature ships and Pardha uses it for at least one complete planning session (defines phases, reviews allocation, trusts the deficit/surplus recommendations)
- Baseline: N/A — this is a new capability, no prior multi-goal usage exists

**Note**: No analytics integration, no external user tracking. Success is qualitative and personal-use scoped per Pardha's Q4 answer.

## 4. Non-goals
What this feature explicitly does NOT do:

1. **Modeling mid-retirement income** (promotions, side income, kids' contributions during retirement) — explicitly excluded per intake. Multi-goal models expense side only.
2. **Changing existing retirement planner tabs** — Projections, Dashboard, What-If, Financial Plan tabs continue to use single-bucket `postRetireMonthly` as today. Multi-goal is a separate view.
3. **Pre-retirement savings allocation** — monthly SIP/investments are NOT split across goal-specific buckets during accumulation phase. All savings flow to one corpus; allocation happens at retirement.
4. **Multi-currency or international tax modeling** — India-specific inflation defaults and ₹ currency only.
5. **Real-time collaboration or cloud sync** — local storage persistence only, no backend.
6. **Automated phase recommendations** — user manually defines phase age ranges, amounts, and inflation rates. No AI/ML suggestions.
7. **Comparison view (single-bucket vs multi-goal side-by-side)** — deferred to follow-up per assumption A16.
8. **Integration with existing Goals tab** — lump-sum goals (house, car, education fund) remain separate from life-phase expense modeling.
9. **Test framework changes** — no Vitest, no npm test harness. Math validation via tiny in-browser test page only, per Pardha's Q5 decision.

## 5. User stories

**US1**: As an early retiree, I want to define multiple expense phases with different monthly costs and inflation rates, so that my retirement projection reflects reality (high costs with kids at home, spike during college, drop during empty nest).

**US2**: As a FIRE planner, I want to see upfront whether my current corpus will fully fund all defined phases, so that I know if I need to save more before retiring.

**US3**: As a user configuring phases, I want to see a pre-flight allocation breakdown showing how much corpus is needed for each phase (present value basis), so that I understand the funding distribution before running the full projection.

**US4**: As a user with an underfunded plan, I want to receive actionable suggestions ("Increase monthly investment by ₹X OR reduce Phase Y costs by Z%"), so that I know exactly what to adjust to close the gap.

**US5**: As a user new to multi-goal planning, I want to load a pre-configured example with 4 realistic Indian early-retirement phases (kids at home, college, empty nest, medical), so that I can quickly understand the feature without starting from scratch.

**US6**: As a user who switches devices, I want my defined phases to persist to localStorage profiles and sharelinks, so that I don't lose my configuration on reload or when sharing with a financial advisor.

**US7**: As a mobile user, I want the multi-goal phase entry and projection table to be responsive, so that I can use the feature on my phone during financial planning discussions.

## 6. Acceptance criteria

**AC1 — Phase CRUD**  
Given: User opens the Multi-Goal tab  
When: User clicks "Add Phase", enters name "Kids at Home", startAge 35, endAge 50, monthlyExpense ₹80,000, inflation 6%, and saves  
Then: Phase card appears with all details, auto-sorted by startAge, assigned a color (blue)

**AC2 — Phase deletion**  
Given: 3 phases exist  
When: User clicks delete icon on "Phase 2"  
Then: Phase is removed from list, remaining phases re-sort, toast shows "Phase deleted" with 5s undo option (or confirmation modal if toast is too costly)

**AC3 — Overlapping phases (allowed)**  
Given: Phase A (age 35-60, ₹50k/mo) and Phase B (age 45-55, ₹30k/mo) both exist  
When: Projection runs for age 50  
Then: Year 50 row shows total expense = (₹50k + ₹30k) × 12 × inflation adjustments = combined inflated annual expense

**AC4 — Gap years (allowed with warning)**  
Given: Phase A covers age 35-50, Phase B covers age 60-100, retirement age 35, life expectancy 100  
When: User saves phases  
Then: Warning toast appears: "Gap detected: ages 51-59 have no phase coverage (₹0 expense assumed)"

**AC5 — PV-proportional allocation pre-flight**  
Given: Corpus at retirement = ₹5 crore, 3 phases defined:
- Phase 1: age 35-50, ₹80k/mo, 6% inflation → PV needed ≈ ₹1.8 crore
- Phase 2: age 50-55, ₹1.2L/mo, 9% inflation → PV needed ≈ ₹0.9 crore
- Phase 3: age 55-100, ₹50k/mo, 6% inflation → PV needed ≈ ₹2.5 crore  
Total PV needed = ₹5.2 crore  
When: User clicks "Calculate Allocation"  
Then: Pre-flight table displays:
| Phase | PV Needed | Allocation % | Allocated Corpus | Status |
|---|---|---|---|---|
| Phase 1 | ₹1.8 cr | 34.6% | ₹1.73 cr | 🔴 Underfunded (-₹0.07 cr) |
| Phase 2 | ₹0.9 cr | 17.3% | ₹0.87 cr | 🔴 Underfunded (-₹0.03 cr) |
| Phase 3 | ₹2.5 cr | 48.1% | ₹2.40 cr | 🔴 Underfunded (-₹0.10 cr) |
| **Total** | ₹5.2 cr | 100% | ₹5.0 cr | 🔴 **Shortfall: ₹0.2 cr** |

**AC6 — Deficit suggestion (actionable)**  
Given: AC5 scenario (₹0.2 crore shortfall)  
When: Pre-flight allocation shows deficit  
Then: Suggestion card displays:  
"**Your plan is underfunded by ₹20 lakhs.** To close the gap:
- Option 1: Increase monthly SIP by **₹8,500** (assumes 15 years to retirement, 12% pre-retirement return)
- Option 2: Reduce Phase 2 (Kids in College) expense from ₹1.2L/mo to **₹1.08L/mo** (10% reduction)"

**AC7 — India inflation defaults (Load Example button)**  
Given: User clicks "Load Example" on empty Multi-Goal tab  
When: Example loads  
Then: 4 pre-filled phases appear:
1. "Kids at Home" (age 35-50, ₹80k/mo, **6%** inflation — general CPI)
2. "Kids in College" (age 50-55, ₹1.2L/mo, **10%** inflation — education)
3. "Empty Nest" (age 55-70, ₹50k/mo, **6%** inflation — general CPI)
4. "Medical / Late Retirement" (age 70-100, ₹70k/mo, **12%** inflation — medical)

**AC8 — Year-by-year projection with phase tracking**  
Given: AC7's 4-phase example loaded, corpus ₹5 crore, retirement age 35, pre-retirement return 12%, post-retirement return 8%  
When: User navigates to Multi-Goal Projections table  
Then: Table shows columns: Age | Active Phase(s) | Annual Expense (inflated) | Corpus Start | Withdrawals | Growth | Corpus End  
Example row for age 52:  
| 52 | 🟡 Kids in College | ₹18.2L | ₹4.1 cr | ₹18.2L | ₹31.4L | ₹4.23 cr |

**AC9 — Persistence to localStorage profiles**  
Given: User creates 3 phases, saves profile as "Pardha FIRE Plan v2"  
When: User reloads page and loads profile "Pardha FIRE Plan v2"  
Then: All 3 phases restore with exact same names, age ranges, expenses, inflation rates, colors

**AC10 — Sharelink persistence**  
Given: User defines 2 phases, clicks "Generate Sharelink"  
When: User opens sharelink URL in incognito browser  
Then: Multi-Goal tab loads with the 2 phases pre-filled (read-only or editable based on existing sharelink behavior)

**AC11 — Dark mode parity**  
Given: User toggles dark mode on  
When: User views Multi-Goal tab  
Then: All phase cards, allocation table, projection table, and form inputs render correctly in dark mode (no white-background leaks, text remains readable)

**AC12 — Mobile responsive**  
Given: User opens Multi-Goal tab on 375px viewport (iPhone SE)  
When: User scrolls through phase cards and allocation table  
Then: Phase cards stack vertically, form inputs are touch-friendly (min 44px tap targets), allocation table scrolls horizontally with sticky phase name column

**AC13 — Math test page passes**  
Given: `test-multigoal.html` exists with 5 hardcoded scenarios covering: single phase, overlapping phases, gap years, underfunded corpus, overfunded corpus  
When: Developer opens `test-multigoal.html` in browser  
Then: All 5 test scenarios show ✅ PASS with exact expected vs actual PV, allocation %, and depletion age matches

## 7. Out of scope (deferred)

Items explicitly considered but NOT included in v1:

1. **Comparison view (single-bucket vs multi-goal)** — Side-by-side table showing "old model says you need ₹8 crore, new model says ₹6.5 crore" (assumption A16). Deferred to v2 based on user feedback.

2. **Drag-and-drop phase reordering** — Phases auto-sort by startAge; manual reorder not needed for time-based model (assumption A14). Could be added if user wants logical grouping separate from chronological order.

3. **Phase color picker** — Auto-assigned colors from palette (blue, emerald, amber, purple, teal, cycling). Custom color selection deferred (assumption A13).

4. **Per-phase passive income** — Existing pension/rental income (if modeled) applies uniformly across all phases in v1. Assigning specific income sources to specific phases (e.g., "pension starts age 60, only offsets Phase 3+4") deferred to v2.

5. **Monte Carlo / range-based inflation** — Each phase uses single inflation rate. Modeling inflation as a range (6-8%) with probabilistic outcomes deferred (matches existing planner's deterministic model).

6. **Phase templates library** — v1 has one "Load Example" button with Indian FIRE 4-phase template. Additional templates (e.g., "US early retirement", "Single person no kids", "Expat returning to India") deferred.

7. **Integration with existing What-If scenarios** — What-If tab continues to model single-bucket scenarios. Applying phase structure to "What if I retire at 40 vs 45?" deferred.

8. **Inline phase editing** — v1 uses "re-enter values to edit" pattern (matches existing Goals tab). Click-to-edit-in-place for phase cards deferred (assumption A22).

9. **Export to PDF/CSV** — Projection table and allocation breakdown export deferred. User can screenshot or copy-paste in v1.

10. **Undo/redo beyond toast** — 5-second undo on phase deletion only. Full undo stack for all edits deferred.

## 8. Open questions

**NONE** — All blockers from Stage 0 (00-pm-questions.md) were resolved via Pardha's Q1-Q5 locked answers and orchestrator-defaulted assumptions A1-A27.

If new questions emerge during implementation:
- **BLOCKER-level**: Pause and escalate to Pardha via team-lead (Gate A or Gate B only, per hard constraint #6)
- **NICE-TO-RESOLVE**: Tech Lead documents in implementation notes, defaults to simplest option, flags for post-launch iteration

## 9. Success metrics

**How we know post-launch this worked** (personal validation scope, no analytics):

1. **Primary metric: Credibility check**
   - **What**: Pardha completes one full multi-goal planning session (defines 3-5 phases, reviews allocation, runs projection to age 100)
   - **Target**: Pardha confirms "the PV allocation math makes sense" and "the deficit suggestion is actionable"
   - **Measurement**: Direct verbal confirmation or written feedback at end of bug bash
   - **Time horizon**: Within 1 week of Stage 8 completion

2. **Secondary metric: Math correctness**
   - **What**: All 5 test scenarios in `test-multigoal.html` pass (PV calculations, allocation percentages, depletion age predictions)
   - **Target**: 100% pass rate (5/5 green)
   - **Measurement**: Manual check of test page before bug bash
   - **Time horizon**: Stage 4 implementation completion

3. **Tertiary metric: Feature adoption (if shared)**
   - **What**: If Pardha shares the tool with Indian FIRE community (reddit, Discord), track qualitative feedback
   - **Target**: At least 2 users report "multi-goal model changed my retirement plan"
   - **Measurement**: Manual aggregation of comments/DMs (no instrumentation)
   - **Time horizon**: 1-3 months post-launch (optional, not gating)

**Dashboard**: None (no analytics). Success is binary: Pardha uses it or doesn't.

**Failure signal**: Pardha reverts to using single-bucket planner because "multi-goal numbers don't match my spreadsheet" or "allocation logic is confusing." If this happens, root-cause in retro and iterate math/UX.

## 10. Anti-patterns to AVOID

Common LLM-PM failure modes that could derail this PRD:

1. **Inventing personas beyond Pardha** — Do NOT create "Priya, 32, Bengaluru software engineer" or "Rajesh, 40, Mumbai consultant" personas. Pardha is the real user. Indian FIRE community is the potential audience, not a researched persona set.

2. **Vague acceptance criteria** — "User can define phases successfully" is not testable. AC5's table with exact ₹5 crore corpus, 3 phases, PV calculations, and red/green status indicators — THAT is testable. Every AC must have a concrete example.

3. **Conflating goals and metrics** — "Improve early retirement planning accuracy" is a goal. "Pardha confirms PV allocation math matches his spreadsheet within 2% margin" is a metric. Both sections exist; don't merge them.

4. **Scope creep via "while we're in there"** — If Tech Lead discovers `utils.js` has a helper that could be refactored, that's OUT OF SCOPE unless it blocks multi-goal implementation. Hard constraint #1: don't disturb existing tabs. Applies to shared utilities too unless absolutely required.

5. **Treating assumptions as optional** — The 27 orchestrator-defaulted assumptions (A1-A27 in 00-intake-assumptions.md) are binding unless Pardha overrides at Gate A. "Should we use phase color picker instead of auto-assign?" — NO, A13 already decided. Don't re-litigate.

6. **Proposing Vitest "for better coverage"** — Pardha explicitly closed this in Q5. The test harness is `test-multigoal.html` (tiny in-browser page). Do NOT suggest npm test frameworks in retro or follow-up recommendations. He said: "I'm ok with one but don't say at last if bug bash is there it would have been better."

7. **Ignoring the "no mid-retirement income" constraint** — Intake says explicitly: "if they go to higher levels in job there might be additional income as well, but explicitly does NOT want to take this into the wealth journey." Do not add "Optional passive income during Phase 2" as a stretch goal. It's a hard NO.

8. **Assuming analytics exist** — This is vanilla HTML/CSS/JS with no backend. No Google Analytics confirmed. Success metrics CANNOT reference "30-day retention" or "conversion rate" or "dashboard link." Personal validation only.

9. **Over-scoping the PV allocation math** — AC5 requires PV-proportional allocation with deficit detection. Do NOT extend to "optimization algorithm that minimizes shortfall by auto-adjusting phase expenses." User manually adjusts based on suggestions. No solver, no optimizer.

10. **Breaking backward compatibility** — Existing profiles (saved before multi-goal feature) must load without error. New `_phases` field is additive. Profile schema versioning must be backward-compatible (absence of `_phases` = single-bucket mode, no crash).
