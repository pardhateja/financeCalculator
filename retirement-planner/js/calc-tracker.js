/**
 * Investment Tracker — 96-month grid with localStorage persistence
 * View modes: Default (flat), Upgrading (step-up), Custom
 * Impact recalculation when actual != planned
 *
 * v1.1 audit fix: month grid is anchored at "today", not at a hardcoded
 * birthday. The previous version had `new Date(1998, 3, 19)` literally and
 * never read it, so the result was already today-anchored — but the comment
 * lied. Cleaned up to make the data flow honest.
 */
RP._trackerMode = 'default';
RP._trackerEntries = {}; // key: "y0m3" -> {actual: 50000, completed: true, date: '2026-04-03'}
RP._trackerModalTarget = null;

RP.initTracker = function () {
    // Load from localStorage
    const saved = localStorage.getItem('rp_tracker_entries');
    if (saved) RP._trackerEntries = JSON.parse(saved);

    const savedMode = localStorage.getItem('rp_tracker_mode');
    if (savedMode) RP._trackerMode = savedMode;

    // View mode toggle
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            RP._trackerMode = btn.dataset.mode;
            localStorage.setItem('rp_tracker_mode', RP._trackerMode);
            RP.renderTracker();
        });
    });

    // Set active mode button
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === RP._trackerMode);
    });

    // Modal buttons
    document.getElementById('trackerModalCancel').addEventListener('click', () => RP.closeTrackerModal());
    document.getElementById('trackerModalSave').addEventListener('click', () => RP.saveTrackerMonth());
    document.getElementById('trackerModalReset').addEventListener('click', () => RP.resetTrackerMonth());

    // Close modal on overlay click
    document.getElementById('trackerModal').addEventListener('click', (e) => {
        if (e.target.id === 'trackerModal') RP.closeTrackerModal();
    });
};

RP.getTrackerMonths = function () {
    const baseSIP = RP.val('monthlyInvestAmt');
    const stepUp = RP.val('stepUpRate') / 100;
    const curAge = RP.val('currentAge');
    const retAge = RP.val('retirementAge');
    const totalMonths = (retAge - curAge) * 12;

    // Tracker grid starts at the current calendar month (today). DOB is now
    // captured separately on the Basics tab (v1.1 Feature A) and feeds
    // Current Age, but Tracker months are about "what should you save from
    // now until retirement," which is anchored to today.
    const today = new Date();
    const startYear = today.getFullYear();
    const startMonth = today.getMonth(); // 0-indexed

    const months = [];
    for (let i = 0; i < totalMonths; i++) {
        const yearIndex = Math.floor(i / 12);
        const monthIndex = i % 12;
        const date = new Date(startYear, startMonth + i, 1);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const label = monthNames[date.getMonth()] + ' ' + date.getFullYear();

        let planned;
        if (RP._trackerMode === 'default') {
            planned = baseSIP;
        } else {
            planned = baseSIP * Math.pow(1 + stepUp, yearIndex);
        }

        // Custom mode: check if user has a custom target saved
        const key = 'y' + yearIndex + 'm' + monthIndex;
        const entry = RP._trackerEntries[key];

        if (RP._trackerMode === 'custom' && entry && entry.customTarget != null) {
            planned = entry.customTarget;
        }

        months.push({
            yearIndex, monthIndex, label, planned: Math.round(planned),
            actual: entry ? entry.actual : 0,
            completed: entry ? entry.completed : false,
            key
        });
    }
    return months;
};

RP.renderTracker = function () {
    const months = RP.getTrackerMonths();
    const totalMonths = months.length;
    const completedCount = months.filter(m => m.completed).length;
    const totalPlanned = months.reduce((s, m) => s + m.planned, 0);
    const totalActual = months.filter(m => m.completed).reduce((s, m) => s + m.actual, 0);
    const remaining = totalPlanned - totalActual;

    // Hero
    const pct = totalMonths > 0 ? Math.round(completedCount / totalMonths * 100) : 0;
    document.getElementById('trackerProgressFill').style.width = pct + '%';
    RP.setText('trackerDone', completedCount);
    RP.setText('trackerTotal', totalMonths);
    RP.setText('trackerPct', pct);

    // Summary cards
    RP.setText('trackerTotalPlanned', RP.formatCurrencyShort(totalPlanned));
    RP.setText('trackerTotalInvested', RP.formatCurrencyShort(totalActual));
    RP.setText('trackerRemaining', RP.formatCurrencyShort(remaining));

    // Impact calculation
    RP.calculateTrackerImpact(months, completedCount, totalActual, totalPlanned);

    // Group by year
    const curAge = RP.val('currentAge');
    const years = {};
    months.forEach(m => {
        if (!years[m.yearIndex]) years[m.yearIndex] = [];
        years[m.yearIndex].push(m);
    });

    const container = document.getElementById('trackerYearsContainer');
    container.innerHTML = Object.entries(years).map(([yi, yMonths]) => {
        const yearDone = yMonths.filter(m => m.completed).length;
        const yearPlanned = yMonths.reduce((s, m) => s + m.planned, 0);
        const yearActual = yMonths.filter(m => m.completed).reduce((s, m) => s + m.actual, 0);

        const grid = yMonths.map(m => {
            let statusIcon = '<span style="color:var(--text-secondary);">&#9675;</span>';
            let cardClass = '';
            if (m.completed) {
                if (m.actual >= m.planned) {
                    statusIcon = '<span style="color:var(--secondary-color);">&#10003;</span>';
                    cardClass = 'completed';
                } else {
                    statusIcon = '<span style="color:var(--warning-color);">&#9888;</span>';
                    cardClass = 'partial';
                }
            }
            return '<div class="month-card ' + cardClass + '" onclick="RP.openTrackerModal(\'' + m.key + '\')">' +
                '<span class="month-status">' + statusIcon + '</span>' +
                '<div class="month-label">' + m.label + '</div>' +
                '<div class="month-target">' + RP.formatCurrency(m.planned) + '</div>' +
                (m.completed ? '<div class="month-actual">Actual: ' + RP.formatCurrency(m.actual) + '</div>' : '') +
                '</div>';
        }).join('');

        return '<div class="tracker-year">' +
            '<div class="tracker-year-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'grid\':\'none\'">' +
            '<span>Year ' + (parseInt(yi) + 1) + ' (Age ' + (curAge + parseInt(yi)) + '-' + (curAge + parseInt(yi) + 1) + ')</span>' +
            '<span class="year-summary">' + yearDone + '/12 done &middot; ' + RP.formatCurrencyShort(yearActual) + ' / ' + RP.formatCurrencyShort(yearPlanned) + '</span>' +
            '</div>' +
            '<div class="tracker-year-grid">' + grid + '</div>' +
            '</div>';
    }).join('');
};

