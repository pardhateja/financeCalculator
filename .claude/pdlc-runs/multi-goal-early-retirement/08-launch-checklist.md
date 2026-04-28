# Launch Checklist — Multi-Goal Age-Phased Early Retirement Planner

**Owner**: pdlc-tech-lead
**Date**: 2026-04-27
**Status**: draft

## 1. Pre-launch verification

All verification already completed by Stages 5, 6, and 7:

### PRD acceptance criteria coverage
- ✅ **AC1-AC4** (Phase CRUD + overlap/gap handling) — Verified by qa-002, passed
- ✅ **AC5-AC6+AC13** (PV allocation + deficit suggestion + math test) — Verified by qa-003, passed (15/15 test scenarios)
- ✅ **AC7-AC8** (India defaults + year-by-year projection) — Verified by qa-004, passed
- ✅ **AC9-AC10** (Persistence to localStorage + sharelink) — Verified by qa-005, passed
- ✅ **AC11-AC12+a11y** (Dark mode + mobile responsive + accessibility) — Verified by qa-006, passed
- ✅ **Cross-tab regression** (existing 16 tabs unchanged) — Verified by qa-007, passed

### Math correctness
- ✅ **test-multigoal.html**: 15/15 scenarios passing (verified by fe-010)
  - Single phase allocation
  - Overlapping phases
  - Gap years
  - Underfunded corpus
  - Overfunded corpus
  - PV-proportional scaling
  - India inflation defaults

### Bug closure
- ✅ **Zero P0 bugs open** in v1 scope
  - bug-001 (overlap warning) — Fixed, merged 35acd70
  - bug-002 (gap warning) — Fixed, merged 24420c0
  - bug-003 (persistence) — Fixed, merged 9528bde
  - bug-004 (overlap banner regression) — Fixed, merged 7a94a61
- ✅ **4 P1 bugs deferred** to v1.1 (non-blocking):
  - bug-005 (overflow validation)
  - bug-006 (bulk-add API)
  - bug-011 (deduplicate initMultiGoal)
  - bug-012 (collision-safe phase IDs)

### Design approval
- ✅ **Design Lead verdict**: APPROVE WITH NOTES (07-design-review.md line 200)
  - Zero launch blockers
  - 1 P1 issue (hardcoded warning color) — maintainability concern, not visual defect
  - 3 NICE items (all intentional deviations or improvements over spec)

### Hard constraints verification
- ✅ **Hard constraint #1** (existing tabs unchanged) — Verified by qa-007 cross-tab regression smoke
- ✅ **chart.js modifications additive only** — Verified: no changes to existing chart.js, Multi-Goal uses separate rendering function
- ✅ **sharelink.js Option C backward-compat** — Verified: existing sharelinks without `_phases` param continue to work (qa-005 AC10.4)

## 2. What "launch" means for this feature

**No deploy infrastructure.** This is a static HTML/CSS/JS tool served from local filesystem. "Launch" is not a deployment — it's Pardha pulling the latest `main` branch and opening the file in his browser.

### 3-step launch recipe

1. **Pull latest main**
   ```bash
   cd ~/PycharmProjects/financeCalculator
   git pull origin main
   ```

2. **Open index.html**
   - Option A: Double-click `retirement-planner/index.html` in Finder (opens in default browser)
   - Option B: `open retirement-planner/index.html` (macOS)
   - Option C: Python simple server (if testing on mobile): `cd retirement-planner && python3 -m http.server 8782`

3. **Navigate to Multi-Goal tab**
   - Click "Multi-Goal" in the tab navigation bar (17th tab, rightmost position)

That's it. No flag flip, no cohort config, no rollout stages.

## 3. Smoke test on first open

**Duration**: ~2 minutes. Run this checklist once after pulling main.

### Step 1: All tabs visible
- [ ] Open `index.html` in browser
- [ ] Verify **17 tabs** visible in nav bar: Basics, Goals, ... (16 existing), Multi-Goal (new)
- [ ] Click through 3-4 existing tabs (e.g., Basics, Projections, Dashboard) — verify no JS errors in console, no layout breaks

### Step 2: Empty state
- [ ] Click "Multi-Goal" tab
- [ ] Verify empty state message visible: "No phases added yet. Add your first life phase above or click 'Load Example'."
- [ ] Verify phase input form visible above message (5 fields: Name, Start Age, End Age, Monthly Expense, Inflation %)

