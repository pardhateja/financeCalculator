# Personas — Multi-Goal Age-Phased Early Retirement Planner

**Source rigor**: every persona below is grounded in REAL DATA cited in the source line. If unknown, say "unknown."

---

## Persona 1: Pardha (Primary & Only Confirmed User)

- **Source**: 00-intake.md (verbatim brief), 00-intake-assumptions.md (A1: Indian FIRE community), project existing state (India-specific defaults: ₹3.5L/mo salary, retirementAge 35), direct user statements
- **Approximate count**: 1 user
- **Primary jobs-to-be-done**:
  1. **Model multi-phase retirement spending** — Account for varying expense levels across life phases (high when kids are home, spike during college years, drop when kids are independent, rise in old age for medical)
  2. **Allocate existing corpus across life phases** — Understand whether accumulated savings will cover each distinct phase, not just a single flat post-retirement expense
  3. **Identify funding gaps early** — Discover deficits in specific phases (e.g., "college years underfunded by ₹15L") so he can adjust savings strategy NOW, not at retirement
  4. **Model phase-specific inflation** — Apply different inflation rates to different life phases (general CPI 6%, education 10%, medical 12%) because real-world costs don't inflate uniformly

- **Constraints/context**:
  - **Technical sophistication**: Builds his own financial planning tools (this entire retirement-planner suite is his personal project)
  - **Time availability**: Personal-use tool — no deadline pressure, but values accuracy over speed
  - **Device**: Desktop-primary use (laptop/desktop browser, not mobile-first)
  - **Domain expertise**: Deep understanding of Indian FIRE movement, SWR (safe withdrawal rate), corpus planning, tax optimization
  - **Existing workflow**: Already uses the single-bucket retirement planner successfully for simple post-retirement modeling; switching to multi-goal only when planning early retirement with children
  - **Data discipline**: Tracks actual expenses, maintains investment corpus spreadsheets, conservative with assumptions
  - **Privacy**: Zero external sharing — all data stays client-side (vanilla HTML/JS, no backend)

- **What success looks like FOR THEM**:
  - **Trust the numbers**: Can confidently say "I need ₹X corpus to cover phases 1-4" and believe the math
  - **Clear visibility into gaps**: Instantly see which life phases are underfunded and by how much
  - **Actionable next steps**: Get concrete suggestions like "Increase monthly SIP by ₹25K to cover Phase 3" rather than vague warnings
  - **No rework**: Multi-goal tab reads existing planner inputs (currentAge, retirementAge, corpus growth) so he doesn't re-enter the same data
  - **Persistence**: Phases auto-save to localStorage so he can iterate over days/weeks without losing config
  - **Validation against reality**: The model's predictions should align with his mental model of how life phases work (e.g., empty-nest years really do cost less)

---

## Anti-personas (who this is explicitly NOT for)

- **Traditional retirement planners (age 60+ retirement)** — The existing single-bucket planner already handles this case perfectly. Multi-goal adds complexity without value for users who don't have life-phase cost curves.
- **Financial advisors managing client portfolios** — This is a personal-use tool. No multi-user accounts, no client data privacy features, no export to advisor platforms.
- **Users expecting automated income modeling** — Intake explicitly excludes modeling mid-retirement income (promotions, side gigs, kids contributing back). Multi-goal is expense-side only.
- **Non-technical users expecting hand-holding** — No onboarding tutorial, no video walkthroughs, no guided setup wizard. Assumes user understands FIRE concepts (SWR, inflation-adjusted returns, corpus planning).

---

## Hypothetical secondary users — NOT prioritized, needs validation

These patterns are plausible given the Indian FIRE community context, but we have ZERO confirmed demand. Listing for completeness; **do NOT design for these in v1**.

- **Pardha's friends in the FIRE community** — If Pardha shares the tool URL, other early retirees might use it. But the intake says "Personal validation only" (00-intake.md Q4), so this is explicitly deferred.
- **Other DIY financial planners** — People who build their own spreadsheets and might prefer a visual tool. But we have no support tickets, no forum requests, no user research validating this segment.

If any of these become real users post-launch, we'll know from:
- Pardha mentioning "I shared with 3 friends and they found bug X"
- Feature requests that don't match Pardha's workflow
- Performance issues (localStorage collision, etc.) indicating multi-user use

Until then: **unknown — needs validation.**

---

## Open questions for the user (Pardha)

**None blocking for Stage 1.** All critical product-shaping questions were answered in Stage 0 (00-intake.md Q1-Q5). 

If during wireframing or implementation we discover ambiguity (e.g., "Should overlapping phases show a visual warning in the timeline or just in the allocation table?"), we'll surface via AskUserQuestion at that stage.
