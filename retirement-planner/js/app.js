/**
 * App entry point
 * Tab switching, event binding, calculation orchestrator
 */
RP.init = function () {
    // Tab switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => RP.switchTab(tab.dataset.tab));
    });

    // Track manual edits to monthly investment
    document.getElementById('monthlyInvestAmt').addEventListener('input', () => {
        RP._investManuallySet = true;
    });

    // Track manual edits to emergency fund
    document.getElementById('emergencyFund').addEventListener('input', () => {
        RP._emFundManuallySet = true;
    });

    // Auto-calc on any input change (debounced).
    // v1.1 audit fix: skip readonly inputs. #currentSavings and #trackerRollupAmount
    // are programmatically updated by RP._computeSavingsRollup, which dispatches
    // 'input' events to notify downstream readers. Subscribing to those here would
    // cause a feedback loop (rollup → input event → calculateAll → rollup …).
    document.querySelectorAll('input[type="number"]').forEach(input => {
        if (input.readOnly) return;
        input.addEventListener('input', () => {
            clearTimeout(RP._debounceTimer);
            RP._debounceTimer = setTimeout(() => RP.calculateAll(), 300);
        });
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => RP.resetDefaults());

    // Module inits
    if (RP.initGoals) RP.initGoals();
    if (RP.initTracker) RP.initTracker();
    if (RP.initProfiles) RP.initProfiles();
    if (RP.initNetWorth) RP.initNetWorth();
    if (RP.initExpenseTracker) RP.initExpenseTracker();
    if (RP.initDarkMode) RP.initDarkMode();
};

RP.resetDefaults = function () {
    const defaults = {
        currentAge: 27, retirementAge: 35, lifeExpectancy: 100,
        inflationRate: 6, taxRate: 30,
        monthlySalary: 350000, monthlyRental: 0, monthlyDividend: 0, monthlyOtherIncome: 0,
        yearlyBonus: 0, yearlyOtherIncome: 0,
        expRent: 25000, expGroceries: 10000, expUtilities: 45000, expTransport: 5000,
        expInsurance: 5000, expEntertainment: 5000, expShopping: 5000, expOtherMonthly: 40000,
        expVacation: 0, expMedical: 0, expOtherYearly: 0,
        safeReturn: 7, largecapReturn: 12, midcapReturn: 15, smallcapReturn: 18,
        currentSavings: 7000000, currentSavingsSeed: 7000000, stepUpRate: 5,
        preFixedReturn: 7, preFixedTax: 30, preFixedShare: 27,
        preLargeReturn: 12, preLargeTax: 20, preLargeShare: 29,
        preMidReturn: 15, preMidTax: 20, preMidShare: 22,
        preSmallReturn: 18, preSmallTax: 20, preSmallShare: 22,
        postFixedReturn: 7, postFixedTax: 30, postFixedShare: 50,
        postLargeReturn: 12, postLargeTax: 20, postLargeShare: 50,
        postMidReturn: 15, postMidTax: 20, postMidShare: 0,
        postSmallReturn: 18, postSmallTax: 20, postSmallShare: 0,
        postRetireMonthly: 100000,
        emergencyMonths: 6, emMonthlyExpInput: 100000,
        scenARetAge: 35, scenAMonthly: 210000, scenAReturn: 12.63,
        scenBRetAge: 40, scenBMonthly: 210000, scenBReturn: 12.63,
        sipAmount: 50000, sipReturn: 12, sipYears: 10, sipStepUp: 5,
        loanPrincipal: 5000000, loanRate: 8.5, loanTenure: 20
    };

    Object.entries(defaults).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });

    RP._investManuallySet = false;
    RP._emFundManuallySet = false;
    if (RP._goals) RP._goals = [];

    // v1.1 Feature B: refresh rollup so Total = seed + tracker (currentSavings
    // shown above is just the visible default before rollup overrides).
    if (typeof RP._computeSavingsRollup === 'function') {
        try { RP._computeSavingsRollup(); } catch (e) { console.warn('rollup after reset failed:', e); }
    }
    RP.calculateAll();
};

