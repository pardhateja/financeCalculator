/**
 * Multi-Goal Planner — life-phase expense planning with per-phase inflation
 *
 * Pure math engine (fe-003): NO DOM access, NO localStorage, NO form reads.
 * Callers (fe-002 UI form, fe-004 allocation table, fe-005 projection table)
 * pass primitives in and consume returned objects.
 *
 * Public API:
 *   RP._multigoal.calculateAllocation(phases, corpus, retirementAge, currentAge, postReturn)
 *     → { phases: [...], totalPV, totalCorpus, surplus, overallDeficit }
 *   RP._multigoal.runProjection(phases, allocations, retirementAge, lifeExpectancy, currentAge, postReturn)
 *     → Array of projection row objects (per 03-data-contracts.md §3)
 *   RP._multigoal.calculateDeficitSuggestions(deficit, yearsToRetirement, preReturn, phases)
 *     → { sipIncrease, phaseReduction }
 *
 * Convenience aliases on RP namespace (match fe-003 task description):
 *   RP.calculatePVAllocation, RP.generateMultiGoalProjections, RP.calculateDeficitSuggestions
 *
 * Persistence (fe-006): RP._multigoal._save() / _load() persist phases to
 * localStorage.rp_phases. Any mutator that adds/edits/deletes a phase MUST
 * call RP._multigoal._save() after mutating RP._multigoal.phases so changes
 * survive a reload. RP._multigoal.loadExample() populates 4 India-default phases.
 *
 * Phase CRUD (fe-002): RP._multigoal.addPhase, removePhase, renderPhases,
 * validatePhase + form-handler glue. Mutators call RP._multigoal._save().
 *
 * Math sources: 01-tech-spec.md Appendix A (PV allocation), Appendix B (projection loop)
 * Data shapes: 03-data-contracts.md §1 (Phase), §2 (Allocation), §3 (Projection row)
 */
RP._multigoal = RP._multigoal || { phases: [] };

/* Color rotation per 03-data-contracts.md (index mod 6). */
RP._phaseColorNames = ['blue', 'emerald', 'amber', 'purple', 'teal', 'pink'];

/* India FIRE example template per fe-002 spec. */
RP._phaseExampleTemplate = [
    { name: 'Kids at Home', startAge: 35, endAge: 50, baseMonthlyExpense: 80000, inflationRate: 6 },
    { name: 'Kids in College', startAge: 50, endAge: 55, baseMonthlyExpense: 120000, inflationRate: 10 },
    { name: 'Empty Nest', startAge: 55, endAge: 70, baseMonthlyExpense: 50000, inflationRate: 6 },
    { name: 'Medical / Late Retirement', startAge: 70, endAge: 100, baseMonthlyExpense: 70000, inflationRate: 12 }
];

/**
 * Validate a phase object against 03-data-contracts.md Section 1.
 * Used on localStorage load (and later sharelink import in fe-007).
 * Returns true if valid, false otherwise. Does NOT throw.
 */
RP._multigoal._validatePhase = function (phase, retirementAge, lifeExpectancy) {
    if (!phase || typeof phase !== 'object') return false;
    if (!phase.id || typeof phase.id !== 'string') return false;
    if (!phase.name || typeof phase.name !== 'string') return false;
    const trimmedName = phase.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 60) return false;
    if (!Number.isInteger(phase.startAge) || phase.startAge < retirementAge || phase.startAge > lifeExpectancy) return false;
    if (!Number.isInteger(phase.endAge) || phase.endAge <= phase.startAge || phase.endAge > lifeExpectancy) return false;
    if (typeof phase.baseMonthlyExpense !== 'number' || phase.baseMonthlyExpense <= 0) return false;
    if (typeof phase.inflationRate !== 'number' || phase.inflationRate < 0 || phase.inflationRate > 25) return false;
    return true;
};

/**
 * Persist RP._multigoal.phases to localStorage under key `rp_phases`.
 * Wrapped in try/catch — quota exceeded or private browsing must not crash
 * the rest of the app. fe-002's add/edit/delete mutators MUST call this.
 */
RP._multigoal._save = function () {
    try {
        localStorage.setItem('rp_phases', JSON.stringify(RP._multigoal.phases));
    } catch (e) {
        console.warn('Failed to save phases to localStorage:', e);
    }
};