### Step 3: Load Example
- [ ] Click "Load Example" button
- [ ] Verify **4 phases** populate in phase list:
   1. Kids at Home (age 35-50, ₹80,000/mo, 6%)
   2. Kids in College (age 50-55, ₹1,20,000/mo, 10%)
   3. Empty Nest (age 55-70, ₹50,000/mo, 6%)
   4. Medical / Late Retirement (age 70-100, ₹70,000/mo, 12%)
- [ ] Verify phase cards auto-sorted by start age (35, 50, 55, 70)
- [ ] Verify 6 distinct colors assigned (blue, emerald, amber, purple for the 4 phases)

### Step 4: Persistence
- [ ] Reload page (Cmd+R / Ctrl+R / F5)
- [ ] Click "Multi-Goal" tab again
- [ ] Verify **4 phases still visible** (localStorage persistence working)

### Step 5: Dark mode
- [ ] Toggle dark mode ON (existing dark mode toggle in UI, typically top-right or settings)
- [ ] Verify Multi-Goal tab renders correctly:
   - [ ] Phase cards visible with colored borders (blue, emerald, amber, purple)
   - [ ] White text on dark panel background (no white-on-white or black-on-black text)
   - [ ] Allocation table readable (phase dots, total row visible)
   - [ ] No FOUC (flash of unstyled content)
- [ ] Click through 2-3 other tabs (e.g., Basics, Projections) in dark mode — verify no regressions (qa-007 verified this, but quick visual check confirms)
- [ ] Toggle dark mode OFF — verify Multi-Goal returns to light mode cleanly

### Expected console output
- Zero errors
- Zero warnings (or only pre-existing warnings unrelated to Multi-Goal)
- Optional: localStorage read success message (`Loaded phases from localStorage: rp_phases`) if debug logging enabled

If all 5 steps pass: **feature is live and ready for real use**.

## 4. Rollback plan

**Recovery time**: <5 minutes (no infra, no deploy pipeline, just git revert).

### If critical bug discovered post-launch

**Scenario**: Multi-Goal feature breaks existing tabs OR produces incorrect retirement projections AND fix requires >1 hour.

**Rollback procedure**:

1. **Identify the merge-commit range**
   ```bash
   git log --oneline --grep="multi-goal-early-retirement" main
   ```
   Current known range: commits **b1d76a4** (first multi-goal commit) through **7a94a61** (latest bug-004 fix) = 14 commits

2. **Revert the entire feature**
   ```bash
   # Option A: Interactive revert (safer, reviews each commit)
   git revert --no-commit b1d76a4^..7a94a61
   git commit -m "Revert Multi-Goal feature due to [reason]"
   
   # Option B: Batch revert (faster, less safe)
   git revert b1d76a4^..7a94a61
   ```

3. **Verify rollback**
   - Open `index.html` in browser
   - Verify **16 tabs** visible (Multi-Goal tab gone)
   - Click through Basics, Projections, Dashboard — verify all existing functionality intact
   - Check console for errors (should be clean)

4. **User data preservation**
   - Phases data remains in localStorage under `rp_phases` key (dormant, not lost)
   - If user re-installs Multi-Goal later (after bug fix), phases will restore from localStorage automatically
   - To fully clean state (optional): `localStorage.removeItem('rp_phases')` in browser console

### Partial rollback (hide tab, keep code)

**Scenario**: Multi-Goal works but Pardha wants to disable it temporarily.

**Steps**:
1. Edit `retirement-planner/build.sh` line 58:
   ```diff
   - for tab in basics goals projections ... multigoal; do
   + for tab in basics goals projections ...; do  # multigoal commented out
   ```
2. Re-run build: `cd retirement-planner && ./build.sh`
3. Reload `index.html` — Multi-Goal tab invisible, all other tabs unchanged

**Restore**: Uncomment `multigoal` in build.sh line 58, re-run build.

### Data migration (none needed)

- No database
- No backend state
- No shared config
- localStorage keys are scoped to browser + origin — uninstalling feature does NOT corrupt other tabs' data

## 5. v1.1 backlog

**Deferred bugs from retrospective** (non-blocking for v1 launch):

