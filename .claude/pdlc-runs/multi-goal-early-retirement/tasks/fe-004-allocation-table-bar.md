---
id: fe-004
title: Pre-flight allocation table + stacked bar
type: implementation
status: completed
owner: "eng-fe-004"
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T17:32:00Z
attempts: 1
merged_at: 2026-04-27T17:32:00Z
branch: feat/fe-004
notes: "Original engineer killed mid-cleanup for attempting npm install jsdom (out-of-scope verification). Orchestrator committed the intact deliverable as commit-bot. Scope-guard verified clean."
files:
  - js/calc-multigoal.js
  - pages/tab-multigoal.html
  - css/multigoal.css
contract_refs:
  - 03-data-contracts.md#allocation-breakdown-schema
design_refs:
  - design/02-wireframes.md#allocation-pre-flight
  - design/02-screen-specs.md#allocation-table-copy
  - design/03-component-specs.md#component-allocation-pre-flight-table-row
  - design/03-component-specs.md#component-stacked-bar-segment
  - design/03-a11y-defaults.md#allocation-chart-accessibility
blocked_by:
  - fe-002
  - fe-003
blocks:
  - fe-008
  - fe-009
attempts: 0
---

## Description

Build the allocation pre-flight section — a data table + horizontal stacked bar showing how retirement corpus allocates across phases BEFORE running the full year-by-year projection. This is the "sanity check" view that answers: "Will my corpus fully fund all my phases?"

**What to build**:

### 1. Allocation Table (HTML + render function)

Add to `pages/tab-multigoal.html` after phase card list:
```html
<div class="section-group">
  <h3>Allocation Pre-Flight</h3>
  <table class="projection-table allocation-table">
    <thead>
      <tr>
        <th scope="col">Phase</th>
        <th scope="col">Age Range</th>
        <th scope="col">PV Needed</th>
        <th scope="col">Allocated</th>
        <th scope="col">%</th>
        <th scope="col">Status</th>
      </tr>
    </thead>
    <tbody id="allocation-tbody">
      <!-- Rows rendered by RP.renderAllocationTable() -->
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2"><strong>TOTAL</strong></td>
        <td id="total-pv-needed">—</td>
        <td id="total-allocated">—</td>
        <td>100%</td>
        <td id="overall-status">—</td>
      </tr>
    </tfoot>
  </table>
</div>
```

Implement in `js/calc-multigoal.js`:
```javascript
RP.renderAllocationTable = function() {
  // Call RP.calculatePVAllocation() to get allocation breakdown
  const corpus = /* derive from existing projections or user input */;
  const allocationData = RP.calculatePVAllocation(corpus, RP._phases, ...);
  
  // Clear tbody
  const tbody = document.getElementById('allocation-tbody');
  tbody.innerHTML = '';
  
  // For each phase in allocationData.phases:
  //   Create <tr> with cells: phase name (with colored dot), age range, PV needed, allocated, %, status
  //   If deficit > 0 for this phase, add .deficit class to row (red tint background)
  //   Status cell: render .health-indicator (green "Funded" or red "Deficit ₹X.XL")
  
  // Update footer row totals
  document.getElementById('total-pv-needed').textContent = RP.formatCurrency(allocationData.totalPV);
  document.getElementById('total-allocated').textContent = RP.formatCurrency(allocationData.totalCorpus);
  // Overall status: green if surplus, red if deficit
  
  // If deficit exists, show suggestion banner (see below)
};
```

**Row structure** per component-specs.md:
- Phase name cell: `<span class="phase-dot" style="background: var(--phase-color-N);"></span> Phase Name`
- Age range: "X-Y" (e.g., "35-50")
- PV Needed: ₹ formatted (e.g., "₹1.8 cr" using `RP.formatCurrencyShort()`)
- Allocated: ₹ formatted
- %: Percent of corpus (e.g., "34.6%")
- Status: `<span class="health-indicator good|bad"><span class="health-dot"></span> Funded|Deficit ₹X</span>`

### 2. Stacked Horizontal Bar (CSS-only visualization)

Add below allocation table in `pages/tab-multigoal.html`:
```html
<div class="alloc-bar" role="img" aria-label="Corpus allocation: Phase 1 X%, Phase 2 Y%, ...">
  <!-- Segments rendered by RP.renderAllocationBar() -->
</div>
```