/**
 * Load phases from localStorage, validate each entry, populate
 * RP._multigoal.phases. Invalid entries are skipped with a console.warn.
 * Malformed JSON or missing key leaves phases as []. Never throws.
 */
RP._multigoal._load = function () {
    let raw;
    try {
        raw = localStorage.getItem('rp_phases');
    } catch (e) {
        console.warn('Failed to read rp_phases from localStorage:', e);
        RP._multigoal.phases = [];
        return;
    }

    if (!raw) {
        RP._multigoal.phases = [];
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        console.warn('rp_phases is not valid JSON, ignoring:', e);
        RP._multigoal.phases = [];
        return;
    }

    if (!Array.isArray(parsed)) {
        console.warn('rp_phases is not an array, ignoring:', parsed);
        RP._multigoal.phases = [];
        return;
    }

    // Validate against current age inputs. Fall back to permissive bounds
    // if RP.val isn't ready yet (e.g. the basics tab fragment hasn't loaded).
    let retAge = 0;
    let lifeExp = 150;
    if (typeof RP.val === 'function') {
        const r = RP.val('retirementAge');
        const l = RP.val('lifeExpectancy');
        if (Number.isFinite(r) && r > 0) retAge = r;
        if (Number.isFinite(l) && l > 0) lifeExp = l;
    }

    const valid = [];
    parsed.forEach(phase => {
        if (RP._multigoal._validatePhase(phase, retAge, lifeExp)) {
            valid.push(phase);
        } else {
            console.warn('Invalid phase data, skipping:', phase);
        }
    });

    RP._multigoal.phases = valid;
};

/**
 * Populate RP._multigoal.phases with the 4-phase India FIRE example
 * (intake's reframed table + India inflation defaults from
 * 03-data-contracts.md Section 7). Persists immediately, then asks
 * the renderer (fe-002) to refresh if it's loaded.
 */
RP._multigoal.loadExample = function () {
    const startAge = (typeof RP.val === 'function') ? RP.val('retirementAge') : 35;
    const lifeExp = (typeof RP.val === 'function') ? RP.val('lifeExpectancy') : 100;

    // Confirm replacement if the user already has phases.
    if (RP._multigoal.phases.length > 0) {
        const ok = confirm('Load Example Template? This will replace your ' +
            RP._multigoal.phases.length + ' existing phase(s).');
        if (!ok) return;
    }

    RP._multigoal.phases = [
        {
            id: 'phase-' + Date.now() + '-1',
            name: 'Active early retirement (kids at home)',
            startAge: startAge,
            endAge: 50,
            baseMonthlyExpense: 150000,
            inflationRate: 6,
            color: 'blue'
        },
        {
            id: 'phase-' + Date.now() + '-2',
            name: 'Kids in college',
            startAge: 50,
            endAge: 54,
            baseMonthlyExpense: 200000,
            inflationRate: 10,
            color: 'emerald'
        },
        {
            id: 'phase-' + Date.now() + '-3',
            name: 'Empty nest',
            startAge: 54,
            endAge: 70,
            baseMonthlyExpense: 100000,
            inflationRate: 6,
            color: 'amber'
        },
        {
            id: 'phase-' + Date.now() + '-4',
            name: 'Late / medical',
            startAge: 70,
            endAge: lifeExp,
            baseMonthlyExpense: 150000,
            inflationRate: 12,
            color: 'purple'
        }
    ];

    RP._multigoal._save();

    // fe-002 owns rendering. Call its renderer if it has been loaded.
    if (typeof RP.renderPhases === 'function') RP.renderPhases();
    if (typeof RP.calculateMultiGoal === 'function') RP.calculateMultiGoal();
};

RP.initMultiGoal = function () {
    // Load persisted phases (if any) before wiring the Load Example button.
    RP._multigoal._load();

    // Wire the Load Example button. The button lives in pages/tab-multigoal.html.
    // Use querySelector so we don't crash if the fragment isn't on this page.
    const loadExampleBtn = document.getElementById('multigoalLoadExampleBtn');
    if (loadExampleBtn && !loadExampleBtn._wired) {
        loadExampleBtn.addEventListener('click', () => RP._multigoal.loadExample());
        loadExampleBtn._wired = true;
    }

    // If fe-002's renderer is already loaded, refresh it so persisted phases show.
    if (typeof RP.renderPhases === 'function') RP.renderPhases();
};

