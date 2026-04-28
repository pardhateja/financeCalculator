---
feature_name: Multi-Goal Age-Phased Early Retirement Planner
slug: multi-goal-early-retirement
started_at: 2026-04-27
mode: brownfield
project_root: /Users/mpardhateja/PycharmProjects/financeCalculator
project_type: vanilla HTML/CSS/JS (no framework, build.sh concatenator)
final_escalation: Pardha
optional_plugins_detected: []
---

# Brief (verbatim from user)

Currently we have a single goal of retirement-planner. This works perfectly fine for the old age retirement; problem comes with the early retirement.

The problem is: in case of early retirement the spends will differ based on ages. Initial days there might be spend on children so expenses will be high; while the children are in college it might go a little higher. Once they land into a proper job the expenses will reduce drastically. (User notes that if they go to higher levels in job there might be additional income as well, but explicitly does NOT want to take this into the wealth journey.) At the end, for medical needs the expenses might increase a little.

So the suggestion is: have a separate page or version (whichever is best). Instead of giving all the savings to one goal, we can have multiple goals to achieve based on age, and we segregate the income towards each one. Also each goal might have a different inflation as well.

Asked: discuss everything within the team and come up with proper designs and plan.

# Reframed by orchestrator

Today the retirement-planner models retirement as **one** post-retirement monthly expense × one inflation rate, applied flat from `retirementAge` to `lifeExpectancy`. For early retirees this is wrong because life has **phases** with different cost curves and different inflation behavior:

| Phase example | Years | Cost behavior | Inflation behavior |
|---|---|---|---|
| Active early-retirement w/ kids at home | retAge .. ~50 | High (lifestyle, kids) | General CPI |
| Kids in college | ~18-22 of kids' age | Spike | Education inflation (often 8-10%) |
| Empty nest / kids self-sufficient | ~mid-50s onward | Drops sharply | General CPI |
| Late retirement / medical | ~70+ | Rises | Medical inflation (often 10-12%) |

The user wants:
1. Multiple "expense buckets" (life phases / goals), each with its own age range, base amount, and inflation rate.
2. The savings/corpus should be allocated across these buckets so each one is "funded".
3. A separate page or new version of the planner that does this without breaking the existing single-bucket flow.
4. Income side stays as-is (NO modeling of mid-career promotions / income jumps, per explicit user preference).

# Key existing files this feature touches or extends

- `retirement-planner/js/calc-projections.js` — the year-by-year projection loop (currently single-bucket)
- `retirement-planner/js/calc-financial-plan.js` — blended pre/post returns and inflation-adjusted expense
- `retirement-planner/js/calc-goals.js` — lump-sum goals (NOT the same model as life-phase buckets, but adjacent UX)
- `retirement-planner/js/calc-whatif.js` — scenario modeling
- `retirement-planner/pages/tab-projections.html`, `tab-financial-plan.html`, `tab-goals.html`
- `retirement-planner/build.sh` — assembles index.html from pages + js

# Out of scope (explicit)

- Modeling income jumps (promotions, side income) during retirement — user explicitly excluded
- Changing the existing single-bucket retirement planner behavior — must stay working
- Mobile app, backend, accounts, sync — vanilla static page model continues

# Pardha's answers to Stage 0 questions (locked, 2026-04-27)

**Q1 — Allocation algorithm**: **Hybrid** (PV-proportional default + user override). Use **India standards** for inflation defaults (general 6%, education 10%, medical 12%, etc.). **Hard constraint repeated**: read data from existing pages but **avoid changing them as much as possible**. The new tab consumes existing inputs (currentAge, retirementAge, lifeExpectancy, corpus growth values) read-only.

**Q2 — Coexistence**: **Multi-goal lives in its own tab; other tabs unchanged.** Reinforces Q1's "don't disturb" — Projections / Dashboard / What-If keep using `postRetireMonthly` as today.

**Q3 — Deficit handling**: **Both** — show pre-flight allocation table with red deficit row(s) + run projection with partial funding + show actionable suggestion ("Increase monthly investment by ₹X OR reduce Phase Y by Z%").

**Q4 — Success measurement**: **Personal validation only.** Pardha is the user. Ship if it makes him happy and clear about what to do. No analytics, no community sharing required.

**Q5 — Test harness**: **Tiny in-browser test page covering math only** (`test-multigoal.html`). Hardcoded scenarios + inline JS asserts + on-page pass/fail. Zero npm. Pardha explicitly said: *"I'm ok with one but don't say at last if bug bash is there it would have been better"* — interpretation: this is the commitment; do not second-guess in retro by saying "we should have used Vitest."

# Hard constraints derived from answers (binding for all downstream agents)

1. **Don't disturb existing tabs.** New code lives in `tab-multigoal.html` + `js/calc-multigoal.js`. Existing `calc-*.js` files are READ-ONLY references unless absolutely required (e.g. shared utility helpers in `utils.js`). Per Pardha's global-rule #1 (ticket scope is the contract) and #2 (change the minimum) — this is a hard line.
2. **Read existing inputs, don't write them.** Multi-goal reads `currentAge`, `retirementAge`, `lifeExpectancy`, corpus accumulation result, etc. from the existing planner state. It does NOT modify them.
3. **India inflation defaults baked into Load Example button**: general CPI 6%, education 10%, medical 12% — verified at PRD writing time.
4. **Math correctness gated by `test-multigoal.html`** before bug-bash. Math test page is part of Stage 4 implementation, not a follow-up.
5. **Personal-use scope**: PRD success metric = "Pardha uses it and trusts the numbers." No analytics integration. No external sharing setup.
6. **Capacity confirmed**: Pardha is available today/tomorrow for Gate A and Gate B. **Strict no-ping policy outside the two gates** — in-loop stages (Bug bash adversary, in-loop stakeholder reviews, fix-verify loops) must run autonomously. Only owner-only operations (security/data class) or genuinely emergent unknowns may pause for him.
7. **Scope locked at full**: PV-proportional + per-phase inflation + actionable deficit suggestions + India defaults + tiny test page. Multi-hour build accepted. Do not propose simpler alternatives mid-run.
