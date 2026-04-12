/**
 * What-If Scenarios — compare 2 retirement strategies side-by-side
 */
RP.calculateWhatIf = function () {
    const curAge = RP.val('currentAge');
    const lifeExp = RP.val('lifeExpectancy');
    const savings = RP.val('currentSavings');
    const stepUp = RP.val('stepUpRate') / 100;
    const inflation = RP.val('inflationRate') / 100;
    const postRetireMonthly = RP.val('postRetireMonthly');
    const postReturn = RP._postReturn || 0.05;

    function runScenario(retAge, monthlyInvest, preReturnPct) {
        const preReturn = preReturnPct / 100;
        let starting = savings;
        let annualInvest = monthlyInvest * 12;
        let corpus = 0;
        let runsOut = null;
        const data = [];

        for (let age = curAge; age <= lifeExp; age++) {
            if (age < retAge) {
                const growth = starting * preReturn;
                starting = starting + growth + annualInvest;
                annualInvest *= (1 + stepUp);
                if (age === retAge - 1) corpus = starting;
            } else if (age < lifeExp) {
                const yearsFromNow = age - curAge;
                const expense = postRetireMonthly * Math.pow(1 + inflation, yearsFromNow) * 12;
                starting = starting + starting * postReturn - expense;
                if (starting < 0 && runsOut === null) runsOut = age;
            }
            data.push({ age, ending: age < lifeExp ? starting : 0 });
        }
        return { corpus, runsOut, data };
    }

    const scenA = runScenario(RP.val('scenARetAge'), RP.val('scenAMonthly'), RP.val('scenAReturn'));
    const scenB = runScenario(RP.val('scenBRetAge'), RP.val('scenBMonthly'), RP.val('scenBReturn'));

    RP.setText('scenACorpus', RP.formatCurrencyShort(scenA.corpus));
    RP.setText('scenARunsOut', scenA.runsOut ? 'Age ' + scenA.runsOut : 'Never');
    RP.setText('scenBCorpus', RP.formatCurrencyShort(scenB.corpus));
    RP.setText('scenBRunsOut', scenB.runsOut ? 'Age ' + scenB.runsOut : 'Never');

    RP._whatIfData = { a: scenA.data, b: scenB.data };
    if (document.getElementById('tab-whatif').classList.contains('active')) {
        RP.renderWhatIfChart();
    }
};

RP.renderWhatIfChart = function () {
    const canvas = document.getElementById('whatifChart');
    if (!canvas || !RP._whatIfData) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = 300;
    ctx.clearRect(0, 0, W, H);

    const dataA = RP._whatIfData.a;
    const dataB = RP._whatIfData.b;
    const allEndings = [...dataA.map(d => d.ending), ...dataB.map(d => d.ending)];
    const maxVal = Math.max(...allEndings, 0);
    const minVal = Math.min(...allEndings, 0);
    const range = maxVal - minVal || 1;

    const pad = { top: 25, right: 25, bottom: 35, left: 75 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    // Grid
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (cH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(RP.formatCurrencyShort(maxVal - (range / 4) * i), pad.left - 6, y + 4);
    }

    // Zero line
    if (minVal < 0 && maxVal > 0) {
        const zy = pad.top + (maxVal / range) * cH;
        ctx.strokeStyle = '#ef4444'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(pad.left, zy); ctx.lineTo(W - pad.right, zy); ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawLine(data, color) {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        data.forEach((d, i) => {
            const x = pad.left + (i / (data.length - 1)) * cW;
            const y = pad.top + ((maxVal - d.ending) / range) * cH;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    drawLine(dataA, '#10b981');
    drawLine(dataB, '#f59e0b');

    // Legend
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#10b981'; ctx.fillText('Scenario A', pad.left + 10, pad.top + 15);
    ctx.fillStyle = '#f59e0b'; ctx.fillText('Scenario B', pad.left + 100, pad.top + 15);

    // X labels
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(dataA.length / 8));
    for (let i = 0; i < dataA.length; i += step) {
        ctx.fillText(dataA[i].age, pad.left + (i / (dataA.length - 1)) * cW, H - pad.bottom + 15);
    }
};
