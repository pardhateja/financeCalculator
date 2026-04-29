/**
 * Monte Carlo chart renderers (fe-004).
 *   RP.renderMcBarChart(canvasId, data, opts)  — vertical bars by tier
 *   RP.renderMcLineChart(canvasId, data, opts) — P50 line + P10/P90 band
 * Pure Canvas 2D, no deps. CSS vars read at runtime so theme switches just work.
 */
(function () {
    window.RP = window.RP || {};

    function cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    function setupCanvas(canvas, heightPx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        const W = Math.max(rect.width, 280);
        const H = heightPx;
        canvas.style.width = '100%';
        canvas.style.height = H + 'px';
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);
        return { ctx, W, H };
    }

    // INR short formatter — < 1L raw, < 1Cr in L, else Cr
    function formatINR(v) {
        const n = Number(v) || 0;
        if (Math.abs(n) < 1e5)  return '₹' + Math.round(n);
        if (Math.abs(n) < 1e7)  return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
        return '₹' + (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    }

    function tierColor(tier) {
        switch (tier) {
            case 'high':       return cssVar('--color-success', '#16a34a');
            case 'medium':     return cssVar('--color-info',    '#2563eb');
            case 'borderline': return cssVar('--color-warning', '#f59e0b');
            default:           return cssVar('--color-danger',  '#ef4444');
        }
    }

    RP.renderMcBarChart = function (canvasId, data, opts) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || !Array.isArray(data.ages) || data.ages.length === 0) return;
        opts = opts || {};
        canvas.setAttribute('aria-label',
            'Bar chart: portfolio success probability at age milestones');

        const { ctx, W, H } = setupCanvas(canvas, 260);
        const isDark = !!opts.darkMode || document.body.classList.contains('dark-mode');
        const labelColor = isDark ? '#cbd5e1' : '#475569';
        const gridColor  = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.30)';

        const padding = { top: 18, right: 16, bottom: 32, left: 44 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;

        // Grid + Y labels (0/25/50/75/100)
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.fillStyle = labelColor;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(W - padding.right, y);
            ctx.stroke();
            ctx.fillText((100 - i * 25) + '%', padding.left - 6, y);
        }

        // Bars
        const n = data.ages.length;
        const slot = chartW / n;
        const barW = Math.min(slot * 0.7, 56);
        for (let i = 0; i < n; i++) {
            const pct = Math.max(0, Math.min(100, Number(data.successPct[i]) || 0));
            const tier = (data.riskTier && data.riskTier[i]) || 'low';
            const x = padding.left + slot * i + (slot - barW) / 2;
            const h = (pct / 100) * chartH;
            const y = padding.top + chartH - h;
            ctx.fillStyle = tierColor(tier);
            ctx.fillRect(x, y, barW, h);

            // % label centered on bar (white + shadow)
            ctx.save();
            ctx.font = 'bold 11px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 2;
            const labelY = h > 22 ? y + 12 : y - 8;
            if (h <= 22) { ctx.fillStyle = labelColor; ctx.shadowColor = 'transparent'; }
            ctx.fillText(Math.round(pct) + '%', x + barW / 2, labelY);
            ctx.restore();

            // Age X-label
            ctx.fillStyle = labelColor;
            ctx.font = '11px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(String(data.ages[i]), x + barW / 2, padding.top + chartH + 6);
        }
    };

    RP.renderMcLineChart = function (canvasId, data, opts) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || !Array.isArray(data.ages) || data.ages.length === 0) return;
        opts = opts || {};
        canvas.setAttribute('aria-label',
            'Line chart: median corpus over time with P10–P90 confidence band');

        const { ctx, W, H } = setupCanvas(canvas, 280);
        const isDark = !!opts.darkMode || document.body.classList.contains('dark-mode');
        const labelColor = isDark ? '#cbd5e1' : '#475569';
        const gridColor  = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.30)';
        const lineColor  = cssVar('--color-info', '#2563eb');

        const padding = { top: 18, right: 16, bottom: 32, left: 64 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;

        const ages = data.ages;
        const p10 = data.p10 || [], p50 = data.p50 || [], p90 = data.p90 || [];
        const maxV = Math.max(1, ...p90, ...p50, ...p10);
        const minAge = ages[0], maxAge = ages[ages.length - 1];
        const span = (maxAge - minAge) || 1;
        const xAt = (a) => padding.left + ((a - minAge) / span) * chartW;
        const yAt = (v) => padding.top + (1 - (Number(v) || 0) / maxV) * chartH;

        // Grid + Y labels
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.fillStyle = labelColor;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(W - padding.right, y);
            ctx.stroke();
            ctx.fillText(formatINR(maxV - (maxV / 4) * i), padding.left - 6, y);
        }

        // Confidence band: P10..P90 polygon (alpha 0.2)
        if (p10.length === ages.length && p90.length === ages.length) {
            ctx.beginPath();
            ages.forEach((a, i) => {
                const x = xAt(a), y = yAt(p90[i]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            for (let i = ages.length - 1; i >= 0; i--) {
                ctx.lineTo(xAt(ages[i]), yAt(p10[i]));
            }
            ctx.closePath();
            ctx.fillStyle = lineColor;
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // P50 line
        if (p50.length === ages.length) {
            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2.25;
            ages.forEach((a, i) => {
                const x = xAt(a), y = yAt(p50[i]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }

        // X-axis age ticks
        ctx.fillStyle = labelColor;
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const step = Math.max(1, Math.floor(ages.length / 8));
        for (let i = 0; i < ages.length; i += step) {
            ctx.fillText(String(ages[i]), xAt(ages[i]), padding.top + chartH + 6);
        }
        ctx.fillText(String(maxAge), xAt(maxAge), padding.top + chartH + 6);
    };
})();
