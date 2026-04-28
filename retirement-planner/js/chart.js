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

/**
 * Multi-Goal corpus chart with phase-shaded vertical regions (fe-005).
 *
 * Sibling of RP.renderChart — DO NOT call this from existing tabs (it expects
 * Multi-Goal projection rows shaped per 03-data-contracts.md §3, plus the
 * fe-002 phase array for region shading + colors).
 *
 * Args:
 *   canvasEl       — <canvas> DOM element to draw into
 *   projectionRows — array of rows from RP._multigoal.runProjection()
 *                    each row has { age, ending, status, ... }
 *   phases         — array of phase objects from RP._multigoal.phases
 *                    each phase has { id, name, startAge, endAge, color }
 *
 * Behavior:
 *   - Draws shaded vertical regions per phase (10% opacity tint of phase color)
 *     BEFORE the corpus line, so overlapping phases combine visually.
 *   - Phase labels render at top of each region (truncated for narrow regions).
 *   - Corpus line + gradient fill drawn over the shaded regions, matching the
 *     existing RP.renderChart visual language (same blue, same line weight).
 */
/**
 * v1.1 audit (chart redesign): clean corpus chart focused on the ONE thing
 * that matters — does your money last? Drops the noisy in-canvas phase bands
 * (which collided with text or read as mystery rectangles when unlabeled).
 *
 *   • Single corpus line, floored at zero (no negative-corpus nonsense).
 *   • Big amber/red marker at depletion age with a callout: "Depletes at age X".
 *   • Soft green fill under the line until depletion, soft red after (visual
 *     "you're funded vs you're not" cue).
 *   • Phase context lives in a thin colored RIBBON below the x-axis. Each
 *     phase gets a stripe within its age range — visible but doesn't compete
 *     with the corpus line. Labels render INSIDE each stripe when wide enough,
 *     truncated otherwise (the table below the chart has full names anyway).
 *   • Concurrent phases stack vertically in the ribbon (one row each).
 */
