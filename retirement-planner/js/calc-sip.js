/**
 * SIP Calculator — standalone SIP with step-up, year-wise growth table
 */
RP.calculateSIP = function () {
    const monthly = RP.val('sipAmount');
    const annualReturn = RP.val('sipReturn') / 100;
    const years = RP.val('sipYears');
    const stepUp = RP.val('sipStepUp') / 100;

    const monthlyRate = annualReturn / 12;
    let corpus = 0;
    let totalInvested = 0;
    let currentMonthly = monthly;
    const rows = [];

    for (let yr = 1; yr <= years; yr++) {
        let yearInvested = 0;
        for (let m = 0; m < 12; m++) {
            corpus += currentMonthly;
            corpus *= (1 + monthlyRate);
            yearInvested += currentMonthly;
        }
        totalInvested += yearInvested;
        rows.push({ year: yr, invested: totalInvested, corpus: corpus, gain: corpus - totalInvested });
        currentMonthly *= (1 + stepUp);
    }

    RP.setText('sipCorpus', RP.formatCurrencyShort(corpus));
    RP.setText('sipInvested', RP.formatCurrencyShort(totalInvested));
    RP.setText('sipGained', RP.formatCurrencyShort(corpus - totalInvested));

    const tbody = document.getElementById('sipTableBody');
    tbody.innerHTML = rows.map(r =>
        '<tr>' +
        '<td style="text-align:center;">' + r.year + '</td>' +
        '<td>' + RP.formatCurrency(r.invested) + '</td>' +
        '<td>' + RP.formatCurrency(r.corpus) + '</td>' +
        '<td style="color:var(--secondary-color);">' + RP.formatCurrency(r.gain) + '</td>' +
        '</tr>'
    ).join('');
};
