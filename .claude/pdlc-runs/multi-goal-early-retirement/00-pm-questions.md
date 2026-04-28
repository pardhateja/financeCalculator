# PM Questions — Multi-Goal Age-Phased Retirement Planner

Generated: 2026-04-27  
Context: Intake doc read, existing retirement planner structure explored (17 tabs, vanilla JS, build.sh concatenator, localStorage profiles system exists but implementation not confirmed in source scan).

---

## BLOCKERS (cannot write PRD without answer)

### 1. Target user profile — who specifically?
**Question:** Is the target user:
- Indian early retirees (FIRE community, age 30-45, tech/high-income professionals)?
- Any early retiree regardless of country/income?
- General retirement planners who want age-phased expense modeling (not just early retirement)?

**Why blocker:** "Early retirement" in the intake suggests FIRE community, but the existing planner has defaults like ₹3.5L/month salary and retirement age 35 — very specific to Indian high earners. Without knowing the user segment, I cannot scope correctly whether we need:
- India-specific defaults (education inflation 8-10%, medical 10-12%)
- Multi-currency support
- Assumptions about family structure (the "kids at home / college / empty nest" phases assume nuclear family model)

If the user is "Indian FIRE community", the PRD's non-goals can exclude international tax, USD, global healthcare. If broader, we need to widen scope or document gaps.

### 2. Primary success metric — what makes this feature successful?
**Question:** This is a vanilla static HTML app with no backend. Success measurement options:
- **Personal validation:** "Pardha uses it for his own early retirement planning and trusts the numbers"
- **Qualitative feedback:** Share with Indian FIRE community (reddit/Discord), collect feedback on accuracy/usefulness
- **Feature completeness:** Multi-goal model produces different (more realistic) corpus requirement than single-bucket for early retirement scenarios
- **Optional analytics:** If Pardha adds Google Analytics or plausible.io, track engagement (% of visitors who use multi-goal vs single-bucket)

**Why blocker:** The PRD template requires "Goals (measurable)" section. If success = "Pardha's own use case is solved", that's valid but means no baseline/target metrics. If success = community adoption, we need to define how we collect feedback. Need explicit answer to set PRD scope correctly.

### 3. Minimum viable phase count and coverage rules
**Question:** Validation rules for phase configuration:
- Can the user create 1 phase (degenerate case — just the new UI for single-bucket planner)?
- Must phases cover the full retirement period (retirementAge to lifeExpectancy) with no gaps?
- Can phases overlap (e.g., "kids in college" 18-22 runs concurrent with "base living" 35-100)?
- What's the max number of phases (UX/performance limit)?

**Why blocker:** Acceptance criteria depend on this. If phases must cover full period with no gaps/overlaps, AC includes validation error messages ("Gap detected: no phase covers age 50-55"). If overlaps allowed, we need additive vs priority logic (do we sum overlapping expenses or pick the higher one?). The intake's example table shows sequential non-overlapping phases, but that's not a spec.

### 4. Corpus allocation strategy — how do we fund each phase?
**Question:** When the user defines 4 phases with different amounts and inflation rates, how does the engine allocate the retirement corpus?
- **Sequential funding (simpler):** One corpus pool. Year-by-year, withdraw inflated expense for current phase. If depleted mid-phase, show "runs out age X". This is how the existing single-bucket planner works.
- **Pre-allocated buckets (complex):** At retirement, calculate present value needed for each phase, split corpus into 4 separate buckets. Each bucket grows/depletes independently. Show 4 balance lines on chart.
- **Hybrid:** One corpus, but calculate upfront "total needed across all phases" to show sufficiency warning before retirement (like existing Goals tab does for lump-sum goals).

**Why blocker:** This is the core engine logic. The intake says "segregate the income towards each one" — but that phrase is ambiguous:
- If "segregate" = **pre-retirement saving** (allocate monthly savings to different goal buckets while working), that's a major scope increase (affects the entire saving phase, not just retirement projection).
- If "segregate" = **post-retirement allocation** (corpus is divided into phase-specific buckets at retirement), that's complex but doable.
- If "segregate" = **just model each phase's cost separately** but draw from one pool sequentially, that's simplest and matches existing engine.

Need explicit answer on which model Pardha expects. The AC and tech spec differ significantly based on this choice.

### 5. Integration with existing tabs — replace, supplement, or independent?
**Question:** The existing retirement planner has Basics, Expenses, Investments, Financial Plan, Projections, Dashboard, What-If, Goals, etc. When the user creates a multi-goal plan:
- **Replace mode:** Multi-goal plan overrides `postRetireMonthly` (single-bucket expense) and recalculates all tabs (Dashboard, Projections, What-If) to use phase-based expenses.
- **Supplement mode:** Multi-goal plan is a separate "scenario" — the existing tabs still show single-bucket, multi-goal has its own Projections-style table.
- **Independent mode:** Multi-goal is a new top-level page (like `multi-method-calculator.html`), shares no state with retirement-planner/index.html.

