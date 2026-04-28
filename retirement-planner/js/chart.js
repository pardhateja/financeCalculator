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
 * v1.1 audit (chart v3): two-panel financial dashboard.
 *
 * Panel 1 (top, ~60% of canvas): "Will my money last?"
 *   • Clean corpus line over time, floored at zero
 *   • Soft green fill while funded → soft red after depletion
 *   • Vertical depletion marker + "Depletes at age X" callout
 *
 * Panel 2 (bottom, ~40% of canvas): "What's costing me, and when?"
 *   • Stacked area chart of monthly outgo (today's rupees) by phase
 *   • Each phase = colored band stacked on top of others
 *   • Total band height at any age = total monthly burn that year
 *   • Reads like a financial dashboard — instantly shows expense
 *     spikes (kid college years, medical phase, etc.)
 *
 * Hover anywhere on the canvas:
 *   • Vertical scrubber line spans both panels at the focused age
 *   • Tooltip in DOM shows: age, corpus, total monthly, per-phase breakdown
 *   • Below the canvas: clean DOM legend chip row (one per phase)
 *
 * Replaces the v2 ribbon design which broke down at 10+ phases — short
 * stripes became unreadable stubs, labels collided regardless of layout.
 * The stacked-area pattern scales: 30 phases would still read clearly
 * because magnitude (band height), not labels, conveys the data.
 */
RP.renderMultiGoalChart = function (canvasEl, projectionRows, phases) {
    if (!canvasEl || !Array.isArray(projectionRows) || projectionRows.length === 0) return;

    const ctx = canvasEl.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    /* CRITICAL: measure the canvas's ACTUAL rendered size FIRST. The browser
     * may apply CSS rules (max-width, parent width, etc.) that override
     * style.width. Setting style.width = '1356px' doesn't guarantee the
     * canvas actually renders at 1356px — if the parent is narrower, CSS
     * wins and the bitmap gets stretched/squished to fit, distorting text
     * and lines. Solution: use the ACTUAL rendered cssWidth/cssHeight as
     * the canvas dimensions, so bitmap-to-CSS is exactly 1:1. */
    canvasEl.style.width = '100%';
    canvasEl.style.height = '420px';
    // Now read the size the browser actually allocated.
    const rect = canvasEl.getBoundingClientRect();
    const W = Math.max(rect.width, 320);
    const H = Math.max(rect.height, 320);
    canvasEl.width = Math.round(W * dpr);
    canvasEl.height = Math.round(H * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const phaseList = Array.isArray(phases) ? phases : [];

    /* ---------- Layout: two panels stacked vertically ---------- */
    const padding = { top: 28, right: 24, bottom: 28, left: 78 };
    const chartW = W - padding.left - padding.right;
    const PANEL_GAP = 28;
    const X_AXIS_H = 18;
    const usableH = H - padding.top - padding.bottom - PANEL_GAP - X_AXIS_H;
    const corpusH = Math.round(usableH * 0.62);   // top panel ~62%
    const expenseH = usableH - corpusH;            // bottom panel ~38%
    const corpusTop = padding.top;
    const expenseTop = corpusTop + corpusH + PANEL_GAP;
    const xAxisY = expenseTop + expenseH + 4;

    /* ---------- Theme ---------- */
    const docStyle = getComputedStyle(document.documentElement);
    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.30)';
    // v1.1 audit: brighter label color in dark mode — #94a3b8 read as too dim
    // against the navy background. #cbd5e1 (slate-300) gives clear contrast
    // without being pure white (which would compete with the corpus line).
    const labelColor = isDark ? '#cbd5e1' : '#64748b';
    const lineColor = '#2563eb';
    const fillGood = isDark ? 'rgba(37,99,235,0.20)' : 'rgba(37,99,235,0.14)';
    const fillBad  = isDark ? 'rgba(239,68,68,0.18)'  : 'rgba(239,68,68,0.14)';
    const depletionRed = '#ef4444';

    /* ---------- Corpus data prep ---------- */
    const flooredData = projectionRows.map(d => ({
        age: d.age,
        ending: Math.max(0, d.ending),
        exhausted: d.ending <= 0
    }));
    const minAge = flooredData[0].age;
    const maxAge = flooredData[flooredData.length - 1].age;
    const ageSpan = (maxAge - minAge) || 1;
    const ageToX = (age) => padding.left + ((age - minAge) / ageSpan) * chartW;

    const corpusMax = Math.max(...flooredData.map(d => d.ending), 1);
    const corpusToY = (val) => corpusTop + (1 - val / corpusMax) * corpusH;
    const corpusBaseY = corpusTop + corpusH;

    /* Find depletion age */
    let depletionAge = null;
    for (let i = 0; i < flooredData.length; i++) {
        if (flooredData[i].exhausted) { depletionAge = flooredData[i].age; break; }
    }

    /* ---------- Expense data prep (stacked per phase) ---------- */
    /* For each age (column), each phase contributes its baseMonthlyExpense
     * if the phase is active that year. Stack order = phase order in input.
     * We use TODAY's-rupees (no inflation) so the visual reads "this is the
     * lifestyle shape" — comparing to inflated projection corpus would be
     * apples to oranges. */
    const ages = flooredData.map(d => d.age);
    const stackData = ages.map(age => {
        const layers = phaseList.map(p => {
            const active = age >= p.startAge && age <= p.endAge;
            return active ? (Number(p.baseMonthlyExpense) || 0) : 0;
        });
        const total = layers.reduce((s, v) => s + v, 0);
        return { age, layers, total };
    });
    const expenseMax = Math.max(...stackData.map(d => d.total), 1);
    const expenseBaseY = expenseTop + expenseH;
    const expenseToY = (val) => expenseBaseY - (val / expenseMax) * expenseH;

    /* No in-canvas section titles — they scaled badly at different viewport
     * widths and overlapped the depletion callout. The two panels are
     * visually distinct (line + filled gradient on top, stacked color bands
     * below) and the y-axis units (Cr vs ₹k/L) make them self-identifying.
     * The DOM legend below the canvas + per-row hover tooltip cover any
     * naming need. */

    /* ---------- Panel 1: Corpus area + line ---------- */
    /* grid lines + y-labels */
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = labelColor;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 3; i++) {
        const y = corpusTop + (corpusH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
        const val = corpusMax - (corpusMax / 3) * i;
        ctx.fillText(RP.formatCurrencyShort(val), padding.left - 6, y);
    }

    /* fill under curve: green before depletion, red after */
    function drawCorpusFill(fromIdx, toIdx, fillStyle) {
        if (toIdx <= fromIdx) return;
        ctx.beginPath();
        ctx.moveTo(ageToX(flooredData[fromIdx].age), corpusBaseY);
        for (let i = fromIdx; i <= toIdx; i++) {
            ctx.lineTo(ageToX(flooredData[i].age), corpusToY(flooredData[i].ending));
        }
        ctx.lineTo(ageToX(flooredData[toIdx].age), corpusBaseY);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (depletionAge !== null) {
        const depIdx = flooredData.findIndex(d => d.age === depletionAge);
        drawCorpusFill(0, depIdx, fillGood);
        drawCorpusFill(depIdx, flooredData.length - 1, fillBad);
    } else {
        drawCorpusFill(0, flooredData.length - 1, fillGood);
    }

    /* corpus line */
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.25;
    flooredData.forEach((d, i) => {
        const x = ageToX(d.age);
        const y = corpusToY(d.ending);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    /* depletion marker (corpus panel only, dashed vertical). Callout always
     * goes top-right of the corpus panel so it never overlaps the curve. */
    if (depletionAge !== null) {
        const xDep = ageToX(depletionAge);
        ctx.strokeStyle = depletionRed;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(xDep, corpusTop);
        ctx.lineTo(xDep, corpusBaseY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = depletionRed;
        ctx.beginPath();
        ctx.arc(xDep, corpusBaseY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Depletes at age ' + depletionAge, W - padding.right, corpusTop + 2);
    } else {
        ctx.fillStyle = isDark ? '#34d399' : '#059669';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('Funded through age ' + maxAge, W - padding.right, corpusTop + 2);
    }

    /* ---------- Panel 2: Stacked area expense chart ---------- */
    /* Resolve phase colors once */
    const phaseColors = phaseList.map(p => {
        const colorName = p.color || 'blue';
        return (docStyle.getPropertyValue('--phase-color-' + colorName) || '#3b82f6').trim();
    });

    /* y-axis labels on expense panel (₹/mo) */
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = labelColor;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 2; i++) {
        const y = expenseTop + (expenseH / 2) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
        const val = expenseMax - (expenseMax / 2) * i;
        const label = val >= 100000
            ? '₹' + (val / 100000).toFixed(1) + 'L'
            : '₹' + Math.round(val / 1000) + 'k';
        ctx.fillText(label, padding.left - 6, y);
    }

    /* Stacked area for each phase. Build top/bottom edge polylines per
     * phase, draw bottom-up so each layer covers the area between prior
     * cumulative top and new cumulative top. */
    const cumulative = ages.map(() => 0);
    for (let p = 0; p < phaseList.length; p++) {
        ctx.beginPath();
        // bottom edge (going right): previous cumulative
        for (let i = 0; i < ages.length; i++) {
            const x = ageToX(ages[i]);
            const y = expenseToY(cumulative[i]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        // top edge (going left): cumulative + this phase's value
        for (let i = ages.length - 1; i >= 0; i--) {
            const x = ageToX(ages[i]);
            const newCum = cumulative[i] + stackData[i].layers[p];
            const y = expenseToY(newCum);
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = phaseColors[p];
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        // accumulate
        for (let i = 0; i < ages.length; i++) {
            cumulative[i] += stackData[i].layers[p];
        }
    }

    /* ---------- X-axis age ticks (between the two panels) ---------- */
    ctx.fillStyle = labelColor;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tickStep = Math.max(1, Math.floor(ages.length / 8));
    for (let i = 0; i < ages.length; i += tickStep) {
        ctx.fillText(ages[i], ageToX(ages[i]), xAxisY);
    }
    ctx.fillText(ages[ages.length - 1], ageToX(maxAge), xAxisY);

    /* ---------- Hover scrubber + tooltip ---------- */
    /* Detach prior listeners cleanly (idempotent re-render). */
    if (canvasEl._scrubHandlers) {
        canvasEl.removeEventListener('mousemove', canvasEl._scrubHandlers.move);
        canvasEl.removeEventListener('mouseleave', canvasEl._scrubHandlers.leave);
    }
    let tooltipEl = document.getElementById('multigoalChartTooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'multigoalChartTooltip';
        tooltipEl.className = 'mg-chart-tooltip';
        canvasEl.parentElement.appendChild(tooltipEl);
    }
    tooltipEl.style.display = 'none';

    /* Pre-snapshot data the handlers need (canvas variables go out of scope
     * via closure, but we capture cleanly to avoid stale closures on re-render). */
    const hoverCtx = {
        canvas: canvasEl,
        tooltipEl,
        ages, flooredData, stackData, phaseList, phaseColors,
        ageToX, corpusToY, corpusTop, corpusBaseY, expenseTop, expenseBaseY,
        padding, W, chartW
    };

    function onMove(e) {
        const rect = canvasEl.getBoundingClientRect();
        const xRel = e.clientX - rect.left;
        const yRel = e.clientY - rect.top;
        if (xRel < hoverCtx.padding.left || xRel > hoverCtx.W - hoverCtx.padding.right) {
            hoverCtx.tooltipEl.style.display = 'none';
            redrawWithoutScrubber();
            return;
        }
        // Find closest age
        const ageFloat = hoverCtx.ages[0] + (xRel - hoverCtx.padding.left) / hoverCtx.chartW * (hoverCtx.ages[hoverCtx.ages.length - 1] - hoverCtx.ages[0]);
        let closestIdx = 0, closestDist = Infinity;
        for (let i = 0; i < hoverCtx.ages.length; i++) {
            const d = Math.abs(hoverCtx.ages[i] - ageFloat);
            if (d < closestDist) { closestDist = d; closestIdx = i; }
        }
        renderTooltip(closestIdx);
        redrawWithScrubber(closestIdx);
    }
    function onLeave() {
        hoverCtx.tooltipEl.style.display = 'none';
        redrawWithoutScrubber();
    }

    canvasEl._scrubHandlers = { move: onMove, leave: onLeave };
    canvasEl.addEventListener('mousemove', onMove);
    canvasEl.addEventListener('mouseleave', onLeave);

    /* Redraw helpers — for performance, cache the chart pixel data once and
     * re-blit it before drawing the scrubber, instead of re-running the
     * full render. */
    const baseSnapshot = ctx.getImageData(0, 0, W * dpr, H * dpr);
    function redrawWithoutScrubber() {
        ctx.putImageData(baseSnapshot, 0, 0);
    }
    function redrawWithScrubber(idx) {
        ctx.putImageData(baseSnapshot, 0, 0);
        const x = hoverCtx.ageToX(hoverCtx.ages[idx]);
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, corpusTop);
        ctx.lineTo(x, expenseBaseY);
        ctx.stroke();
        ctx.setLineDash([]);
        // Dot on corpus line
        const cy = corpusToY(flooredData[idx].ending);
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(x, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function renderTooltip(idx) {
        const row = stackData[idx];
        const corpusRow = flooredData[idx];
        const activeLayers = row.layers
            .map((v, p) => ({ v, name: phaseList[p].name, color: phaseColors[p] }))
            .filter(x => x.v > 0)
            .sort((a, b) => b.v - a.v);
        let html = '<div class="mg-tt-head">Age <strong>' + row.age + '</strong></div>';
        html += '<div class="mg-tt-row"><span>Corpus</span><strong>' + RP.formatCurrencyShort(corpusRow.ending) + '</strong></div>';
        html += '<div class="mg-tt-row"><span>Monthly outgo (today)</span><strong>₹' + (row.total >= 100000 ? (row.total / 100000).toFixed(2) + 'L' : Math.round(row.total / 1000) + 'k') + '</strong></div>';
        if (activeLayers.length > 0) {
            html += '<div class="mg-tt-divider"></div>';
            activeLayers.forEach(layer => {
                html += '<div class="mg-tt-phase"><span class="mg-tt-dot" style="background:' + layer.color + '"></span><span class="mg-tt-name">' + escapeHtml(layer.name) + '</span><span class="mg-tt-val">₹' + Math.round(layer.v / 1000) + 'k</span></div>';
            });
        } else {
            html += '<div class="mg-tt-divider"></div><div class="mg-tt-row mg-tt-muted">No active phases</div>';
        }
        tooltipEl.innerHTML = html;
        // Position: prefer right of cursor, flip to left if it would overflow
        const x = ageToX(row.age);
        const parentRect = canvasEl.parentElement.getBoundingClientRect();
        const ttW = 220;
        let left = x + 12;
        if (left + ttW > parentRect.width - 8) left = x - 12 - ttW;
        const top = Math.max(8, Math.min(parentRect.height - 200, corpusTop));
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = top + 'px';
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* ---------- DOM legend below the canvas ---------- */
    if (typeof RP._renderMultiGoalChartLegend === 'function') {
        RP._renderMultiGoalChartLegend(phaseList);
    }

    /* Re-render on window resize so the canvas bitmap matches CSS width.
     * Without this, the chart is drawn at the initial-load width and the
     * browser stretches the bitmap to fit a different container width on
     * resize/zoom — making text and lines look proportionally too big.
     * Idempotent: prior listener is stashed on the canvas and removed first. */
    if (canvasEl._resizeHandler) {
        window.removeEventListener('resize', canvasEl._resizeHandler);
    }
    let resizeTimer = null;
    canvasEl._resizeHandler = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            // Re-call the latest cached projection rows + phases via the
            // multigoal renderer (it owns the cache + cascade).
            if (typeof RP._multigoal !== 'undefined' &&
                typeof RP._multigoal.renderProjection === 'function') {
                try { RP._multigoal.renderProjection(); } catch (e) { /* swallow */ }
            }
        }, 150);
    };
    window.addEventListener('resize', canvasEl._resizeHandler);
};

RP._renderMultiGoalChartLegend = function (phaseList) {
    const host = document.getElementById('multigoalChartLegend');
    if (!host) return;
    host.innerHTML = '';
    if (!Array.isArray(phaseList) || phaseList.length === 0) return;
    phaseList.forEach(phase => {
        const chip = document.createElement('span');
        chip.className = 'phase-legend-chip';
        const dot = document.createElement('span');
        dot.className = 'phase-legend-dot';
        dot.style.background = 'var(--phase-color-' + (phase.color || 'blue') + ')';
        chip.appendChild(dot);
        const label = document.createElement('span');
        label.className = 'phase-legend-label';
        label.textContent = phase.name;
        chip.appendChild(label);
        host.appendChild(chip);
    });
};