Implement in `js/calc-multigoal.js`:
```javascript
RP.renderAllocationBar = function(allocationData) {
  const container = document.querySelector('.alloc-bar');
  container.innerHTML = '';
  
  allocationData.phases.forEach((phase, index) => {
    const segment = document.createElement('div');
    segment.className = 'alloc-bar__segment';
    segment.style.flexBasis = `${phase.percentOfCorpus}%`;
    segment.style.background = `var(--phase-color-${(index % 6) + 1})`;
    segment.title = `${phase.phaseName}: ₹${RP.formatCurrencyShort(phase.allocated)} (${phase.percentOfCorpus.toFixed(1)}%)`;
    container.appendChild(segment);
  });
  
  // Update aria-label with all phase percentages (accessibility requirement)
  const label = allocationData.phases.map(p => `${p.phaseName} ${p.percentOfCorpus.toFixed(1)}%`).join(', ');
  container.setAttribute('aria-label', `Corpus allocation: ${label}`);
};
```

**CSS** (add to `css/multigoal.css`):
```css
.alloc-bar {
  display: flex;
  flex-direction: row;
  gap: 0;
  width: 100%;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--neutral-border);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
  margin-top: 16px;
}

.alloc-bar__segment {
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 4px; /* ensure tiny phases stay visible */
  position: relative;
  transition: filter 0.2s ease;
}

.alloc-bar__segment:hover {
  filter: brightness(1.1);
}
```

### 3. Suggestion Banner (deficit scenario)

Add after allocation bar in `pages/tab-multigoal.html`:
```html
<div id="deficit-suggestion" class="alert alert-warning" role="alert" style="display:none;">
  <span class="alert-icon" aria-hidden="true">⚠️</span>
  <span class="alert-message" id="deficit-message">
    <!-- Message rendered by RP.renderDeficitSuggestion() -->
  </span>
  <button type="button" class="alert-dismiss" aria-label="Dismiss suggestion" onclick="this.parentElement.style.display='none';">
    <span aria-hidden="true">×</span>
  </button>
</div>
```

Implement in `js/calc-multigoal.js`:
```javascript
RP.renderDeficitSuggestion = function(allocationData) {
  const banner = document.getElementById('deficit-suggestion');
  const message = document.getElementById('deficit-message');
  
  if (allocationData.deficit > 0) {
    // Calculate suggestions (or call RP.calculateDeficitSuggestions if fe-003 implemented it)
    const deficitLakhs = (allocationData.deficit / 100000).toFixed(1);
    const sipIncrease = /* calculate */;
    const phaseReduction = /* find highest-cost phase, calc reduction % */;
    
    message.innerHTML = `
      <strong>Your plan is underfunded by ₹${deficitLakhs} lakhs.</strong> To close the gap:<br>
      • Option 1: Increase monthly SIP by ₹${sipIncrease.toLocaleString('en-IN')}<br>
      • Option 2: Reduce "${phaseReduction.phaseName}" from ₹${phaseReduction.currentAmount / 1000}k to ₹${phaseReduction.reducedAmount / 1000}k/mo (${phaseReduction.reductionPercent}% reduction)
    `;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
};
```

**CSS for alert** (if not already in existing CSS — check for `.alert` pattern):
```css
.alert {
  padding: 16px 20px;
  border-radius: 12px;
  margin-top: 20px;
  position: relative;
}

.alert-warning {
  background: var(--warning-light);
  border-left: 4px solid var(--warning-color);
}

.alert-icon {
  font-size: 20px;
  margin-right: 8px;
}

.alert-dismiss {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}
```

### 4. Integration — Call from main calculate function

Add orchestrator function in `js/calc-multigoal.js`:
```javascript
RP.calculateMultiGoal = function() {
  // This is the main entry point called when user clicks "Calculate" button
  // (Or auto-called when phases change, depending on UX decision)
  
  RP.renderAllocationTable(); // calls RP.calculatePVAllocation internally
  const allocationData = RP._lastAllocationData; // cache from renderAllocationTable
  RP.renderAllocationBar(allocationData);
  RP.renderDeficitSuggestion(allocationData);
  
  // fe-005 will add: RP.renderMultiGoalProjections();
};
```

**What NOT to do**:
- Do NOT build the year-by-year projection table yet (fe-005 handles that)
- Do NOT add chart phase regions yet (fe-005 handles that)
- Do NOT implement mobile vertical bar layout yet (fe-009 handles responsive CSS)

## Acceptance Criteria

- [ ] Allocation table renders with correct column headers matching design/02-screen-specs.md
- [ ] Each phase row shows: colored dot + name, age range, PV needed, allocated amount, percentage, status
- [ ] Deficit rows have red tint background (`.deficit` class applied)
- [ ] Status cell shows green "Funded" or red "Deficit ₹X.X cr" with health indicator dot
- [ ] Footer row shows totals: sum of PV needed, sum of allocated (=corpus), overall status
- [ ] Stacked bar renders with segments sized proportional to allocation %
- [ ] Bar segments use correct phase colors from design tokens
- [ ] Hovering bar segment shows tooltip with phase name + amount + %
- [ ] Deficit banner appears when `allocationData.deficit > 0`
- [ ] Banner shows actionable suggestions (SIP increase OR phase expense reduction)
- [ ] Dismiss button hides banner (click × or press Enter/Space when focused)
- [ ] Table is keyboard-navigable (can Tab through, screen reader reads headers + cell content)
- [ ] Bar has `role="img"` + `aria-label` describing all phases (per a11y-defaults.md)

