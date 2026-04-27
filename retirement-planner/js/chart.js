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
RP.renderMultiGoalChart = function (canvasEl, projectionRows, phases) {
    if (!canvasEl || !Array.isArray(projectionRows) || projectionRows.length === 0) return;

    const ctx = canvasEl.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.parentElement.getBoundingClientRect();
    const W = Math.max(rect.width, 320);
    const H = 350;
    canvasEl.width = W * dpr;
    canvasEl.height = H * dpr;
    canvasEl.style.width = W + 'px';
    canvasEl.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, W, H);

    const padding = { top: 30, right: 30, bottom: 40, left: 80 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const data = projectionRows;
    const maxVal = Math.max(...data.map(d => d.ending), 0);
    const minVal = Math.min(...data.map(d => d.ending), 0);
    const range = (maxVal - minVal) || 1;

    const minAge = data[0].age;
    const maxAge = data[data.length - 1].age;
    const ageSpan = (maxAge - minAge) || 1;
    const ageToX = (age) => padding.left + ((age - minAge) / ageSpan) * chartW;

    /* Hex color → rgba helper (handles 3- and 6-digit hex, ignores existing alpha) */
    const hexToRgba = (hex, alpha) => {
        if (!hex) return 'rgba(59, 130, 246, ' + alpha + ')';
        let h = String(hex).trim().replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (h.length !== 6) return 'rgba(59, 130, 246, ' + alpha + ')';
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    };

    /* Pattern 3 (fe-002): read phase colors from CSS custom properties — never hardcode */
    const docStyle = getComputedStyle(document.documentElement);
    const phaseList = Array.isArray(phases) ? phases : [];

    /* Step 1: draw shaded phase regions FIRST (behind grid + line) */
    phaseList.forEach(phase => {
        const colorName = phase.color || 'blue';
        const phaseColor = (docStyle.getPropertyValue('--phase-color-' + colorName) || '#3b82f6').trim();

        // Clamp region to visible age window
        const startAge = Math.max(minAge, phase.startAge);
        const endAge = Math.min(maxAge, phase.endAge);
        if (endAge < startAge) return;

        const xStart = ageToX(startAge);
        const xEnd = ageToX(endAge);
        const regionWidth = Math.max(2, xEnd - xStart);

        ctx.fillStyle = hexToRgba(phaseColor, 0.10);
        ctx.fillRect(xStart, padding.top, regionWidth, chartH);

        // Phase label at top of region (truncate if narrow)
        ctx.fillStyle = phaseColor;
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const maxChars = Math.max(3, Math.floor(regionWidth / 7));
        const label = phase.name.length > maxChars
            ? phase.name.slice(0, maxChars - 1) + '…'
            : phase.name;
        // Clip label to region so it doesn't bleed into neighbor regions
        ctx.save();
        ctx.beginPath();
        ctx.rect(xStart, padding.top - 12, regionWidth, 16);
        ctx.clip();
        ctx.fillText(label, xStart + 4, padding.top - 10);
        ctx.restore();
    });

    /* Step 2: grid lines (matches RP.renderChart) */
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
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(RP.formatCurrencyShort(val), padding.left - 8, y + 4);
    }

    /* Step 3: zero line if range crosses zero */
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

    /* Step 4: corpus line over shaded regions */
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    data.forEach((d, i) => {
        const x = ageToX(d.age);
        const y = padding.top + ((maxVal - d.ending) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    /* Step 5: gradient fill under curve */
    ctx.lineTo(ageToX(maxAge), H - padding.bottom);
    ctx.lineTo(ageToX(minAge), H - padding.bottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
    ctx.fillStyle = gradient;
    ctx.fill();

    /* Step 6: x-axis age labels (every Nth age) */
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const step = Math.max(1, Math.floor(data.length / 10));
    for (let i = 0; i < data.length; i += step) {
        ctx.fillText(data[i].age, ageToX(data[i].age), H - padding.bottom + 18);
    }
    ctx.fillText(data[data.length - 1].age, ageToX(maxAge), H - padding.bottom + 18);
};
