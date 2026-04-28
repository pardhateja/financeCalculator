/**
 * Milestone Alerts — show when you'll hit key corpus amounts
 */
RP.calculateMilestones = function () {
    const container = document.getElementById('milestonesContainer');
    if (!container || !RP._chartData || RP._chartData.length === 0) return;

    const milestones = [
        { label: '₹1 Cr', amount: 10000000 },
        { label: '₹2 Cr', amount: 20000000 },
        { label: '₹3 Cr', amount: 30000000 },
        { label: '₹5 Cr', amount: 50000000 },
        { label: '₹10 Cr', amount: 100000000 },
        { label: '₹20 Cr', amount: 200000000 }
    ];

    const data = RP._chartData;
    const curAge = RP.val('currentAge');
    const today = new Date();
    // v1.1 audit: "reached" must compare against ACTUAL CURRENT corpus
    // (#currentSavings = seed + tracker contributions + interest), not the
    // first projection row's ending value. The first row's `ending` already
    // includes a full year of growth + savings, so a ₹70L corpus that grows
    // to ₹1.04Cr by year-end was incorrectly marked as "reached ₹1 Cr today".
    const currentCorpus = (typeof RP.val === 'function') ? RP.val('currentSavings') : 0;

    container.innerHTML = milestones.map(m => {
        const idx = data.findIndex(d => d.ending >= m.amount);
        if (idx < 0) {
            return '<div class="summary-card" style="text-align:left;margin-bottom:8px;padding:12px 16px;opacity:0.5;">' +
                '<div style="display:flex;justify-content:space-between;">' +
                '<strong>' + m.label + '</strong>' +
                '<span style="color:var(--text-secondary);">Not reached</span>' +
                '</div></div>';
        }
        const age = data[idx].age;
        const yearsFromNow = age - curAge;
        const targetDate = new Date(today.getFullYear() + yearsFromNow, today.getMonth(), 1);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dateStr = monthNames[targetDate.getMonth()] + ' ' + targetDate.getFullYear();
        const isPast = currentCorpus >= m.amount;
        const statusColor = isPast ? 'var(--secondary-color)' : yearsFromNow <= 3 ? 'var(--warning-color)' : 'var(--primary-color)';
        const statusIcon = isPast ? '&#10003;' : '&#9679;';

        return '<div class="summary-card" style="text-align:left;margin-bottom:8px;padding:12px 16px;border-left:4px solid ' + statusColor + ';">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>' + m.label + '</strong><br>' +
            '<span style="font-size:0.85rem;color:var(--text-secondary);">Age ' + age + ' &middot; ' + dateStr + ' &middot; ' + yearsFromNow + ' yrs from now</span></div>' +
            '<span style="color:' + statusColor + ';font-size:1.2rem;">' + statusIcon + '</span>' +
            '</div></div>';
    }).join('');
};
