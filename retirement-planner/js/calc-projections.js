/**
 * Projection engine — THE CORE
 * Earning: ending = starting * (1 + preReturn) + annualSavings (step-up each year)
 * Retired: ending = starting * (1 + postReturn) - inflatedExpenses
 * Dead: everything = 0
 *
 * v1.1 audit (Pardha): partial first year. If DOB is set and today is past
 * the user's birthday, only `monthsRemaining` months of birthday-year remain
 * BEFORE the next birthday. Pardha-explicit: "this month I invested already
 * so I can only invest for 11 more months" → savings AND growth for the
 * current-age year are scaled to monthsRemaining/12. Years thereafter run
 * the normal 12-month logic. This prevents double-counting the months
 * already past in the user's birthday-year.
 */

/* Compute remaining months in the user's CURRENT birthday-year.
 *
 * Pardha v2026-05-03: simplified the dropout logic.
 *   Cutoff day = DOB's day-of-month (e.g. 19 for DOB 1998-04-19),
 *                or 1 if DOB is missing.
 *   Inclusive on cutoff day: today's day <= cutoff -> current month
 *                            STILL counts as remaining.
 *   Today's day  > cutoff -> current month already invested, drop it.
 *
 * Example for DOB 1998-04-19, today = 2026-05-03:
 *   - Cutoff = 19. Today's day = 3. 3 <= 19 -> count May as remaining.
 *   - Months: May, Jun, Jul, ..., Mar = 11 months.
 *   - Drops to 10 on May 20 (when day > 19).
 *
 * Returns 12 if DOB is missing/invalid AND today's day == 1 (full year ahead).
 * Returns 11 if DOB is missing/invalid AND today's day > 1 (current month dropped). */
RP._monthsRemainingThisBirthdayYear = function () {
    const now = new Date();
    const dobEl = document.getElementById('dateOfBirth');
    let dobMonth, dobDay;

    if (!dobEl || !dobEl.value) {
        // Fallback: default cutoff = day 1 (most defensive — drop current
        // month from day 2 onwards, matches typical SIP-on-the-1st flows).
        dobMonth = now.getMonth();
        dobDay = 1;
    } else {
        const dob = new Date(dobEl.value);
        if (isNaN(dob.getTime())) {
            dobMonth = now.getMonth();
            dobDay = 1;
        } else {
            dobMonth = dob.getMonth();
            dobDay = dob.getDate();
        }
    }

    // Find next birthday in the future (strictly after today).
    let nextBday = new Date(now.getFullYear(), dobMonth, dobDay);
    if (nextBday <= now) {
        nextBday = new Date(now.getFullYear() + 1, dobMonth, dobDay);
    }

    // Whole months from this month's "remaining" count up to next birthday's
    // month (exclusive — birthday's month is the start of the NEW birthday-year).
    let months = (nextBday.getFullYear() - now.getFullYear()) * 12
               + (nextBday.getMonth() - now.getMonth());

    // Cutoff rule: if today's day-of-month is past the SIP cutoff (DOB day),
    // the current month is "already invested" and drops out of the count.
    // Inclusive on the cutoff itself: today.day == cutoff -> still counts.
    if (now.getDate() > dobDay) {
        months -= 1;
    }

    return Math.max(0, Math.min(12, months));
};