// ---------------------------------------------------------------------------
// Helper: inflated annual expense for a phase at a given age
// Inflation compounds from currentAge (expense grows from TODAY's value).
// ---------------------------------------------------------------------------
RP._multigoal._inflatedAnnualExpense = function (phase, age, currentAge) {
    const phaseInflation = (phase.inflationRate || 0) / 100;
    const yearsFromNow = age - currentAge;
    return phase.baseMonthlyExpense * Math.pow(1 + phaseInflation, yearsFromNow) * 12;
};

// ---------------------------------------------------------------------------
// Helper: Present Value of a single phase's full expense stream
// Inflate each year's expense forward from currentAge, discount back to retirementAge.
// ---------------------------------------------------------------------------
RP._multigoal._phasePresentValue = function (phase, retirementAge, currentAge, postReturn) {
    let phasePV = 0;
    for (let age = phase.startAge; age <= phase.endAge; age++) {
        const inflatedAnnual = RP._multigoal._inflatedAnnualExpense(phase, age, currentAge);
        const yearsFromRetirement = age - retirementAge;
        // Math.pow(1, n) === 1, so postReturn=0 is safe (no divide-by-zero)
        const discountFactor = Math.pow(1 + postReturn, yearsFromRetirement);
        phasePV += inflatedAnnual / discountFactor;
    }
    return phasePV;
};

// ---------------------------------------------------------------------------
// PV-Proportional Allocation
//   - Compute per-phase PV (inflated → discounted)
//   - Allocate corpus proportionally to PV share
//   - Detect surplus / overall deficit
// Returns object matching 03-data-contracts.md §2 (Allocation Result Object).
// ---------------------------------------------------------------------------
RP._multigoal.calculateAllocation = function (phases, totalCorpus, retirementAge, currentAge, postReturn) {
    // Defensive defaults (per Tech Spec Risk #7)
    const corpus = (typeof totalCorpus === 'number' && isFinite(totalCorpus)) ? Math.max(0, totalCorpus) : 0;
    const ret = (typeof retirementAge === 'number') ? retirementAge : 60;
    const cur = (typeof currentAge === 'number') ? currentAge : 30;
    const r = (typeof postReturn === 'number' && isFinite(postReturn)) ? postReturn : 0.05;
    const phaseList = Array.isArray(phases) ? phases : [];

    // Step 1: PV per phase
    const pvByPhase = {};
    let totalPV = 0;
    for (const phase of phaseList) {
        const pv = RP._multigoal._phasePresentValue(phase, ret, cur, r);
        pvByPhase[phase.id] = pv;
        totalPV += pv;
    }

    // Step 2: Proportional allocation
    const allocationRows = phaseList.map(phase => {
        const pvRequired = pvByPhase[phase.id] || 0;
        const allocated = (totalPV > 0) ? (pvRequired / totalPV) * corpus : 0;
        const percentOfCorpus = (corpus > 0) ? (allocated / corpus) * 100 : 0;
        const deficit = Math.max(0, pvRequired - allocated);
        const status = (allocated >= pvRequired - 0.01) ? 'funded' : 'underfunded';
        return {
            phaseId: phase.id,
            phaseName: phase.name,
            ageRange: phase.startAge + '-' + phase.endAge,
            pvRequired: pvRequired,
            allocated: allocated,
            percentOfCorpus: percentOfCorpus,
            deficit: deficit,
            status: status
        };
    });

    // Step 3: Surplus / overall deficit summary
    const surplus = Math.max(0, corpus - totalPV);
    const overallDeficit = Math.max(0, totalPV - corpus);

    return {
        phases: allocationRows,
        totalPV: totalPV,
        totalCorpus: corpus,
        surplus: surplus,
        overallDeficit: overallDeficit
    };
};

