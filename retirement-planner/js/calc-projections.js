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
 * Returns 12 if DOB is not set or invalid (preserves legacy behavior). */
RP._monthsRemainingThisBirthdayYear = function () {
    const dobEl = document.getElementById('dateOfBirth');
    if (!dobEl || !dobEl.value) return 12;
    const dob = new Date(dobEl.value);
    if (isNaN(dob.getTime())) return 12;
    const now = new Date();
    // Find the next birthday (after today). The full year before it has
    // already had (12 - monthsRemaining) months of life happen.
    let nextBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBday <= now) {
        nextBday = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
    }
    // Months between now and nextBday (inclusive of partial month → round up)
    const monthsDiff = (nextBday.getFullYear() - now.getFullYear()) * 12
                     + (nextBday.getMonth() - now.getMonth())
                     + (nextBday.getDate() < now.getDate() ? -1 : 0)
                     + 1; // +1 because we count the current month as "still has investment opportunity"
    // Pardha-explicit: "this month I invested already" → DON'T count current month.
    // So actually subtract 1. Net effect: months remaining = months until next birthday EXCLUDING current.
    const monthsRemaining = Math.max(0, Math.min(12, monthsDiff - 1));
    return monthsRemaining;
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