RP.switchTab = function (tabName) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('.nav-tab[data-tab="' + tabName + '"]').classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
    // v1.1 audit: persist active tab so refresh restores the user's place
    // instead of always landing on Basics & Income.
    try { localStorage.setItem('rp_active_tab', tabName); } catch (e) {}
    if (tabName === 'projections') RP.renderChart();
    if (tabName === 'whatif' && RP.renderWhatIfChart) RP.renderWhatIfChart();
    if (tabName === 'tracker' && RP.renderTracker) RP.renderTracker();
    if (tabName === 'networth' && RP.renderNetWorth) RP.renderNetWorth();
};

/* v1.1 audit: restore the previously-active tab on page load. Called from
 * the DOMContentLoaded boot sequence below. Falls back to 'basics' if
 * nothing was saved or the saved name no longer matches a real tab. */
RP._restoreActiveTab = function () {
    try {
        const saved = localStorage.getItem('rp_active_tab');
        if (!saved) return;
        const tab = document.querySelector('.nav-tab[data-tab="' + saved + '"]');
        const content = document.getElementById('tab-' + saved);
        if (tab && content) RP.switchTab(saved);
    } catch (e) { /* swallow */ }
};

RP.calculateAll = function () {
    const curAge = RP.val('currentAge');
    const retAge = RP.val('retirementAge');
    document.getElementById('yearsToRetire').value = Math.max(0, retAge - curAge);

    // Core modules
    RP.highlightBracket();
    RP.calculateIncome();
    RP.calculateExpenses();
    RP.calculateInvestments();
    RP.calculateFinancialPlan();
    RP.generateProjections();

    // Extended modules
    if (RP.calculateDashboard) RP.calculateDashboard();
    if (RP.calculateWhatIf) RP.calculateWhatIf();
    if (RP.calculateEmergency) RP.calculateEmergency();
    if (RP.calculateSIP) RP.calculateSIP();
    if (RP.calculateMilestones) RP.calculateMilestones();
    if (RP.calculateLoan) RP.calculateLoan();
    if (RP.renderGoals) RP.renderGoals();
    if (RP.renderTracker) RP.renderTracker();
    if (RP.renderExpenseTracker) RP.renderExpenseTracker();
    // v1.1 audit fix (cold-start cascade): RP.initMultiGoal() runs at script-load,
    // BEFORE calculateAll has computed RP._projectionRows. So the initial
    // RP.renderPhases() inside initMultiGoal sees corpus=0 and allocation/projection
    // fall into the "Run Projections first" empty state — even though the 10 phases
    // are loaded. Re-fire renderPhases at the end of every calculateAll so the
    // cascade picks up the freshly computed corpus. The wrapper IIFEs are idempotent.
    if (typeof RP.renderPhases === 'function') {
        try { RP.renderPhases(); } catch (e) { console.warn('renderPhases at end of calculateAll failed:', e); }
    }
};

/* ---------- v1.1 Feature A: DOB → auto current age ---------- */

/* Pure compute: years between DOB and today (rounded down) */
RP._computeAgeFromDOB = function (dobString) {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDelta = now.getMonth() - dob.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
        age--;
    }
    // v1.1 validation guard: reject impossible ages (future DOB, > 120 yrs old)
    if (age < 0 || age > 120) return null;
    return age;
};

/* Show/hide validation error below the DOB field. */
RP._setDOBError = function (msg) {
    const dobEl = document.getElementById('dateOfBirth');
    if (!dobEl) return;
    let errEl = document.getElementById('dateOfBirthError');
    if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'dateOfBirthError';
        errEl.className = 'dob-error';
        errEl.setAttribute('role', 'alert');
        dobEl.parentNode.appendChild(errEl);
    }
    if (msg) {
        errEl.textContent = msg;
        errEl.style.display = '';
        dobEl.classList.add('input-invalid');
    } else {
        errEl.textContent = '';
        errEl.style.display = 'none';
        dobEl.classList.remove('input-invalid');
    }
};