## Conventions to honor

**Pattern 1: Table structure** (from existing tab-projections.html)
```html
<!-- File: pages/tab-projections.html:5-12 -->
<table class="projection-table">
  <thead>
    <tr>
      <th scope="col">Age</th>
      <th scope="col">Starting</th>
      <!-- more columns -->
    </tr>
  </thead>
  <tbody id="projection-tbody">
    <!-- rows rendered by JS -->
  </tbody>
</table>
```
**Action**: Match this — use `<th scope="col">` for headers, `id=""` on tbody for JS target, `.projection-table` class for styling.

**Pattern 2: Currency formatting** (from existing utils.js)
```javascript
// File: js/utils.js:45-50
RP.formatCurrency = function(value) {
  return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

RP.formatCurrencyShort = function(value) {
  if (value >= 10000000) return '₹' + (value / 10000000).toFixed(2) + ' cr';
  if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + ' L';
  return RP.formatCurrency(value);
};
```
**Action**: Use `RP.formatCurrencyShort()` for table cells (compact display), `RP.formatCurrency()` for tooltips (full precision).

**Pattern 3: Health indicator** (from existing css/cards.css)
```css
/* File: css/cards.css:29-42 */
.health-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 10px;
}

.health-indicator.good {
  background: var(--secondary-light);
  color: var(--secondary-color);
}

.health-indicator.bad {
  background: var(--danger-light);
  color: var(--danger-color);
}

.health-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
}
```
**Action**: Reuse this exact structure for status cell — `<span class="health-indicator good|bad"><span class="health-dot"></span> Text</span>`.

## Test plan

**Manual smoke test**:
1. Open Multi-Goal tab
2. Load Example (4 phases)
3. Verify allocation table appears with 4 phase rows + footer
4. Verify stacked bar appears below table with 4 colored segments
5. Hover each segment → verify tooltip shows phase name + amount
6. Check footer row: "TOTAL" label, sum of PV, sum of allocated
7. If deficit exists, verify banner appears with suggestions
8. Click × on banner → verify it disappears
9. Keyboard test: Tab to dismiss button, press Enter → verify banner closes

**Math verification** (compare against fe-003 test scenario):
- Manually calculate expected PV for Phase 1 (use spreadsheet)
- Compare table "PV Needed" column against hand calc — should match within ₹10,000

**Color check**:
- Phase 1 → blue dot + blue bar segment
- Phase 2 → emerald dot + emerald segment
- Etc. (cycling through 6 colors)

## Build verification

```bash
cd retirement-planner

# Verify allocation table render function exists
grep -c "RP\.renderAllocationTable" js/calc-multigoal.js
# Expected: ≥1

# Verify stacked bar CSS exists
grep -c "\.alloc-bar" css/multigoal.css
# Expected: ≥1

# Verify alert banner HTML exists
grep -c "deficit-suggestion" pages/tab-multigoal.html
# Expected: 1
```

## Notes

**Re: deficit suggestions calculation**:
If fe-003 didn't implement `RP.calculateDeficitSuggestions()`, do a simplified version here:
- SIP increase: `deficit / (yearsToRetirement * 12)` (ignores compounding, but close enough for v1)
- Phase reduction: Find phase with highest `baseMonthlyExpense`, calculate `(deficit / totalPV) * 100%` reduction

**Re: corpus source**:
Allocation needs `totalCorpus` (available at retirement). Options:
1. Read from existing projections: `RP._projectionRows[retirementAge - currentAge].ending` (if Projections tab already calculated)
2. Add input field "Retirement Corpus (₹)" in Multi-Goal tab (if user wants to override existing planner's result)
3. Default: If Projections tab result exists, use it; else show warning "Run Projections tab first"

For v1, use option #1 + option #3 (read from existing projection, warn if missing).

**Re: data table as accessibility fallback for bar**:
The allocation table is the primary data source. The stacked bar is a visual enhancement. Screen readers skip the bar (via `role="img"`) and read the table instead. This satisfies WCAG 1.1.1 (Non-text Content).

**Integration point**:
fe-005 will call `RP.calculateMultiGoal()` after rendering the projection table, so both allocation + projection views stay in sync.
