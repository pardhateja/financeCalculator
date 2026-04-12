/**
 * Dashboard — executive summary of financial health
 * FI score (using projected corpus, not current savings), all key metrics
 */
RP.calculateDashboard = function () {
    const savings = RP.val('currentSavings');
    const monthlyIncome = RP.val('monthlySalary') + RP.val('monthlyRental') + RP.val('monthlyDividend') + RP.val('monthlyOtherIncome');
    const needs = RP.val('expRent') + RP.val('expGroceries') + RP.val('expUtilities') + RP.val('expTransport') + RP.val('expInsurance');
    const wants = RP.val('expEntertainment') + RP.val('expShopping') + RP.val('expOtherMonthly');
    const monthlyExp = needs + wants;
    const excess = monthlyIncome - monthlyExp;
    const savingsRate = monthlyIncome > 0 ? (excess / monthlyIncome * 100) : 0;
    const curAge = RP.val('currentAge');
    const retAge = RP.val('retirementAge');
    const lifeExp = RP.val('lifeExpectancy');
    const inflation = RP.val('inflationRate') / 100;
    const postRetireMonthly = RP.val('postRetireMonthly');
    const monthlyInvest = RP.val('monthlyInvestAmt');

    // --- FI SCORE (0-100) using PROJECTED corpus ---
    // Get projected corpus from projections (already calculated)
    const corpusText = document.getElementById('corpusAtRetirement') ? document.getElementById('corpusAtRetirement').textContent : '';
    let projectedCorpus = 0;
    if (corpusText.includes('Cr')) projectedCorpus = parseFloat(corpusText.replace(/[^0-9.]/g, '')) * 10000000;
    else if (corpusText.includes('L')) projectedCorpus = parseFloat(corpusText.replace(/[^0-9.]/g, '')) * 100000;

    // Target corpus: inflation-adjusted annual expense at retirement * 25 (4% rule)
    const retYears = retAge - curAge;
    const inflAdjAnnualExp = postRetireMonthly * Math.pow(1 + inflation, retYears) * 12;
    const targetCorpus = inflAdjAnnualExp * 25;
    const corpusRatio = targetCorpus > 0 ? Math.min(1, projectedCorpus / targetCorpus) : 0;

    // Longevity: how much of retirement is covered
    const runsOutText = document.getElementById('runsOutAge') ? document.getElementById('runsOutAge').textContent : '';
    const runsOutAge = runsOutText.includes('Never') ? lifeExp : (parseInt(runsOutText.replace('Age ', '')) || lifeExp);
    const retDuration = lifeExp - retAge;
    const longevityScore = retDuration > 0 ? Math.min(1, (runsOutAge - retAge) / retDuration) : 0;

    // Emergency fund from input (auto-filled or manually set)
    const emFund = RP.val('emergencyFund');
    const jobLossExp = RP.val('emMonthlyExpInput') || monthlyExp;
    const emMonths = jobLossExp > 0 ? emFund / jobLossExp : 0;
    const emScore = Math.min(1, emMonths / 6);

    // Score components (weighted to 100)
    const s1 = Math.min(savingsRate, 60) / 60 * 20;       // Savings rate: 20 pts
    const s2 = corpusRatio * 30;                            // Corpus adequacy: 30 pts
    const s3 = longevityScore * 30;                         // Longevity: 30 pts
    const s4 = emScore * 10;                                // Emergency fund: 10 pts
    const s5 = (monthlyInvest > 0 ? Math.min(1, monthlyInvest / (monthlyIncome * 0.5)) : 0) * 10; // Investment discipline: 10 pts
    const fiScore = Math.round(s1 + s2 + s3 + s4 + s5);

    // Display FI score
    RP.setText('fiScore', fiScore + '/100');
    const fiEl = document.getElementById('fiScore').parentElement;
    fiEl.className = 'summary-card ' + (fiScore >= 75 ? 'success' : fiScore >= 50 ? 'warning' : 'danger');
    RP.setText('fiScoreText', fiScore >= 75 ? 'On Track' : fiScore >= 50 ? 'Needs Attention' : 'At Risk');

    // FI Score Breakdown
    const breakdownEl = document.getElementById('fiBreakdown');
    breakdownEl.innerHTML = [
        { label: 'Savings Rate', score: s1, max: 20, detail: savingsRate.toFixed(1) + '% (target: 60%+)' },
        { label: 'Corpus Adequacy', score: s2, max: 30, detail: RP.formatCurrencyShort(projectedCorpus) + ' / ' + RP.formatCurrencyShort(targetCorpus) + ' target' },
        { label: 'Longevity Coverage', score: s3, max: 30, detail: runsOutAge >= lifeExp ? 'Lasts entire lifetime' : 'Runs out at ' + runsOutAge + ' (need ' + lifeExp + ')' },
        { label: 'Emergency Fund', score: s4, max: 10, detail: emMonths.toFixed(1) + ' months covered (target: 6)' },
        { label: 'Investment Discipline', score: s5, max: 10, detail: RP.formatCurrency(monthlyInvest) + '/mo invested' }
    ].map(item => {
        const pct = item.max > 0 ? (item.score / item.max * 100) : 0;
        const color = pct >= 75 ? 'var(--secondary-color)' : pct >= 50 ? 'var(--warning-color)' : 'var(--danger-color)';
        return '<div style="margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem;">' +
                '<strong>' + item.label + '</strong>' +
                '<span>' + item.score.toFixed(1) + ' / ' + item.max + '</span>' +
            '</div>' +
            '<div style="background:var(--border-color);border-radius:6px;height:8px;overflow:hidden;">' +
                '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:6px;transition:width 0.3s;"></div>' +
            '</div>' +
            '<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">' + item.detail + '</div>' +
        '</div>';
    }).join('');

    // Hero metrics
    RP.setText('dashNetWorth', RP.formatCurrencyShort(savings));
    RP.setText('dashCorpus', corpusText || '-');
    RP.setText('dashRunsOut', runsOutText || '-');

    // Income & Expense metrics
    RP.setText('dashSavingsRate', savingsRate.toFixed(1) + '%');
    RP.setText('dashSurplus', RP.formatCurrency(excess));
    RP.setText('dashNeedsWants', Math.round(needs / (monthlyExp || 1) * 100) + '% / ' + Math.round(wants / (monthlyExp || 1) * 100) + '%');
    RP.setText('dashAnnualSurplus', RP.formatCurrencyShort(excess * 12));

    // Investment metrics
    RP.setText('dashPreReturn', ((RP._preReturn || 0) * 100).toFixed(2) + '%');
    RP.setText('dashPostReturn', ((RP._postReturn || 0) * 100).toFixed(2) + '%');
    RP.setText('dashMonthlySIP', RP.formatCurrency(monthlyInvest));
    RP.setText('dashAnnualSIP', RP.formatCurrencyShort(monthlyInvest * 12));

    // Retirement readiness
    RP.setText('dashYearsToRetire', Math.max(0, retYears));
    RP.setText('dashRetDuration', retDuration + ' yrs');
    RP.setText('dashPostRetExpense', RP.formatCurrency(postRetireMonthly * Math.pow(1 + inflation, retYears)));
    const wealthMultiple = inflAdjAnnualExp > 0 ? (projectedCorpus / inflAdjAnnualExp) : 0;
    RP.setText('dashWealthMultiple', wealthMultiple.toFixed(1) + 'x');

    // Key ratios
    const expenseRatio = monthlyIncome > 0 ? (monthlyExp / monthlyIncome * 100) : 0;
    const investRatio = monthlyIncome > 0 ? (monthlyInvest / monthlyIncome * 100) : 0;
    RP.setText('dashExpenseRatio', expenseRatio.toFixed(0) + '%');
    RP.setText('dashInvestRatio', investRatio.toFixed(0) + '%');
    RP.setText('dashDebtFree', RP.formatCurrency(monthlyIncome - RP.val('expRent')));
    RP.setText('dashFIRENumber', RP.formatCurrencyShort(inflAdjAnnualExp * 25));

    // Risk alerts
    const alerts = [];
    if (savingsRate < 20) alerts.push({ type: 'bad', text: 'Savings rate below 20% — increase income or cut expenses' });
    if (runsOutAge < lifeExp) alerts.push({ type: 'bad', text: 'Money runs out at age ' + runsOutAge + ' — need ' + (lifeExp - runsOutAge) + ' more years of coverage' });
    if (excess < 0) alerts.push({ type: 'bad', text: 'Spending exceeds income by ' + RP.formatCurrency(Math.abs(excess)) + '/month' });
    if (emMonths < 3) alerts.push({ type: 'bad', text: 'Emergency fund critical — only ' + emMonths.toFixed(1) + ' months coverage' });
    if (wealthMultiple < 25) alerts.push({ type: 'bad', text: 'Wealth multiple ' + wealthMultiple.toFixed(1) + 'x — target 25x for 4% safe withdrawal' });
    if (savingsRate >= 50) alerts.push({ type: 'good', text: 'Excellent savings rate of ' + savingsRate.toFixed(0) + '%' });
    if (runsOutAge >= lifeExp) alerts.push({ type: 'good', text: 'Corpus lasts your entire lifetime' });
    if (emMonths >= 6) alerts.push({ type: 'good', text: 'Emergency fund adequate — ' + emMonths.toFixed(1) + ' months covered' });
    if (wealthMultiple >= 25) alerts.push({ type: 'good', text: 'Wealth multiple ' + wealthMultiple.toFixed(1) + 'x — FIRE ready!' });

    const alertsEl = document.getElementById('dashAlerts');
    alertsEl.innerHTML = alerts.length ? alerts.map(a =>
        '<div class="health-indicator ' + a.type + '" style="margin-bottom:8px;"><span class="health-dot"></span><span>' + a.text + '</span></div>'
    ).join('') : '<div class="sub-text" style="color:var(--text-secondary);">No alerts</div>';

    // Quick actions
    const actions = [];
    if (savingsRate < 30) actions.push('Increase monthly investment by ' + RP.formatCurrency(monthlyIncome * 0.1));
    if (runsOutAge < lifeExp && runsOutAge > 0) actions.push('Reduce post-retirement monthly expense or delay retirement to grow corpus');
    if (emMonths < 6) actions.push('Build emergency fund to ' + RP.formatCurrency(monthlyExp * 6) + ' (6 months)');
    if (wealthMultiple < 25 && wealthMultiple > 0) actions.push('Need ' + RP.formatCurrencyShort(targetCorpus - projectedCorpus) + ' more corpus to hit 25x FIRE number');
    actions.push('Review investment allocation at age milestones (30, 40, 50)');

    const actionsEl = document.getElementById('dashActions');
    actionsEl.innerHTML = actions.map(a =>
        '<div style="padding:8px 12px;margin-bottom:6px;background:var(--bg-color);border-radius:8px;border-left:3px solid var(--primary-color);font-size:0.9rem;">' + a + '</div>'
    ).join('');
};