// ---------------------------------------------------------------------------
// Year-by-year projection with per-phase sub-corpus buckets
// Returns array of row objects matching 03-data-contracts.md §3.
//
// Pattern: extends calc-projections.js:27-61 — same `for (let age = ...; age <= lifeExp; age++)`
// loop structure, but tracks N independent buckets instead of one corpus.
// ---------------------------------------------------------------------------
RP._multigoal.runProjection = function (phases, allocationResult, retirementAge, lifeExpectancy, currentAge, postReturn) {
    const phaseList = Array.isArray(phases) ? phases : [];
    const ret = (typeof retirementAge === 'number') ? retirementAge : 60;
    const lifeExp = (typeof lifeExpectancy === 'number') ? lifeExpectancy : 85;
    const cur = (typeof currentAge === 'number') ? currentAge : 30;
    const r = (typeof postReturn === 'number' && isFinite(postReturn)) ? postReturn : 0.05;

    // Build phaseId → allocated amount lookup from allocation result
    const allocByPhase = {};
    if (allocationResult && Array.isArray(allocationResult.phases)) {
        for (const a of allocationResult.phases) {
            allocByPhase[a.phaseId] = a.allocated || 0;
        }
    }

    // Initialize per-phase buckets
    const phaseBuckets = {};
    for (const phase of phaseList) {
        phaseBuckets[phase.id] = {
            balance: allocByPhase[phase.id] || 0,
            exhaustedAt: null
        };
    }

    const rows = [];

    for (let age = ret; age <= lifeExp; age++) {
        const activePhases = phaseList.filter(p => age >= p.startAge && age <= p.endAge);

        let totalStarting = 0;
        let totalGrowth = 0;
        let totalExpenses = 0;
        const phaseDetails = [];
        const activePhaseIds = [];

        for (const phase of activePhases) {
            const bucket = phaseBuckets[phase.id];
            const starting = bucket.balance;
            const growth = starting * r;
            const expense = RP._multigoal._inflatedAnnualExpense(phase, age, cur);
            const endingRaw = starting + growth - expense;

            // Mark exhaustion: bucket can't cover this year's expense
            if (endingRaw < 0 && bucket.exhaustedAt === null) {
                bucket.exhaustedAt = age;
            }

            const ending = Math.max(0, endingRaw);
            bucket.balance = ending;

            activePhaseIds.push(phase.id);
            phaseDetails.push({
                phaseId: phase.id,
                phaseName: phase.name,
                color: phase.color,
                bucketStarting: starting,
                bucketGrowth: growth,
                bucketExpense: expense,
                bucketEnding: ending,
                isExhausted: bucket.exhaustedAt !== null
            });

            totalStarting += starting;
            totalGrowth += growth;
            totalExpenses += expense;
        }

        // Inactive (idle) buckets still grow during this year — they're earmarked
        // savings until their phase activates. Add their growth to row totals so
        // the displayed corpus reflects the full state, not just the active slice.
        for (const phase of phaseList) {
            const isActive = activePhases.some(p => p.id === phase.id);
            if (isActive) continue;
            const bucket = phaseBuckets[phase.id];
            const starting = bucket.balance;
            const growth = starting * r;
            bucket.balance = starting + growth;
            totalStarting += starting;
            totalGrowth += growth;
        }

        const totalEnding = totalStarting + totalGrowth - totalExpenses;

        // Status per contract: depleted if ≤0, depleting if 0 < ending ≤ expenses*5, else healthy
        let status;
        if (totalEnding <= 0) {
            status = 'depleted';
        } else if (totalExpenses > 0 && totalEnding <= totalExpenses * 5) {
            status = 'depleting';
        } else {
            status = 'healthy';
        }

        rows.push({
            age: age,
            activePhaseIds: activePhaseIds,
            starting: totalStarting,
            growth: totalGrowth,
            expenses: totalExpenses,
            ending: totalEnding,
            status: status,
            activePhases: phaseDetails
        });
    }

    return rows;
};

