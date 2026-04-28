---
id: qa-001
title: Test harness setup — verify manual test workflow
type: test
status: completed
owner: eng-qa-001
priority: P1
created_by: pdlc-qa-lead
created_at: 2026-04-27T15:00:00Z
updated_at: 2026-04-27T16:55:00Z
files:
  - index.html
  - pages/tab-multigoal.html
  - js/calc-multigoal.js
contract_refs: []
blocked_by:
  - fe-001
blocks: []
attempts: 1
---

## Description

Verify the manual QA workflow for Multi-Goal tab works end-to-end. This task establishes the test harness (manual browser-based testing) and confirms the basic dev loop: open `index.html` → navigate to Multi-Goal tab → interact with phase CRUD → verify calculations update.

**No automated test framework** — per Q5 decision, this feature uses manual QA only. This task verifies the manual test loop is functional before testing individual features.

## Acceptance Criteria

- [ ] Open `index.html` in Chrome → Multi-Goal tab button visible in nav bar
- [ ] Click Multi-Goal tab → tab content loads (no blank page, no console errors)
- [ ] Add a phase → phase card appears in phase list
- [ ] Edit a phase → phase card updates
- [ ] Delete a phase → phase card removed, undo toast appears
- [ ] Navigate to existing tab (e.g., Basics) → Multi-Goal tab state preserved when returning
- [ ] Reload page → Multi-Goal state persists (if localStorage working)
- [ ] Chrome DevTools console shows zero errors during above flow

## Test Plan

### Manual Test Loop Verification

1. Open `index.html` in Chrome (from filesystem: `file:///...`)
2. Navigate to Multi-Goal tab via nav button
3. Verify empty state shows: "No phases added yet"
4. Click "Add Phase" → form appears
5. Fill form: name "Test Phase", startAge 35, endAge 50, monthlyExpense 50000, inflation 6
6. Click submit → phase card appears
7. Click Edit on phase card → form pre-fills
8. Change monthlyExpense to 60000, submit → phase card updates
9. Click Delete → toast "Phase deleted. [Undo]" appears, card fades out
10. Click [Undo] within 5s → phase restores
11. Navigate to Basics tab → verify no console errors
12. Return to Multi-Goal tab → verify phase still visible
13. Reload page → verify phase persists (if localStorage active)

### Environment Checklist

- [ ] Chrome Desktop (latest stable)
- [ ] Safari Desktop (verify nav works, don't test full CRUD yet)
- [ ] Console clean (zero errors)

## Build Verification

Not applicable — this is a QA workflow verification task, not an implementation task. Engineer runs this after `fe-001` completes.

## Notes

(Engineer appends notes here during execution)

### Verified workflow (eng-qa-001, 2026-04-27)

**Status**: ✅ Manual test loop is real and reproducible against the fe-001 scaffold.

**Working dir / branch**: worktree `.claude/worktrees/eng-qa-001` on branch `test/qa-001` (cut from `main` @ c320cd9).

**Reproducer (full loop)**:

```bash
# 1. Build the bundled index.html (concatenates pages/*.html + js/*.js)
cd /Users/mpardhateja/PycharmProjects/financeCalculator/<worktree>/retirement-planner
./build.sh
# → "Built index.html (1215 lines)"

# 2. Serve over HTTP (file:// is blocked by playwright)
python3 -m http.server 8765 > /tmp/qa-server.log 2>&1 &
# Verify: curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/index.html → 200

# 3. Drive playwright (see tool-by-tool guide below)

# 4. Cleanup
kill %1   # or pkill -f "python3 -m http.server 8765"
```

**Playwright tool-by-tool guide for manual QA**:

| Tool | When to use | Notes |
|---|---|---|
| `browser_navigate` | Open the page (must be `http://localhost:PORT/index.html`, NOT `file://`). | `file://` is blocked. Always serve over HTTP. |
| `browser_snapshot` | Get the a11y-tree of current state. **Preferred over screenshot** for assertions — gives you `ref=eN` handles for clicking, plus all visible text. | Each navigation invalidates old `ref` ids; re-snapshot after each click. |
| `browser_click` | Click anything by `ref=eN` from the latest snapshot. | Must pass both `element` (human description) and `ref`. |
| `browser_evaluate` | Run JS in page context (e.g. `() => Object.keys(window.MultiGoalState || {})`, `() => localStorage.getItem('multiGoalState')`, computed-style or bounding-rect probes). | Use this for state inspection that the a11y tree can't show — IndexedDB, localStorage, computed CSS, JS globals. |
| `browser_console_messages` (level=`error`) | After each interaction, verify no new JS errors. | favicon.ico 404 is the baseline noise (ignore it). Anything else = real error to file as bug-NNN. |
| `browser_fill_form` / `browser_type` | Fill phase form fields when fe-002+ lands (CRUD UI). | Not needed yet — fe-001 only ships section headings. |
| `browser_close` | Tear down at end. | Always pair with `kill` of the http.server. |

**Verified observations against current fe-001 scaffold**:
- `./build.sh` produces `index.html` 1215 lines, no errors.
- Page loads at `http://localhost:8765/index.html`. Title: "Retirement Financial Planner".
- Console at load shows exactly: `[LOG] Multi-Goal tab initialized @ js/calc-multigoal.js:10` ✅ (this is the fe-001 init log).
- Multi-Goal tab button is present in the nav bar (between Goals and Emergency Fund).
- Clicking Multi-Goal activates the tab (`[active]` flag in snapshot) and renders 5 section headings: "Multi-Goal Planner", "Add Life Phase", "Your Life Phases", "Allocation Pre-Flight", "Corpus Projection by Phase", "Year-by-Year Projection". This matches the fe-001 scaffold spec — all sections are placeholders, no CRUD yet.
- Switched through 5 tabs (Multi-Goal → Basics & Income → Investments → Dashboard → Goals → Multi-Goal) — zero new console errors. Multi-Goal tab returns cleanly.
- Only console error throughout entire flow: 1× favicon.ico 404 — cosmetic, not a blocker, can be ignored as baseline.

**Acceptance-criteria coverage** (fe-001-scoped subset only — full CRUD criteria belong to qa-002+ once fe-002+ ships):
- [x] Open `index.html` in Chrome → Multi-Goal tab button visible in nav bar
- [x] Click Multi-Goal tab → tab content loads (no blank page, no console errors)
- [x] Navigate to existing tab (e.g., Basics) → Multi-Goal tab state preserved when returning
- [x] Chrome DevTools console shows zero JS errors during flow (favicon 404 ignored)
- [ ] Add/Edit/Delete/Undo phase — DEFERRED to qa-002+ (fe-001 scaffold has no CRUD UI yet, this is expected per fe-001 scope)
- [ ] Reload-persistence — DEFERRED to qa-002+ (no state to persist yet)

**Deferred / follow-ups (not bugs, just observations for QA Lead)**:
- favicon.ico 404 is harmless but appears on every page load — could be silenced with a 1-byte favicon if cosmetic cleanliness matters during demos. Out of scope here.
- `file://` blocking is a playwright MCP limitation, not a project bug. Future QA tasks should always start with `python3 -m http.server` (or any other static server) before `browser_navigate`.

**No bugs filed** — manual test loop works as designed against the fe-001 scaffold.