**Why blocker:** Scope and effort differ by 3x:
- Replace mode: modify calc-projections.js, calc-financial-plan.js, calc-whatif.js, tab-dashboard.html rendering → ~10 files touched.
- Supplement mode: new tab `tab-multigoal.html`, new calc-multigoal.js, toggle in UI to switch between single/multi view → ~5 new files, 2 modified.
- Independent mode: new `retirement-planner-multigoal/index.html`, full duplication of structure → ~20 new files, 0 modified.

Intake says "separate page or version whichever is best" but doesn't specify. Default proposal needed + rationale.

### 6. What happens to existing features when multi-goal is active?
**Question:** If we go with "Replace mode" (multi-goal recalculates all tabs):
- Does the existing "Goals" tab (lump-sum goals like house, car, education) still work? Or does multi-goal replace it?
- Does "What-If" scenario modeling (compare ret-age 35 vs 40) still function, and if so, does it apply the phase structure to both scenarios?
- Does the Dashboard's "Runs Out Age" card now show "Runs out during Phase 3 (empty nest) at age 67" instead of "Runs out age 67"?

**Why blocker:** The existing planner has 17 tabs. If multi-goal is "just a new tab", we avoid breaking changes. If it's a new mode that recalculates the whole app, we need to audit every tab for compatibility. The PRD's "Out of scope" section needs to list which tabs are NOT updated in v1.

### 7. Persistence and sharing — does multi-goal use the existing Profiles system?
**Question:** The planner has a Profiles tab (tab-profiles.html) for save/load. When a user creates a multi-goal plan:
- Do phases save to localStorage as part of the profile (like `_goals` array for lump-sum goals)?
- Is there a separate "Multi-Goal Profiles" system?
- No persistence in v1 (user re-enters phases each session)?

**Why blocker:** If we use existing Profiles, the AC includes "phases persist across sessions" and we add schema versioning (profile v1 = single-bucket, v2 = multi-goal). If no persistence, we document that in "Known limitations" and scope drops by ~1-2 days of effort.

### 8. Passive retirement income — does it apply across all phases or per-phase?
**Question:** The existing planner models pension/rental income (passive retirement income). For multi-goal:
- Does existing pension/rental income apply **uniformly** across all phases (reduces net expense in every phase proportionally)?
- Can the user assign income sources to **specific phases** (e.g., "₹10k/month pension starts age 60, only applies to Phase 3 and 4")?
- Is passive retirement income **out of scope** for v1 (multi-goal only models expense side, income side deferred)?

**Why blocker:** This affects calculation logic. If income applies uniformly, we modify the existing `postRetireMonthlyIncome` (if it exists) to offset phase expenses. If per-phase income is allowed, we need UI for income-to-phase mapping and more complex allocation logic. Need explicit answer to scope AC correctly.

**Note:** Active income from kids' jobs is explicitly excluded per intake ("if they go to higher levels in job there might be additional income as well, but explicitly does NOT want to take this into the wealth journey"). This blocker is ONLY about passive income that the existing planner may already model.

---

## NICE-TO-RESOLVE (can default and let Pardha correct at Gate A)