RP.renderMultiGoalChart = function (canvasEl, projectionRows, phases) {
    if (!canvasEl || !Array.isArray(projectionRows) || projectionRows.length === 0) return;

    const ctx = canvasEl.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.parentElement.getBoundingClientRect();
    const W = Math.max(rect.width, 320);

    const phaseList = Array.isArray(phases) ? phases : [];

    /* Lay out concurrent phases as stacked ribbon rows. Each row holds phases
     * whose age windows don't overlap, so a busy era (5 phases at age 47)
     * uses 5 rows; a quiet era uses 1. */
    const ribbonRows = [];
    phaseList.forEach(phase => {
        for (let i = 0; i < ribbonRows.length; i++) {
            const row = ribbonRows[i];
            const collides = row.some(p => !(p.endAge < phase.startAge || p.startAge > phase.endAge));
            if (!collides) { row.push(phase); return; }
        }
        ribbonRows.push([phase]);
    });

    const RIBBON_ROW_H = 22;
    const RIBBON_GAP = 6;
    const ribbonH = ribbonRows.length === 0 ? 0 : (ribbonRows.length * RIBBON_ROW_H + (ribbonRows.length - 1) * RIBBON_GAP + 12);
    const H = 280 + ribbonH;

    canvasEl.width = W * dpr;
    canvasEl.height = H * dpr;
    canvasEl.style.width = W + 'px';
    canvasEl.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padding = { top: 28, right: 28, bottom: 36 + ribbonH, left: 78 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const data = projectionRows;
    /* Floor at zero for visual purposes — negative corpus is a math artifact
     * (the projection keeps subtracting expenses past depletion). The "line
     * at zero past depletion" tells the real story. */
    const flooredData = data.map(d => ({ age: d.age, ending: Math.max(0, d.ending), exhausted: d.ending <= 0 }));
    const maxVal = Math.max(...flooredData.map(d => d.ending), 1);
    const range = maxVal || 1;

    const minAge = flooredData[0].age;
    const maxAge = flooredData[flooredData.length - 1].age;
    const ageSpan = (maxAge - minAge) || 1;
    const ageToX = (age) => padding.left + ((age - minAge) / ageSpan) * chartW;
    const valToY = (val) => padding.top + ((maxVal - val) / range) * chartH;

    const docStyle = getComputedStyle(document.documentElement);
    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(148,163,184,0.18)' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    /* Find depletion age (first row where corpus first hits 0). Null if never depletes. */
    let depletionAge = null;
    for (let i = 0; i < flooredData.length; i++) {
        if (flooredData[i].exhausted) { depletionAge = flooredData[i].age; break; }
    }

    /* Step 1: grid lines + y-axis labels */
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = labelColor;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
        const val = maxVal - (range / gridLines) * i;
        ctx.fillText(RP.formatCurrencyShort(val), padding.left - 8, y);
    }

    /* Step 2: corpus line, then a fill under it. Green tint while funded,
     * red tint after depletion. */
    const lineColor = '#2563eb';
    const fillGood = isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.14)';
    const fillBad  = isDark ? 'rgba(239,68,68,0.18)'  : 'rgba(239,68,68,0.14)';
    const baselineY = valToY(0);

    function drawAreaSegment(fromIdx, toIdx, fillStyle) {
        if (toIdx <= fromIdx) return;
        ctx.beginPath();
        ctx.moveTo(ageToX(flooredData[fromIdx].age), baselineY);
        for (let i = fromIdx; i <= toIdx; i++) {
            ctx.lineTo(ageToX(flooredData[i].age), valToY(flooredData[i].ending));
        }
        ctx.lineTo(ageToX(flooredData[toIdx].age), baselineY);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }

    if (depletionAge !== null) {
        const depIdx = flooredData.findIndex(d => d.age === depletionAge);
        drawAreaSegment(0, depIdx, fillGood);
        drawAreaSegment(depIdx, flooredData.length - 1, fillBad);
    } else {
        drawAreaSegment(0, flooredData.length - 1, fillGood);
    }

    // Corpus line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    flooredData.forEach((d, i) => {
        const x = ageToX(d.age);
        const y = valToY(d.ending);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    /* Step 3: depletion marker — vertical dashed line + dot + callout */
    if (depletionAge !== null) {
        const xDep = ageToX(depletionAge);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(xDep, padding.top);
        ctx.lineTo(xDep, baselineY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(xDep, baselineY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        const calloutText = 'Depletes at age ' + depletionAge;
        const textW = ctx.measureText(calloutText).width;
        // Place callout left of the marker if too close to right edge
        const calloutX = xDep + 8 + textW > W - padding.right
            ? xDep - 8 - textW
            : xDep + 8;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(calloutText, calloutX, padding.top + 2);
    } else {
        // Funded for life — soft green callout in top-right
        ctx.fillStyle = isDark ? '#34d399' : '#059669';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Funded through age ' + maxAge, W - padding.right, padding.top + 2);
    }

    /* Step 4: x-axis age ticks */
    ctx.fillStyle = labelColor;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xAxisY = baselineY + 6;
    const step = Math.max(1, Math.floor(flooredData.length / 8));
    for (let i = 0; i < flooredData.length; i += step) {
        ctx.fillText(flooredData[i].age, ageToX(flooredData[i].age), xAxisY);
    }
    ctx.fillText(flooredData[flooredData.length - 1].age, ageToX(maxAge), xAxisY);

    /* Step 5: phase ribbon below the x-axis. One stripe per phase, stacked
     * into rows when phases overlap in time. */
    const ribbonTop = baselineY + 24;
    ribbonRows.forEach((row, rowIdx) => {
        const rowY = ribbonTop + rowIdx * (RIBBON_ROW_H + RIBBON_GAP);
        row.forEach(phase => {
            const startAge = Math.max(minAge, phase.startAge);
            const endAge = Math.min(maxAge, phase.endAge);
            if (endAge < startAge) return;
            const colorName = phase.color || 'blue';
            const phaseColor = (docStyle.getPropertyValue('--phase-color-' + colorName) || '#3b82f6').trim();

            const xStart = ageToX(startAge);
            const xEnd = ageToX(endAge);
            const w = Math.max(3, xEnd - xStart);

            // Solid stripe
            ctx.fillStyle = phaseColor;
            ctx.beginPath();
            const r = 4;
            const x = xStart;
            const y = rowY;
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y,     x + w, y + RIBBON_ROW_H, r);
            ctx.arcTo(x + w, y + RIBBON_ROW_H, x,     y + RIBBON_ROW_H, r);
            ctx.arcTo(x,     y + RIBBON_ROW_H, x,     y, r);
            ctx.arcTo(x,     y, x + w, y, r);
            ctx.closePath();
            ctx.fill();

            // Label inside stripe (truncated to fit). Skip if stripe < 36px.
            if (w >= 36) {
                ctx.font = 'bold 10px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const shortName = phase.shortName || phase.name;
                const maxChars = Math.max(3, Math.floor((w - 10) / 6));
                const label = shortName.length > maxChars
                    ? shortName.slice(0, maxChars - 1) + '…'
                    : shortName;
                ctx.save();
                ctx.beginPath();
                ctx.rect(xStart + 4, rowY, w - 8, RIBBON_ROW_H);
                ctx.clip();
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, xStart + 6, rowY + RIBBON_ROW_H / 2 + 1);
                ctx.restore();
            }
        });
    });

    /* No DOM legend below — the ribbon IS the legend now. Clear any lingering
     * legend host from the prior design so it doesn't render an empty bar. */
    const legendHost = document.getElementById('multigoalChartLegend');
    if (legendHost) legendHost.innerHTML = '';
};