// ---------------------------------------------------------------------------
// Deficit suggestions — actionable text for underfunded scenarios.
// Two options:
//   1. Increase monthly SIP to close the gap by retirement
//      Solve FV = SIP * [(1+r)^n - 1] / r for SIP, given FV = deficit
//   2. Reduce highest-cost phase by X% to eliminate the gap
// ---------------------------------------------------------------------------
RP._multigoal.calculateDeficitSuggestions = function (deficit, yearsToRetirement, preReturn, phases) {
    const gap = (typeof deficit === 'number' && deficit > 0) ? deficit : 0;
    const years = (typeof yearsToRetirement === 'number' && yearsToRetirement > 0) ? yearsToRetirement : 0;
    const r = (typeof preReturn === 'number' && isFinite(preReturn)) ? preReturn : 0.08;
    const phaseList = Array.isArray(phases) ? phases : [];

    // Option 1: SIP increase needed (monthly amount)
    let sipIncrease = 0;
    if (gap > 0 && years > 0) {
        const monthlyRate = r / 12;
        const months = years * 12;
        if (monthlyRate > 0) {
            const fvFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
            sipIncrease = gap / fvFactor;
        } else {
            // Zero return — straight division
            sipIncrease = gap / months;
        }
    }

    // Option 2: Reduce highest-cost phase by gap/totalPhaseCost percentage
    // Directional suggestion only — exact reduction requires re-running PV.
    let phaseReduction = null;
    if (gap > 0 && phaseList.length > 0) {
        let topPhase = phaseList[0];
        for (const p of phaseList) {
            if (p.baseMonthlyExpense > topPhase.baseMonthlyExpense) {
                topPhase = p;
            }
        }
        const topPhaseAnnualBase = topPhase.baseMonthlyExpense * 12;
        const phaseDuration = topPhase.endAge - topPhase.startAge + 1;
        const topPhaseTotalBase = topPhaseAnnualBase * phaseDuration;
        const reductionPercent = topPhaseTotalBase > 0
            ? Math.min(100, (gap / topPhaseTotalBase) * 100)
            : 0;
        const reducedAmount = topPhase.baseMonthlyExpense * (1 - reductionPercent / 100);
        phaseReduction = {
            phaseName: topPhase.name,
            currentAmount: topPhase.baseMonthlyExpense,
            reducedAmount: Math.max(0, reducedAmount),
            reductionPercent: reductionPercent
        };
    }

    return {
        sipIncrease: sipIncrease,
        phaseReduction: phaseReduction
    };
};

// ---------------------------------------------------------------------------
// Public aliases on RP namespace (match fe-003 task description signatures)
// ---------------------------------------------------------------------------
RP.calculatePVAllocation = function (totalCorpus, phases, retirementAge, currentAge, postReturn) {
    return RP._multigoal.calculateAllocation(phases, totalCorpus, retirementAge, currentAge, postReturn);
};

RP.generateMultiGoalProjections = function (phases, allocations, retirementAge, lifeExpectancy, currentAge, postReturn) {
    return RP._multigoal.runProjection(phases, allocations, retirementAge, lifeExpectancy, currentAge, postReturn);
};

RP.calculateDeficitSuggestions = function (deficit, yearsToRetirement, preReturn, phases) {
    return RP._multigoal.calculateDeficitSuggestions(deficit, yearsToRetirement, preReturn, phases);
};