/* Updates #currentAge from #dateOfBirth, UNLESS the override pencil is pressed.
 * v1.1 UI fix: override is now a button toggle (aria-pressed) instead of a
 * checkbox, but the same semantic — pressed = user-typed mode, not pressed = DOB mode. */
RP._isAgeOverrideOn = function () {
    const el = document.getElementById('currentAgeOverride');
    if (!el) return false;
    // Button-style: aria-pressed. Checkbox-style fallback: el.checked.
    if (el.tagName === 'BUTTON') return el.getAttribute('aria-pressed') === 'true';
    return !!el.checked;
};

RP._updateAgeFromDOB = function () {
    const dobEl = document.getElementById('dateOfBirth');
    const ageEl = document.getElementById('currentAge');
    if (!dobEl || !ageEl) return;

    if (RP._isAgeOverrideOn()) {
        // User explicitly wants manual control. Respect it; clear any DOB error.
        ageEl.removeAttribute('readonly');
        RP._setDOBError(null);
        return;
    }
    ageEl.setAttribute('readonly', '');

    const dobValue = dobEl.value;
    if (!dobValue) {
        RP._setDOBError(null);
        return;
    }
    const computed = RP._computeAgeFromDOB(dobValue);
    if (computed === null) {
        // Invalid: future DOB, > 120 yrs old, or unparseable
        RP._setDOBError('Enter a valid Date of Birth (between 120 years ago and today)');
        // Don't update Current Age — leave whatever was last valid
        return;
    }
    RP._setDOBError(null);
    if (parseInt(ageEl.value, 10) !== computed) {
        ageEl.value = computed;
        ageEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

/* Wire DOB and Override change events (idempotent — safe to re-call). */
RP._wireDOBHandlers = function () {
    const dobEl = document.getElementById('dateOfBirth');
    const overrideEl = document.getElementById('currentAgeOverride');
    if (dobEl && !dobEl._dobWired) {
        // v1.1: HTML5-level validation — browser blocks future + > 120-yr-old DOBs
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
        dobEl.setAttribute('max', todayISO);
        dobEl.setAttribute('min', minDate.toISOString().slice(0, 10));
        dobEl.addEventListener('change', () => RP._updateAgeFromDOB());
        dobEl.addEventListener('input', () => RP._updateAgeFromDOB());
        dobEl._dobWired = true;
    }
    if (overrideEl && !overrideEl._dobWired) {
        if (overrideEl.tagName === 'BUTTON') {
            overrideEl.addEventListener('click', () => {
                const next = overrideEl.getAttribute('aria-pressed') !== 'true';
                overrideEl.setAttribute('aria-pressed', String(next));
                RP._updateAgeFromDOB();
            });
        } else {
            overrideEl.addEventListener('change', () => RP._updateAgeFromDOB());
        }
        overrideEl._dobWired = true;
    }
    // Initial compute (in case profile/sharelink load already populated DOB).
    RP._updateAgeFromDOB();
};

// Boot
document.addEventListener('DOMContentLoaded', () => {
    // Load from share link if present
    if (RP.loadFromShareLink) RP.loadFromShareLink();

    RP.init();
    // v1.1 audit: wire DOB BEFORE calculateAll so the first projection uses
    // the DOB-derived Current Age (not the HTML default). _wireDOBHandlers
    // is idempotent and ends with a synchronous _updateAgeFromDOB(), which
    // sets #currentAge before any downstream consumer reads it.
    if (RP._wireDOBHandlers) RP._wireDOBHandlers();
    RP.calculateAll();
    // v1.1 audit: restore last active tab AFTER calculateAll so any tab-switch
    // side effects (renderChart, renderTracker, etc.) have data to work with.
    if (RP._restoreActiveTab) RP._restoreActiveTab();
});
