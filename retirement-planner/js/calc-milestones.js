/**
 * Milestone Alerts — show when you'll hit key corpus amounts.
 *
 * v1.1 audit:
 *   - "Now" anchor card at top showing current corpus + today's date
 *   - Wider ladder (1, 2, 3, 5, 10, 25, 50, 100, 250, 500 Cr) — only
 *     milestones the projection actually reaches are shown
 *   - Target date is the END of the birthday-year when corpus first
 *     crosses the threshold (next-birthday + (yearsFromNow * 12) months),
 *     not just today + yearsFromNow which gave wrong calendar dates
 *   - "yrs from now" text becomes "this year", "next year",
 *     "N yrs · M mo from now" so the timeline reads naturally
 */
RP.calculateMilestones = function () {
    const container = document.getElementById('milestonesContainer');
    if (!container || !RP._chartData || RP._chartData.length === 0) return;

    /* Wider ladder. Each ascending number is "feels meaningful" — round
     * crores. Only the ones the projection reaches will render. */
    const milestones = [
        { label: '₹1 Cr',   amount:   10000000 },
        { label: '₹2 Cr',   amount:   20000000 },
        { label: '₹3 Cr',   amount:   30000000 },
        { label: '₹5 Cr',   amount:   50000000 },
        { label: '₹10 Cr',  amount:  100000000 },
        { label: '₹25 Cr',  amount:  250000000 },
        { label: '₹50 Cr',  amount:  500000000 },
        { label: '₹100 Cr', amount: 1000000000 },
        { label: '₹250 Cr', amount: 2500000000 },
        { label: '₹500 Cr', amount: 5000000000 }
    ];

    const data = RP._chartData;
    const curAge = RP.val('currentAge');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today = new Date();
    const todayStr = monthNames[today.getMonth()] + ' ' + today.getFullYear();
    const currentCorpus = (typeof RP.val === 'function') ? RP.val('currentSavings') : 0;

    /* Compute next-birthday so target dates are anchored correctly. If DOB
     * isn't set, fall back to today (callers won't get exact-month dates
     * but the year math stays right). */
    let nextBday = today;
    const dobEl = document.getElementById('dateOfBirth');
    if (dobEl && dobEl.value) {
        const dob = new Date(dobEl.value);
        if (!isNaN(dob.getTime())) {
            nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextBday <= today) {
                nextBday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
            }
        }
    }

    function formatYrsFromNow(yrs, mo) {
        if (yrs === 0 && mo === 0) return 'this month';
        if (yrs === 0 && mo < 12) return mo + ' mo from now';
        if (yrs === 1 && mo === 0) return '1 yr from now';
        if (mo === 0) return yrs + ' yrs from now';
        return yrs + ' yr ' + mo + ' mo from now';
    }

    /* "Now" anchor card so the timeline starts somewhere familiar. */
    let html = '<div class="summary-card" style="text-align:left;margin-bottom:8px;padding:12px 16px;border-left:4px solid var(--secondary-color);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div><strong>Now</strong><br>' +
        '<span style="font-size:0.85rem;color:var(--text-secondary);">Age ' + curAge + ' · ' + todayStr + ' · ' + RP.formatCurrency(currentCorpus) + '</span></div>' +
        '<span style="color:var(--secondary-color);font-size:1.2rem;">●</span>' +
        '</div></div>';

    let anyShown = false;
    milestones.forEach(m => {
        const idx = data.findIndex(d => d.ending >= m.amount);
        if (idx < 0) return; // projection doesn't reach this — skip entirely
        anyShown = true;

        const age = data[idx].age;
        const yearsAhead = age - curAge;
        // Target date = the END of that birthday-year, which is the day BEFORE
        // the (yearsAhead+1)-th next birthday. Subtract one day to land in the
        // previous month so users read it as "Mar 2027" not "Apr 2027" when
        // their birthday is in April.
        const target = new Date(nextBday.getFullYear() + yearsAhead, nextBday.getMonth(), nextBday.getDate());
        target.setDate(target.getDate() - 1);
        const dateStr = monthNames[target.getMonth()] + ' ' + target.getFullYear();

        // Months-from-now: rough but accurate to the month
        const monthsAhead = (target.getFullYear() - today.getFullYear()) * 12
                          + (target.getMonth() - today.getMonth());
        const yrsPart = Math.floor(monthsAhead / 12);
        const moPart = monthsAhead % 12;
        const fromNowStr = formatYrsFromNow(Math.max(0, yrsPart), Math.max(0, moPart));

        const isReached = currentCorpus >= m.amount;
        const statusColor = isReached ? 'var(--secondary-color)'
                          : yrsPart <= 3 ? 'var(--warning-color)'
                          : 'var(--primary-color)';
        const statusIcon = isReached ? '&#10003;' : '&#9679;';

        html += '<div class="summary-card" style="text-align:left;margin-bottom:8px;padding:12px 16px;border-left:4px solid ' + statusColor + ';">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>' + m.label + '</strong><br>' +
            '<span style="font-size:0.85rem;color:var(--text-secondary);">Age ' + age + ' · ' + dateStr + ' · ' + fromNowStr + '</span></div>' +
            '<span style="color:' + statusColor + ';font-size:1.2rem;">' + statusIcon + '</span>' +
            '</div></div>';
    });

    if (!anyShown) {
        html += '<div class="summary-card" style="padding:12px 16px;color:var(--text-secondary);text-align:center;">' +
            'No milestones reached within your current projection horizon.</div>';
    }

    /* v1.1 audit: "Max" anchor card at the bottom showing the peak corpus
     * ever reached in the projection (before depletion if any) and the age
     * at which it peaks. Gives users a clear ceiling for their plan. */
    let peakIdx = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i].ending > data[peakIdx].ending) peakIdx = i;
    }
    const peakRow = data[peakIdx];
    if (peakRow && peakRow.ending > 0) {
        const peakAge = peakRow.age;
        const peakYearsAhead = peakAge - curAge;
        const peakTarget = new Date(nextBday.getFullYear() + peakYearsAhead, nextBday.getMonth(), nextBday.getDate());
        peakTarget.setDate(peakTarget.getDate() - 1);
        const peakDateStr = monthNames[peakTarget.getMonth()] + ' ' + peakTarget.getFullYear();
        html += '<div class="summary-card" style="text-align:left;margin-bottom:8px;padding:12px 16px;border-left:4px solid var(--warning-color);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>Peak (Max)</strong><br>' +
            '<span style="font-size:0.85rem;color:var(--text-secondary);">Age ' + peakAge + ' · ' + peakDateStr + ' · ' + RP.formatCurrency(peakRow.ending) + '</span></div>' +
            '<span style="color:var(--warning-color);font-size:1.2rem;">★</span>' +
            '</div></div>';
    }

    container.innerHTML = html;
};
