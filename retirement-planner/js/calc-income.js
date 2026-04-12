/**
 * Income calculator
 * Sums monthly + yearly income sources
 */
RP.calculateIncome = function () {
    const monthly = RP.val('monthlySalary') + RP.val('monthlyRental')
        + RP.val('monthlyDividend') + RP.val('monthlyOtherIncome');
    const yearly = RP.val('yearlyBonus') + RP.val('yearlyOtherIncome');
    const grandTotal = (monthly * 12) + yearly;

    RP.setText('totalMonthlyIncome', RP.formatCurrency(monthly));
    RP.setText('totalYearlyIncome', RP.formatCurrency(yearly));
    RP.setText('grandTotalIncome', RP.formatCurrency(grandTotal));
};
