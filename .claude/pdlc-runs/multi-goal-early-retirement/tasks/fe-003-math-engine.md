---
id: fe-003
title: Math engine — PV allocation + projection loop
type: implementation
status: completed
owner: eng-fe-003
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T16:55:00Z
attempts: 1
merged_at: 2026-04-27T16:55:00Z
branch: feat/fe-003
files:
  - js/calc-multigoal.js
contract_refs:
  - 03-data-contracts.md#phase-object-schema
  - 03-data-contracts.md#allocation-breakdown-schema
  - 03-data-contracts.md#projection-result-schema
design_refs:
  - 01-tech-spec.md#appendix-a-pv-proportional-allocation-algorithm
  - 01-tech-spec.md#appendix-b-year-by-year-projection-loop
blocked_by:
  - fe-001
blocks:
  - fe-004
  - fe-005
  - fe-010
attempts: 1
---

## Description

Implement the core financial math engine for multi-goal retirement planning. This task is **pure logic** — NO DOM manipulation, NO UI updates. All functions are pure/testable, called by fe-004 (allocation table) and fe-005 (projection table + chart).

**What to build** (two main algorithms per Tech Spec Appendices A & B):

### 1. PV-Proportional Allocation Algorithm

```javascript
/**
 * Allocate retirement corpus across phases proportional to Present Value of each phase's expenses
 * @param {number} totalCorpus - Available corpus at retirement (₹)
 * @param {Array} phases - Array of phase objects from RP._phases
 * @param {number} retirementAge - User's retirement age
 * @param {number} currentAge - User's current age
 * @param {number} postReturn - Post-retirement blended return (decimal, e.g., 0.08 for 8%)
 * @returns {Object} Allocation breakdown (see contract schema)
 */
RP.calculatePVAllocation = function(totalCorpus, phases, retirementAge, currentAge, postReturn) {
  // Step 1: Calculate PV for each phase
  //   For each phase:
  //     For each year in phase (startAge..endAge):
  //       Inflate expense from currentAge to that year using phase.inflationRate
  //       Discount inflated expense back to retirementAge using postReturn
  //       Sum all discounted expenses → phase PV
  //   Sum all phase PVs → total PV needed
  
  // Step 2: Allocate proportionally
  //   If totalPV > 0:
  //     For each phase:
  //       allocated[phase.id] = (phase.PV / totalPV) * totalCorpus
  //   Else (no phases):
  //     allocated = {}
  
  // Step 3: Calculate surplus/deficit
  //   surplus = max(0, totalCorpus - totalPV)
  //   deficit = max(0, totalPV - totalCorpus)
  
  // Return: { phases: [...], totalPV, totalCorpus, surplus, deficit }
  //   where phases[i] = { phaseId, phaseName, ageRange, pvRequired, allocated, percentOfCorpus, deficit }
};
```

**Critical formula details** (from Tech Spec Appendix A):
- **Inflation**: `inflatedExpense = baseMonthly * Math.pow(1 + inflationRate, yearsFromNow) * 12`
  - `yearsFromNow = age - currentAge` (expense grows from TODAY)
- **Discount**: `pvOfYear = inflatedExpense / Math.pow(1 + postReturn, yearsFromRetirement)`
  - `yearsFromRetirement = age - retirementAge` (PV discounts to RETIREMENT)

**Example calculation** (verify against this):
- Phase: age 50-52, ₹100k/mo, 6% inflation
- Current age: 35, Retirement age: 35, Post-return: 8%
- Year 50 (15 years from now):
  - Inflated expense: 100k × (1.06^15) × 12 = ₹2,876,387 annual
  - Years from retirement: 50 - 35 = 15
  - Discount: 2,876,387 / (1.08^15) = ₹907,129 PV
- Repeat for years 51, 52, sum → phase PV

### 2. Year-by-Year Projection Loop

```javascript
/**
 * Generate year-by-year projection with per-phase depletion tracking
 * @param {Array} phases - Array of phase objects
 * @param {Object} allocations - Output from calculatePVAllocation
 * @param {number} retirementAge - User's retirement age
 * @param {number} lifeExpectancy - User's life expectancy age
 * @param {number} currentAge - User's current age
 * @param {number} postReturn - Post-retirement return rate (decimal)
 * @returns {Array} Projection rows (see contract schema)
 */
RP.generateMultiGoalProjections = function(phases, allocations, retirementAge, lifeExpectancy, currentAge, postReturn) {
  // Initialize: Create per-phase sub-corpus buckets from allocations
  //   phaseBuckets[phase.id] = { balance: allocations[phase.id], exhaustedAt: null }
  
  // Loop: For each year (retirementAge .. lifeExpectancy):
  //   Find active phases (phase.startAge <= age <= phase.endAge)
  //   
  //   For each active phase:
  //     starting = bucket.balance
  //     growth = starting * postReturn
  //     expense = inflatedExpense for this year (same formula as PV calc)
  //     ending = starting + growth - expense
  //     
  //     If ending < 0 and not yet exhausted:
  //       bucket.exhaustedAt = age
  //     bucket.balance = max(0, ending)
  //   
  //   Sum all buckets' starting/growth/expense/ending → total row values
  //   
  //   Push row: { age, starting, growth, expenses, ending, status, activePhases: [...] }
  
  // Return: Array of row objects
};
```

