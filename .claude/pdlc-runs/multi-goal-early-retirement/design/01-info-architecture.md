# Information Architecture — Multi-Goal Age-Phased Early Retirement Planner

---

## Sitemap

```
/ (retirement-planner/index.html)
├── Basics (tab-basics.html) — age, income, returns
├── Expenses (tab-expenses.html) — current monthly expenses
├── Investments (tab-investments.html) — SIP, lump sum, accumulated corpus
├── SIP (tab-sip.html) — SIP calculator
├── Projections (tab-projections.html) — year-by-year balance projection (single-bucket model)
├── Financial Plan (tab-financial-plan.html) — blended returns, withdrawal strategy
├── Goals (tab-goals.html) — lump-sum financial goals (house, car, etc.)
├── **Multi-Goal (tab-multigoal.html)** ← NEW — life-phase retirement expense modeling
├── Emergency (tab-emergency.html) — emergency fund calculator
├── What-If (tab-whatif.html) — scenario modeling
├── Dashboard (tab-dashboard.html) — summary of all metrics
├── Tracker (tab-tracker.html) — expense tracking
├── ExpTrack (tab-exptrack.html) — detailed expense tracking
├── Net Worth (tab-networth.html) — assets vs liabilities
├── Milestones (tab-milestones.html) — financial milestones
├── Loan (tab-loan.html) — loan calculator
└── Profiles (tab-profiles.html) — save/load/share profiles
```

**New tab insertion point**: Between "Goals" and "Emergency" (per 00-intake-assumptions.md A2).

**Rationale**: Goals tab models lump-sum expenses (one-time purchases). Multi-Goal tab models recurring phase-based expenses (retirement spending patterns). Conceptually related, so placing them adjacent makes sense. Emergency tab is a distinct calculator, so it forms a natural boundary.

---

## Navigation structure

### Primary nav (horizontal tab bar at top of page)

Existing tabs (no changes):
- Basics, Expenses, Investments, SIP, Projections, Financial Plan, Goals, Emergency, What-If, Dashboard, Tracker, ExpTrack, Net Worth, Milestones, Loan, Profiles

New tab:
- **Multi-Goal** — label "Multi-Goal", active state uses same `.tab-button.active` style (white background, blue text)

Tab order after insertion:
1. Basics
2. Expenses
3. Investments
4. SIP
5. Projections
6. Financial Plan
7. Goals
8. **Multi-Goal** ← NEW (position 8)
9. Emergency (shifts from 8 → 9)
10. What-If
11. Dashboard
12. Tracker
13. ExpTrack
14. Net Worth
15. Milestones
16. Loan
17. Profiles

**No secondary nav.** Single-level tab structure continues.

### Auth-aware nav

**N/A.** This is a client-side vanilla app with no authentication. All tabs visible to all users at all times.

---

## Object model (what users think about)

### Existing objects (READ-ONLY for multi-goal feature)

- **Profile** — A saved set of user inputs (age, income, expenses, goals, investments, etc.). Persists to localStorage. Shareable via URL.
- **Corpus** — Total accumulated savings at retirement (calculated from Investments tab: SIP + lump sums + current savings, grown at pre-retirement return rate).
- **Retirement Age** — Age at which user stops working and starts drawing from corpus.
- **Life Expectancy** — Age at which planning horizon ends.
- **Current Age** — User's age today.
- **Post-Retirement Return** — Expected annual return on investments after retirement (typically lower than pre-retirement).
- **Monthly Expense** — Inflation-adjusted monthly spending during retirement (single-bucket model, used by Projections tab).
- **Goal** — A lump-sum financial target (e.g., "Buy house: ₹50L at age 30"). Lives in Goals tab, separate from multi-goal phases.

### New objects (OWNED by multi-goal feature)