RP.calculateTrackerImpact = function (months, completedCount, totalActual, totalPlanned) {
    const remainingMonths = months.length - completedCount;
    const plannedSoFar = months.filter(m => m.completed).reduce((s, m) => s + m.planned, 0);
    const deficit = plannedSoFar - totalActual; // positive = behind, negative = ahead
    const remainingPlanned = totalPlanned - plannedSoFar;
    const totalRemaining = remainingPlanned + deficit;

    const card1 = document.getElementById('trackerImpactCard1');
    const card2 = document.getElementById('trackerImpactCard2');

    if (completedCount === 0) {
        RP.setText('trackerImpactValue1', '-');
        RP.setText('trackerImpactValue2', '-');
        RP.setText('trackerImpactSub1', 'Complete a month to see impact');
        RP.setText('trackerImpactSub2', 'Complete a month to see impact');
        return;
    }

    const currentSIP = months.find(m => !m.completed);
    const avgPlannedSIP = remainingMonths > 0 ? remainingPlanned / remainingMonths : 0;

    if (deficit > 0) {
        // Behind — need higher SIP or more months
        const adjustedSIP = remainingMonths > 0 ? totalRemaining / remainingMonths : 0;
        const extraMonths = avgPlannedSIP > 0 ? Math.ceil(deficit / avgPlannedSIP) : 0;

        card1.className = 'summary-card danger';
        RP.setText('trackerImpactLabel1', 'Need Higher SIP');
        RP.setText('trackerImpactValue1', RP.formatCurrency(Math.round(adjustedSIP)));
        RP.setText('trackerImpactSub1', 'to stay on timeline');

        card2.className = 'summary-card warning';
        RP.setText('trackerImpactLabel2', 'Or Extra Months');
        RP.setText('trackerImpactValue2', '+' + extraMonths + ' months');
        RP.setText('trackerImpactSub2', 'at current SIP');
    } else {
        // Ahead or on track
        const surplus = Math.abs(deficit);
        const reducedSIP = remainingMonths > 0 ? (remainingPlanned - surplus) / remainingMonths : 0;
        const fewerMonths = avgPlannedSIP > 0 ? Math.floor(surplus / avgPlannedSIP) : 0;

        card1.className = 'summary-card success';
        RP.setText('trackerImpactLabel1', 'Can Reduce SIP');
        RP.setText('trackerImpactValue1', RP.formatCurrency(Math.round(Math.max(0, reducedSIP))));
        RP.setText('trackerImpactSub1', 'and still hit target');

        card2.className = 'summary-card success';
        RP.setText('trackerImpactLabel2', 'Or Finish Early');
        RP.setText('trackerImpactValue2', fewerMonths + ' months early');
        RP.setText('trackerImpactSub2', 'at current SIP');
    }
};

RP.openTrackerModal = function (key) {
    const months = RP.getTrackerMonths();
    const month = months.find(m => m.key === key);
    if (!month) return;

    RP._trackerModalTarget = key;
    document.getElementById('trackerModalTitle').textContent = month.label;
    document.getElementById('trackerModalPlanned').value = month.planned;
    document.getElementById('trackerModalActual').value = month.completed ? month.actual : month.planned;
    document.getElementById('trackerModal').classList.add('active');
    document.getElementById('trackerModalActual').focus();
};

RP.closeTrackerModal = function () {
    document.getElementById('trackerModal').classList.remove('active');
    RP._trackerModalTarget = null;
};

RP.saveTrackerMonth = function () {
    const key = RP._trackerModalTarget;
    if (!key) return;

    const actual = parseFloat(document.getElementById('trackerModalActual').value) || 0;
    const existing = RP._trackerEntries[key] || {};

    RP._trackerEntries[key] = {
        ...existing,
        actual: actual,
        completed: true,
        date: new Date().toISOString().split('T')[0]
    };

    RP.saveTrackerToStorage();
    RP.closeTrackerModal();
    RP.renderTracker();
};

RP.resetTrackerMonth = function () {
    const key = RP._trackerModalTarget;
    if (!key) return;

    delete RP._trackerEntries[key];
    RP.saveTrackerToStorage();
    RP.closeTrackerModal();
    RP.renderTracker();
};

RP.saveTrackerToStorage = function () {
    localStorage.setItem('rp_tracker_entries', JSON.stringify(RP._trackerEntries));
    // v1.1 Feature B: any tracker mutation flows into Current Total Savings rollup.
    // The rollup helper guards against missing globals + DOM absence.
    if (typeof RP._computeSavingsRollup === 'function') {
        try { RP._computeSavingsRollup(); } catch (e) { console.warn('savings rollup failed after tracker save:', e); }
    }
};
