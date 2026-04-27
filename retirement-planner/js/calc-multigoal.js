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

/* India FIRE example template — Pardha v1.1 (10 overlapping phases).
 * Decisions locked in docs/multi-goal-v1.1/00-tone-and-locked-decisions.md §3.1
 * Math engine sums overlapping phases per year (verified by qa-003 in v1).
 *
 * shortName field (bug-013): used as compact label in projection table badges.
 * Falls back to auto-derive when missing (see bug-013 fix when it lands). */
RP._phaseExampleTemplate = [
    // Always-on baseline (no kids — IS the empty-nest baseline too).
    { name: 'Base (no kids)',     shortName: 'Base',      startAge: 27, endAge: 100, baseMonthlyExpense: 50000, inflationRate: 6  },
    // Kid 1: born ~age 28; at home until college (kid age 17 → Pardha 45)
    { name: 'Kid 1 at home',      shortName: 'K1 home',   startAge: 28, endAge: 45,  baseMonthlyExpense: 10000, inflationRate: 6  },
    { name: 'Kid 1 college fees', shortName: 'K1 fees',   startAge: 45, endAge: 49,  baseMonthlyExpense: 8333,  inflationRate: 10 },
    { name: 'Kid 1 hostel',       shortName: 'K1 hostel', startAge: 45, endAge: 49,  baseMonthlyExpense: 8333,  inflationRate: 7  },
    { name: 'Kid 1 pocket money', shortName: 'K1 pocket', startAge: 45, endAge: 49,  baseMonthlyExpense: 15000, inflationRate: 6  },
    // Kid 2: born ~age 35
    { name: 'Kid 2 at home',      shortName: 'K2 home',   startAge: 35, endAge: 52,  baseMonthlyExpense: 10000, inflationRate: 6  },
    { name: 'Kid 2 college fees', shortName: 'K2 fees',   startAge: 52, endAge: 56,  baseMonthlyExpense: 8333,  inflationRate: 10 },
    { name: 'Kid 2 hostel',       shortName: 'K2 hostel', startAge: 52, endAge: 56,  baseMonthlyExpense: 8333,  inflationRate: 7  },
    { name: 'Kid 2 pocket money', shortName: 'K2 pocket', startAge: 52, endAge: 56,  baseMonthlyExpense: 15000, inflationRate: 6  },
    // Late-life medical add-on (sums on top of Base from age 70)
    { name: 'Medical add-on',     shortName: 'Medical',   startAge: 70, endAge: 100, baseMonthlyExpense: 20000, inflationRate: 12 }
];

/**
 * Generate a collision-safe phase ID (bug-012 fix).
 * Uses crypto.randomUUID() (available in all modern browsers + iOS Safari 15.4+).
 * Falls back to Date.now() + random suffix for very old environments
 * (jsdom test harness, headless tooling). Never collides under realistic load.
 */
RP._multigoal._generateId = function () {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return 'phase-' + crypto.randomUUID();
    }
    return 'phase-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
};

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
            id: RP._multigoal._generateId(),
            name: 'Active early retirement (kids at home)',
            startAge: startAge,
            endAge: 50,
            baseMonthlyExpense: 150000,
            inflationRate: 6,
            color: 'blue'
        },
        {
            id: RP._multigoal._generateId(),
            name: 'Kids in college',
            startAge: 50,
            endAge: 54,
            baseMonthlyExpense: 200000,
            inflationRate: 10,
            color: 'emerald'
        },
        {
            id: RP._multigoal._generateId(),
            name: 'Empty nest',
            startAge: 54,
            endAge: 70,
            baseMonthlyExpense: 100000,
            inflationRate: 6,
            color: 'amber'
        },
        {
            id: RP._multigoal._generateId(),
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

// bug-011 fix: removed orphaned RP.initMultiGoal definition (formerly here).
// Canonical RP.initMultiGoal lives at line ~671 below — it merges the localStorage
// load (formerly the unique responsibility of this orphan) with the button wiring
// added by fe-002. The orphan was wiring a button id "multigoalLoadExampleBtn"
// that no longer exists in the DOM (fe-002 changed it to "loadPhaseExampleBtn"),
// so this code path was never executing anyway.

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
// Helper: Overlap detection (bug-001 / PRD AC3)
// Two phases overlap when their inclusive age ranges intersect.
// Returns per-phase overlap descriptors so renderPhases can decorate cards
// with "Overlaps with X" badges.
// ---------------------------------------------------------------------------
RP._multigoal._detectOverlaps = function (phases) {
    const list = Array.isArray(phases) ? phases : [];
    const result = [];
    for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a) continue;
        const overlapsWith = [];
        for (let j = 0; j < list.length; j++) {
            if (i === j) continue;
            const b = list[j];
            if (!b) continue;
            // Inclusive intersection: a.start <= b.end && b.start <= a.end
            if (a.startAge <= b.endAge && b.startAge <= a.endAge) {
                const fromAge = Math.max(a.startAge, b.startAge);
                const toAge = Math.min(a.endAge, b.endAge);
                overlapsWith.push({
                    otherPhaseId: b.id,
                    otherPhaseName: b.name,
                    fromAge: fromAge,
                    toAge: toAge
                });
            }
        }
        if (overlapsWith.length > 0) {
            result.push({ phaseId: a.id, overlapsWith: overlapsWith });
        }
    }
    return result;
};