// ---------------------------------------------------------------------------
// Test scenarios — consumed by fe-010 (test-multigoal.html). Lightweight,
// no TEST_MODE guard needed (data only, ~3KB at script-load).
// ---------------------------------------------------------------------------
RP._multigoal.testScenarios = [
    {
        name: 'Single phase, no inflation, underfunded',
        corpus: 10000000,
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 70,
        postReturn: 0,
        phases: [
            { id: 'p1', name: 'Test', startAge: 60, endAge: 69, baseMonthlyExpense: 100000, inflationRate: 0, color: 'blue' }
        ],
        expected: {
            totalPV: 12000000, // ₹100k × 12mo × 10yr
            overallDeficit: 2000000,
            phase_p1_allocated: 10000000
        }
    },
    {
        name: 'Single phase, no inflation, exactly funded',
        corpus: 12000000,
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 70,
        postReturn: 0,
        phases: [
            { id: 'p1', name: 'Test', startAge: 60, endAge: 69, baseMonthlyExpense: 100000, inflationRate: 0, color: 'blue' }
        ],
        expected: {
            totalPV: 12000000,
            overallDeficit: 0,
            surplus: 0,
            phase_p1_allocated: 12000000
        }
    },
    {
        name: 'Two phases, equal expense + duration → 50/50 split',
        corpus: 20000000,
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 80,
        postReturn: 0,
        phases: [
            { id: 'a', name: 'A', startAge: 60, endAge: 69, baseMonthlyExpense: 100000, inflationRate: 0, color: 'blue' },
            { id: 'b', name: 'B', startAge: 70, endAge: 79, baseMonthlyExpense: 100000, inflationRate: 0, color: 'emerald' }
        ],
        expected: {
            phase_a_percent: 50,
            phase_b_percent: 50
        }
    },
    {
        name: 'Overlapping phases — both active at age 50',
        corpus: 30000000,
        currentAge: 35,
        retirementAge: 50,
        lifeExpectancy: 60,
        postReturn: 0.08,
        phases: [
            { id: 'a', name: 'Lifestyle', startAge: 50, endAge: 55, baseMonthlyExpense: 80000, inflationRate: 6, color: 'blue' },
            { id: 'b', name: 'Kids college', startAge: 50, endAge: 53, baseMonthlyExpense: 40000, inflationRate: 10, color: 'emerald' }
        ],
        expected: {
            overlapAge: 50,
            overlapPhaseCount: 2
        }
    },
    {
        name: 'Gap year — age 60 has no phases',
        corpus: 20000000,
        currentAge: 35,
        retirementAge: 50,
        lifeExpectancy: 65,
        postReturn: 0.08,
        phases: [
            { id: 'a', name: 'Early', startAge: 50, endAge: 55, baseMonthlyExpense: 100000, inflationRate: 6, color: 'blue' },
            { id: 'b', name: 'Late', startAge: 62, endAge: 64, baseMonthlyExpense: 100000, inflationRate: 6, color: 'emerald' }
        ],
        expected: {
            gapAge: 60,
            gapExpenses: 0
        }
    },
    {
        name: 'Indian FIRE template — 4 phases, ₹5Cr corpus, 8% post-return',
        corpus: 50000000,
        currentAge: 35,
        retirementAge: 50,
        lifeExpectancy: 85,
        postReturn: 0.08,
        phases: [
            { id: 'p1', name: 'Active retirement', startAge: 50, endAge: 60, baseMonthlyExpense: 100000, inflationRate: 6, color: 'blue' },
            { id: 'p2', name: 'Kids college', startAge: 50, endAge: 54, baseMonthlyExpense: 80000, inflationRate: 10, color: 'emerald' },
            { id: 'p3', name: 'Late lifestyle', startAge: 60, endAge: 75, baseMonthlyExpense: 80000, inflationRate: 6, color: 'amber' },
            { id: 'p4', name: 'Medical', startAge: 70, endAge: 85, baseMonthlyExpense: 60000, inflationRate: 12, color: 'purple' }
        ],
        expected: {
            allocationSumNear: 50000000
        }
    }
];

// fe-002 redefines RP.initMultiGoal below to wire up CRUD form buttons.
// We keep the call here so initialization runs at script-load.

RP.initMultiGoal = function () {
    const addBtn = document.getElementById('addPhaseBtn');
    const exampleBtn = document.getElementById('loadPhaseExampleBtn');
    if (addBtn) addBtn.addEventListener('click', () => RP.addPhase());
    if (exampleBtn) exampleBtn.addEventListener('click', () => RP.loadPhaseExample());
    if (typeof RP._multigoal._load === 'function') RP._multigoal._load();
    RP.renderPhases();
};

/* ---------- Validation ---------- */

/**
 * Validates a phase object against contract constraints (per 03-data-contracts.md §1).
 * Used for both UI form submission and (later) sharelink/localStorage import.
 */
RP.validatePhase = function (phase, retirementAge, lifeExpectancy) {
    if (!phase || typeof phase !== 'object') return false;
    if (!phase.id || typeof phase.id !== 'string') return false;
    if (!phase.name || typeof phase.name !== 'string') return false;
    if (phase.name.trim().length < 1 || phase.name.trim().length > 60) return false;
    if (!Number.isInteger(phase.startAge) || phase.startAge < retirementAge || phase.startAge > lifeExpectancy) return false;
    if (!Number.isInteger(phase.endAge) || phase.endAge <= phase.startAge || phase.endAge > lifeExpectancy) return false;
    if (typeof phase.baseMonthlyExpense !== 'number' || phase.baseMonthlyExpense <= 0) return false;
    if (typeof phase.inflationRate !== 'number' || phase.inflationRate < 0 || phase.inflationRate > 25) return false;
    return true;
};

/**
 * Reads the form, returns { ok, phase, errors } where errors is { fieldId: message }.
 * Per 03-data-contracts.md §6 validation error messages table.
 */
