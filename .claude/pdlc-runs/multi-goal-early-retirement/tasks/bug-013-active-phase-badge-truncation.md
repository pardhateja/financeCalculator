---
id: bug-013
title: Active Phase column badges truncate long phase names mid-word
type: bug
status: pending
owner: ""
priority: P2
created_by: pardha-gate-b-feedback
created_at: 2026-04-27T22:00:00Z
files:
  - retirement-planner/js/calc-multigoal.js
  - retirement-planner/pages/tab-multigoal.html
  - retirement-planner/css/multigoal.css
contract_refs:
  - docs/multi-goal-v1.1/00-tone-and-locked-decisions.md (Section 1.2 verification discipline)
blocked_by: []
blocks: []
attempts: 0
parallel_safe: true
---

## Description

In the Multi-Goal year-by-year projection table, the "Active Phase" column shows phase-name badges with CSS truncation (max-width + text-overflow: ellipsis). Long names like "Medical / Late Retirement" get cut to "Medical / Late R" with the full name only visible on hover via tooltip.

**Pardha at Gate B (screenshot evidence)**: rows 70-81 of the projection table all show "Medical / Late R" badges with the truncated label being visually noisy + ambiguous to read.

This is a **P2 polish bug** — the data is correct (full name in tooltip + phase card), only the badge label is truncated. Not urgent, not launch-blocking, but worth fixing for the v1.1 polish wave.

## Locked design (γ approach with smart algorithm + user override)

Decided in Pardha conversation 2026-04-27:

1. **Add optional `shortName` field to phase data shape** (in `js/calc-multigoal.js` validation + form helpers).
2. **Auto-derive a short label** when `shortName` is not provided. Algorithm:
   - If name matches `^Kid (\d+) (\w+)` → "K{N} {first-word-of-second-segment}" (e.g., "Kid 1 college fees" → "K1 fees", "Kid 2 at home" → "K2 home")
   - If name contains " / " → first 3 chars of each segment joined by "/" (e.g., "Medical / Late Retirement" → "Med/Late")
   - If name length ≤ 12 → use as-is
   - Else → first 12 chars + "…"
3. **User-supplied `shortName` always wins** over auto-derived.
4. **Form input** (Add Phase / Edit Phase): hide behind an "Advanced" details toggle (collapsed by default) so the form stays simple for casual use.
5. **Used in**: badges in projection table's "Active Phase" column. NOT used in: phase cards (full name there), allocation table (full name), tooltips (full name).
6. **Hardcoded shortName for the 10-phase example template** (so users get clean badges out of the box):
   - Base (no kids) → Base
   - Kid 1 at home → K1 home
   - Kid 1 college fees → K1 fees
   - Kid 1 hostel → K1 hostel
   - Kid 1 pocket money → K1 pocket
   - Kid 2 at home → K2 home
   - Kid 2 college fees → K2 fees
   - Kid 2 hostel → K2 hostel
   - Kid 2 pocket money → K2 pocket
   - Medical add-on → Medical

## Acceptance criteria

- [ ] Default Multi-Goal example template uses hardcoded `shortName` per the table above
- [ ] Custom phases with no `shortName` set get auto-derived short labels per the algorithm
- [ ] Form (Add + Edit modes) has an "Advanced" toggle that reveals a "Short label (optional)" input
- [ ] Year-by-year projection table badges use `shortName` (or auto-derived); full name stays in `title` tooltip + phase card text + allocation table
- [ ] Existing phases without `shortName` keep working (backward compat)
- [ ] localStorage persists `shortName` field; sharelink encodes it (Option C path); validation contract updated to accept optional shortName field

## Convention to honor

Per `00-tone-and-locked-decisions.md` Section 1.2: orchestrator drives cold-start playwright verification before claiming done. Don't trust agent's self-report.

Per general orchestrator-direct preference: this is small enough that a single engineer (or orchestrator-direct) can handle. Spawn ONE engineer in TEAM mode with the full FILE-WRITE rule + TRANSPORT-RETRY block prepended.

## Test plan

1. Cold-start: open app, click Multi-Goal → Load Example
2. Scroll to year-by-year projection table
3. Verify badges show short labels: "Base", "K1 home", "K1 fees", "K1 hostel", "K1 pocket", "K2 home", "K2 fees", "K2 hostel", "K2 pocket", "Medical"
4. Hover over any badge → tooltip shows full name
5. Phase card (above) still shows full name
6. Click [Add Phase] → toggle "Advanced" → Short label input appears → type "Custom phase name that is very long" + leave Short label blank → submit → badge shows auto-derived "Custom phase…" or similar
7. Edit that phase → set Short label = "MyPhase" → save → badge updates to "MyPhase"
8. Reload page → shortName persists from localStorage
9. Generate sharelink → open in incognito → shortName comes back from URL

## Estimate

30-45 min (HTML + JS + CSS + verification).

## Notes

This task is **parallel-safe** with Feature C (template), Expense Profile, and Feature A (DOB). It only touches the badge rendering + form helpers; doesn't conflict with the 10-phase template, the new Expense Profile section, or the Basics-tab DOB changes.