- **Phase** (user's mental model: "Life Phase" or "Spending Phase")  
  - **What it is (to the user)**: A period of retirement with distinct expense characteristics. Examples: "Kids in college", "Empty nest", "Medical years".
  - **Key attributes**:
    - **Name** — Freeform text label (e.g., "Active Retirement", "College Years")
    - **Start Age** — Absolute user age when phase begins (e.g., 35)
    - **End Age** — Absolute user age when phase ends (e.g., 50)
    - **Monthly Expense** — Base monthly spending for this phase, in current rupees (e.g., ₹80,000/mo)
    - **Inflation Rate** — Annual inflation rate specific to this phase (e.g., 6% for general CPI, 10% for education, 12% for medical)
  - **Derived attributes** (calculated, not entered):
    - **Duration** — End age minus start age (in years)
    - **Present Value (PV)** — Today's equivalent corpus needed to fund this phase, accounting for inflation and post-retirement returns
    - **Allocation** — Portion of total corpus assigned to this phase (calculated by allocation algorithm)
    - **Funding Status** — Green (fully funded), Red (deficit), calculated by comparing PV to allocation

- **Phase Collection** (user's mental model: "My Retirement Plan" or "Life Phases")  
  - **What it is**: The full set of phases user has configured. Visualized as a timeline, allocated as a pie/bar chart.
  - **Key operations**:
    - Add phase (via input form)
    - Edit phase (click card or re-submit form)
    - Delete phase (X button on card, with undo toast)
    - Load example (pre-fills 4 phases from intake template)
    - View allocation (pre-flight table showing PV, allocation, status per phase)
    - View projection (year-by-year balance with phase-shaded chart)

---

## Naming (exact labels users see)

### Tab label
- **"Multi-Goal"** (not "Phases", not "Life-Phase Planner", not "Advanced Retirement")

### Section headings (on Multi-Goal tab page)
- **"Configure Life Phases"** — Input form + phase cards area
- **"Allocation & Funding"** — Pre-flight allocation table + stacked bar chart
- **"Year-by-Year Projection"** — Projection table + Chart.js line chart

### Button labels
- **"Add Phase"** — Primary button in input form (after user fills fields)
- **"Update Phase"** — Same button when editing existing phase (form pre-filled)
- **"Load Example"** — Secondary button in empty state (gray style)
- **"Delete"** or **"✕"** — Icon button on phase card
- **"Save Profile"** — Existing button in Profiles tab (no change)

### Input field labels
- **"Phase Name"** — Text input (e.g., "Active Retirement")
- **"Start Age"** — Number input (e.g., 35)
- **"End Age"** — Number input (e.g., 50)
- **"Monthly Expense"** — Number input with ₹ prefix (e.g., 80000)
- **"Inflation Rate (%)"** — Number input (e.g., 6)

### Table column headers (Allocation table)
- **"Phase"** — Phase name
- **"PV (₹Cr)"** — Present value in crores
- **"Allocation (₹Cr)"** — Allocated corpus in crores
- **"Status"** — Funding status (🟢 Funded / 🔴 -₹XCr)

### Table column headers (Projection table)
- Existing columns: Age, Year, Start Balance, Income, Expense, Returns, End Balance, Active Phase(s)
- **New column: "Active Phase(s)"** — Colored badge(s) showing which phase(s) are active in that year (e.g., "🟦 Active Retirement" or "🟦 Active Retirement + 🟩 College" for overlapping years)

### Chart labels
- **Timeline strip**: Phase name above each horizontal bar (e.g., "Active Retirement"), age range below (e.g., "35-50")
- **Projection chart legend**: Phase name + color swatch (e.g., "🟦 Active Retirement", "🟩 Kids in College")
- **Projection chart Y-axis**: "Balance (₹Cr)"
- **Projection chart X-axis**: "Age"

### Status messages
- **Empty state**: "No phases added yet. Life phases help you model varying retirement expenses over time."
- **Overlap warning**: "⚠️ Years X-Y are covered by multiple phases. Expenses will be summed for those years."
- **Gap warning**: "⚠️ Years X-Y have no phases. Post-retirement expense will be ₹0 for those years."
- **Deficit banner**: "⚠️ Shortfall detected: ₹XCr. Increase monthly SIP by ₹Y OR reduce total phase expenses by Z%."
- **Fully funded banner**: "✅ All phases fully funded. Corpus will last until age 85."
- **Save toast**: "✅ Profile saved with N life phases"
- **Delete toast**: "Phase deleted. [Undo]"

### Avoid jargon
- Use **"Phase"** not "Bucket" (bucket implies separate accounts; phase implies time period)
- Use **"Allocation"** not "Assignment" (financial planning term users already know)
- Use **"Funded"** not "Solvent" (plain language)
- Use **"Shortfall"** not "Deficit" in headings (more accessible), but "Deficit" is OK in technical table cells
- Use **"Life Phases"** not "Goals" in Multi-Goal context (avoids confusion with Goals tab, which is lump-sum goals)

---

## Hierarchy rules

### Level 1 (always visible without scrolling)

On Multi-Goal tab:
- Tab nav bar (inherited, same as all tabs)
- Panel title: "Multi-Goal Retirement Planning"
- Input form section: "Configure Life Phases" heading + 5 input fields + "Add Phase" button
- Empty state (if no phases): "No phases added yet" text + "Load Example" button

### Level 2 (one scroll down, or visible if phases exist)

- **Phase cards area** — List of configured phases (if any exist), vertically stacked
- **Timeline visualization** — Horizontal scrollable strip showing phase bars (if phases exist)
- **Allocation & Funding section** — Heading + pre-flight allocation table + stacked bar chart (if phases exist)

### Level 3 (multiple scrolls down, or tab-switch)

- **Projection section** — Heading + projection table + Chart.js line chart (if phases exist)
- **Profiles tab** — User navigates to separate tab to save/load

### What can the user do without auth?

**Everything.** No auth system exists. All features are client-side, localStorage-based, no account required.

---

## State sharing between tabs

### Multi-Goal tab READS these values from existing tabs (read-only, no writes)

| Field | Source tab | Source JS variable | Purpose in Multi-Goal |
|---|---|---|---|
| Current Age | Basics | `RP.currentAge` | Timeline start age, phase age validation |
| Retirement Age | Basics | `RP.retirementAge` | Phase start age validation (phases must be >= retirementAge) |
| Life Expectancy | Basics | `RP.lifeExpectancy` | Timeline end age, projection chart X-axis max |
| Post-Retirement Return | Basics or Financial Plan | `RP.postReturn` | PV calculation discounting |
| Accumulated Corpus | Investments | Calculated from SIP + lump sums + current savings | Allocation algorithm input (total corpus to distribute) |

**Hard constraint from intake**: Multi-goal must NOT modify these values. If a field needs changing, user goes to the source tab (Basics, Investments) and edits there. Multi-goal re-reads on recalculate.

### Multi-Goal tab OWNS this state (writes, persists, shares)

| Field | Storage location | Format | Persistence |
|---|---|---|---|
| `_phases` array | `RP._phases` (global namespace, matches `RP._goals` convention per A19) | Array of objects: `[{ name, startAge, endAge, monthlyExpense, inflation }, ...]` | localStorage via Profiles tab, sharelink URL param |

**Backward compatibility**: Profiles saved before multi-goal feature shipped will not have `_phases` field. Multi-goal checks for field presence; if absent, shows empty state. No migration script needed.

---

## Profiles save/load integration

### When user clicks "Save Profile" in Profiles tab

Existing behavior (no change):
- Serialize `RP` object to JSON
- Write to localStorage key `retirementPlannerProfile`
- Generate sharelink URL with all fields as query params

New behavior (additive):
- Include `_phases` field in serialization if `RP._phases` exists and is non-empty
- Sharelink URL gets new param: `_phases=<URL-encoded JSON array>`
- If `_phases` is empty or undefined, omit from sharelink (keeps URL short for users who don't use multi-goal)

### When user clicks "Load Profile" in Profiles tab

Existing behavior (no change):
- Read JSON from localStorage or URL params
- Populate `RP` object
- Trigger recalculate for all tabs

New behavior (additive):
- If `_phases` field exists in loaded profile, populate `RP._phases`
- Multi-Goal tab auto-renders phases when user navigates to it
- If `_phases` field absent, Multi-Goal tab shows empty state (no error)

### When user clicks "Load Example" in Multi-Goal tab

Behavior:
- Overwrites `RP._phases` with hardcoded 4-phase template (from intake):
  ```js
  RP._phases = [
    { name: "Active Retirement", startAge: 35, endAge: 50, monthlyExpense: 80000, inflation: 6 },
    { name: "Kids in College", startAge: 42, endAge: 46, monthlyExpense: 120000, inflation: 10 },
    { name: "Empty Nest", startAge: 51, endAge: 70, monthlyExpense: 40000, inflation: 6 },
    { name: "Medical Years", startAge: 71, endAge: 85, monthlyExpense: 60000, inflation: 12 }
  ];
  ```
- Re-renders Multi-Goal tab (timeline, allocation table, projection)
- Does NOT auto-save to profile (user must explicitly click "Save Profile" if they want to persist)

---

## Mobile / Responsive behavior

### Desktop (>1024px)
- Two-column panel layout (inherited `.panel-grid` pattern)
- Timeline: horizontal scrollable strip
- Allocation table: full table with all columns
- Projection chart: full-width line chart

### Tablet (768px - 1024px)
- Single-column panel layout (inherited responsive.css breakpoint)
- Timeline: horizontal scrollable strip (narrower)
- Allocation table: full table, slightly smaller fonts
- Projection chart: full-width, slightly shorter

### Mobile (<768px)
- Single-column panel layout
- Timeline: vertical stack of phase cards (no horizontal Gantt strip, too narrow)
- Allocation table: collapses to card layout (one card per phase, stacked vertically)
- Projection chart: full-width, compressed height (e.g., 250px instead of 400px)

**Responsive pattern matches existing tabs** (e.g., Goals tab on mobile stacks goal cards vertically, same approach here).

---

## Dark mode support

**All new UI must support dark mode.** Multi-Goal tab inherits existing dark mode CSS patterns:

- Body background: dark gradient (slate-900 → slate-800)
- Panel background: `#1e293b` (slate-800)
- Section groups: `#0f172a` (slate-900)
- Input fields: dark background `#1e293b`, light text `#e2e8f0`, bright borders
- Accent colors (blue, green, amber, red) remain bright in dark mode for contrast
- Chart.js charts: dark background, light grid lines, bright phase-shaded regions

**Implementation**: Use existing `body.dark-mode` class selector pattern from darkmode.js. No separate dark-mode CSS file needed; all dark overrides inline in same stylesheet.

---

## Accessibility considerations

### Keyboard navigation
- All input fields, buttons, phase cards focusable via Tab
- Phase card delete button accessible via keyboard (Enter to activate)
- Timeline visualization: if interactive (click to edit), must support keyboard selection (arrow keys + Enter)

### Screen reader support
- Allocation table: proper `<table>` with `<thead>`, `<th>` scope attributes
- Phase cards: use semantic HTML (`<article>` or `<div role="article">`), not just styled divs
- Status indicators: use both color AND text (e.g., "🟢 Funded" not just green dot)
- Chart.js canvas: provide aria-label summarizing chart data (e.g., "Balance projection chart showing 4 life phases from age 35 to 85")

### Color contrast
- Test all new colors (phase badges, allocation bar segments, deficit red backgrounds) against WCAG AA contrast requirements
- Dark mode colors must also meet contrast requirements (light text on dark background)

### Error states
- Input validation errors: use `aria-invalid="true"` + `aria-describedby` pointing to error message element
- Deficit warnings: use `role="alert"` or ARIA live region so screen readers announce them

---

## Information architecture edge cases

### What if user has no phases?
- Multi-Goal tab shows empty state
- Allocation section hidden
- Projection section hidden
- User can only click "Load Example" or manually add first phase

### What if user has 1 phase?
- Timeline shows single bar
- Allocation table has 1 row + total row
- Projection chart shows 1 shaded region
- No error, but consider UX nudge: "Single-phase model. Add more phases to model varying expenses."

### What if user has 20 phases?
- Timeline becomes very crowded (horizontal scroll required)
- Allocation table grows to 20 rows (vertical scroll)
- Projection chart has 20 shaded regions (might be visually cluttered, but functional)
- No hard limit in v1 (per A7 assumption), but if Pardha reports UX issues, can add soft limit (e.g., warning at 10 phases)

### What if phases overlap completely (same start/end ages)?
- Timeline shows stacked bars (or bars with same position)
- Allocation table lists both phases separately
- Projection table shows both phase badges in "Active Phase(s)" column
- Expenses sum for those years (per intake, this is allowed)

### What if phase ages extend beyond lifeExpectancy?
- Input validation prevents endAge > lifeExpectancy
- If user edits Basics tab to lower lifeExpectancy below existing phase endAge, Multi-Goal shows warning: "⚠️ Phase 'Medical Years' extends beyond life expectancy. Adjust phase or update Basics tab."
- Projection chart clips shaded region at lifeExpectancy age

### What if user hasn't filled Basics tab (currentAge, retirementAge missing)?
- Multi-Goal shows error banner: "Configure basic details first (Basics tab) to use Multi-Goal planner."
- Input form disabled until Basics tab has valid data

---

## Cross-tab dependencies (navigation hints for users)

**Multi-Goal tab depends on**:
- Basics tab: currentAge, retirementAge, lifeExpectancy, postReturn
- Investments tab: accumulated corpus calculation

**If user tries to use Multi-Goal first** (before filling Basics/Investments):
- Show friendly error: "Multi-Goal planner requires age and investment data. Start with Basics tab."
- Provide link/button to Basics tab (if navigation system supports it, or just instructional text)

**Multi-Goal tab does NOT depend on**:
- Goals tab (lump-sum goals are separate from life-phase expenses)
- Expenses tab (multi-goal uses phase-specific monthly expenses, not current expenses)
- Dashboard tab (dashboard reads multi-goal data, not vice versa)

---

## Future IA extensions (out of scope for v1, documented for awareness)

### Comparison view (single-bucket vs multi-goal)
- If added in v2, would be a toggle in Multi-Goal tab: "Compare with single-bucket model"
- Shows two projection charts side-by-side (or overlaid)
- Helps user validate multi-goal is more accurate than flat expense assumption

### Export to PDF/Excel
- If added, would be button in Multi-Goal tab: "Export Projection Report"
- Generates PDF with allocation table + projection chart + phase summary
- Requires new dependency (jsPDF or similar), deferred per intake scope

### Sync across devices
- If added, would require backend (Firebase, Supabase, etc.)
- Out of scope per intake: "vanilla static page model continues"

### Multi-user / family planning
- If added, would model spouse's income/expenses, joint corpus
- Out of scope per intake: "personal-use tool"

None of these extensions change the v1 IA. Multi-Goal tab remains self-contained, optional, additive to existing planner.