### 1. Default phase templates — the intake provides a 4-phase example, use it?
**Question:** The intake's reframed table shows a specific 4-phase model:
1. Active early-retirement w/ kids at home (ret age → ~50) — High cost, general CPI
2. Kids in college (~18-22 of kids' age) — Spike cost, education inflation 8-10%
3. Empty nest / kids self-sufficient (~mid-50s onward) — Low cost, general CPI
4. Late retirement / medical (~70+) — Rising cost, medical inflation 10-12%

Should the UI:
- **Pre-fill** this exact 4-phase template when user opens multi-goal for the first time (editable)?
- **Offer as preset** alongside "Blank custom" option?
- **Start blank**, user builds from scratch?

**Proposed default:** Offer the 4-phase template as a preset ("Indian Early Retirement — Kids at home → College → Empty nest → Medical") with default age ranges and inflation rates filled in, plus a "Custom" option that starts blank. This matches the intake's motivating example and reduces setup friction.

**Why nice-to-resolve:** The intake already specifies the use case in detail, so pre-filling seems low-risk. But if Pardha wants to force users to think through their own phases (avoid cargo-culting), blank slate is better. Clarifying this saves rework on UI defaults.

### 2. Inflation rate per phase — single value or range?
**Question:** Each phase has an inflation rate. Should the user also specify:
- **Single rate** (simpler): "6% annually for this phase"
- **Range** (realistic): "6-8% range, Monte Carlo samples" (like existing What-If scenarios)

**Proposed default:** Single rate. The existing planner uses single-value inflation (line 14 calc-projections.js). Adding range-based modeling is a Phase 2 feature (defer to "Out of scope").

### 3. UI location — new tab vs new page
**Question:** Per Blocker #5, if we go "Supplement mode":
- New tab in the existing 17-tab navbar ("Multi-Goal Planner" tab)
- Separate HTML page at `/retirement-planner-multigoal/index.html` with its own navbar

**Proposed default:** New tab in existing navbar. Reasoning:
- Lower friction (user already has retirement-planner open, clicks one tab vs new URL)
- Shares the existing stylesheet, form components, RP global namespace
- Follows existing "Goals" tab pattern (calc-goals.js is a module, not a separate page)

**Why nice-to-resolve:** If Pardha prefers isolation (multi-goal doesn't pollute the main planner), separate page is cleaner. But tab is faster to ship and more discoverable.

### 4. Phase naming — freeform text or dropdown?
**Question:** When the user creates a phase:
- **Freeform:** text input, user types "Kids at home", "Empty nest", etc.
- **Dropdown:** predefined labels (Family Phase, Education Phase, Empty Nest, Medical/Late Retirement) + optional custom

**Proposed default:** Freeform text input (like existing Goals tab, line 9 tab-goals.html: `<input type="text" id="goalName">`). Simpler, no enforcement of lifecycle model.

### 5. Visualization — one chart with phase markers or multiple charts?
**Question:** The existing Projections tab has a line chart (corpus over age). For multi-goal:
- **Single chart with phase annotations:** Same chart, vertical lines + labels at each phase boundary (age 50 = "College starts", age 55 = "Empty nest")
- **Multi-line chart:** One line per phase showing that phase's funding status
- **Separate charts:** One chart for overall corpus, one stacked-area chart for expense breakdown by phase

**Proposed default:** Single chart with phase markers (vertical lines + labels). Least complexity, matches existing chart rendering in calc-projections.js (line 88-92).

**Why nice-to-resolve:** Better visualization drives user trust, but it's not a PRD-level decision unless we know Pardha has strong UX preferences. Default to simplest, iterate post-launch.

### 6. Error handling for impossible scenarios
**Question:** If the user defines phases that require ₹10 crore corpus but they only have ₹2 crore at retirement:
- Show warning upfront ("Insufficient corpus, shortfall: ₹8 crore")?
- Let projection run and show "Runs out age 42" in red?
- Both?

**Proposed default:** Both. Summary card shows "Total corpus needed: ₹10 crore | Available: ₹2 crore | Shortfall: ₹8 crore" (like existing "Goal Impact" card on tab-goals.html), AND projection table shows depletion age in red row.

### 7. Mobile responsiveness — in scope for v1?
**Question:** The existing planner has `css/responsive.css`. Should multi-goal phase-entry form be mobile-optimized (vertical stacking, touch-friendly)?

**Proposed default:** Yes, follow existing responsive patterns. The planner already works on mobile (grid collapses to single column), multi-goal should match. Low incremental cost.

### 8. Baseline data — do we have it?
**Question:** For "Goals (measurable)" section, do we know:
- Current daily/monthly active users of retirement planner?
- Existing bounce rate or session depth?
- Any user feedback on "single-bucket retirement model doesn't fit my needs"?

**Proposed default:** Assume no analytics (vanilla HTML/JS static page, no backend). Write goals as aspirational ("Increase user trust in projection accuracy"), note "baseline TBD — needs user research or Google Analytics integration" in PRD.

**Why nice-to-resolve:** If Pardha has GA set up or Cloudflare analytics, we can pull baseline. If not, we document the gap and the PRD lives with qualitative success (user satisfaction survey, Pardha's own use case).

### 9. Acceptance criteria detail level
**Question:** How granular should AC be?
- **High-level:** "User can define multiple expense phases and see year-by-year projection"
- **Detailed:** "Given 3 phases (age 35-50 ₹80k/mo @ 6%, age 50-55 ₹1.2L/mo @ 9%, age 55-100 ₹50k/mo @ 6%), when corpus at retirement is ₹5 crore, then projection table shows exact inflated expense per year and corpus depletion at age 73."

**Proposed default:** Detailed (Given/When/Then with specific examples). The existing planner has precise calculation logic (calc-projections.js line 44: inflatedAnnualExpense formula). QA Lead needs testable AC to write tasks/qa-NNN.md. High-level AC leads to "does it work?" ambiguity.

### 10. Definition of "age range" for a phase
**Question:** Is a phase defined as:
- **Start age to end age** (e.g., "age 35 to 50" — 15 years)
- **Start age + duration** (e.g., "starts age 35, lasts 15 years")
- **Age of user + years from now** (e.g., "starts in 8 years, lasts 15 years")

**Proposed default:** Start age to end age (absolute years). Matches existing planner's model (retirementAge, lifeExpectancy are absolute ages, not durations). Easier for user to think "kids in college = age 18-22 of kids = I'll be age 45-49".

**Why nice-to-resolve:** If Pardha's mental model is duration-based (like existing Goals tab uses "target year"), we adjust. But age-based is more natural for life phases.

---

## Summary for Pardha

**Total blockers:** 8  
**Total nice-to-resolve:** 10

**Recommended next step:** Review blockers 1-8, provide answers. For nice-to-resolve, I'll use the proposed defaults unless you override. Once blockers are answered, I can write a complete PRD with testable AC and clear scope boundaries.

**Estimated PRD writing time after answers:** ~45 minutes (chunked write: skeleton + 10 sections via Edit calls).
