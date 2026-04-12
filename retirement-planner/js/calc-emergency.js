/**
 * Emergency Fund — auto-calculated from Fixed Returns share of current savings
 * User can override by editing the amount directly
 * Uses post-job-loss expenses for coverage calculation
 */
RP.calculateEmergency = function () {
    const normalExp = RP.val('expRent') + RP.val('expGroceries') + RP.val('expUtilities')
        + RP.val('expTransport') + RP.val('expInsurance') + RP.val('expEntertainment')
        + RP.val('expShopping') + RP.val('expOtherMonthly');
    const jobLossExp = RP.val('emMonthlyExpInput');
    const targetMonths = RP.val('emergencyMonths');

    // Auto-sync emergency fund = savings × fixed share, unless manually overridden
    const savings = RP.val('currentSavings');
    const fixedShare = RP.val('preFixedShare') / 100;
    if (!RP._emFundManuallySet) {
        document.getElementById('emergencyFund').value = Math.round(savings * fixedShare);
    }
    const fund = RP.val('emergencyFund');

    const target = jobLossExp * targetMonths;

    RP.setText('emCurrent', RP.formatCurrency(fund));
    RP.setText('emFormula', RP._emFundManuallySet ? 'Manually set' : RP.formatCurrencyShort(savings) + ' × ' + (fixedShare * 100) + '% fixed');
    RP.setText('emMonthlyExp', RP.formatCurrency(normalExp));
    RP.setText('emTarget', RP.formatCurrency(target));

    // Months covered based on reduced expenses
    const monthsCovered = jobLossExp > 0 ? (fund / jobLossExp) : 0;
    RP.setText('emMonthsCovered', monthsCovered.toFixed(1));

    // Gap
    const gap = fund - target;
    RP.setText('emGap', (gap >= 0 ? '+' : '') + RP.formatCurrency(gap));

    // Health
    const healthEl = document.getElementById('emHealthIndicator');
    const healthText = document.getElementById('emHealthText');
    if (monthsCovered >= targetMonths) {
        healthEl.className = 'health-indicator good';
        healthText.textContent = 'ADEQUATE — ' + monthsCovered.toFixed(1) + ' months at ' + RP.formatCurrency(jobLossExp) + '/mo (target: ' + targetMonths + ')';
    } else if (monthsCovered >= 3) {
        healthEl.className = 'health-indicator bad';
        healthText.textContent = 'LOW — Only ' + monthsCovered.toFixed(1) + ' months at ' + RP.formatCurrency(jobLossExp) + '/mo (target: ' + targetMonths + ')';
    } else {
        healthEl.className = 'health-indicator bad';
        healthText.textContent = 'CRITICAL — Only ' + monthsCovered.toFixed(1) + ' months. Build this immediately!';
    }

    // Job loss simulator
    RP.setText('emJobLossMonths', monthsCovered.toFixed(1) + ' months');
    const today = new Date();
    const runwayDate = new Date(today.getTime() + monthsCovered * 30 * 24 * 60 * 60 * 1000);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    RP.setText('emRunwayDate', months[runwayDate.getMonth()] + ' ' + runwayDate.getFullYear());
};