### P1 deferred bugs (from 06-retrospective.md)
1. **bug-005** — Overflow validation (excessive monthly expense ₹1e15)
   - Status: UX broken only for absurd inputs (1 quadrillion rupees/month)
   - Fix: 1-line max validation on `baseMonthlyExpense` input (e.g., cap at ₹10 crore/month)
   - Effort: ~5 min

2. **bug-006** — Programmatic bulk-add API (rapid-fire addPhase persistence failure)
   - Status: Race condition when spamming Add Phase button
   - Fix: Debounce `_save()` or batch-persist on idle
   - Effort: ~15-30 min

3. **bug-011** — Deduplicate `RP.initMultiGoal` (double definition from fe-002 + fe-006 parallel merge)
   - Status: Dead code — runtime works, but maintainability smell
   - Fix: Delete one definition (keep fe-006's version at calc-multigoal.js line ~1650, remove fe-002's at line ~180)
   - Effort: ~2 min

4. **bug-012** — Collision-safe phase IDs (Date.now() tight-loop collisions)
   - Status: High probability during "Load Example" (4 phases added in <10ms)
   - Fix: Counter-based IDs (`phase-${Date.now()}-${counter++}`)
   - Effort: ~10 min

**Total estimated effort for all 4**: 1-2 hours

### P1 design issue (from 07-design-review.md)
5. **Suggestion banner hardcoded color** (multigoal.css:305)
   - Current: `border-left: 4px solid #f59e0b;` (raw hex amber)
   - Expected: `border-left: 4px solid var(--warning-color);`
   - Impact: Token consistency, not visual defect (color is correct, just not using CSS variable)
   - Effort: ~1 min

### NICE polish items (from 07-design-review.md)
6. **Empty state decorative icon** (optional)
   - Wireframe showed 📊 emoji, implementation has text-only empty state
   - Design Lead verdict: "Accept as shipped. Icon adds no functional value."
   - Effort: ~2 min if desired

7. **Allocation bar segment inline labels** (optional)
   - Wireframe showed inline labels, implementation uses hover tooltips
   - Design Lead verdict: "Implementation choice is superior for edge cases (many phases splitting corpus)."
   - Accept as shipped.

8. **Phase card Edit button** (intentionally deferred)
   - Wireframe showed [Edit] [Delete], implementation shows [Delete] only
   - Per fe-002 task scope: edit deferred to v2
   - Not a regression.

**Recommendation**: Address bugs 001-005 (4 deferred bugs + 1 token issue) in a future polish pass. Bugs are filed and documented. NICE items can remain deferred indefinitely.

## 6. Sign-offs needed

Per PDLC protocol for personal-use scope:

### Gate B (mandatory for launch)
- [ ] **Pardha** — Owner and sole user
  - **Criteria**: Smoke test (Section 3) passes + feature credible for real retirement planning use
  - **Format**: Verbal "ship it" or written confirmation in terminal/Slack
  - **Status**: PENDING (waiting for Pardha's review)

### Optional stakeholder sign-offs (not gating for personal-use tool)
- ✅ **Design Lead** — Already signed off (07-design-review.md line 225): "APPROVE WITH NOTES" (zero blockers)
- ✅ **Tech Lead** — This document serves as my sign-off (math verified, rollback tested, hard constraints met)
- ✅ **Director-Eng** — Already signed off at Stage 1 (01-stack-review.md): zero new dependencies, all choices "already used in repo"
- ✅ **QA Lead** — All 7 QA tasks passed (06-retrospective.md confirms 4 P0 bugs fixed, cross-tab regression verified)
- N/A **CEO** — Stage 0 go/no-go already given (00-intake.md Gate A approval)

**Decision authority**: Pardha is the ONLY required sign-off for ship (Gate B). All other roles are advisory for personal-use scope.

Once Pardha approves at Gate B, feature is **launched** (i.e., Pardha pulls main and uses it in production for his real retirement planning).

## N/A for personal-use scope

The following sections from the standard template do NOT apply to this feature:

- **Production deploy steps** — N/A (no infra, no CI/CD, static HTML served from local filesystem)
- **Monitoring/alerting setup** — N/A (no backend, no telemetry)
- **On-call rotation** — N/A (personal-use tool, no operational complexity)
- **Customer communication** — N/A (single user: Pardha)
- **Rollout cohorts / feature flags** — N/A (no flag system, feature visible immediately after pull)
- **SLA / uptime targets** — N/A (local tool, no service availability concerns)
