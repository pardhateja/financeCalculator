/**
 * Canvas 2D chart renderer
 * Line chart with gradient fill, retirement marker, zero line
 */
RP.renderChart = function () {
    const canvas = document.getElementById('projectionChart');
    if (!canvas || !RP._chartData || RP._chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 350 * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = 350;

    ctx.clearRect(0, 0, W, H);

    const data = RP._chartData;
    const padding = { top: 30, right: 30, bottom: 40, left: 80 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map(d => d.ending), 0);
    const minVal = Math.min(...data.map(d => d.ending), 0);
    const range = maxVal - minVal || 1;

    const retAge = RP.val('retirementAge');

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();

        const val = maxVal - (range / gridLines) * i;
        ctx.fillStyle = '#64748b';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(RP.formatCurrencyShort(val), padding.left - 8, y + 4);
    }

    // Zero line (if range crosses zero)
    if (minVal < 0 && maxVal > 0) {
        const zeroY = padding.top + (maxVal / range) * chartH;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(W - padding.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Retirement marker
    const retIdx = data.findIndex(d => d.age === retAge);
    if (retIdx >= 0) {
        const x = padding.left + (retIdx / (data.length - 1)) * chartW;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, H - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Retirement', x, padding.top - 8);
    }

    // Data line
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    data.forEach((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartW;
        const y = padding.top + ((maxVal - d.ending) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill under curve
    ctx.lineTo(padding.left + chartW, H - padding.bottom);
    ctx.lineTo(padding.left, H - padding.bottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // X-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 10));
    for (let i = 0; i < data.length; i += step) {
        const x = padding.left + (i / (data.length - 1)) * chartW;
        ctx.fillText(data[i].age, x, H - padding.bottom + 18);
    }
    const lastX = padding.left + chartW;
    ctx.fillText(data[data.length - 1].age, lastX, H - padding.bottom + 18);
};
