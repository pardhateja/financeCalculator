/**
 * fe-010 — Multi-Goal Math Test Fixtures
 *
 * Hardcoded scenarios that exercise RP._multigoal.calculateAllocation,
 * RP._multigoal.runProjection, and RP._multigoal.calculateDeficitSuggestions
 * (math engine from fe-003). NO npm, NO Vitest — consumed by test-multigoal.html
 * which renders pass/fail per scenario in plain DOM.
 *
 * Each scenario:
 *   {
 *     name:    string,
 *     fn:      function() returning { pass: bool, expected, actual }
 *   }
 *
 * Expected values were hand-calculated using the Tech Spec Appendix A formula:
 *   inflatedAnnual = baseMonthly * (1 + inflation)^(age - currentAge) * 12
 *   discountFactor = (1 + postReturn)^(age - retirementAge)
 *   PV per year    = inflatedAnnual / discountFactor
 *
 * Tolerance: ₹100 default (₹1000 for crore-scale compounding scenarios).
 *
 * If a scenario fails, the math engine in calc-multigoal.js (fe-003) is
 * suspect — file as tasks/bug-NNN-math-<scenario>.md (P0). The whole point
 * of this page is to catch real bugs.
 */

window.TEST_SCENARIOS = [

    // =========================================================================
    // 1. Single-phase degenerate (no inflation, no growth, exact PV match)
    // =========================================================================
    {
        name: 'Scenario 1: Single phase, zero inflation, zero return — exact PV',
        fn: function () {
            // 100k/mo × 12 mo × 10 yr (age 60-69 inclusive) = ₹12,000,000
            const phases = [
                { id: 'p1', name: 'Test', startAge: 60, endAge: 69,
                  baseMonthlyExpense: 100000, inflationRate: 0, color: 'blue' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, 12000000, 60, 60, 0);

            const expectedPV = 12000000;
            const tol = 100;
            const pvOk = Math.abs(result.totalPV - expectedPV) < tol;
            const allocOk = Math.abs(result.phases[0].allocated - 12000000) < tol;
            const fundedOk = result.surplus === 0 && result.overallDeficit === 0;

            return {
                pass: pvOk && allocOk && fundedOk,
                expected: { totalPV: expectedPV, allocated: 12000000, surplus: 0, deficit: 0 },
                actual:   { totalPV: result.totalPV, allocated: result.phases[0].allocated,
                            surplus: result.surplus, deficit: result.overallDeficit }
            };
        }
    },

    // =========================================================================
    // 2. PV formula spot-check — inflation + discount compounding
    // Hand-calculated: phase covers single age=60, baseMonthly=100k, inflation=6%,
    // currentAge=30, retirementAge=60, postReturn=8%
    //   inflatedAnnual = 100000 * (1.06)^30 * 12 = 100000 * 5.74349117 * 12
    //                  ≈ ₹6,892,189.41
    //   discount       = (1.08)^0 = 1
    //   PV             ≈ ₹6,892,189.41
    // =========================================================================
    {
        name: 'Scenario 2: PV formula spot-check — 6% inflation × 30 yrs at age 60',
        fn: function () {
            const phases = [
                { id: 'p1', name: 'Spot', startAge: 60, endAge: 60,
                  baseMonthlyExpense: 100000, inflationRate: 6, color: 'blue' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, 100000000, 60, 30, 0.08);

            // 100000 * Math.pow(1.06, 30) * 12 / Math.pow(1.08, 0)
            const expectedPV = 100000 * Math.pow(1.06, 30) * 12;
            const tol = 1000; // ~1 paise per crore
            const ok = Math.abs(result.totalPV - expectedPV) < tol;

            return {
                pass: ok,
                expected: { totalPV: expectedPV },
                actual:   { totalPV: result.totalPV, diff: result.totalPV - expectedPV }
            };
        }
    },

    // =========================================================================
    // 3. 4-phase Indian FIRE template (intake's reframed table)
    // Sanity: all 4 phases get allocation, total ≈ corpus, no NaN
    // =========================================================================
    {
        name: 'Scenario 3: 4-phase Indian FIRE template (₹5Cr corpus)',
        fn: function () {
            const corpus = 50000000;
            const phases = [
                { id: 'ex1', name: 'Kids at Home',    startAge: 35, endAge: 50, baseMonthlyExpense:  80000, inflationRate:  6, color: 'blue' },
                { id: 'ex2', name: 'Kids in College', startAge: 50, endAge: 55, baseMonthlyExpense: 120000, inflationRate: 10, color: 'emerald' },
                { id: 'ex3', name: 'Empty Nest',      startAge: 55, endAge: 70, baseMonthlyExpense:  50000, inflationRate:  6, color: 'amber' },
                { id: 'ex4', name: 'Medical',         startAge: 70, endAge: 100, baseMonthlyExpense: 70000, inflationRate: 12, color: 'purple' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, corpus, 35, 30, 0.08);

            const all4 = result.phases.length === 4
                      && result.phases.every(p => p.allocated > 0 && !isNaN(p.allocated));

            const allocSum = result.phases.reduce((s, p) => s + p.allocated, 0);
            // Corpus is fully allocated when totalPV ≥ corpus (proportional). India FIRE
            // is heavily underfunded at ₹5Cr, so allocSum should equal corpus.
            const sumOk = Math.abs(allocSum - corpus) < 100;
            const noNaN = !isNaN(result.totalPV) && !isNaN(result.surplus) && !isNaN(result.overallDeficit);

            return {
                pass: all4 && sumOk && noNaN,
                expected: { phaseCount: 4, allocSum: corpus, noNaN: true },
                actual:   { phaseCount: result.phases.length, allocSum: allocSum,
                            totalPV: result.totalPV, deficit: result.overallDeficit }
            };
        }
    },

    // =========================================================================
    // 4. Overlapping phases — both active in projection at age 50
    // Verify expenses sum across overlapping phases.
    // =========================================================================
    {
        name: 'Scenario 4: Overlapping phases — projection sums expenses',
        fn: function () {
            const phases = [
                { id: 'a', name: 'Lifestyle',    startAge: 50, endAge: 55, baseMonthlyExpense: 80000, inflationRate: 0, color: 'blue' },
                { id: 'b', name: 'Kids college', startAge: 50, endAge: 53, baseMonthlyExpense: 40000, inflationRate: 0, color: 'emerald' }
            ];
            const alloc = RP._multigoal.calculateAllocation(phases, 50000000, 50, 50, 0);
            const proj  = RP._multigoal.runProjection(phases, alloc, 50, 60, 50, 0);

            // Age 50: both active, 0% inflation, expenses = (80k + 40k) × 12 = ₹1,440,000
            const row50 = proj.find(r => r.age === 50);
            const expectedExpense = (80000 + 40000) * 12;
            const expenseOk = Math.abs(row50.expenses - expectedExpense) < 1;
            const twoActive = row50.activePhaseIds.length === 2;

            return {
                pass: expenseOk && twoActive,
                expected: { age: 50, expenses: expectedExpense, activeCount: 2 },
                actual:   { age: row50.age, expenses: row50.expenses,
                            activeCount: row50.activePhaseIds.length }
            };
        }
    },

    // =========================================================================
    // 5. Gap year — no phases active, expense = 0, corpus grows
    // =========================================================================
    {
        name: 'Scenario 5: Gap year — no expense, corpus grows',
        fn: function () {
            const phases = [
                { id: 'a', name: 'Early', startAge: 50, endAge: 55, baseMonthlyExpense: 100000, inflationRate: 6, color: 'blue' },
                { id: 'b', name: 'Late',  startAge: 62, endAge: 64, baseMonthlyExpense: 100000, inflationRate: 6, color: 'emerald' }
            ];
            const alloc = RP._multigoal.calculateAllocation(phases, 30000000, 50, 35, 0.08);
            const proj  = RP._multigoal.runProjection(phases, alloc, 50, 65, 35, 0.08);

            const row60 = proj.find(r => r.age === 60); // gap year
            const zeroExp = row60.expenses === 0;
            const noActive = row60.activePhaseIds.length === 0;
            const grew = row60.ending > row60.starting; // pure 8% growth

            return {
                pass: zeroExp && noActive && grew,
                expected: { age: 60, expenses: 0, activeCount: 0, grew: true },
                actual:   { age: row60.age, expenses: row60.expenses,
                            activeCount: row60.activePhaseIds.length,
                            starting: row60.starting, ending: row60.ending }
            };
        }
    },

    // =========================================================================
    // 6. Underfunded — overallDeficit > 0, suggestions banner trigger
    // =========================================================================
    {
        name: 'Scenario 6: Underfunded — overallDeficit > 0',
        fn: function () {
            const corpus = 5000000; // ₹50L only
            const phases = [
                { id: 't', name: 'Expensive', startAge: 60, endAge: 80,
                  baseMonthlyExpense: 200000, inflationRate: 8, color: 'blue' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, corpus, 60, 30, 0.08);
            const sugg   = RP._multigoal.calculateDeficitSuggestions(
                result.overallDeficit, 30, 0.10, phases);

            const hasDef = result.overallDeficit > 0;
            const noSurplus = result.surplus === 0;
            const allocFull = Math.abs(result.phases[0].allocated - corpus) < 100;
            const sipPositive = sugg.sipIncrease > 0;
            const phaseCutSuggested = sugg.phaseReduction !== null
                                    && sugg.phaseReduction.reductionPercent > 0;

            return {
                pass: hasDef && noSurplus && allocFull && sipPositive && phaseCutSuggested,
                expected: { deficit: '>0', surplus: 0, sipIncrease: '>0',
                            phaseReduction: 'present' },
                actual:   { deficit: result.overallDeficit, surplus: result.surplus,
                            allocated: result.phases[0].allocated,
                            sipIncrease: sugg.sipIncrease,
                            phaseReductionPct: sugg.phaseReduction
                                ? sugg.phaseReduction.reductionPercent : null }
            };
        }
    },

    // =========================================================================
    // 7. Overfunded — surplus > 0, no deficit
    // =========================================================================
    {
        name: 'Scenario 7: Overfunded — surplus > 0',
        fn: function () {
            const corpus = 50000000; // ₹5Cr
            const phases = [
                { id: 't', name: 'Modest', startAge: 60, endAge: 70,
                  baseMonthlyExpense: 50000, inflationRate: 0, color: 'blue' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, corpus, 60, 60, 0);

            // Expected PV = 50k * 12 * 11 yrs (60-70 inclusive) = ₹6,600,000
            const expectedPV = 50000 * 12 * 11;
            const expectedSurplus = corpus - expectedPV;
            const tol = 100;

            const pvOk = Math.abs(result.totalPV - expectedPV) < tol;
            const surpOk = Math.abs(result.surplus - expectedSurplus) < tol;
            const noDef = result.overallDeficit === 0;

            return {
                pass: pvOk && surpOk && noDef,
                expected: { totalPV: expectedPV, surplus: expectedSurplus, deficit: 0 },
                actual:   { totalPV: result.totalPV, surplus: result.surplus,
                            deficit: result.overallDeficit }
            };
        }
    },

    // =========================================================================
    // 8. 25% inflation boundary (max per validator) — must not NaN/overflow
    // =========================================================================
    {
        name: 'Scenario 8: 25% inflation boundary — handles extreme compounding',
        fn: function () {
            const phases = [
                { id: 'p', name: 'Hot', startAge: 60, endAge: 65,
                  baseMonthlyExpense: 50000, inflationRate: 25, color: 'blue' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, 100000000, 60, 30, 0.08);

            const finite = isFinite(result.totalPV) && !isNaN(result.totalPV);
            const positive = result.totalPV > 0;
            // At 25% × 30 years, expense at age 60 = 50k × 1.25^30 × 12 ≈ huge but finite
            // PV must be > corpus for sanity (deeply underfunded)
            const big = result.totalPV > 100000000;

            return {
                pass: finite && positive && big,
                expected: { finite: true, positive: true, totalPV: '>100Cr' },
                actual:   { totalPV: result.totalPV, isFinite: finite }
            };
        }
    },

    // =========================================================================
    // 9. 10-phase stress test — math engine handles many phases
    // =========================================================================
    {
        name: 'Scenario 9: 10-phase stress — all allocated, sum ≈ corpus',
        fn: function () {
            const phases = [];
            for (let i = 0; i < 10; i++) {
                phases.push({
                    id: 'sp' + i,
                    name: 'Phase ' + i,
                    startAge: 60 + i * 3,
                    endAge: 62 + i * 3,
                    baseMonthlyExpense: 30000 + i * 5000,
                    inflationRate: 6,
                    color: 'blue'
                });
            }
            const corpus = 30000000;
            const result = RP._multigoal.calculateAllocation(phases, corpus, 60, 30, 0.08);

            const all10 = result.phases.length === 10;
            const allPositive = result.phases.every(p => p.allocated > 0);
            const sum = result.phases.reduce((s, p) => s + p.allocated, 0);
            const sumOk = Math.abs(sum - corpus) < 100; // Underfunded → exhausts corpus
            const noNaN = !isNaN(result.totalPV);

            return {
                pass: all10 && allPositive && sumOk && noNaN,
                expected: { phases: 10, allPositive: true, sum: corpus },
                actual:   { phases: result.phases.length, sum: sum,
                            totalPV: result.totalPV }
            };
        }
    },

    // =========================================================================
    // 10. Edge: corpus = 0 → all PV is deficit, no allocations
    // =========================================================================
    {
        name: 'Scenario 10: Edge — corpus = 0, full deficit',
        fn: function () {
            const phases = [
                { id: 'p', name: 'Test', startAge: 60, endAge: 65,
                  baseMonthlyExpense: 50000, inflationRate: 5, color: 'blue' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, 0, 60, 30, 0.08);

            const zeroAlloc = result.phases.every(p => p.allocated === 0);
            const zeroSurplus = result.surplus === 0;
            const defEqualsPV = Math.abs(result.overallDeficit - result.totalPV) < 1;
            const noNaN = !isNaN(result.totalPV) && !isNaN(result.overallDeficit);

            return {
                pass: zeroAlloc && zeroSurplus && defEqualsPV && noNaN,
                expected: { allocated: 0, surplus: 0, deficit: 'equals totalPV' },
                actual:   { allocated: result.phases[0].allocated,
                            surplus: result.surplus,
                            deficit: result.overallDeficit, totalPV: result.totalPV }
            };
        }
    },

    // =========================================================================
    // 11. Edge: zero phases → handled gracefully (no crash, zero PV)
    // =========================================================================
    {
        name: 'Scenario 11: Edge — zero phases, no crash',
        fn: function () {
            const result = RP._multigoal.calculateAllocation([], 10000000, 60, 30, 0.08);

            const noPhases = result.phases.length === 0;
            const zeroPV = result.totalPV === 0;
            // All corpus is surplus (nothing to allocate)
            const surpEqCorpus = Math.abs(result.surplus - 10000000) < 1;
            const noDef = result.overallDeficit === 0;

            // Projection with zero phases must also not crash
            let projOk = true;
            try {
                const rows = RP._multigoal.runProjection([], result, 60, 65, 30, 0.08);
                projOk = Array.isArray(rows) && rows.length === 6; // age 60..65 inclusive
            } catch (e) {
                projOk = false;
            }

            return {
                pass: noPhases && zeroPV && surpEqCorpus && noDef && projOk,
                expected: { phases: 0, totalPV: 0, surplus: 10000000,
                            deficit: 0, projOk: true },
                actual:   { phases: result.phases.length, totalPV: result.totalPV,
                            surplus: result.surplus, deficit: result.overallDeficit,
                            projOk: projOk }
            };
        }
    },

    // =========================================================================
    // 12. Allocation sums to corpus when underfunded (within ₹10 tolerance)
    // =========================================================================
    {
        name: 'Scenario 12: Underfunded → allocation sum equals corpus (≤ ₹10 drift)',
        fn: function () {
            const corpus = 10000000;
            const phases = [
                { id: 'a', name: 'A', startAge: 60, endAge: 75, baseMonthlyExpense: 60000, inflationRate: 7, color: 'blue' },
                { id: 'b', name: 'B', startAge: 65, endAge: 80, baseMonthlyExpense: 40000, inflationRate: 5, color: 'emerald' },
                { id: 'c', name: 'C', startAge: 70, endAge: 85, baseMonthlyExpense: 30000, inflationRate: 8, color: 'amber' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, corpus, 60, 35, 0.08);
            const sum = result.phases.reduce((s, p) => s + p.allocated, 0);

            const drift = Math.abs(sum - corpus);
            const tightSum = drift <= 10;
            const isUnderfunded = result.overallDeficit > 0;

            return {
                pass: tightSum && isUnderfunded,
                expected: { allocSum: corpus, driftMax: 10, underfunded: true },
                actual:   { allocSum: sum, drift: drift,
                            overallDeficit: result.overallDeficit }
            };
        }
    },

    // =========================================================================
    // 13. Two equal phases → 50/50 PV split
    // =========================================================================
    {
        name: 'Scenario 13: Two equal phases (same expense + duration) → 50/50 split',
        fn: function () {
            const corpus = 20000000;
            const phases = [
                { id: 'a', name: 'A', startAge: 60, endAge: 69, baseMonthlyExpense: 100000, inflationRate: 0, color: 'blue' },
                { id: 'b', name: 'B', startAge: 70, endAge: 79, baseMonthlyExpense: 100000, inflationRate: 0, color: 'emerald' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, corpus, 60, 60, 0);

            // 0% inflation, 0% return → both phases have identical PV → 50/50 split
            const a = result.phases.find(p => p.phaseId === 'a');
            const b = result.phases.find(p => p.phaseId === 'b');
            const split5050 = Math.abs(a.percentOfCorpus - 50) < 0.1
                            && Math.abs(b.percentOfCorpus - 50) < 0.1;
            const allocOk = Math.abs(a.allocated - 10000000) < 100
                          && Math.abs(b.allocated - 10000000) < 100;

            return {
                pass: split5050 && allocOk,
                expected: { aPct: 50, bPct: 50, aAlloc: 10000000, bAlloc: 10000000 },
                actual:   { aPct: a.percentOfCorpus, bPct: b.percentOfCorpus,
                            aAlloc: a.allocated, bAlloc: b.allocated }
            };
        }
    },

    // =========================================================================
    // 14. Phase exhaustion in projection (underfunded depletes mid-life)
    // =========================================================================
    {
        name: 'Scenario 14: Phase exhausts mid-life — exhaustedAt set in projection',
        fn: function () {
            const corpus = 3000000; // ₹30L for 20-yr phase = guaranteed depletion
            const phases = [
                { id: 'p', name: 'Underfunded', startAge: 60, endAge: 80,
                  baseMonthlyExpense: 50000, inflationRate: 0, color: 'blue' }
            ];
            const alloc = RP._multigoal.calculateAllocation(phases, corpus, 60, 60, 0.05);
            const proj  = RP._multigoal.runProjection(phases, alloc, 60, 80, 60, 0.05);

            // Find first row where bucket hits exhaustion
            const exhRow = proj.find(r =>
                r.activePhases.some(p => p.isExhausted));
            const exhausted = !!exhRow;
            const beforeEnd = exhausted && exhRow.age < 80;

            return {
                pass: exhausted && beforeEnd,
                expected: { exhausted: true, age: '<80' },
                actual:   { exhausted: exhausted,
                            exhaustedAt: exhRow ? exhRow.age : 'never' }
            };
        }
    },

    // =========================================================================
    // 15. Higher inflation → larger PV than lower inflation (same other inputs)
    // =========================================================================
    {
        name: 'Scenario 15: Higher inflation phase requires larger PV',
        fn: function () {
            const phases = [
                { id: 'low',  name: 'Low',  startAge: 60, endAge: 70, baseMonthlyExpense: 100000, inflationRate:  3, color: 'blue' },
                { id: 'high', name: 'High', startAge: 60, endAge: 70, baseMonthlyExpense: 100000, inflationRate: 10, color: 'emerald' }
            ];
            const result = RP._multigoal.calculateAllocation(phases, 50000000, 60, 30, 0.08);

            const low  = result.phases.find(p => p.phaseId === 'low');
            const high = result.phases.find(p => p.phaseId === 'high');

            const highMorePV = high.pvRequired > low.pvRequired;
            const highMoreAlloc = high.allocated > low.allocated;
            const noNaN = !isNaN(low.pvRequired) && !isNaN(high.pvRequired);

            return {
                pass: highMorePV && highMoreAlloc && noNaN,
                expected: { highPV: '> lowPV', highAlloc: '> lowAlloc' },
                actual:   { lowPV: low.pvRequired, highPV: high.pvRequired,
                            lowAlloc: low.allocated, highAlloc: high.allocated }
            };
        }
    }
];
