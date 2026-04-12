/**
 * Financial Plan calculator
 * Pre/post retirement blended returns via SUMPRODUCT(returns, shares) / SUM(shares)
 * Inflation-adjusted retirement expense
 * Savings dashboard
 */
RP.calculateFinancialPlan = function () {
    // Pre-retirement blended
    const preReturns = [RP.val('preFixedReturn'), RP.val('preLargeReturn'), RP.val('preMidReturn'), RP.val('preSmallReturn')];
    const preTaxes = [RP.val('preFixedTax'), RP.val('preLargeTax'), RP.val('preMidTax'), RP.val('preSmallTax')];
    const preShares = [RP.val('preFixedShare'), RP.val('preLargeShare'), RP.val('preMidShare'), RP.val('preSmallShare')];
    const preSumShares = preShares.reduce((a, b) => a + b, 0);

    let preBlendedR = 0, preBlendedT = 0;
    if (preSumShares > 0) {
        preBlendedR = preShares.reduce((sum, s, i) => sum + s * preReturns[i], 0) / preSumShares;
        preBlendedT = preShares.reduce((sum, s, i) => sum + s * preTaxes[i], 0) / preSumShares;
    }
    RP.setText('preBlendedReturn', preBlendedR.toFixed(2) + '%');
    RP.setText('preBlendedTax', preBlendedT.toFixed(2) + '%');
    RP.setText('preShareTotal', preSumShares);

    // Post-retirement blended
    const postReturns = [RP.val('postFixedReturn'), RP.val('postLargeReturn'), RP.val('postMidReturn'), RP.val('postSmallReturn')];
    const postTaxes = [RP.val('postFixedTax'), RP.val('postLargeTax'), RP.val('postMidTax'), RP.val('postSmallTax')];
    const postShares = [RP.val('postFixedShare'), RP.val('postLargeShare'), RP.val('postMidShare'), RP.val('postSmallShare')];
    const postSumShares = postShares.reduce((a, b) => a + b, 0);

    let postBlendedR = 0, postBlendedT = 0;
    if (postSumShares > 0) {
        postBlendedR = postShares.reduce((sum, s, i) => sum + s * postReturns[i], 0) / postSumShares;
        postBlendedT = postShares.reduce((sum, s, i) => sum + s * postTaxes[i], 0) / postSumShares;
    }
    RP.setText('postBlendedReturn', postBlendedR.toFixed(2) + '%');
    RP.setText('postBlendedTax', postBlendedT.toFixed(2) + '%');
    RP.setText('postShareTotal', postSumShares);

    // Inflation-adjusted expense at retirement
    const inflation = RP.val('inflationRate') / 100;
    const curAge = RP.val('currentAge');
    const retAge = RP.val('retirementAge');
    const monthlyNeed = RP.val('postRetireMonthly');
    const adjExpense = monthlyNeed * Math.pow(1 + inflation, retAge - curAge) * 12;
    RP.setText('inflationAdjustedExpense', RP.formatCurrency(adjExpense / 12) + '/mo');

    // Store for projections (gross blended return, matching Excel)
    RP._preReturn = preBlendedR / 100;
    RP._postReturn = postBlendedR / 100;

    // Savings dashboard
    const savings = RP.val('currentSavings');
    const monthlyInvest = RP.val('monthlyInvestAmt');
    RP.setText('savingsDisplay', RP.formatCurrency(savings));
    RP.setText('investDisplay', RP.formatCurrency(monthlyInvest));
    RP.setText('annualInvestDisplay', RP.formatCurrency(monthlyInvest * 12));
    RP.setText('yearsToRetireDisplay', Math.max(0, retAge - curAge));
};