**Edge cases to handle**:
1. **Overlapping phases**: Age 50 has Phase A (₹80k/mo) + Phase B (₹40k/mo) → total expense ₹120k/mo
2. **Gap years**: Age 60 has no active phases → expense ₹0, corpus grows by postReturn only
3. **Phase exhaustion mid-life**: Phase A bucket hits zero at age 70, but Phase B continues → total corpus NOT zero yet
4. **All buckets exhausted**: All phases depleted at age 80, but user lives to 100 → all rows after age 80 show ₹0 balance

### 3. Deficit Suggestion Calculator (OPTIONAL — defer to fe-004 if time-constrained)

```javascript
/**
 * Generate actionable suggestions when corpus is underfunded
 * @param {number} deficit - Shortfall in ₹
 * @param {number} yearsToRetirement - Years until retirement
 * @param {number} preReturn - Pre-retirement return rate (decimal)
 * @param {Array} phases - Array of phase objects (to find highest-cost phase)
 * @returns {Object} { sipIncrease, phaseReduction: { phaseName, currentAmount, reducedAmount, reductionPercent } }
 */
RP.calculateDeficitSuggestions = function(deficit, yearsToRetirement, preReturn, phases) {
  // Option 1: Increase monthly SIP (SIP future value formula inverted)
  //   FV = SIP * [(1+r)^n - 1] / r
  //   Solve for SIP given FV = deficit
  
  // Option 2: Reduce highest-cost phase by X%
  //   Find phase with highest baseMonthlyExpense
  //   Calculate reduction % needed to eliminate deficit
  
  // Return both suggestions
};
```

**What NOT to do**:
- Do NOT update DOM or render tables (fe-004 and fe-005 consume these functions and render results)
- Do NOT read from form inputs directly (caller passes values as parameters — pure functions)
- Do NOT persist results to localStorage (fe-006 handles persistence)

## Acceptance Criteria

- [ ] `RP.calculatePVAllocation()` returns correct allocation breakdown for single-phase scenario (hand-verify PV math)
- [ ] `RP.calculatePVAllocation()` handles multiple phases with different inflation rates (higher inflation → larger PV share)
- [ ] `RP.calculatePVAllocation()` detects deficit when totalPV > corpus (returns `deficit > 0`)
- [ ] `RP.generateMultiGoalProjections()` returns array of row objects with correct structure
- [ ] Projection loop handles overlapping phases (sums expenses correctly)
- [ ] Projection loop handles gap years (zero expense, corpus grows)
- [ ] Projection loop detects phase bucket exhaustion (marks `exhaustedAt` age)
- [ ] All calculations match existing planner's precision (existing calc-projections.js uses same formulas — verify outputs align within ₹1000 for comparable scenarios)
- [ ] No NaN or Infinity in outputs (defensive checks: `postReturn || 0.05`, `totalCorpus || 0`)

## Conventions to honor

**Pattern 1: Pure calculation functions** (from existing calc-sip.js)
```javascript
// File: js/calc-sip.js:12-20
RP.calculateSIP = function(targetAmount, years, annualReturn) {
    const monthlyRate = annualReturn / 12;
    const months = years * 12;
    const fv = targetAmount;
    const sip = fv * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
    return sip;
};
```
**Action**: Match this style — pure function, no DOM access, takes primitives as parameters, returns result object/number. Caller (UI layer) handles rendering.

**Pattern 2: Year-by-year projection loop** (from existing calc-projections.js)
```javascript
// File: js/calc-projections.js:27-45 (simplified)
for (let age = currentAge; age <= lifeExpectancy; age++) {
    const isRetired = age >= retirementAge;
    const starting = age === currentAge ? initialCorpus : previousRow.ending;
    const growth = starting * (isRetired ? postReturn : preReturn);
    const expense = isRetired ? inflatedPostRetireExpense : 0;
    const ending = starting + growth - expense;
    rows.push({ age, starting, growth, expense, ending });
}
```
**Action**: Extend this pattern for multi-phase — same loop structure, but track per-phase buckets instead of single corpus. Sum all buckets each year to get total row values.

**Pattern 3: PV calculation with inflation + discount** (from financial math standard, NOT in existing code — verify formula)
```javascript
// Standard PV formula (verify this is what existing planner uses for lump-sum goal NPV):
const pv = futureValue / Math.pow(1 + discountRate, years);
```
**Action**: Apply this for each year's expense — inflate to future value, then discount back to retirement. The two compounding directions (inflation forward, discount backward) are BOTH needed.

