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

    /* v1.1 audit: front-and-center Savings Rate on Basics tab.
     * Same formula as calc-dashboard.js (one source of truth would be better
     * — for now both compute it the same way). FIRE community treats 50%+
     * as the meaningful target. */
    const monthlyExp = (typeof RP._lastMonthlyExpense === 'number') ? RP._lastMonthlyExpense : 0;
    const surplus = Math.max(0, monthly - monthlyExp);
    const rate = monthly > 0 ? (surplus / monthly * 100) : 0;
    const rateEl = document.getElementById('basicsSavingsRate');
    if (rateEl) {
        rateEl.textContent = rate.toFixed(1) + '%';
        // Color hint: red <20%, amber <40%, green >=50%
        rateEl.style.color = rate >= 50 ? 'var(--secondary-color)'
                           : rate >= 20 ? 'var(--warning-color)'
                           : 'var(--danger-color)';
    }
};
