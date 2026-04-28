/**
 * App entry point
 * Tab switching, event binding, calculation orchestrator
 */

/* v1.1 audit (two-tier nav): groups + reverse lookup. Each group owns a list
 * of tab IDs. Order matters — first tab is the default sub-tab when the user
 * clicks a group fresh. */
RP._tabGroups = {
    setup:    { label: 'Setup',    tabs: ['basics', 'expenses', 'investments'] },
    plan:     { label: 'Plan',     tabs: ['financial-plan', 'multigoal', 'emergency'] },
    project:  { label: 'Project',  tabs: ['projections', 'whatif', 'milestones', 'goals'] },
    track:    { label: 'Track',    tabs: ['dashboard', 'tracker', 'networth', 'exptrack'] },
    tools:    { label: 'Tools',    tabs: ['sip', 'loan'] },
    profiles: { label: 'Profiles', tabs: ['profiles'] }
};
/* tab → group key, built once at script load. */
RP._tabToGroup = (function () {
    const m = {};
    Object.keys(RP._tabGroups).forEach(g => RP._tabGroups[g].tabs.forEach(t => { m[t] = g; }));
    return m;
})();
/* Display labels for sub-tab buttons. Single source of truth for tab names
 * — used by switchTab to render .nav-subtab buttons. */
RP._tabLabels = {
    'basics': 'Basics & Income',
    'expenses': 'Expenses',
    'investments': 'Investments',
    'financial-plan': 'Financial Plan',
    'multigoal': 'Multi-Goal',
    'emergency': 'Emergency Fund',
    'projections': 'Projections',
    'whatif': 'What-If',
    'milestones': 'Milestones',
    'goals': 'Goals',
    'dashboard': 'Dashboard',
    'tracker': 'Tracker',
    'networth': 'Net Worth',
    'exptrack': 'Expense Log',
    'sip': 'SIP Calculator',
    'loan': 'Loan/EMI',
    'profiles': 'Profiles'
};

RP.init = function () {
    // v1.1 audit: top-tier group buttons. Click → switch to that group's
    // first tab (or its previously-active sub-tab if remembered).
    document.querySelectorAll('.nav-group').forEach(btn => {
        btn.addEventListener('click', () => {
            const groupKey = btn.dataset.group;
            const group = RP._tabGroups[groupKey];
            if (!group) return;
            // Restore the last-active sub-tab within this group, else default to first
            let target = group.tabs[0];
            try {
                const lastInGroup = localStorage.getItem('rp_last_tab_in_group_' + groupKey);
                if (lastInGroup && group.tabs.indexOf(lastInGroup) >= 0) target = lastInGroup;
            } catch (e) {}
            RP.switchTab(target);
        });
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

    // v1.1 audit: Settings popover open/close. Click gear → toggle. Click
    // anywhere outside the popover → close. Esc → close. Closes after each
    // item click (except the Include phases checkbox which is sticky).
    const settingsBtn = document.getElementById('settingsToggleBtn');
    const settingsPop = document.getElementById('settingsPopover');
    if (settingsBtn && settingsPop) {
        const closePopover = function () {
            settingsPop.hidden = true;
            settingsBtn.setAttribute('aria-expanded', 'false');
        };
        const openPopover = function () {
            settingsPop.hidden = false;
            settingsBtn.setAttribute('aria-expanded', 'true');
        };
        settingsBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            settingsPop.hidden ? openPopover() : closePopover();
        });
        // Close after action items (Reset, Share Link, Dark mode toggle).
        // Skip the checkbox label — that's the sticky toggle the user wants
        // to flip without dismissing.
        settingsPop.addEventListener('click', function (e) {
            const item = e.target.closest('.settings-item');
            if (!item) return;
            if (item.classList.contains('settings-item--checkbox')) return;
            closePopover();
        });
        // Click outside → close
        document.addEventListener('click', function (e) {
            if (settingsPop.hidden) return;
            if (settingsPop.contains(e.target) || settingsBtn.contains(e.target)) return;
            closePopover();
        });
        // Esc → close
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !settingsPop.hidden) closePopover();
        });
    }

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
    // v1.1 audit (two-tier nav): activate the parent group + render its
    // sub-tab strip first, then activate the requested sub-tab + content.
    const groupKey = RP._tabToGroup[tabName];
    if (!groupKey) return; // unknown tab — do nothing rather than crash

    // 1. Activate the top-level group button
    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('active'));
    const groupBtn = document.querySelector('.nav-group[data-group="' + groupKey + '"]');
    if (groupBtn) groupBtn.classList.add('active');

    // 2. Render the sub-tab strip for this group (always re-render so
    //    switching groups updates the visible sub-tabs).
    const subContainer = document.getElementById('navSubtabs');
    if (subContainer) {
        const groupTabs = (RP._tabGroups[groupKey] && RP._tabGroups[groupKey].tabs) || [];
        subContainer.innerHTML = '';
        groupTabs.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'nav-subtab' + (t === tabName ? ' active' : '');
            btn.dataset.tab = t;
            btn.textContent = RP._tabLabels[t] || t;
            btn.addEventListener('click', () => RP.switchTab(t));
            subContainer.appendChild(btn);
        });
    }

    // 3. Show the tab content
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const contentEl = document.getElementById('tab-' + tabName);
    if (contentEl) contentEl.classList.add('active');

    // 4. Persist (active tab + last sub-tab within this group)
    try {
        localStorage.setItem('rp_active_tab', tabName);
        localStorage.setItem('rp_last_tab_in_group_' + groupKey, tabName);
    } catch (e) {}

    // 5. URL hash sync — unchanged format so old shared links still work
    try {
        const newHash = '#' + tabName;
        if (window.location.hash !== newHash) {
            history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
        }
    } catch (e) {}

    // 6. Per-tab side effects (charts, render hooks)
    if (tabName === 'projections') RP.renderChart();
    if (tabName === 'whatif' && RP.renderWhatIfChart) RP.renderWhatIfChart();
    if (tabName === 'tracker' && RP.renderTracker) RP.renderTracker();
    if (tabName === 'networth' && RP.renderNetWorth) RP.renderNetWorth();
};

/* v1.1 audit: restore the previously-active tab on page load. URL hash
 * takes precedence over localStorage so a shared link like
 * "...#multigoal" wins over a stored other tab. Falls back to 'basics'
 * if nothing matches. */
RP._restoreActiveTab = function () {
    try {
        let target = null;
        // 1. URL hash wins (shareable / bookmarkable)
        if (window.location.hash) {
            const fromHash = window.location.hash.replace(/^#/, '');
            if (RP._tabToGroup[fromHash]) target = fromHash;
        }
        // 2. localStorage fallback
        if (!target) {
            const saved = localStorage.getItem('rp_active_tab');
            if (saved && RP._tabToGroup[saved]) target = saved;
        }
        // 3. Default to the first tab of the first group (Setup → Basics)
        if (!target) {
            target = RP._tabGroups.setup.tabs[0];
        }
        RP.switchTab(target);
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