RP._readPhaseForm = function () {
    const retAge = parseInt(document.getElementById('retirementAge') ? document.getElementById('retirementAge').value : '0', 10) || 0;
    const lifeExp = parseInt(document.getElementById('lifeExpectancy') ? document.getElementById('lifeExpectancy').value : '0', 10) || 120;

    const nameRaw = (document.getElementById('phaseName').value || '').trim();
    const startRaw = document.getElementById('phaseStartAge').value;
    const endRaw = document.getElementById('phaseEndAge').value;
    const expenseRaw = document.getElementById('phaseMonthlyExpense').value;
    const inflRaw = document.getElementById('phaseInflationRate').value;

    const startAge = startRaw === '' ? NaN : parseInt(startRaw, 10);
    const endAge = endRaw === '' ? NaN : parseInt(endRaw, 10);
    const baseMonthlyExpense = expenseRaw === '' ? NaN : parseFloat(expenseRaw);
    const inflationRate = inflRaw === '' ? NaN : parseFloat(inflRaw);

    const errors = {};
    if (nameRaw.length < 1) errors.phaseName = 'Phase name cannot be empty';
    else if (nameRaw.length > 60) errors.phaseName = 'Phase name too long (max 60 characters)';

    if (!Number.isFinite(startAge) || !Number.isInteger(startAge)) {
        errors.phaseStartAge = 'Start age is required';
    } else if (retAge && startAge < retAge) {
        errors.phaseStartAge = 'Phase cannot start before retirement (age ' + retAge + ')';
    } else if (lifeExp && startAge > lifeExp) {
        errors.phaseStartAge = 'Phase cannot start after life expectancy (age ' + lifeExp + ')';
    }

    if (!Number.isFinite(endAge) || !Number.isInteger(endAge)) {
        errors.phaseEndAge = 'End age is required';
    } else if (Number.isFinite(startAge) && endAge <= startAge) {
        errors.phaseEndAge = 'Phase end age must be after start age';
    } else if (lifeExp && endAge > lifeExp) {
        errors.phaseEndAge = 'Phase cannot extend beyond life expectancy (age ' + lifeExp + ')';
    }

    if (!Number.isFinite(baseMonthlyExpense) || baseMonthlyExpense <= 0) {
        errors.phaseMonthlyExpense = 'Monthly expense must be greater than zero';
    }

    if (!Number.isFinite(inflationRate)) {
        errors.phaseInflationRate = 'Inflation rate is required';
    } else if (inflationRate < 0) {
        errors.phaseInflationRate = 'Inflation rate cannot be negative';
    } else if (inflationRate > 25) {
        errors.phaseInflationRate = 'Inflation rate too high (max 25%)';
    }

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors: errors };
    }

    const idx = (RP._multigoal.phases || []).length;
    const phase = {
        id: 'phase-' + Date.now(),
        name: nameRaw,
        startAge: startAge,
        endAge: endAge,
        baseMonthlyExpense: baseMonthlyExpense,
        inflationRate: inflationRate,
        color: RP._phaseColorNames[idx % 6]
    };
    return { ok: true, phase: phase };
};

RP._clearPhaseFormErrors = function () {
    ['phaseName', 'phaseStartAge', 'phaseEndAge', 'phaseMonthlyExpense', 'phaseInflationRate'].forEach(id => {
        const errEl = document.getElementById(id + 'Error');
        if (errEl) errEl.textContent = '';
        const inputEl = document.getElementById(id);
        if (inputEl) inputEl.classList.remove('phase-input-invalid');
    });
};

RP._showPhaseFormErrors = function (errors) {
    Object.keys(errors).forEach(id => {
        const errEl = document.getElementById(id + 'Error');
        if (errEl) errEl.textContent = errors[id];
        const inputEl = document.getElementById(id);
        if (inputEl) inputEl.classList.add('phase-input-invalid');
    });
};

