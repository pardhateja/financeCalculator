/**
 * Loan/EMI Impact — calculate EMI and show retirement impact
 */
RP.calculateLoan = function () {
    const principal = RP.val('loanPrincipal');
    const rate = RP.val('loanRate') / 100 / 12; // monthly rate
    const tenure = RP.val('loanTenure') * 12; // months

    if (principal <= 0 || rate <= 0 || tenure <= 0) {
        RP.setText('loanEMI', '-');
        RP.setText('loanTotalInterest', '-');
        RP.setText('loanTotalPayment', '-');
        RP.setText('loanImpactCorpus', '-');
        RP.setText('loanImpactRunsOut', '-');
        return;
    }

    // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    const emi = principal * rate * Math.pow(1 + rate, tenure) / (Math.pow(1 + rate, tenure) - 1);
    const totalPayment = emi * tenure;
    const totalInterest = totalPayment - principal;

    RP.setText('loanEMI', RP.formatCurrency(Math.round(emi)));
    RP.setText('loanTotalInterest', RP.formatCurrencyShort(totalInterest));
    RP.setText('loanTotalPayment', RP.formatCurrencyShort(totalPayment));

    // Impact: reduce monthly investment by EMI, recalculate corpus
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
    const loanYears = RP.val('loanTenure');

    // Without loan (current projections)
    const withoutLoan = RP.simulateProjection(curAge, retAge, lifeExp, savings, monthlyInvest, 0, stepUp, preReturn, postReturn, inflation, postRetireMonthly);

    // With loan (reduced investment during loan tenure)
    const withLoan = RP.simulateProjection(curAge, retAge, lifeExp, savings, monthlyInvest, Math.round(emi), stepUp, preReturn, postReturn, inflation, postRetireMonthly, loanYears);

    RP.setText('loanImpactCorpus', RP.formatCurrencyShort(withLoan.corpus) + ' (was ' + RP.formatCurrencyShort(withoutLoan.corpus) + ')');
    RP.setText('loanImpactRunsOut', (withLoan.runsOut ? 'Age ' + withLoan.runsOut : 'Never') + ' (was ' + (withoutLoan.runsOut ? 'Age ' + withoutLoan.runsOut : 'Never') + ')');

    const corpusDiff = withLoan.corpus - withoutLoan.corpus;
    document.getElementById('loanImpactCorpus').parentElement.className = 'summary-card ' + (corpusDiff >= 0 ? 'success' : 'danger');
};

RP.simulateProjection = function (curAge, retAge, lifeExp, savings, monthlyInvest, emiDeduction, stepUp, preReturn, postReturn, inflation, postRetireMonthly, loanYears) {
    let starting = savings;
    let annualInvest = (monthlyInvest - emiDeduction) * 12;
    let corpus = 0;
    let runsOut = null;

    for (let age = curAge; age <= lifeExp; age++) {
        if (age < retAge) {
            const growth = starting * preReturn;
            starting = starting + growth + Math.max(0, annualInvest);
            // After loan tenure, restore full investment
            if (loanYears && (age - curAge) >= loanYears) {
                annualInvest = monthlyInvest * 12 * Math.pow(1 + stepUp, age - curAge);
            } else {
                annualInvest = (monthlyInvest - emiDeduction) * 12 * Math.pow(1 + stepUp, age - curAge);
            }
            if (age === retAge - 1) corpus = starting;
        } else if (age < lifeExp) {
            const yearsFromNow = age - curAge;
            const expense = postRetireMonthly * Math.pow(1 + inflation, yearsFromNow) * 12;
            starting = starting + starting * postReturn - expense;
            if (starting < 0 && runsOut === null) runsOut = age;
        }
    }
    return { corpus, runsOut };
};
