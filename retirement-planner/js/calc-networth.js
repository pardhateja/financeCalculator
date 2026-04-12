/**
 * Net Worth Tracker — monthly log with chart, actual vs projected
 */
RP.getNetWorthLog = function () {
    return JSON.parse(localStorage.getItem('rp_networth_log') || '[]');
};

RP.addNetWorthEntry = function () {
    const amount = RP.val('nwAmount');
    const month = document.getElementById('nwMonth').value;
    if (!amount || !month) return;

    const log = RP.getNetWorthLog();
    const existing = log.findIndex(e => e.month === month);
    if (existing >= 0) log[existing].amount = amount;
    else log.push({ month, amount, date: new Date().toISOString() });

    log.sort((a, b) => a.month.localeCompare(b.month));
    localStorage.setItem('rp_networth_log', JSON.stringify(log));
    document.getElementById('nwAmount').value = '';
    RP.renderNetWorth();
};

RP.deleteNetWorthEntry = function (month) {
    const log = RP.getNetWorthLog().filter(e => e.month !== month);
    localStorage.setItem('rp_networth_log', JSON.stringify(log));
    RP.renderNetWorth();
};

RP.renderNetWorth = function () {
    const log = RP.getNetWorthLog();
    const container = document.getElementById('nwLogContainer');
    const chartCanvas = document.getElementById('nwChart');

    // Table
    if (log.length === 0) {
        container.innerHTML = '<div class="sub-text" style="padding:16px;text-align:center;color:var(--text-secondary);">No entries yet. Add your first monthly net worth above.</div>';
    } else {
        container.innerHTML = '<table class="projection-table"><thead><tr><th>Month</th><th>Net Worth</th><th>Change</th><th></th></tr></thead><tbody>' +
            log.map((e, i) => {
                const prev = i > 0 ? log[i - 1].amount : e.amount;
                const change = e.amount - prev;
                const changeColor = change >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)';
                return '<tr><td style="text-align:center;">' + e.month + '</td>' +
                    '<td>' + RP.formatCurrency(e.amount) + '</td>' +
                    '<td style="color:' + changeColor + ';">' + (change >= 0 ? '+' : '') + RP.formatCurrency(change) + '</td>' +
                    '<td style="text-align:center;"><button onclick="RP.deleteNetWorthEntry(\'' + e.month + '\')" style="background:none;border:none;color:var(--danger-color);cursor:pointer;font-size:1rem;">&#10005;</button></td></tr>';
            }).join('') + '</tbody></table>';

        // Summary
        const first = log[0].amount;
        const last = log[log.length - 1].amount;
        const growth = last - first;
        RP.setText('nwTotalGrowth', (growth >= 0 ? '+' : '') + RP.formatCurrencyShort(growth));
        RP.setText('nwLatest', RP.formatCurrencyShort(last));
        RP.setText('nwEntries', log.length + ' entries');
    }

    // Chart
    if (!chartCanvas || log.length < 2) return;
    const ctx = chartCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = chartCanvas.parentElement.getBoundingClientRect();
    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = 250 * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = 250;
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 20, right: 20, bottom: 35, left: 70 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;
    const vals = log.map(e => e.amount);
    const maxV = Math.max(...vals);
    const minV = Math.min(...vals);
    const range = maxV - minV || 1;

    // Grid
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (cH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(RP.formatCurrencyShort(maxV - (range / 4) * i), pad.left - 6, y + 4);
    }

    // Line
    ctx.beginPath(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5;
    vals.forEach((v, i) => {
        const x = pad.left + (i / (vals.length - 1)) * cW;
        const y = pad.top + ((maxV - v) / range) * cH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    vals.forEach((v, i) => {
        const x = pad.left + (i / (vals.length - 1)) * cW;
        const y = pad.top + ((maxV - v) / range) * cH;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb'; ctx.fill();
    });

    // X labels
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(log.length / 6));
    for (let i = 0; i < log.length; i += step) {
        ctx.fillText(log[i].month, pad.left + (i / (log.length - 1)) * cW, H - pad.bottom + 15);
    }
};

RP.initNetWorth = function () {
    document.getElementById('addNwBtn').addEventListener('click', () => RP.addNetWorthEntry());
    // Default month to current
    const now = new Date();
    document.getElementById('nwMonth').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    RP.renderNetWorth();
};
