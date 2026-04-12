/**
 * Projection engine — THE CORE
 * Earning: ending = starting * (1 + preReturn) + annualSavings (step-up each year)
 * Retired: ending = starting * (1 + postReturn) - inflatedExpenses
 * Dead: everything = 0
 */
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

    const rows = [];
    let starting = savings;
    let annualInvest = monthlyInvest * 12;
    let corpusAtRetirement = 0;
    let runsOutAge = null;
    RP._chartData = [];

    for (let age = curAge; age <= lifeExp; age++) {
        let status, ending, growth, expenses;

        if (age < retAge) {
            status = 'Earning';
            growth = starting * preReturn;
            expenses = 0;
            ending = starting + growth + annualInvest;
            rows.push({ age, starting, annualSavings: annualInvest, growth, ending, status, expenses });
            starting = ending;
            annualInvest = annualInvest * (1 + stepUp);
            if (age === retAge - 1) {
                corpusAtRetirement = ending;
            }
        } else if (age >= retAge && age < lifeExp) {
            status = 'Retired';
            const yearsFromNow = age - curAge;
            const inflatedAnnualExpense = postRetireMonthly * Math.pow(1 + inflation, yearsFromNow) * 12;
            growth = starting * postReturn;
            expenses = inflatedAnnualExpense;
            ending = starting + growth - expenses;

            if (ending < 0 && runsOutAge === null) {
                runsOutAge = age;
            }

            rows.push({ age, starting, annualSavings: 0, growth, ending, status, expenses });
            starting = ending;
        } else {
            status = 'Dead';
            rows.push({ age, starting: 0, annualSavings: 0, growth: 0, ending: 0, status: 'Dead', expenses: 0 });
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
        return '<tr class="' + rowClass + '">' +
            '<td>' + r.age + '</td>' +
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