## Test plan

**Math test page** (fe-010 will build the HTML, but this task should prepare test scenarios):

Create `RP._testScenarios` array in `js/calc-multigoal.js` (wrapped in `if (typeof TEST_MODE !== 'undefined')` guard):

```javascript
RP._testScenarios = [
  {
    name: "Single phase, no inflation, exact funding",
    corpus: 10000000, // ₹1 crore
    phases: [{ id: 'p1', name: 'Test', startAge: 60, endAge: 70, baseMonthlyExpense: 100000, inflationRate: 0 }],
    retirementAge: 60,
    currentAge: 30,
    postReturn: 0,
    expected: {
      totalPV: 12000000, // ₹100k/mo × 12mo × 10yr = ₹1.2cr
      deficit: 2000000, // ₹1.2cr needed - ₹1cr available
      phase_p1_allocated: 10000000
    }
  },
  // Add 4-5 more scenarios covering:
  // - Multiple phases with different inflation rates
  // - Overlapping phases
  // - Gap years
  // - Overfunded corpus (surplus)
];
```

fe-010 will iterate this array and assert `expected` values match actual outputs.

**Manual verification before fe-010**:
1. Open browser console
2. Call `RP.calculatePVAllocation(10000000, [phase], 60, 30, 0.08)` with test phase
3. Console.log the result, hand-verify PV matches expected (use spreadsheet for complex scenarios)

## Build verification

```bash
cd retirement-planner

# Verify functions exist
grep -c "RP\.calculatePVAllocation" js/calc-multigoal.js
# Expected: ≥1

grep -c "RP\.generateMultiGoalProjections" js/calc-multigoal.js
# Expected: ≥1

# No DOM manipulation in this file (pure math only)
grep "document\." js/calc-multigoal.js | grep -v "console\|TEST_MODE"
# Expected: empty output (or only inside commented sections)
```

## Notes

**Floating-point precision**: JavaScript uses IEEE 754 doubles. For ₹1 crore (10^7) corpus, precision is ~0.01 ₹ (sub-paisa level). Acceptable for planning. If issues arise in testing, multiply by 100 (work in paise internally), divide on display — but unlikely needed.

**Performance**: 50-year projection (age 30→80) × 4 phases = 200 iterations. Each iteration: ~10 arithmetic ops. Total: 2000 ops. Runs in <5ms on modern browser. No optimization needed.

**Defensive defaults** (per Tech Spec Risk #7):
```javascript
const postReturn = RP._postReturn || 0.05; // fallback if Financial Plan not calculated
const currentAge = RP.val('currentAge') || 30;
const retirementAge = RP.val('retirementAge') || 60;
```
If user hasn't filled Basics tab, use sensible defaults + log warning to console.

**Why this task is critical-path**:
Both fe-004 (allocation table) and fe-005 (projection table/chart) depend on these functions. Any math errors here propagate to all downstream UI. fe-010 (test page) validates this before UI tasks ship.

**Re: data contracts dependency**:
This task reads `RP._phases` array structure from contracts. If `03-data-contracts.md` isn't ready yet, refer to Tech Spec Section 3 (Data Model) as fallback — schema is already fully specified there.

[REVIEW] branch: feat/fe-003

Implemented `RP._multigoal.calculateAllocation`, `RP._multigoal.runProjection`, `RP._multigoal.calculateDeficitSuggestions` plus convenience aliases on the RP namespace (`RP.calculatePVAllocation`, `RP.generateMultiGoalProjections`, `RP.calculateDeficitSuggestions`). Output shapes match `03-data-contracts.md` §2 (Allocation Result) and §3 (Projection Row), including `activePhaseIds`, `activePhases[].color`, `isExhausted`, and `status` ("healthy" | "depleting" | "depleted"). Six test scenarios stored at `RP._multigoal.testScenarios` for fe-010.

Smoke tested via Node:
- Single-phase exact funding → ₹0 deficit, status "funded"
- Single-phase underfunded → exact ₹20L deficit at ₹1cr/₹1.2cr
- Two equal phases → exact 50/50 split
- Indian FIRE 4-phase ₹5cr / 8% → sum of allocations = ₹5.0000 cr exactly, no NaN/Infinity, 36 projection rows (50→85), overlap and gap years handled
- Hand-verify spec example (₹100k, 6%, 15yr → ₹2,875,870 inflated annual, ₹906,594 PV) matches within rounding
- Inactive buckets still grow in projection so corpus reflects full state during gap years

Reviewer notes:
- File contains ZERO DOM access (`grep "document\." retirement-planner/js/calc-multigoal.js` returns empty)
- Defensive defaults applied for all numeric inputs (`postReturn || 0.05`, `corpus || 0`, etc.)
- Buckets clamp to ≥0; `exhaustedAt` recorded when `endingRaw < 0` first occurs
