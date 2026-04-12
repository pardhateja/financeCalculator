/**
 * Expense calculator
 * Sums expenses, computes excess, savings rate, health indicator
 * Auto-syncs monthly investment if not manually overridden
 */
RP.calculateExpenses = function () {
    const monthlyExp = RP.val('expRent') + RP.val('expGroceries')
        + RP.val('expUtilities') + RP.val('expTransport')
        + RP.val('expInsurance') + RP.val('expEntertainment')
        + RP.val('expShopping') + RP.val('expOtherMonthly');

    const yearlyExp = RP.val('expVacation') + RP.val('expMedical')
        + RP.val('expOtherYearly');

    const totalAnnual = (monthlyExp * 12) + yearlyExp;
    const monthlyIncome = RP.val('monthlySalary') + RP.val('monthlyRental')
        + RP.val('monthlyDividend') + RP.val('monthlyOtherIncome');
    const excess = monthlyIncome - monthlyExp;
    const savingsRate = monthlyIncome > 0 ? (excess / monthlyIncome * 100) : 0;

    RP.setText('totalMonthlyExpenses', RP.formatCurrency(monthlyExp));
    RP.setText('totalAnnualExpenses', RP.formatCurrency(totalAnnual));
    RP.setText('monthlyExcess', RP.formatCurrency(excess));
    RP.setText('savingsRate', savingsRate.toFixed(1) + '%');
    RP.setText('monthlyInvestment', RP.formatCurrency(excess));

    // Auto-sync monthly investment amount if not manually overridden
    if (!RP._investManuallySet) {
        document.getElementById('monthlyInvestAmt').value = Math.max(0, excess);
    }

    // Health indicator
    const healthEl = document.getElementById('healthIndicator');
    const healthText = document.getElementById('healthText');
    if (savingsRate <= 20) {
        healthEl.className = 'health-indicator bad';
        healthText.textContent = 'TOO LOW - Savings rate should be above 20%';
    } else {
        healthEl.className = 'health-indicator good';
        healthText.textContent = 'HEALTHY - Good savings rate of ' + savingsRate.toFixed(1) + '%';
    }
};
