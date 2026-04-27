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

    // Auto-calc on any input change (debounced)
    document.querySelectorAll('input[type="number"]').forEach(input => {
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
        currentSavings: 7000000, stepUpRate: 5,
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

    RP.calculateAll();
};

RP.switchTab = function (tabName) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('.nav-tab[data-tab="' + tabName + '"]').classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
    if (tabName === 'projections') RP.renderChart();
    if (tabName === 'whatif' && RP.renderWhatIfChart) RP.renderWhatIfChart();
    if (tabName === 'tracker' && RP.renderTracker) RP.renderTracker();
    if (tabName === 'networth' && RP.renderNetWorth) RP.renderNetWorth();
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
    return age;
};

/* Updates #currentAge from #dateOfBirth, UNLESS the override checkbox is on. */
RP._updateAgeFromDOB = function () {
    const dobEl = document.getElementById('dateOfBirth');
    const ageEl = document.getElementById('currentAge');
    const overrideEl = document.getElementById('currentAgeOverride');
    if (!dobEl || !ageEl) return;
    if (overrideEl && overrideEl.checked) {
        // User explicitly wants manual control. Respect it.
        ageEl.removeAttribute('readonly');
        return;
    }
    ageEl.setAttribute('readonly', '');
    const computed = RP._computeAgeFromDOB(dobEl.value);
    if (computed !== null && computed >= 0) {
        if (parseInt(ageEl.value, 10) !== computed) {
            ageEl.value = computed;
            ageEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
};

/* Wire DOB and Override change events (idempotent — safe to re-call). */
RP._wireDOBHandlers = function () {
    const dobEl = document.getElementById('dateOfBirth');
    const overrideEl = document.getElementById('currentAgeOverride');
    if (dobEl && !dobEl._dobWired) {
        dobEl.addEventListener('change', () => RP._updateAgeFromDOB());
        dobEl.addEventListener('input', () => RP._updateAgeFromDOB());
        dobEl._dobWired = true;
    }
    if (overrideEl && !overrideEl._dobWired) {
        overrideEl.addEventListener('change', () => RP._updateAgeFromDOB());
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
    // v1.1: wire DOB after init (Basics tab DOM is loaded by then)
    if (RP._wireDOBHandlers) RP._wireDOBHandlers();
    RP.calculateAll();
});
