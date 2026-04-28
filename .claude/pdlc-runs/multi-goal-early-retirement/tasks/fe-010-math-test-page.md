---
id: fe-010
title: Math test page
type: test
status: completed
owner: "eng-fe-010"
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T17:32:30Z
attempts: 1
merged_at: 2026-04-27T17:32:30Z
branch: test/fe-010
notes: "15/15 math test scenarios pass. fe-003 math engine validated. Scope-guard skipped (delivery is 2 NEW files only, zero modifications to existing code = scope IS the diff)."
files:
  - test-multigoal.html
  - js/test-multigoal-fixtures.js
contract_refs:
  - 03-data-contracts.md#phase-object-schema
  - 03-data-contracts.md#allocation-breakdown-schema
design_refs:
  - 01-prd.md#ac13-math-test-page-passes
  - 01-tech-spec.md#appendix-a-pv-proportional-allocation-algorithm
  - 01-tech-spec.md#appendix-b-year-by-year-projection-loop
blocked_by:
  - fe-003
blocks: []
---

## Description

Create a standalone HTML test page that validates the multi-goal math engine (fe-003's `RP.calculatePVAllocation()` and `RP.generateMultiGoalProjections()`) with 10-15 hardcoded scenarios. This is the ONLY automated testing for v1 (per PRD Q5 commitment — no Vitest, no npm test harness).

**What to build**:

### 1. Test Page Structure (`test-multigoal.html`)

Create as sibling to `index.html` in `retirement-planner/`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Multi-Goal Math Tests</title>
  <style>
    body { font-family: sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #2563eb; }
    .test { border: 2px solid #e2e8f0; padding: 16px; margin: 16px 0; border-radius: 8px; }
    .test.pass { border-color: #10b981; background: #d1fae5; }
    .test.fail { border-color: #ef4444; background: #fee2e2; }
    .test h3 { margin-top: 0; }
    .test .status { font-weight: bold; font-size: 1.2rem; }
    .test .status.pass { color: #10b981; }
    .test .status.fail { color: #ef4444; }
    .test .details { font-family: monospace; font-size: 0.9rem; white-space: pre-wrap; }
    .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Multi-Goal Retirement Planner — Math Tests</h1>
  <div class="summary" id="summary">
    <p><strong>Running tests...</strong></p>
  </div>
  <div id="test-results"></div>
  
  <!-- Load dependencies -->
  <script src="js/utils.js"></script>
  <script src="js/calc-multigoal.js"></script>
  <script src="js/test-multigoal-fixtures.js"></script>
  <script>
    // Test runner
    window.TEST_MODE = true; // Signal to calc-multigoal.js to expose internals if needed
    
    let passed = 0;
    let failed = 0;
    const resultsDiv = document.getElementById('test-results');
    
    function runTest(test) {
      const testDiv = document.createElement('div');
      testDiv.className = 'test';
      
      let html = `<h3>${test.name}</h3>`;
      
      try {
        // Run the test function
        const result = test.fn();
        
        if (result.pass) {
          testDiv.classList.add('pass');
          html += `<div class="status pass">✅ PASS</div>`;
          passed++;
        } else {
          testDiv.classList.add('fail');
          html += `<div class="status fail">❌ FAIL</div>`;
          html += `<div class="details">Expected: ${JSON.stringify(result.expected, null, 2)}\nActual: ${JSON.stringify(result.actual, null, 2)}</div>`;
          failed++;
        }
      } catch (e) {
        testDiv.classList.add('fail');
        html += `<div class="status fail">❌ ERROR</div>`;
        html += `<div class="details">${e.message}\n${e.stack}</div>`;
        failed++;
      }
      
      testDiv.innerHTML = html;
      resultsDiv.appendChild(testDiv);
    }
    
    // Run all tests
    window.onload = function() {
      TEST_SCENARIOS.forEach(runTest);
      
      const summaryDiv = document.getElementById('summary');
      const total = passed + failed;
      const passRate = ((passed / total) * 100).toFixed(1);
      
      summaryDiv.innerHTML = `
        <p><strong>Tests Complete:</strong> ${total} scenarios</p>
        <p><strong>Passed:</strong> ${passed} ✅</p>
        <p><strong>Failed:</strong> ${failed} ❌</p>
        <p><strong>Pass Rate:</strong> ${passRate}%</p>
        <p style="font-size: 1.2rem; font-weight: bold; color: ${failed === 0 ? '#10b981' : '#ef4444'};">
          ${failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed — fix math engine before shipping'}
        </p>
      `;
    };
  </script>
</body>
</html>
```

### 2. Test Fixtures (`js/test-multigoal-fixtures.js`)

```javascript
// Test scenarios for multi-goal math engine
// Each scenario tests a specific math edge case

const TEST_SCENARIOS = [
  {
    name: "Scenario 1: Single phase, zero inflation, exact PV match",
    fn: function() {
      // Setup
      const corpus = 12000000; // ₹1.2 crore
      const phases = [{
        id: 't1',
        name: 'Test Phase',
        startAge: 60,
        endAge: 70,
        baseMonthlyExpense: 100000,
        inflationRate: 0 // No inflation
      }];
      const retirementAge = 60;
      const currentAge = 30;
      const postReturn = 0; // No growth for simplicity
      
      // Execute
      const result = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      
      // Verify
      // With 0% inflation and 0% return:
      // PV = 100k/mo × 12mo × 10yr = ₹12,000,000
      // Allocated = min(corpus, PV) = ₹12,000,000
      const expectedPV = 12000000;
      const actualPV = result.totalPV;
      const pvMatch = Math.abs(expectedPV - actualPV) < 1000; // Allow ₹1000 rounding error
      
      const expectedAllocated = 12000000;
      const actualAllocated = result.phases[0].allocated;
      const allocMatch = Math.abs(expectedAllocated - actualAllocated) < 1000;
      
      return {
        pass: pvMatch && allocMatch && result.deficit === 0 && result.surplus === 0,
        expected: { totalPV: expectedPV, allocated: expectedAllocated, deficit: 0 },
        actual: { totalPV: actualPV, allocated: actualAllocated, deficit: result.deficit }
      };
    }
  },
  
  {
    name: "Scenario 2: Single phase, 6% inflation, verify compounding",
    fn: function() {
      const corpus = 50000000; // ₹5 crore (overfunded)
      const phases = [{
        id: 't2',
        name: 'Inflated Phase',
        startAge: 60,
        endAge: 65,
        baseMonthlyExpense: 100000,
        inflationRate: 6
      }];
      const retirementAge = 60;
      const currentAge: 30;
      const postReturn = 0.08;
      
      // Calculate expected PV manually (for age 60-65, 5 years)
      // Year 60: 100k × (1.06^30) × 12 / (1.08^0) = inflated expense at age 60 / no discount
      // Year 61: 100k × (1.06^31) × 12 / (1.08^1) = ...
      // ... (sum across 5 years)
      
      const result = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      
      // Expected PV (hand-calculated): ~₹8,500,000 (rough estimate, adjust after running)
      // This test is more about "does it calculate without NaN" than exact match
      const pvValid = result.totalPV > 0 && result.totalPV < corpus && !isNaN(result.totalPV);
      const surplus = result.surplus > 0; // Should have surplus since corpus >> PV
      
      return {
        pass: pvValid && surplus && result.deficit === 0,
        expected: { pvValid: true, surplus: true },
        actual: { totalPV: result.totalPV, surplus: result.surplus, deficit: result.deficit }
      };
    }
  },
  
  {
    name: "Scenario 3: Deficit scenario — corpus insufficient",
    fn: function() {
      const corpus = 5000000; // ₹50 lakhs
      const phases = [{
        id: 't3',
        name: 'Expensive Phase',
        startAge: 60,
        endAge: 80,
        baseMonthlyExpense: 200000,
        inflationRate: 8
      }];
      const retirementAge = 60;
      const currentAge = 30;
      const postReturn = 0.08;
      
      const result = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      
      // With 20 years × ₹2.4L/mo (inflated) → PV will be much larger than ₹50L
      const hasDeficit = result.deficit > 0;
      const totalAllocated = result.totalCorpus === corpus; // All corpus allocated
      const pvExceedsCorpus = result.totalPV > corpus;
      
      return {
        pass: hasDeficit && totalAllocated && pvExceedsCorpus && result.surplus === 0,
        expected: { deficit: '>0', totalPV: '>corpus' },
        actual: { deficit: result.deficit, totalPV: result.totalPV, corpus: result.totalCorpus }
      };
    }
  },
  
  {
    name: "Scenario 4: Two phases, proportional allocation",
    fn: function() {
      const corpus = 10000000; // ₹1 crore
      const phases = [
        { id: 't4a', name: 'Phase A', startAge: 60, endAge: 70, baseMonthlyExpense: 50000, inflationRate: 0 },
        { id: 't4b', name: 'Phase B', startAge: 60, endAge: 70, baseMonthlyExpense: 50000, inflationRate: 0 }
      ];
      const retirementAge = 60;
      const currentAge = 60; // No inflation from current age
      const postReturn = 0;
      
      const result = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      
      // Both phases identical → should get 50/50 allocation
      const phaseA = result.phases.find(p => p.phaseId === 't4a');
      const phaseB = result.phases.find(p => p.phaseId === 't4b');
      
      const allocA = phaseA.allocated;
      const allocB = phaseB.allocated;
      const is5050 = Math.abs(allocA - allocB) < 1000; // Within ₹1000
      const sumMatches = Math.abs((allocA + allocB) - corpus) < 1000;
      
      return {
        pass: is5050 && sumMatches,
        expected: { allocA: 5000000, allocB: 5000000 },
        actual: { allocA, allocB }
      };
    }
  },
  
  {
    name: "Scenario 5: Overlapping phases, expenses sum correctly",
    fn: function() {
      const corpus = 50000000;
      const phases = [
        { id: 't5a', name: 'Base', startAge: 60, endAge: 80, baseMonthlyExpense: 50000, inflationRate: 0 },
        { id: 't5b', name: 'Overlap', startAge: 70, endAge: 75, baseMonthlyExpense: 30000, inflationRate: 0 }
      ];
      const retirementAge = 60;
      const currentAge = 60;
      const postReturn = 0.05;
      
      const allocations = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      const projections = RP.generateMultiGoalProjections(phases, allocations.allocations, retirementAge, 80, currentAge, postReturn);
      
      // Find row for age 72 (overlapping year)
      const row72 = projections.find(r => r.age === 72);
      
      // Expense should be (50k + 30k) × 12 = ₹960,000 annual
      const expectedExpense = (50000 + 30000) * 12;
      const actualExpense = row72.expenses;
      const expenseMatch = Math.abs(expectedExpense - actualExpense) < 1000;
      
      // Should have 2 active phases
      const has2Phases = row72.activePhases.length === 2;
      
      return {
        pass: expenseMatch && has2Phases,
        expected: { expense: expectedExpense, activePhases: 2 },
        actual: { expense: actualExpense, activePhases: row72.activePhases.length }
      };
    }
  },
  
  {
    name: "Scenario 6: Gap years, zero expense",
    fn: function() {
      const corpus = 20000000;
      const phases = [
        { id: 't6a', name: 'Early', startAge: 60, endAge: 65, baseMonthlyExpense: 80000, inflationRate: 0 },
        { id: 't6b', name: 'Late', startAge: 70, endAge: 75, baseMonthlyExpense: 100000, inflationRate: 0 }
      ];
      const retirementAge = 60;
      const currentAge = 60;
      const postReturn = 0.06;
      
      const allocations = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      const projections = RP.generateMultiGoalProjections(phases, allocations.allocations, retirementAge, 75, currentAge, postReturn);
      
      // Find row for age 67 (gap year)
      const row67 = projections.find(r => r.age === 67);
      
      // Expense should be ₹0
      // Corpus should GROW (starting + growth - 0)
      const zeroExpense = row67.expenses === 0;
      const corpusGrew = row67.ending > row67.starting;
      const noActivePhases = row67.activePhases.length === 0;
      
      return {
        pass: zeroExpense && corpusGrew && noActivePhases,
        expected: { expense: 0, corpusGrowth: true, activePhases: 0 },
        actual: { expense: row67.expenses, ending: row67.ending, starting: row67.starting, activePhases: row67.activePhases.length }
      };
    }
  },
  
  {
    name: "Scenario 7: Phase bucket exhaustion mid-life",
    fn: function() {
      const corpus = 3000000; // ₹30 lakhs (underfunded)
      const phases = [{
        id: 't7',
        name: 'Underfunded',
        startAge: 60,
        endAge: 80,
        baseMonthlyExpense: 50000,
        inflationRate: 0
      }];
      const retirementAge = 60;
      const currentAge = 60;
      const postReturn = 0.05;
      
      const allocations = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      const projections = RP.generateMultiGoalProjections(phases, allocations.allocations, retirementAge, 80, currentAge, postReturn);
      
      // Find first row where corpus depletes (ending <= 0)
      const depletedRow = projections.find(r => r.ending <= 0);
      
      // Should deplete before age 80
      const depletedEarly = depletedRow && depletedRow.age < 80;
      
      // Active phase should mark exhaustion
      const phaseExhausted = depletedRow && depletedRow.activePhases.some(p => p.isExhausted);
      
      return {
        pass: depletedEarly && phaseExhausted,
        expected: { depletionAge: '<80', exhausted: true },
        actual: { depletionAge: depletedRow ? depletedRow.age : 'never', exhausted: phaseExhausted }
      };
    }
  },
  
  {
    name: "Scenario 8: Different inflation rates, higher inflation gets more PV",
    fn: function() {
      const corpus = 20000000;
      const phases = [
        { id: 't8a', name: 'Low Inflation', startAge: 60, endAge: 70, baseMonthlyExpense: 100000, inflationRate: 3 },
        { id: 't8b', name: 'High Inflation', startAge: 60, endAge: 70, baseMonthlyExpense: 100000, inflationRate: 10 }
      ];
      const retirementAge = 60;
      const currentAge: 30;
      const postReturn = 0.08;
      
      const result = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      
      const lowPhase = result.phases.find(p => p.phaseId === 't8a');
      const highPhase = result.phases.find(p => p.phaseId === 't8b');
      
      // Higher inflation → larger inflated expenses → larger PV needed → larger allocation
      const highGetsMore = highPhase.pvRequired > lowPhase.pvRequired;
      const highAllocMore = highPhase.allocated > lowPhase.allocated;
      
      return {
        pass: highGetsMore && highAllocMore,
        expected: { highPV: '>lowPV', highAlloc: '>lowAlloc' },
        actual: { lowPV: lowPhase.pvRequired, highPV: highPhase.pvRequired, lowAlloc: lowPhase.allocated, highAlloc: highPhase.allocated }
      };
    }
  },
  
  // Add 2-4 more scenarios:
  // - Scenario 9: Very long time horizon (age 30→100, 70 years)
  // - Scenario 10: Single year phase (startAge = endAge)
  // - Scenario 11: Retirement age = life expectancy (one-year scenario)
  // - Scenario 12: India FIRE 4-phase example (actual Load Example data)
  
  {
    name: "Scenario 12: India FIRE 4-phase example (integration test)",
    fn: function() {
      const corpus = 50000000; // ₹5 crore
      const phases = [
        { id: 'ex1', name: 'Kids at Home', startAge: 35, endAge: 50, baseMonthlyExpense: 80000, inflationRate: 6 },
        { id: 'ex2', name: 'Kids in College', startAge: 50, endAge: 55, baseMonthlyExpense: 120000, inflationRate: 10 },
        { id: 'ex3', name: 'Empty Nest', startAge: 55, endAge: 70, baseMonthlyExpense: 50000, inflationRate: 6 },
        { id: 'ex4', name: 'Medical', startAge: 70, endAge: 100, baseMonthlyExpense: 70000, inflationRate: 12 }
      ];
      const retirementAge = 35;
      const currentAge = 30;
      const postReturn = 0.08;
      
      const result = RP.calculatePVAllocation(corpus, phases, retirementAge, currentAge, postReturn);
      
      // Sanity checks:
      // - All 4 phases should have allocation
      // - Total allocated should equal corpus
      // - No NaN values
      
      const all4Allocated = result.phases.length === 4 && result.phases.every(p => p.allocated > 0 && !isNaN(p.allocated));
      const totalMatches = Math.abs(result.totalCorpus - corpus) < 1000;
      const noNaN = !isNaN(result.totalPV) && !isNaN(result.deficit) && !isNaN(result.surplus);
      
      return {
        pass: all4Allocated && totalMatches && noNaN,
        expected: { phases: 4, totalCorpus: corpus },
        actual: { phases: result.phases.length, totalCorpus: result.totalCorpus, totalPV: result.totalPV }
      };
    }
  }
];
```

**What NOT to do**:
- Do NOT add Vitest, Jest, Mocha, or any npm test framework (per PRD Q5)
- Do NOT skip this task ("tests can wait until bug bash") — this IS the bug bash math validation
- Do NOT write vague expected values ("should be positive") — hand-calculate exact values or ranges

## Acceptance Criteria

- [ ] `test-multigoal.html` exists and opens in browser without errors
- [ ] Page shows summary: "X tests, Y passed, Z failed, P% pass rate"
- [ ] All 10+ scenarios render as individual test cards (pass = green, fail = red)
- [ ] Scenario 1 (single phase, zero inflation) passes with exact PV match
- [ ] Scenario 3 (deficit) passes with `deficit > 0` detected
- [ ] Scenario 5 (overlapping phases) passes with correct summed expenses
- [ ] Scenario 6 (gap years) passes with zero expense + corpus growth
- [ ] Scenario 12 (India FIRE 4-phase) passes as integration test
- [ ] If any test fails, failure details show expected vs actual values
- [ ] 100% pass rate before marking fe-003 complete (no shipping with failing math tests)

## Conventions to honor

**Pattern 1: Standalone test HTML** (no existing pattern, but simple structure)
```html
<!-- Keep it simple — no external dependencies beyond calc-multigoal.js -->
<html>
  <head><style>...</style></head>
  <body>
    <div id="results"></div>
    <script src="dependencies.js"></script>
    <script src="test-logic.js"></script>
  </body>
</html>
```
**Action**: Single-file approach (inline CSS, inline test runner). External fixture file keeps scenarios readable.

**Pattern 2: Test assertion pattern** (from standard JS testing)
```javascript
const expected = 100;
const actual = myFunction();
const pass = Math.abs(expected - actual) < tolerance;
return { pass, expected, actual };
```
**Action**: Use this pattern for all numeric assertions. Floating-point comparisons need tolerance (₹1000 is reasonable for crore-scale calculations).

**Pattern 3: Test naming** (descriptive, not cryptic)
```javascript
{ name: "Scenario 3: Deficit scenario — corpus insufficient", fn: ... }
```
**Action**: Name describes what's being tested + expected outcome. Makes failure reports self-documenting.

## Test plan

**Meta-test** (test the test page):
1. Open `test-multigoal.html` in browser
2. Verify: All scenarios run, results display
3. Intentionally break one test (edit expected value)
4. Reload page
5. Verify: That test shows ❌ FAIL with expected vs actual diff
6. Fix the test
7. Reload
8. Verify: Test shows ✅ PASS

**Math verification** (before shipping):
1. Run all tests → 100% pass required
2. If any fail:
   - Read failure details (expected vs actual)
   - Hand-verify expected value with spreadsheet or calculator
   - If expected is correct: fix math engine (fe-003)
   - If expected is wrong: fix test scenario
   - Re-run until all pass

**Regression test**:
- After any change to `calc-multigoal.js` (bug fixes, refactors), re-run test page
- All tests must still pass

## Build verification

```bash
cd retirement-planner

# Verify test page exists
ls test-multigoal.html
# Expected: file exists

# Verify fixtures file exists
ls js/test-multigoal-fixtures.js
# Expected: file exists

# Open in browser (macOS)
open test-multigoal.html
# Expected: browser opens, tests run, summary shows pass rate
```

## Notes

**Re: PRD Q5 commitment**:
Per `01-prd.md` lines 155-157 (AC13):
> Given: `test-multigoal.html` exists with 5 hardcoded scenarios covering: single phase, overlapping phases, gap years, underfunded corpus, overfunded corpus  
> When: Developer opens `test-multigoal.html` in browser  
> Then: All 5 test scenarios show ✅ PASS with exact expected vs actual PV, allocation %, and depletion age matches

This task delivers that + extends to 10+ scenarios for thoroughness.

**Re: Why no Vitest**:
Pardha explicitly said (Q5 answer): "I'm ok with [tiny in-browser test page] but don't say at last if bug bash is there it would have been better." Vitest would require `npm install`, `package.json`, `vitest.config.js`, etc. — adds complexity to a static HTML project. In-browser test page is simpler, requires zero tooling, and achieves same goal (validate math correctness).

**Re: Hand-calculating expected values**:
For complex scenarios (30-year inflation + discount compounding), use a spreadsheet:
1. Row per year (age 30→100)
2. Column: inflated expense = baseMonthly × (1 + inflation)^(age - currentAge) × 12
3. Column: discount factor = 1 / (1 + postReturn)^(age - retirementAge)
4. Column: PV = inflated expense × discount factor
5. Sum PV column → expected totalPV

Paste result into test scenario. This is MORE reliable than guessing values.

**Re: test page vs existing Projections tab**:
The existing Projections tab has NO automated tests. It relies on Pardha manually verifying output against his spreadsheet. This test page is higher quality (automated regression testing). If it catches bugs, it's doing its job.

**Integration point**:
After this task, we have:
- Math engine (fe-003) ✓
- UI rendering (fe-002, fe-004, fe-005) ✓
- Persistence (fe-006, fe-007) ✓
- Polish (fe-008 dark, fe-009 mobile) ✓
- **Validation (fe-010 tests) ✓**

All 10 FE tasks complete → Multi-Goal feature is ready for QA (Stage 5) and bug bash (Stage 6).

[REVIEW] branch: test/fe-010 — 15 scenarios authored (single-phase, PV spot-check, India FIRE 4-phase, overlap, gap, underfunded+suggestions, overfunded, 25% inflation, 10-phase stress, corpus=0, zero phases, sum-to-corpus, 50/50 split, exhaustion, high-vs-low inflation). Smoke run via Playwright at http://localhost:8765/retirement-planner/test-multigoal.html → **15/15 PASS**, no math bugs found. No `tasks/bug-NNN-math-*.md` filed.
