---
feature_name: Phase 2 — Monte Carlo Stress Test (Confidence Layer)
slug: phase-2-monte-carlo
started_at: 2026-04-29
mode: brownfield
project_root: /Users/mpardhateja/PycharmProjects/financeCalculator
project_type: vanilla HTML/CSS/JS (no framework, build.sh concatenator)
branch: phase-2
base_branch: main
final_escalation: Pardha
optional_plugins_detected: []
phase_1_reference: .claude/pdlc-runs/multi-goal-early-retirement/
bug_drain_policy: p0_p1
---

# Brief (verbatim from user)

> we need to start out our project for phase 2 we will create a new branch and work on this for this phase-2 not disturbing phase 1 this is the info reg this mplementation of the Monte Carlo Snippet
>
> When you integrate the code I gave you into the Project tab:
>
> Don't replace the current table: Keep the "Year-by-Year" table as the "Ideal Scenario."
>
> Add a "Confidence" layer: Add a toggle or a separate section called "Stress Test (Monte Carlo)." * Success Rate vs. Age: Show a chart that displays the probability of having money left at age 70, 80, 90, and 100. For example:
>
> Age 70: 99% Success
>
> Age 80: 85% Success
>
> Age 95: 42% Success (This tells the user: "Your plan is great until 80, but risky after that.")

# Reframed by orchestrator

Phase 1 (multi-goal early retirement) shipped a deterministic year-by-year projection: one path, one inflation rate, one expected return per asset class. The user calls this the **"Ideal Scenario"** because it answers "if everything goes as planned, will I have money?"

Phase 2 adds a **probabilistic overlay**: Monte Carlo simulation answers a different question — "given that markets are random, what's the probability I'll have money at age X?" The two views coexist. Toggle at top of the existing **Projections tab** switches between:

- **Ideal Scenario** — the existing year-by-year table (untouched)
- **Stress Test (Monte Carlo)** — new view showing success% by age (70, 80, 90, 100, ...)

The deliverable is a **Success Rate vs. Age** visualization that tells the user *when* their plan starts to fail, e.g., "great until 80, risky after." This is far more actionable than a single overall success% because it maps directly to retirement decisions: work longer, spend less, buy longevity insurance.

# Locked decisions from Stage 0 question batch (2026-04-29)

| Question | Decision | Rationale |
|---|---|---|
| Branch name | `phase-2` | Pardha-explicit. Phase-2 may include things beyond Monte Carlo later. |
| UI placement | **Toggle at top of Projections tab** ("View: Ideal Scenario \| Stress Test (Monte Carlo)") | One screen, clear mental model. Doesn't add another tab to the Project group nav. |
| Simulation depth | **10,000 sims, historical bootstrap** (resample real Indian-market return years) | Most rigorous. Preserves fat-tail behavior. ~5s compute on modern laptop, run in Web Worker so UI stays responsive. |
| Success definition | **Corpus > 6 months expense buffer at age X** (Pardha-locked B1) | Plain English: "At 80, in 85% of sims you still had ≥6mo expenses." |
| MC inflation | **Stochastic — bootstrap Indian CPI 1991-2025** (Pardha-locked B2) | More rigorous than deterministic; needs CPI dataset alongside asset returns. |
| Color tiers | **≥85% green / 75-84% blue / 50-74% amber / <50% red** (Pardha-locked B3) | Drives both bar colors and copy thresholds (great/OK/risky/likely fail). |
| Visualization | **Multiple chart types** (Pardha-locked B4) | UI Designer to layout: primary bar + supporting line/lollipop/heatmap. |
| Loading UX | **Progress bar + cancel; sim runs in background while user navigates other tabs** (Pardha-locked B5) | Web Worker mandatory (not optional) for tab-independent execution. |
| App open mode | **Both file:// and localhost** (Pardha-locked B6) | Worker via Blob URL pattern — works for both. |

# Hard scope constraints (from Phase 1 patterns + this brief)

1. **Don't disturb Phase 1 work.** Tabs other than Projections stay byte-identical. Multi-goal Allocator, Tracker, Dashboard, Financial Plan — untouched. Only `tab-projections.html` (and its supporting JS) gain the toggle + new view.
2. **Don't replace the Year-by-Year table.** It stays as-is, accessible via the toggle's "Ideal Scenario" position.
3. **Read existing inputs as-is.** Monte Carlo consumes the same `currentAge`, `retirementAge`, `lifeExpectancy`, `currentSavings`, `monthlyInvestment`, expected returns, and life-phase buckets that Phase 1 produces. No new input fields unless absolutely necessary.
4. **Vanilla JS only.** No framework, no npm. Build via existing `build.sh` concatenator. New files: `js/calc-montecarlo.js`, `js/calc-montecarlo-worker.js` (Web Worker for non-blocking compute), `js/historical-returns-data.js` (bundled NIFTY/debt/gold annual returns 1991-2025).
5. **Performance contract**: 10K sim run must complete in under 8 seconds on a 2020+ MacBook Air. UI must show progress (spinner + percent) and stay interactive (Web Worker mandatory). If user changes inputs mid-run, cancel and restart.

# Out of scope (explicit)

- Sequence-of-returns risk shown as separate metric beyond success% (deferred to v2)
- Withdrawal-strategy comparison (4% rule vs guardrails vs bucket strategy) — v2
- Tax modeling within Monte Carlo (uses post-tax return assumptions like Phase 1) — v2
- Letting the user upload their own historical-returns dataset — v2
- Showing individual simulation paths as ribbon/spaghetti chart — possible v1 stretch, ask UI Designer
- Backend persistence of MC results — sim runs client-side, results in-memory only

# Success metrics (draft — PM will refine in PRD)

- User can run 10K Monte Carlo sim from Projections tab, see results within 8 seconds
- Success% by age clearly shown for at least 5 ages (70, 80, 90, 95, 100 — adjust based on user's life expectancy input)
- Toggle between Ideal Scenario and Stress Test is instant (<100ms)
- No Phase 1 functionality regressed — all existing tabs work byte-identical
- Plain-English interpretation alongside numbers ("Your plan is great until 80, risky after")

# Pre-flight check results (2026-04-29)

- All 20 PDLC agents present in `~/.claude/agents/`
- Templates exist in `~/.claude/pdlc-templates/stages/` and `tasks/`
- tmux 3.6a, Claude Code 2.1.123 (above 2.1.120 floor for team_name/tmux handshake)
- Project type: brownfield (Phase 1 codebase live in `retirement-planner/`)
- Branch `phase-2` created from `main` (commit 615f8cd "PDLC Stage 8 + 9 closeout — Phase 1 complete")
- Run folder `.claude/pdlc-runs/phase-2-monte-carlo/` created
- `.gitignore` already tracks `.claude/` per Pardha (no edit needed)

# Pardha as final-escalation contact

All BLOCKER questions surface to Pardha via `AskUserQuestion`. NICE-TO-RESOLVE answers documented in `00-intake-assumptions.md` and surfaced at Gate A.
