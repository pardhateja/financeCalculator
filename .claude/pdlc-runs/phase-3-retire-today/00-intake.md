---
feature: Phase 3 — Persistence (Supabase) + Retire Today tab
slug: phase-3-retire-today
started: 2026-04-30
mode: brownfield (extends Phase 1 + Phase 2)
branch: phase-3 (forked from phase-2)
base: phase-2 @ commit 990e577
project_root: /Users/mpardhateja/PycharmProjects/financeCalculator
makefile: added (make dev / make build / make stop / make status)
---

# Two-part scope

## Part A — Supabase persistence (URGENT, ships FIRST)

**Why**: Pardha lost his April Tracker data because Phase 1's `profiles.js` saves only to localStorage. localStorage gets wiped on browser-clear, incognito, device-switch, etc. For a tool depended on across months, this is unacceptable.

**Decision** (locked from Stage 0 questions): Supabase managed backend.
- Free tier (500MB ≈ 50K tracker entries — way more than needed)
- Google OAuth login (no tokens to paste)
- Auto-save on every input change (debounced 1s)
- Cross-device automatic sync
- $0 forever, zero infra ops

**Architecture**:
- One table `app_data` with `(user_id uuid, payload jsonb, updated_at)`
- Row-Level Security (RLS): each user sees only their own row
- Client uses `@supabase/supabase-js` v2 via CDN (no npm)
- New file: `js/persistence.js` — handles login UI + auto-sync
- Reuses Phase 1's `RP.getAllInputIds()` to know what to save
- JSON export/import buttons retained as offline-disaster backup

**Owner-only setup steps** (Pardha did these manually):
1. Created Supabase project at supabase.com
2. Project URL: `https://xjyebiztvfxgkounymfh.supabase.co`
3. Anon public key: (pending paste)
4. Will run `00-supabase-schema.sql` in Supabase SQL Editor
5. Will enable Google OAuth in Supabase Auth → Providers

## Part B — Retire Today tab (Phase 3 proper)

**Why**: User wants to know "if I stopped working TODAY, how much can I withdraw safely / how long can I survive?" — independent of the planned future-retirement scenario.

**Decisions** (locked from Stage 0 questions):

### B.1 — Withdrawal strategies (show 3 SIDE-BY-SIDE)
1. **MC-derived 85% safe** — binary search over MC sims to find the highest monthly that gives ≥85% success from now to lifeExpectancy
2. **4% rule** — corpus × 4% / 12 (industry standard, simple, doesn't account for taxes/fees)
3. **Derived from user's Post-Retirement Blended Return** — the 9.5% blended return + 4% safe-withdrawal rate from Phase 1's Investments tab. NOT hardcoded — read from `RP._postReturn` and corresponding inputs.

### B.2 — Months survivable (show ALL 3)
- Deterministic at user's blended post-return
- MC median (50th percentile)
- MC worst-10% (10th percentile, the unlucky case)

### B.3 — Inputs UI
- **Editable inline + reactive** (same pattern as Phase 2 Stress Test)
- Monthly investment field is the primary scrubber — change it, all 3 strategies + 3 months metrics recompute
- Reset to Setup values button

### B.4 — Tab placement
- **NEW top-level group** "Retire Today" alongside Setup / Plan / Project / Track / Tools / Profiles
- Pardha-explicit: "important key factor to me"
- Single subtab inside the group (no children for now)

# Constraints

1. **Must auto-save on EVERY change** (Phase 3-A persistence). No manual export.
2. **Must NOT regress Phase 1 or Phase 2** (toggle, charts, all calculations still work)
3. **Reuse Phase 2 MC engine** (`calc-montecarlo-worker.js`) for strategies #1 + months #2/#3 — no duplication
4. **Read user's blended return DYNAMICALLY** — never hardcode. Use `RP._postReturn` for Strategy #3.

# Out of scope (this run)

- Real-time multi-user (only one user, your account)
- Conflict resolution (only one device editing at a time is the realistic case)
- Migration from localStorage to Supabase for old profiles (one-time manual import via JSON)
- Server-side validation (RLS handles security; data shape is client-owned)

# Stage list

| Stage | What | Owner |
|---|---|---|
| Persistence-1 | Supabase project setup | Pardha (in flight) |
| Persistence-2 | Run schema SQL + enable Google OAuth | Pardha (after #1) |
| Persistence-3 | Build `js/persistence.js` + login UI + auto-sync | Orchestrator |
| Persistence-4 | Pardha re-enters April data + verifies cross-device | Pardha |
| Phase3-1 | Build "Retire Today" tab | Orchestrator |
| Phase3-2 | Browser smoke + ship | Orchestrator |
| Phase3-3 | Pardha verifies + push | Pardha |
