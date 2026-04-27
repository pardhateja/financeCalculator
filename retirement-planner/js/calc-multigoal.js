/**
 * Multi-Goal Planner — life-phase expense planning with per-phase inflation
 * Scaffold (fe-001) + persistence and Load Example (fe-006).
 * Phase CRUD, math, allocation, and projection land in fe-002, fe-003,
 * fe-004, fe-005 — those mutators MUST call RP._multigoal._save() after
 * mutating RP._multigoal.phases so changes survive a reload.
 */
RP._multigoal = {
    phases: []
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

// Run init at script-load so the scaffold is observable in the console
// without requiring app.js wiring (that's fe-002's responsibility).
RP.initMultiGoal();
