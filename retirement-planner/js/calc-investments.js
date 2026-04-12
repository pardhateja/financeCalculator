/**
 * Investment calculator
 * Age-based safe/stock split, MF allocation by bracket, blended return
 */
RP.calculateInvestments = function () {
    const age = RP.val('currentAge');
    const safeP = age;
    const stockP = 100 - age;
    document.getElementById('safePercent').value = safeP;
    document.getElementById('stockPercent').value = stockP;

    const safeR = RP.val('safeReturn');
    const largeR = RP.val('largecapReturn');
    const midR = RP.val('midcapReturn');
    const smallR = RP.val('smallcapReturn');

    // Get MF allocation from active age bracket
    let largePct, midPct, smallPct;
    if (age < 30) { largePct = 40; midPct = 30; smallPct = 30; }
    else if (age < 40) { largePct = 50; midPct = 30; smallPct = 20; }
    else { largePct = 60; midPct = 30; smallPct = 10; }

    // Stock blended return (MF portion only)
    const stockBlended = (largePct * largeR + midPct * midR + smallPct * smallR) / 100;
    RP.setText('stockBlendedReturn', stockBlended.toFixed(1) + '%');

    // Overall blended = safe% * safeReturn + stock% * stockBlended
    const overallBlended = (safeP * safeR + stockP * stockBlended) / 100;
    RP.setText('blendedReturn', overallBlended.toFixed(2) + '%');

    // SIP amount breakdown
    const monthlyInvest = RP.val('monthlyInvestAmt');
    const safeAmt = monthlyInvest * safeP / 100;
    const stockAmt = monthlyInvest * stockP / 100;
    RP.setText('sipSafe', RP.formatCurrency(safeAmt));
    RP.setText('sipLarge', RP.formatCurrency(stockAmt * largePct / 100));
    RP.setText('sipMid', RP.formatCurrency(stockAmt * midPct / 100));
    RP.setText('sipSmall', RP.formatCurrency(stockAmt * smallPct / 100));
};

/** Highlight the active age bracket row in the investment matrix */
RP.highlightBracket = function () {
    const age = RP.val('currentAge');
    const brackets = ['bracket-20-30', 'bracket-30-40', 'bracket-40-plus'];
    brackets.forEach(b => {
        const row = document.getElementById(b);
        if (row) {
            row.querySelectorAll('td').forEach(td => td.classList.remove('active-bracket'));
        }
    });

    let activeId;
    if (age < 30) activeId = 'bracket-20-30';
    else if (age < 40) activeId = 'bracket-30-40';
    else activeId = 'bracket-40-plus';

    const activeRow = document.getElementById(activeId);
    if (activeRow) {
        activeRow.querySelectorAll('td').forEach(td => td.classList.add('active-bracket'));
    }
};