RP._clearPhaseFormInputs = function () {
    ['phaseName', 'phaseStartAge', 'phaseEndAge', 'phaseMonthlyExpense', 'phaseInflationRate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
};

/* ---------- CRUD ---------- */

RP.addPhase = function () {
    RP._clearPhaseFormErrors();
    const result = RP._readPhaseForm();
    if (!result.ok) {
        RP._showPhaseFormErrors(result.errors);
        return;
    }
    RP._multigoal.phases.push(result.phase);
    RP._sortPhases();
    RP._clearPhaseFormInputs();
    RP.renderPhases();
};

RP.removePhase = function (phaseId) {
    const idx = RP._multigoal.phases.findIndex(p => p.id === phaseId);
    if (idx === -1) return;
    const removed = RP._multigoal.phases[idx];
    RP._multigoal.phases.splice(idx, 1);
    RP.renderPhases();
    RP._showPhaseToast('Phase "' + removed.name + '" deleted', () => {
        RP._multigoal.phases.push(removed);
        RP._sortPhases();
        RP.renderPhases();
    });
};

RP.loadPhaseExample = function () {
    const existing = RP._multigoal.phases.length;
    if (existing > 0) {
        const ok = window.confirm('Load Example Template? This will replace your ' + existing + ' existing phase' + (existing === 1 ? '' : 's') + '.');
        if (!ok) return;
    }
    RP._multigoal.phases = RP._phaseExampleTemplate.map((p, i) => ({
        id: 'phase-' + Date.now() + '-' + i,
        name: p.name,
        startAge: p.startAge,
        endAge: p.endAge,
        baseMonthlyExpense: p.baseMonthlyExpense,
        inflationRate: p.inflationRate,
        color: RP._phaseColorNames[i % 6]
    }));
    RP._sortPhases();
    RP.renderPhases();
};

/* Sort by startAge ascending. Per data contract §1: existing phase colors are
 * preserved on delete (no re-assignment); however on initial add/load we assign
 * by current insertion index, then sorting may shuffle visual order while
 * keeping each phase's assigned color. */
RP._sortPhases = function () {
    RP._multigoal.phases.sort((a, b) => a.startAge - b.startAge);
};

/* ---------- Render ---------- */

RP.renderPhases = function () {
    const container = document.getElementById('phasesContainer');
    const countEl = document.getElementById('phaseCount');
    if (!container) return;

    const phases = RP._multigoal.phases;
    if (countEl) countEl.textContent = String(phases.length);

    if (phases.length === 0) {
        container.innerHTML = '<div class="sub-text" style="padding:16px;text-align:center;color:var(--text-secondary);">No phases added yet. Add your first life phase above or click "Load Example".</div>';
        return;
    }

    /* Build cards via DOM (textContent, not innerHTML, for user-supplied name — no XSS). */
    container.innerHTML = '';
    phases.forEach(phase => {
        const card = document.createElement('div');
        card.className = 'phase-card';
        const colorVar = 'var(--phase-color-' + phase.color + ')';
        card.style.setProperty('--phase-color', colorVar);

        const body = document.createElement('div');
        body.className = 'phase-card-body';

        const nameEl = document.createElement('div');
        nameEl.className = 'phase-card-name';
        nameEl.textContent = phase.name;

        const years = phase.endAge - phase.startAge;
        const ageEl = document.createElement('div');
        ageEl.className = 'phase-card-meta';
        const dot = document.createElement('span');
        dot.className = 'phase-color-dot';
        ageEl.appendChild(dot);
        ageEl.appendChild(document.createTextNode('Age ' + phase.startAge + '-' + phase.endAge + ' (' + years + ' year' + (years === 1 ? '' : 's') + ')'));

        const exprEl = document.createElement('div');
        exprEl.className = 'phase-card-meta';
        exprEl.textContent = RP.formatCurrency(phase.baseMonthlyExpense) + '/mo · ' + phase.inflationRate + '% inflation';

        body.appendChild(nameEl);
        body.appendChild(ageEl);
        body.appendChild(exprEl);

        const actions = document.createElement('div');
        actions.className = 'phase-card-actions';
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = 'Delete';
        delBtn.setAttribute('aria-label', 'Delete phase ' + phase.name);
        delBtn.addEventListener('click', () => RP.removePhase(phase.id));
        actions.appendChild(delBtn);

        card.appendChild(body);
        card.appendChild(actions);
        container.appendChild(card);
    });
};

/* ---------- Toast (delete-undo, per A15) ---------- */

RP._showPhaseToast = function (message, undoFn) {
    const container = document.getElementById('phaseToastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'phase-toast';
    toast.setAttribute('role', 'status');

    const msg = document.createElement('span');
    msg.textContent = message;
    toast.appendChild(msg);

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.textContent = 'Undo';
    toast.appendChild(undoBtn);

    const dismiss = () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    };
    undoBtn.addEventListener('click', () => {
        try { undoFn(); } finally { dismiss(); }
    });
    container.appendChild(toast);
    setTimeout(dismiss, 5000);
};

/* Run init at script-load so the scaffold is observable in the console
 * even before app.js wires it. Once app.js is updated (fe-008) to call
 * RP.initMultiGoal(), this becomes a no-op safety net. */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RP.initMultiGoal());
} else {
    RP.initMultiGoal();
}