RP.generateProjections = function () {
    const curAge = RP.val('currentAge');
    const retAge = RP.val('retirementAge');
    const lifeExp = RP.val('lifeExpectancy');
    const savings = RP.val('currentSavings');
    const monthlyInvest = RP.val('monthlyInvestAmt');
    const stepUp = RP.val('stepUpRate') / 100;
    const inflation = RP.val('inflationRate') / 100;
    const postRetireMonthly = RP.val('postRetireMonthly');

    const preReturn = RP._preReturn || 0.08;
    const postReturn = RP._postReturn || 0.05;

    const monthsRemainingFirstYear = RP._monthsRemainingThisBirthdayYear();

    const rows = [];
    let starting = savings;
    let annualInvest = monthlyInvest * 12;
    let corpusAtRetirement = 0;
    let runsOutAge = null;
    RP._chartData = [];

    for (let age = curAge; age <= lifeExp; age++) {
        let status, ending, growth, expenses;
        // First-year fraction: only applies to the very first iteration (age == curAge).
        const isFirstYear = (age === curAge);
        const yearFraction = isFirstYear ? (monthsRemainingFirstYear / 12) : 1;

        if (age < retAge) {
            status = 'Earning';
            // Compound growth for fractional year: (1+r)^(N/12) - 1
            // For full year, this reduces to r exactly (N=12 → (1+r)^1 - 1 = r).
            growth = starting * (Math.pow(1 + preReturn, yearFraction) - 1);
            expenses = 0;
            const partialAnnualInvest = annualInvest * yearFraction;
            ending = starting + growth + partialAnnualInvest;
            rows.push({
                age, starting,
                annualSavings: partialAnnualInvest,
                growth, ending, status, expenses,
                yearFraction: yearFraction,
                monthsInYear: Math.round(yearFraction * 12)
            });
            starting = ending;
            annualInvest = annualInvest * (1 + stepUp);
            if (age === retAge - 1) {
                corpusAtRetirement = ending;
            }
        } else if (age >= retAge && age < lifeExp) {
            status = 'Retired';
            const yearsFromNow = age - curAge;
            const inflatedAnnualExpense = postRetireMonthly * Math.pow(1 + inflation, yearsFromNow) * 12;
            growth = starting * (Math.pow(1 + postReturn, yearFraction) - 1);
            expenses = inflatedAnnualExpense * yearFraction;
            ending = starting + growth - expenses;

            if (ending < 0 && runsOutAge === null) {
                runsOutAge = age;
            }

            rows.push({
                age, starting, annualSavings: 0,
                growth, ending, status, expenses,
                yearFraction: yearFraction,
                monthsInYear: Math.round(yearFraction * 12)
            });
            starting = ending;
        } else {
            status = 'Dead';
            rows.push({ age, starting: 0, annualSavings: 0, growth: 0, ending: 0,
                        status: 'Dead', expenses: 0,
                        yearFraction: 1, monthsInYear: 12 });
        }

        RP._chartData.push({ age, ending: rows[rows.length - 1].ending });
    }

    RP._projectionRows = rows;

    // Summary cards
    RP.setText('corpusAtRetirement', RP.formatCurrencyShort(corpusAtRetirement));
    RP.setText('yearsEarning', retAge - curAge);
    RP.setText('yearsRetired', lifeExp - retAge);
    RP.setText('runsOutAge', runsOutAge ? 'Age ' + runsOutAge : 'Never');

    // Render table
    const tbody = document.getElementById('projectionTableBody');
    tbody.innerHTML = rows.map(r => {
        let rowClass = 'row-' + r.status.toLowerCase();
        if (r.ending < 0) rowClass += ' row-warning';
        // v1.1 audit: surface partial-year months in the Age cell so user
        // sees why year 28 has smaller numbers than year 29.
        const ageLabel = (r.monthsInYear < 12)
            ? r.age + ' <span style="font-size:0.78em;color:var(--text-secondary,#94a3b8);font-weight:normal;">(' + r.monthsInYear + ' mo)</span>'
            : r.age;
        return '<tr class="' + rowClass + '">' +
            '<td>' + ageLabel + '</td>' +
            '<td>' + RP.formatCurrency(r.starting) + '</td>' +
            '<td>' + RP.formatCurrency(r.annualSavings) + '</td>' +
            '<td>' + RP.formatCurrency(r.growth) + '</td>' +
            '<td>' + RP.formatCurrency(r.ending) + '</td>' +
            '<td><span class="status-badge ' + r.status.toLowerCase() + '">' + r.status + '</span></td>' +
            '<td>' + (r.expenses ? RP.formatCurrency(r.expenses) : '-') + '</td>' +
            '</tr>';
    }).join('');

    // Render chart if projections tab is visible
    const projTab = document.getElementById('tab-projections');
    if (projTab.classList.contains('active')) {
        RP.renderChart();
    }
};
