# Personas — Phase 2 Monte Carlo Stress Test

**Source rigor**: every persona below is grounded in REAL DATA cited in the source line. If unknown, say "unknown."

---

## Persona 1: Pardha (Primary User — Owner of the Tool)

- **Source**: 00-intake.md (verbatim brief), 00-intake-assumptions.md (BLOCKER answers B1-B6), Phase 1 personas doc (existing user profile), direct user statements throughout Phase 1 execution
- **Approximate count**: 1 user
- **Primary jobs-to-be-done**:
  1. **Stress-test retirement plan against market randomness** — Answer "if markets are volatile (not ideal), when does my plan start to fail?" Because deterministic projection (Phase 1) only shows one path, but real markets have fat-tail crashes.
  2. **Identify age-specific risk points** — See precisely WHEN the plan becomes risky (e.g., "great until 80, risky after 85") so he can make concrete decisions: work 2 more years, reduce spending post-80, buy longevity insurance at 79.
  3. **Validate early retirement decision** — Retiring at 35 is extremely non-traditional in India. Monte Carlo gives probabilistic confidence ("85% success to age 95") that reduces decision anxiety.
  4. **Share credible plans with family** — When explaining early retirement to spouse/parents, "85% success in 10,000 simulations" is more defensible than "Excel says it works."
- **Constraints/context**:
  - **Technical sophistication**: Built Phase 1 himself, understands Monte Carlo concept (has heard of it in FIRE forums), comfortable with probabilistic thinking
  - **FIRE-curious, not FIRE-committed**: Still validating the decision to retire at 35-40. Monte Carlo is part of the validation toolkit, not a post-decision monitoring tool.
  - **India-based, age ~30s, planning early retirement ~50s**: 15-20 year horizon to retirement, then 40-50 year post-retirement period (longer risk window than traditional retirees)
  - **Time availability**: Personal tool, no deadline, but values fast feedback (<8s per sim run, per intake constraint)
  - **Device**: Desktop-primary (file:// usage pattern confirmed in 00-intake-assumptions B6)
  - **Data discipline**: Conservative assumptions, tracks actual expenses, wants rigor in the randomness model (hence B2: stochastic inflation, not just returns)
  - **Privacy**: Zero external sharing of data — sim must run fully client-side (Web Worker in-browser, no backend persistence)
- **What success looks like FOR THEM**:
  - **Confidence in the plan**: Can say "I'm 85% confident my money lasts to age 95" and trust the math because it's grounded in 35 years of real Indian market data
  - **Actionable age breakpoints**: Clearly see which ages are safe vs risky, enabling concrete next steps (e.g., "Add ₹5K/mo to cover post-85 risk")
  - **No re-input work**: Monte Carlo consumes existing Phase 1 inputs (corpus, expenses, allocation) — zero duplicate data entry
  - **Fast iteration**: Can tweak monthly investment in Calculator, switch to Stress Test tab, re-run MC in <8s, compare results
  - **Sharable results**: Can send URL with seed (`&mcseed=N`) to friend, friend sees IDENTICAL chart (reproducibility for peer review)

---

## Persona 2: Future First-Time Monte Carlo User (Secondary — Hypothetical)

- **Source**: **unknown — needs validation.** This persona is plausible given Indian FIRE community context (00-intake-assumptions A1) and Pardha's eventual plan to share the tool, but we have ZERO confirmed users in this segment. No support tickets, no user research, no exec ask.
- **Approximate count**: unknown (possibly 0, possibly 5-10 if Pardha shares post-Phase-2 launch)
- **Primary jobs-to-be-done**:
  1. **Understand what "Monte Carlo" means in plain English** — Has heard the term in FIRE forums ("you should Monte Carlo your plan") but doesn't know it means "run 10,000 random market scenarios." Needs the UI to explain, not assume.
  2. **Trust the simulation without understanding the math** — Unlike Pardha, won't read the PRNG seed implementation or validate the historical dataset. Needs confidence from clear UI messaging ("Based on 35 years of Indian market data").
  3. **Get a simple yes/no answer** — "Is my plan safe?" More interested in the overall health signal (green/amber/red) than drilling into individual age breakpoints.
- **Constraints/context**:
  - **Non-technical**: May not know what "bootstrap resampling" means. May confuse "85% success" with "you'll lose 15% of your money."
  - **FIRE-aware but not FIRE-expert**: Knows SWR (4% rule), knows inflation matters, but may not understand sequence-of-returns risk or why Monte Carlo is necessary.
  - **Device**: possibly mobile (Pardha is desktop-primary, but shared-to users might open on phone)
  - **Time availability**: casual exploration, not deep iteration. Might run MC once, see result, then not return for weeks.
  - **Trust threshold**: needs plain-English explanations and visual cues (color-coding) to trust the output without digging into methodology
- **What success looks like FOR THEM**:
  - **Plain-English verdict**: See "Your plan is great until 80, risky after" and understand what that means without needing to know how the sim works
  - **Clear next action**: If plan is risky, see concrete suggestion ("Increase monthly SIP by ₹X" or "Retire 2 years later") — not just "success rate is 68%"
  - **No jargon**: UI says "Stress Test" not "Monte Carlo bootstrap simulation with stochastic inflation"
  - **Visual confidence**: Color-coded bars (green/amber/red per B3) give immediate health signal before reading any text

---

## Anti-personas (who this is explicitly NOT for)

- **Users wanting tax-optimized withdrawal strategies** — Intake explicitly excludes tax modeling (00-intake.md "Out of scope: tax modeling within Monte Carlo"). Monte Carlo uses post-tax return assumptions, doesn't model LTCG/STCG harvesting, doesn't compare bucket strategies. If the user expects "should I withdraw from debt or equity first in year X to minimize tax?", this tool won't answer it.
- **Institutional users / financial advisors** — No multi-user accounts, no client data export, no compliance reporting (SEBI/advisors need audit trails). This is a personal DIY tool.
- **Users expecting backend persistence** — Monte Carlo results are in-memory only (00-intake.md "out of scope: backend persistence"). If the user expects to log in later and see their previous MC runs, they'll be disappointed.
- **Users wanting real-time market data integration** — Historical dataset is bundled 1991-2025, static. No live NSE API, no auto-update of return assumptions.
- **Traditional retirees (age 60+) who don't need probabilistic modeling** — If retirement is 5 years away and the deterministic projection shows ₹2 crore surplus, Monte Carlo adds complexity without value. Phase 1 already handles this case.

---

## Open questions for the user (Pardha)

**None blocking for Stage 1.** All critical persona-shaping questions were answered in Stage 0 BLOCKER batch (B1-B6 in 00-intake-assumptions.md).

If during wireframing or implementation we discover ambiguity about how non-technical users would interpret specific UI elements (e.g., "Does 'Stress Test' convey the same meaning as 'Monte Carlo' to someone who's never heard the term?"), we'll surface via AskUserQuestion at that stage.