// ---------------------------------------------------------------------------
// Helper: Aggregate overlap ranges for the info banner (bug-001 / PRD AC3)
// Walks the union of all phase ages, groups consecutive ages where 2+ phases
// are active into contiguous ranges, and returns one entry per range with the
// phase names involved.
// ---------------------------------------------------------------------------
RP._multigoal._detectOverlapRanges = function (phases) {
    const list = Array.isArray(phases) ? phases : [];
    if (list.length < 2) return [];

    let minAge = Infinity;
    let maxAge = -Infinity;
    list.forEach(p => {
        if (!p) return;
        if (p.startAge < minAge) minAge = p.startAge;
        if (p.endAge > maxAge) maxAge = p.endAge;
    });
    if (!isFinite(minAge) || !isFinite(maxAge)) return [];

    const ranges = [];
    let current = null;
    for (let age = minAge; age <= maxAge; age++) {
        const active = list.filter(p => p && age >= p.startAge && age <= p.endAge);
        if (active.length >= 2) {
            const namesKey = active.map(p => p.name).join('||');
            if (current && current._key === namesKey && current.toAge === age - 1) {
                current.toAge = age;
            } else {
                if (current) ranges.push(current);
                current = {
                    fromAge: age,
                    toAge: age,
                    phaseNames: active.map(p => p.name),
                    _key: namesKey
                };
            }
        } else if (current) {
            ranges.push(current);
            current = null;
        }
    }
    if (current) ranges.push(current);
    // Strip the internal _key field before returning
    return ranges.map(r => ({ fromAge: r.fromAge, toAge: r.toAge, phaseNames: r.phaseNames }));
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
    } else if (baseMonthlyExpense > 100000000) {
        // bug-005 fix: cap at ₹10 crore/month to prevent number-formatting overflow
        // and absurd suggestion text. Even ultra-HNW Indian early retirees fit in this range.
        errors.phaseMonthlyExpense = 'Monthly expense unrealistically high (max ₹10 crore/mo)';
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
        id: RP._multigoal._generateId(),
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

// Tracks the phase id currently being edited in the form (or null = "add" mode).
// Set by RP.editPhase, cleared by RP.addPhase + RP.cancelEditPhase.
RP._editingPhaseId = null;

RP.addPhase = function () {
    RP._clearPhaseFormErrors();
    const result = RP._readPhaseForm();
    if (!result.ok) {
        RP._showPhaseFormErrors(result.errors);
        return;
    }

    if (RP._editingPhaseId) {
        // Save-Changes mode: replace the phase with the same id, preserving its color.
        const idx = RP._multigoal.phases.findIndex(p => p.id === RP._editingPhaseId);
        if (idx !== -1) {
            const existingColor = RP._multigoal.phases[idx].color;
            result.phase.id = RP._editingPhaseId;
            result.phase.color = existingColor;
            RP._multigoal.phases[idx] = result.phase;
        } else {
            // Phase was deleted while user was editing — fall back to add.
            RP._multigoal.phases.push(result.phase);
        }
        RP._editingPhaseId = null;
    } else {
        RP._multigoal.phases.push(result.phase);
    }

    RP._sortPhases();
    RP._multigoal._save();
    RP._clearPhaseFormInputs();
    RP._restorePhaseFormButtons();
    RP.renderPhases();
};

RP.removePhase = function (phaseId) {
    const idx = RP._multigoal.phases.findIndex(p => p.id === phaseId);
    if (idx === -1) return;
    const removed = RP._multigoal.phases[idx];
    RP._multigoal.phases.splice(idx, 1);

    // If the user was editing this phase, exit edit mode cleanly.
    if (RP._editingPhaseId === phaseId) {
        RP._editingPhaseId = null;
        RP._clearPhaseFormInputs();
        RP._restorePhaseFormButtons();
    }

    RP._multigoal._save();
    RP.renderPhases();
    RP._showPhaseToast('Phase "' + removed.name + '" deleted', () => {
        RP._multigoal.phases.push(removed);
        RP._sortPhases();
        RP._multigoal._save();
        RP.renderPhases();
    });
};

// Populate the form with this phase's values + put the form in Save-Changes mode.
RP.editPhase = function (phaseId) {
    const phase = RP._multigoal.phases.find(p => p.id === phaseId);
    if (!phase) return;

    RP._clearPhaseFormErrors();
    document.getElementById('phaseName').value = phase.name;
    document.getElementById('phaseStartAge').value = phase.startAge;
    document.getElementById('phaseEndAge').value = phase.endAge;
    document.getElementById('phaseMonthlyExpense').value = phase.baseMonthlyExpense;
    document.getElementById('phaseInflationRate').value = phase.inflationRate;

    RP._editingPhaseId = phaseId;
    RP._setPhaseFormButtonsToEditMode(phase.name);

    // Scroll the form into view so the user knows the click did something.
    const form = document.querySelector('.phase-form-grid');
    if (form && typeof form.scrollIntoView === 'function') {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

RP.cancelEditPhase = function () {
    RP._editingPhaseId = null;
    RP._clearPhaseFormErrors();
    RP._clearPhaseFormInputs();
    RP._restorePhaseFormButtons();
};

// UI helpers: swap "Add Phase" button label to "Save Changes" + show Cancel button.
RP._setPhaseFormButtonsToEditMode = function (phaseName) {
    const addBtn = document.getElementById('addPhaseBtn');
    if (addBtn) {
        addBtn.textContent = 'Save Changes';
        addBtn.setAttribute('aria-label', 'Save changes to phase ' + phaseName);
    }
    let cancelBtn = document.getElementById('cancelEditPhaseBtn');
    if (!cancelBtn && addBtn && addBtn.parentNode) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelEditPhaseBtn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.setAttribute('aria-label', 'Cancel editing');
        cancelBtn.addEventListener('click', () => RP.cancelEditPhase());
        addBtn.parentNode.insertBefore(cancelBtn, addBtn.nextSibling);
    } else if (cancelBtn) {
        cancelBtn.style.display = '';
    }
};

RP._restorePhaseFormButtons = function () {
    const addBtn = document.getElementById('addPhaseBtn');
    if (addBtn) {
        addBtn.textContent = 'Add Phase';
        addBtn.removeAttribute('aria-label');
    }
    const cancelBtn = document.getElementById('cancelEditPhaseBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
};

RP.loadPhaseExample = function () {
    const existing = RP._multigoal.phases.length;
    if (existing > 0) {
        const ok = window.confirm('Load Example Template? This will replace your ' + existing + ' existing phase' + (existing === 1 ? '' : 's') + '.');
        if (!ok) return;
    }
    RP._multigoal.phases = RP._phaseExampleTemplate.map((p, i) => ({
        id: RP._multigoal._generateId(),
        name: p.name,
        shortName: p.shortName, // bug-013: forward template-baked compact label
        startAge: p.startAge,
        endAge: p.endAge,
        baseMonthlyExpense: p.baseMonthlyExpense,
        inflationRate: p.inflationRate,
        color: RP._phaseColorNames[i % 6]
    }));
    RP._sortPhases();
    RP._multigoal._save();
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

    /* Overlap banner (bug-001 / PRD AC3) — render ABOVE the phase list so it
     * remains visible when users scroll through cards. Cleared whenever no
     * overlap ranges exist. */
    RP._multigoal._renderOverlapBanner(phases);

    if (phases.length === 0) {
        container.innerHTML = '<div class="sub-text" style="padding:16px;text-align:center;color:var(--text-secondary);">No phases added yet. Add your first life phase above or click "Load Example".</div>';
        return;
    }

    /* Per-phase overlap descriptors keyed by phaseId for badge lookup. */
    const overlapByPhase = {};
    RP._multigoal._detectOverlaps(phases).forEach(o => {
        overlapByPhase[o.phaseId] = o.overlapsWith;
    });

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

        /* Overlap badge per card (bug-001 / PRD AC3). One badge per overlap
         * partner so users can see all collisions at a glance. */
        const overlaps = overlapByPhase[phase.id];
        if (Array.isArray(overlaps) && overlaps.length > 0) {
            overlaps.forEach(o => {
                const badge = document.createElement('div');
                badge.className = 'phase-overlap-badge';
                badge.textContent = 'Overlaps with ' + o.otherPhaseName;
                badge.title = 'Years ' + o.fromAge + '-' + o.toAge
                    + ' overlap with ' + o.otherPhaseName;
                body.appendChild(badge);
            });
        }

        const actions = document.createElement('div');
        actions.className = 'phase-card-actions';

        // Edit button (Gate B feedback: basic CRUD must include in-place edit,
        // not just delete-and-re-add for typo correction).
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.textContent = 'Edit';
        editBtn.className = 'btn-secondary';
        editBtn.setAttribute('aria-label', 'Edit phase ' + phase.name);
        editBtn.addEventListener('click', () => RP.editPhase(phase.id));
        actions.appendChild(editBtn);

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

/* ---------- Overlap banner (bug-001 / PRD AC3) ----------
 * Aggregates overlap ranges and renders an info banner with the year ranges
 * affected. Hidden when no overlaps exist. The fix-the-tooling principle:
 * users get a clear visual cue that their expenses are being summed during
 * those years (the underlying math already does this — see qa-002). */
RP._multigoal._renderOverlapBanner = function (phases) {
    const banner = document.getElementById('overlapBanner');
    const message = document.getElementById('overlapBannerMessage');
    if (!banner || !message) return;

    const ranges = RP._multigoal._detectOverlapRanges(phases);
    if (!ranges || ranges.length === 0) {
        banner.style.display = 'none';
        message.textContent = '';
        return;
    }

    const parts = ranges.map(r => {
        const yearLabel = (r.fromAge === r.toAge)
            ? ('Year ' + r.fromAge)
            : ('Years ' + r.fromAge + '-' + r.toAge);
        return yearLabel + ' are covered by multiple phases. Expenses will be summed.';
    });
    // textContent (not innerHTML) — phase names never reach this string,
    // but keep the safe channel out of habit per global conventions.
    message.textContent = parts.join(' ');
    banner.style.display = '';
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

/* ---------- Allocation Pre-Flight (fe-004) ----------
 * Renders the per-phase allocation table + horizontal stacked bar + deficit
 * suggestion banner inside the existing #allocationContent placeholder.
 *
 * Inputs derived from current RP state (no new form fields):
 *   - corpus       → existing planner result (RP._projectionRows / #corpusAtRetirement),
 *                    falls back to 0 (empty state shown)
 *   - retirementAge / currentAge / lifeExpectancy → RP.val() from Basics tab
 *   - postReturn   → RP._postReturn (set by calc-financial-plan.js), default 0.08 (India)
 *   - preReturn    → RP._preReturn (for deficit-suggestion SIP math), default 0.12
 *
 * Wired by wrapping RP.renderPhases (defined above) so every phase mutation
 * (add / remove / load example) re-renders allocation without touching fe-002's
 * mutator bodies — see the wrapper at the bottom of this section.
 */

/* Read corpus-at-retirement from the existing planner. Three sources, in order:
 * 1. RP._projectionRows (set by calc-projections.js): ending balance of row at retAge-1.
 * 2. #corpusAtRetirement element textContent (rendered by calc-projections.js too).
 * 3. 0 — triggers empty state with helpful message.
 */
RP._multigoal._readCorpusAtRetirement = function () {
    // Defensive recompute: when Multi-Goal renders before Projections has
    // finished its async/debounced run (e.g. cold-start: page loads → user
    // clicks Multi-Goal → clicks Load Example, all in <100ms), _projectionRows
    // is stale or empty, so the corpus reads as 0 and the empty-state message
    // says "Run the Projections tab first" — even though all inputs are valid.
    // Force a synchronous recompute so we always read the latest corpus.
    // Safe because calculateProjections is idempotent on identical inputs.
    if (typeof RP.calculateProjections === 'function') {
        try { RP.calculateProjections(); } catch (e) { /* fall through */ }
    }

    // Prefer the structured projection rows if they're populated.
    if (Array.isArray(RP._projectionRows) && RP._projectionRows.length > 0) {
        const retAge = (typeof RP.val === 'function') ? RP.val('retirementAge') : 0;
        // Row at retAge-1 has the corpus arriving at retirement.
        const row = RP._projectionRows.find(r => r.age === retAge - 1);
        if (row && Number.isFinite(row.ending)) return Math.max(0, row.ending);
        // Fallback: row whose status flips to Retired
        const firstRetired = RP._projectionRows.find(r => r.status === 'Retired');
        if (firstRetired && Number.isFinite(firstRetired.starting)) return Math.max(0, firstRetired.starting);
    }
    // No structured data — try parsing the text shown in the Projections tab card.
    const el = document.getElementById('corpusAtRetirement');
    if (el && el.textContent) {
        const parsed = RP._multigoal._parseShortCurrency(el.textContent);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 0;
};

/* Reverse of formatCurrencyShort: "₹5.21 Cr" → 52100000. Best-effort only;
 * we use it only as a fallback when RP._projectionRows is empty. */
RP._multigoal._parseShortCurrency = function (text) {
    if (!text || typeof text !== 'string') return NaN;
    const s = text.replace(/[₹,\s]/g, '');
    const num = parseFloat(s);
    if (!Number.isFinite(num)) return NaN;
    if (/Cr/i.test(text)) return num * 10000000;
    if (/L/i.test(text)) return num * 100000;
    if (/K/i.test(text)) return num * 1000;
    return num;
};

/* Main entry point — re-renders the allocation table, bar, and deficit banner.
 * Idempotent: safe to call repeatedly. */
RP._multigoal.renderAllocation = function () {
    const emptyEl = document.getElementById('allocationEmptyState');
    const contentEl = document.getElementById('allocationContent');
    const tbody = document.getElementById('allocationTbody');
    const bar = document.getElementById('allocBar');
    if (!emptyEl || !contentEl || !tbody || !bar) return; // tab not in DOM

    const phases = RP._multigoal.phases || [];

    // Empty state: no phases → hide content, show empty message.
    if (phases.length === 0) {
        emptyEl.style.display = '';
        emptyEl.textContent = 'Add a life phase to see how your retirement corpus allocates across phases.';
        contentEl.style.display = 'none';
        return;
    }

    const corpus = RP._multigoal._readCorpusAtRetirement();
    const retAge = (typeof RP.val === 'function') ? RP.val('retirementAge') : 60;
    const curAge = (typeof RP.val === 'function') ? RP.val('currentAge') : 30;
    const postReturn = (typeof RP._postReturn === 'number' && isFinite(RP._postReturn) && RP._postReturn > 0)
        ? RP._postReturn
        : 0.08; // India FIRE default per 03-data-contracts.md

    // Corpus = 0 → degenerate state; show empty message with a hint.
    if (corpus <= 0) {
        emptyEl.style.display = '';
        emptyEl.textContent = 'Run the Projections tab first — allocation needs your retirement corpus.';
        contentEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    contentEl.style.display = '';

    const allocation = RP._multigoal.calculateAllocation(phases, corpus, retAge, curAge, postReturn);

    // Cache for fe-005 to read without recomputing.
    RP._lastAllocationData = allocation;

    RP._multigoal._renderAllocationTable(allocation);
    RP._multigoal._renderAllocationBar(allocation);
    RP._multigoal._renderDeficitSuggestion(allocation, retAge, curAge);
};

RP._multigoal._renderAllocationTable = function (allocation) {
    const tbody = document.getElementById('allocationTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Build a quick phaseId → phase color lookup so we paint dots accurately.
    const colorById = {};
    (RP._multigoal.phases || []).forEach(p => { colorById[p.id] = p.color; });

    allocation.phases.forEach(row => {
        const tr = document.createElement('tr');
        if (row.deficit > 0.5) tr.classList.add('deficit');

        // Phase name with colored dot
        const nameTd = document.createElement('td');
        const dot = document.createElement('span');
        dot.className = 'phase-dot';
        const colorName = colorById[row.phaseId] || 'blue';
        dot.style.background = 'var(--phase-color-' + colorName + ')';
        nameTd.appendChild(dot);
        nameTd.appendChild(document.createTextNode(row.phaseName));

        const ageTd = document.createElement('td');
        ageTd.textContent = row.ageRange;

        const pvTd = document.createElement('td');
        pvTd.textContent = RP.formatCurrencyShort(row.pvRequired);
        pvTd.title = RP.formatCurrency(row.pvRequired); // full precision on hover

        const allocTd = document.createElement('td');
        allocTd.textContent = RP.formatCurrencyShort(row.allocated);
        allocTd.title = RP.formatCurrency(row.allocated);

        const pctTd = document.createElement('td');
        pctTd.textContent = row.percentOfCorpus.toFixed(1) + '%';

        const statusTd = document.createElement('td');
        const statusSpan = document.createElement('span');
        const isFunded = row.deficit <= 0.5;
        statusSpan.className = 'health-indicator ' + (isFunded ? 'good' : 'bad');
        const statusDot = document.createElement('span');
        statusDot.className = 'health-dot';
        statusSpan.appendChild(statusDot);
        const statusText = isFunded
            ? 'Funded'
            : 'Deficit ' + RP.formatCurrencyShort(row.deficit);
        statusSpan.appendChild(document.createTextNode(' ' + statusText));
        statusTd.appendChild(statusSpan);

        tr.appendChild(nameTd);
        tr.appendChild(ageTd);
        tr.appendChild(pvTd);
        tr.appendChild(allocTd);
        tr.appendChild(pctTd);
        tr.appendChild(statusTd);
        tbody.appendChild(tr);
    });

    // Footer totals
    const totalPvEl = document.getElementById('allocTotalPv');
    const totalAllocEl = document.getElementById('allocTotalAllocated');
    const totalPctEl = document.getElementById('allocTotalPercent');
    const overallStatusEl = document.getElementById('allocOverallStatus');

    if (totalPvEl) {
        totalPvEl.textContent = RP.formatCurrencyShort(allocation.totalPV);
        totalPvEl.title = RP.formatCurrency(allocation.totalPV);
    }
    if (totalAllocEl) {
        totalAllocEl.textContent = RP.formatCurrencyShort(allocation.totalCorpus);
        totalAllocEl.title = RP.formatCurrency(allocation.totalCorpus);
    }
    if (totalPctEl) totalPctEl.textContent = '100%';

    if (overallStatusEl) {
        overallStatusEl.innerHTML = '';
        const span = document.createElement('span');
        const hasDeficit = allocation.overallDeficit > 0.5;
        span.className = 'health-indicator ' + (hasDeficit ? 'bad' : 'good');
        const dot = document.createElement('span');
        dot.className = 'health-dot';
        span.appendChild(dot);
        const text = hasDeficit
            ? 'Shortfall ' + RP.formatCurrencyShort(allocation.overallDeficit)
            : (allocation.surplus > 0.5 ? 'Surplus ' + RP.formatCurrencyShort(allocation.surplus) : 'Funded');
        span.appendChild(document.createTextNode(' ' + text));
        overallStatusEl.appendChild(span);
    }
};

RP._multigoal._renderAllocationBar = function (allocation) {
    const bar = document.getElementById('allocBar');
    if (!bar) return;
    bar.innerHTML = '';

    const colorById = {};
    (RP._multigoal.phases || []).forEach(p => { colorById[p.id] = p.color; });

    const labelParts = [];
    allocation.phases.forEach(row => {
        const seg = document.createElement('div');
        seg.className = 'alloc-bar__segment';
        // Use flex-basis so segments size proportionally to allocation %
        const pct = (row.percentOfCorpus || 0).toFixed(2);
        seg.style.flexBasis = pct + '%';
        const colorName = colorById[row.phaseId] || 'blue';
        seg.style.background = 'var(--phase-color-' + colorName + ')';
        // title supplies a sighted-user tooltip (a11y is via the table fallback)
        seg.title = row.phaseName + ': ' + RP.formatCurrencyShort(row.allocated)
            + ' (' + row.percentOfCorpus.toFixed(1) + '%)';
        bar.appendChild(seg);
        labelParts.push(row.phaseName + ' ' + row.percentOfCorpus.toFixed(1) + '%');
    });

    bar.setAttribute(
        'aria-label',
        'Retirement corpus allocation across ' + allocation.phases.length + ' phases: ' + labelParts.join(', ')
    );
};

RP._multigoal._renderDeficitSuggestion = function (allocation, retirementAge, currentAge) {
    const banner = document.getElementById('deficitSuggestion');
    const message = document.getElementById('deficitMessage');
    const dismissBtn = document.getElementById('deficitDismissBtn');
    if (!banner || !message) return;

    if (!(allocation.overallDeficit > 0.5)) {
        banner.style.display = 'none';
        return;
    }

    const yearsToRetirement = Math.max(0, retirementAge - currentAge);
    const preReturn = (typeof RP._preReturn === 'number' && isFinite(RP._preReturn) && RP._preReturn > 0)
        ? RP._preReturn
        : 0.12;
    const suggestions = RP._multigoal.calculateDeficitSuggestions(
        allocation.overallDeficit, yearsToRetirement, preReturn, RP._multigoal.phases
    );

    const deficitLakhs = (allocation.overallDeficit / 100000).toFixed(1);
    const sipText = RP.formatCurrency(Math.round(suggestions.sipIncrease));

    let html = '<strong>Your plan is underfunded by &#8377;' + deficitLakhs + ' lakhs.</strong> To close the gap:<br>';
    html += '&bull; Increase monthly SIP by ' + sipText
        + ' (assumes ' + yearsToRetirement + ' years, ' + (preReturn * 100).toFixed(0) + '% return)';

    if (suggestions.phaseReduction && suggestions.phaseReduction.phaseName) {
        const pr = suggestions.phaseReduction;
        // Escape phase name to avoid HTML injection from user-supplied data
        const safeName = String(pr.phaseName).replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
        html += '<br>&bull; OR reduce "' + safeName + '" from '
            + RP.formatCurrency(pr.currentAmount) + '/mo to '
            + RP.formatCurrency(Math.round(pr.reducedAmount)) + '/mo ('
            + pr.reductionPercent.toFixed(1) + '% reduction)';
    }

    message.innerHTML = html;
    banner.style.display = '';

    // Wire dismiss once
    if (dismissBtn && !dismissBtn._wired) {
        dismissBtn.addEventListener('click', () => { banner.style.display = 'none'; });
        dismissBtn._wired = true;
    }
};

/* Convenience public alias used by orchestrator (fe-005 entry point too) */
RP.renderAllocation = function () { RP._multigoal.renderAllocation(); };

/* ---------- Year-by-Year Projection (fe-005) ----------
 * Renders the multi-goal projection table + phase-shaded chart inside the
 * existing #multigoalProjectionContent and #multigoalChartContent placeholders.
 *
 * Data flow:
 *   phases (fe-002) → calculateAllocation (fe-003)
 *                   → runProjection (fe-003) → projectionRows
 *                   → table rows + chart canvas
 *
 * Inputs derived from current RP state:
 *   - phases             → RP._multigoal.phases (fe-002)
 *   - allocationResult   → RP._lastAllocationData (cached by fe-004)
 *   - retirementAge / currentAge / lifeExpectancy → RP.val()
 *   - postReturn         → RP._postReturn, default 0.08 (India)
 *
 * Wired into _save() flow via the renderPhases wrapper at the bottom of this
 * file — every phase mutation triggers re-allocation then re-projection.
 */

/* Map projection row status to existing tables.css row classes:
 *   'healthy'   → row-retired (blue tint matches "in plan" feel)
 *   'depleting' → no extra class (default striped look) + amber status badge
 *   'depleted'  → row-warning (red tint, !important)
 * The status column always renders a status-badge for explicit color+text. */
RP._multigoal._projectionStatusMeta = {
    healthy:   { rowClass: 'row-retired', badge: 'retired',  label: 'Healthy' },
    depleting: { rowClass: '',            badge: 'earning',  label: 'Depleting' },
    depleted:  { rowClass: 'row-warning', badge: 'dead',     label: 'Depleted' }
};

RP._multigoal.renderProjection = function () {
    const tableEmpty = document.getElementById('multigoalProjectionEmptyState');
    const tableContent = document.getElementById('multigoalProjectionContent');
    const tbody = document.getElementById('multigoalProjectionTbody');
    const chartEmpty = document.getElementById('multigoalChartEmptyState');
    const chartContent = document.getElementById('multigoalChartContent');
    const canvas = document.getElementById('multigoalProjectionChart');
    if (!tableEmpty || !tableContent || !tbody || !chartEmpty || !chartContent || !canvas) return; // tab not in DOM

    const phases = RP._multigoal.phases || [];

    // Empty: no phases → hide both, show empty messages
    if (phases.length === 0) {
        tableEmpty.style.display = '';
        tableContent.style.display = 'none';
        chartEmpty.style.display = '';
        chartContent.style.display = 'none';
        return;
    }

    // Need an allocation result to seed per-phase buckets. fe-004's
    // renderAllocation caches it in RP._lastAllocationData; if it's missing
    // (corpus = 0 or allocation hasn't run yet), show a hint.
    const allocation = RP._lastAllocationData;
    if (!allocation || !Array.isArray(allocation.phases) || allocation.phases.length === 0) {
        tableEmpty.style.display = '';
        tableEmpty.textContent = 'Run the Projections tab first — projection needs your retirement corpus.';
        tableContent.style.display = 'none';
        chartEmpty.style.display = '';
        chartEmpty.textContent = 'Run the Projections tab first — projection needs your retirement corpus.';
        chartContent.style.display = 'none';
        return;
    }

    const retAge = (typeof RP.val === 'function') ? RP.val('retirementAge') : 60;
    const curAge = (typeof RP.val === 'function') ? RP.val('currentAge') : 30;
    const lifeExp = (typeof RP.val === 'function') ? RP.val('lifeExpectancy') : 85;
    const postReturn = (typeof RP._postReturn === 'number' && isFinite(RP._postReturn) && RP._postReturn > 0)
        ? RP._postReturn
        : 0.08;

    const rows = RP._multigoal.runProjection(phases, allocation, retAge, lifeExp, curAge, postReturn);

    // Cache for downstream consumers (e.g. fe-007 sharelink debug, fe-009 mobile)
    RP._multiGoalProjectionRows = rows;

    tableEmpty.style.display = 'none';
    tableContent.style.display = '';
    chartEmpty.style.display = 'none';
    chartContent.style.display = '';

    RP._multigoal._renderProjectionTable(rows, phases);
    RP._multigoal._renderProjectionChart(rows, phases, canvas);
};

RP._multigoal._renderProjectionTable = function (rows, phases) {
    const tbody = document.getElementById('multigoalProjectionTbody');
    if (!tbody) return;

    // Quick lookup: phaseId → { name, color } for badge rendering
    const phaseMeta = {};
    phases.forEach(p => { phaseMeta[p.id] = { name: p.name, color: p.color || 'blue' }; });

    tbody.innerHTML = '';
    rows.forEach(row => {
        const meta = RP._multigoal._projectionStatusMeta[row.status]
            || { rowClass: '', badge: 'earning', label: row.status };
        const tr = document.createElement('tr');
        if (meta.rowClass) tr.className = meta.rowClass;

        // Age
        const ageTd = document.createElement('td');
        ageTd.textContent = row.age;
        tr.appendChild(ageTd);

        // Active Phase(s) — colored badges, "—" if gap year
        const phaseTd = document.createElement('td');
        if (!row.activePhaseIds || row.activePhaseIds.length === 0) {
            phaseTd.textContent = '—';
            phaseTd.style.color = 'var(--text-secondary, #6b7280)';
            phaseTd.style.textAlign = 'center';
        } else {
            const wrap = document.createElement('span');
            wrap.className = 'phase-badge-group';
            row.activePhaseIds.forEach(pid => {
                const m = phaseMeta[pid];
                if (!m) return;
                const badge = document.createElement('span');
                badge.className = 'phase-badge phase-badge--' + m.color;
                badge.title = m.name; // full name on hover (handles truncation)
                // Decorative dot prefix per 03-component-specs.md
                const dot = document.createElement('span');
                dot.className = 'phase-badge-dot';
                badge.appendChild(dot);
                badge.appendChild(document.createTextNode(m.name));
                wrap.appendChild(badge);
            });
            phaseTd.appendChild(wrap);
        }
        tr.appendChild(phaseTd);

        // Inflated expense for the year
        const expTd = document.createElement('td');
        expTd.textContent = row.expenses > 0 ? RP.formatCurrency(row.expenses) : '—';
        tr.appendChild(expTd);

        // Per-phase balances — compact: "PhaseName: ₹X" rows
        const perTd = document.createElement('td');
        if (Array.isArray(row.activePhases) && row.activePhases.length > 0) {
            const list = document.createElement('div');
            list.className = 'per-phase-balance-list';
            row.activePhases.forEach(p => {
                const item = document.createElement('div');
                item.className = 'per-phase-balance-item';
                const dot = document.createElement('span');
                dot.className = 'phase-color-dot';
                dot.style.background = 'var(--phase-color-' + (p.color || 'blue') + ')';
                item.appendChild(dot);
                const text = document.createElement('span');
                text.textContent = RP.formatCurrencyShort(p.bucketEnding);
                text.title = p.phaseName + ': ' + RP.formatCurrency(p.bucketEnding);
                item.appendChild(text);
                list.appendChild(item);
            });
            perTd.appendChild(list);
        } else {
            perTd.textContent = '—';
            perTd.style.color = 'var(--text-secondary, #6b7280)';
            perTd.style.textAlign = 'center';
        }
        tr.appendChild(perTd);

        // Total balance
        const totalTd = document.createElement('td');
        totalTd.textContent = RP.formatCurrency(row.ending);
        tr.appendChild(totalTd);

        // Status badge
        const statusTd = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'status-badge ' + meta.badge;
        badge.textContent = meta.label;
        statusTd.appendChild(badge);
        tr.appendChild(statusTd);

        tbody.appendChild(tr);
    });
};

RP._multigoal._renderProjectionChart = function (rows, phases, canvas) {
    if (typeof RP.renderMultiGoalChart !== 'function') {
        console.warn('RP.renderMultiGoalChart not loaded — chart skipped.');
        return;
    }
    try {
        RP.renderMultiGoalChart(canvas, rows, phases);
    } catch (e) {
        console.warn('Multi-goal chart render failed:', e);
    }
};

/* Public alias (matches fe-004's RP.renderAllocation pattern) */
RP.renderMultiGoalProjection = function () { RP._multigoal.renderProjection(); };

/* Wrap RP.renderPhases additively so every phase mutation also re-renders
 * allocation AND projection (fe-005). Per team-lead's guidance: do NOT modify
 * fe-002's mutator bodies; do NOT touch fe-004's renderAllocation. */
(function wrapRenderPhasesForAllocation() {
    const original = RP.renderPhases;
    if (typeof original !== 'function' || original._allocationWrapped) return;
    RP.renderPhases = function () {
        const result = original.apply(this, arguments);
        try {
            RP._multigoal.renderAllocation();
        } catch (e) {
            console.warn('renderAllocation failed:', e);
        }
        // fe-005: projection depends on allocation result cached above.
        try {
            RP._multigoal.renderProjection();
        } catch (e) {
            console.warn('renderProjection failed:', e);
        }
        return result;
    };
    RP.renderPhases._allocationWrapped = true;
})();

/* ---------- Gap-warning banner (bug-002 / PRD AC4) ----------
 * Detect uncovered age ranges within [retirementAge, lifeExpectancy] and surface
 * them as an informational (non-blocking) banner above the phase list. A "gap"
 * is any age in the post-retirement window that no phase covers — including
 * leading (retirementAge → first phase) and trailing (last phase → lifeExpectancy)
 * gaps. Math (calc-multigoal.runProjection) already treats gap years as ₹0
 * expense; this just tells the user.
 */

/**
 * Return an array of { fromAge, toAge } gap ranges within [retirementAge, lifeExpectancy].
 * Each range is inclusive on both ends. Empty array means full coverage (or no phases).
 * Pure: no DOM, no localStorage. Safe to call with malformed inputs.
 */
RP._multigoal._detectGaps = function (phases, retirementAge, lifeExpectancy) {
    const phaseList = Array.isArray(phases) ? phases : [];
    const ret = (typeof retirementAge === 'number' && Number.isFinite(retirementAge)) ? retirementAge : null;
    const life = (typeof lifeExpectancy === 'number' && Number.isFinite(lifeExpectancy)) ? lifeExpectancy : null;
    if (ret === null || life === null || life < ret) return [];
    if (phaseList.length === 0) return [];

    // Build a covered-age set across [ret, life], honoring overlap.
    const covered = new Set();
    for (const p of phaseList) {
        if (!p || !Number.isInteger(p.startAge) || !Number.isInteger(p.endAge)) continue;
        const lo = Math.max(ret, p.startAge);
        const hi = Math.min(life, p.endAge);
        for (let a = lo; a <= hi; a++) covered.add(a);
    }

    // Walk [ret, life] and collapse contiguous uncovered ages into ranges.
    const gaps = [];
    let runStart = null;
    for (let a = ret; a <= life; a++) {
        if (!covered.has(a)) {
            if (runStart === null) runStart = a;
        } else if (runStart !== null) {
            gaps.push({ fromAge: runStart, toAge: a - 1 });
            runStart = null;
        }
    }
    if (runStart !== null) gaps.push({ fromAge: runStart, toAge: life });
    return gaps;
};

/**
 * Render (or hide) the gap-warning banner in #gapBanner. Idempotent — safe
 * to call after every phase mutation. Reads retirementAge / lifeExpectancy
 * from the Basics tab via RP.val(); silently no-ops if either is missing.
 */
RP._multigoal._renderGapBanner = function () {
    const banner = document.getElementById('gapBanner');
    if (!banner) return; // tab fragment not on this page

    const phases = RP._multigoal.phases || [];
    const retAge = (typeof RP.val === 'function') ? RP.val('retirementAge') : NaN;
    const lifeExp = (typeof RP.val === 'function') ? RP.val('lifeExpectancy') : NaN;

    if (!Number.isFinite(retAge) || !Number.isFinite(lifeExp) || phases.length === 0) {
        banner.style.display = 'none';
        banner.textContent = '';
        return;
    }

    const gaps = RP._multigoal._detectGaps(phases, retAge, lifeExp);
    if (gaps.length === 0) {
        banner.style.display = 'none';
        banner.textContent = '';
        return;
    }

    // Build "ages X-Y" / "age X" parts; join with ", " then prepend label.
    const parts = gaps.map(g => g.fromAge === g.toAge
        ? 'age ' + g.fromAge
        : 'ages ' + g.fromAge + '-' + g.toAge);
    const label = (gaps.length === 1)
        ? 'Gap detected: ' + parts[0] + ' have no phase coverage'
        : 'Gaps detected: ' + parts.join(', ') + ' have no phase coverage';

    // textContent — gap data is numeric, no XSS risk, but keep consistent with
    // the "no innerHTML for dynamic data" pattern used in renderPhases above.
    banner.textContent = label;
    banner.style.display = '';
};

/* Wrap RP.renderPhases additively (mirroring the allocation wrapper above so
 * that the same mutation flow surfaces the gap warning). Per fix-bug-001
 * coordination notes: do NOT modify RP.renderPhases body; just chain. */
(function wrapRenderPhasesForGapBanner() {
    const original = RP.renderPhases;
    if (typeof original !== 'function' || original._gapBannerWrapped) return;
    RP.renderPhases = function () {
        const result = original.apply(this, arguments);
        try {
            RP._multigoal._renderGapBanner();
        } catch (e) {
            console.warn('renderGapBanner failed:', e);
        }
        // If fix-bug-001's overlap banner has merged in, keep both in sync.
        // bug-004 fix: pass phases explicitly. The original `_renderOverlapBanner(phases)`
        // call inside RP.renderPhases ran first and showed the banner correctly; calling
        // this with no args was overwriting it with `_detectOverlapRanges(undefined) → []`.
        if (typeof RP._multigoal._renderOverlapBanner === 'function') {
            try {
                RP._multigoal._renderOverlapBanner(RP._multigoal.phases || []);
            } catch (e) {
                console.warn('renderOverlapBanner failed:', e);
            }
        }
        return result;
    };
    RP.renderPhases._gapBannerWrapped = true;
    // Preserve the prior _allocationWrapped flag too so the earlier wrapper
    // still recognizes this as already-wrapped on any future re-init.
    RP.renderPhases._allocationWrapped = true;
})();

/* Run init at script-load so the scaffold is observable in the console
 * even before app.js wires it. Once app.js is updated (fe-008) to call
 * RP.initMultiGoal(), this becomes a no-op safety net. */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RP.initMultiGoal());
} else {
    RP.initMultiGoal();
}
