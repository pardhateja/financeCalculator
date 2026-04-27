/**
 * Current Total Savings rollup (Pardha v1.1 §3.4)
 *
 * Total = Seed (manually-typed) + Tracker rollup (sum of completed entries +
 * monthly compound interest at post-tax blended return from Financial Plan).
 *
 * Critical invariant: the #currentSavings field MUST stay in the DOM and hold
 * the correct numeric total. Every downstream tab reads it via
 * RP.val('currentSavings') (calc-projections, calc-whatif, calc-multigoal,
 * calc-dashboard, calc-loan, calc-emergency, calc-financial-plan). Making the
 * field readonly + auto-computed leaves all those callers untouched.
 */

(function () {
    'use strict';

    /* Read post-tax annual rate. Falls back to defaults if Financial Plan
     * hasn't computed yet at first render. */
    function getPostTaxAnnualRate() {
        const preReturn = (typeof RP._preReturn === 'number' && isFinite(RP._preReturn) && RP._preReturn > 0)
            ? RP._preReturn
            : 0.10; // 10% default if not yet computed
        const taxRatePct = (typeof RP.val === 'function') ? RP.val('taxRate') : 30;
        const taxRate = (Number.isFinite(taxRatePct) ? taxRatePct : 30) / 100;
        return preReturn * (1 - taxRate);
    }

    /* Walk RP._trackerEntries (object keyed by "y{N}m{N}"), compound each
     * completed contribution from its date (or implicit y/m offset) to today. */
    function computeTrackerRollup() {
        if (typeof RP._trackerEntries !== 'object' || !RP._trackerEntries) return 0;
        const entries = RP._trackerEntries;
        const postTaxAnnual = getPostTaxAnnualRate();
        if (!Number.isFinite(postTaxAnnual) || postTaxAnnual < 0) return 0;
        const monthlyRate = Math.pow(1 + postTaxAnnual, 1 / 12) - 1;

        const today = new Date();
        let rollup = 0;

        Object.keys(entries).forEach(key => {
            const entry = entries[key];
            if (!entry || !entry.completed) return;
            const amount = parseFloat(entry.actual) || 0;
            if (amount <= 0) return;

            // Prefer explicit entry.date; fall back to deriving from the y{N}m{N} key.
            let entryDate;
            if (entry.date) {
                entryDate = new Date(entry.date);
            } else {
                // Key format "y0m3" → year offset 0, month offset 3 from when the user
                // started tracking. Without a known start date, treat as "now" (no interest).
                // Best-effort fallback only; modern entries always carry .date.
                entryDate = today;
            }
            if (isNaN(entryDate.getTime())) entryDate = today;

            const monthsElapsed = Math.max(0,
                (today.getFullYear() - entryDate.getFullYear()) * 12
                + (today.getMonth() - entryDate.getMonth())
            );
            rollup += amount * Math.pow(1 + monthlyRate, monthsElapsed);
        });

        return Math.round(rollup);
    }

    /* Main entry point — refreshes the readonly Tracker rollup + Total fields,
     * then fires a 'change' event on #currentSavings so all downstream readers
     * (Projections, What-If, Multi-Goal, Dashboard, etc.) recompute. */
    RP._computeSavingsRollup = function () {
        const seedEl = document.getElementById('currentSavingsSeed');
        const rollupEl = document.getElementById('trackerRollupAmount');
        const totalEl = document.getElementById('currentSavings');
        if (!seedEl || !rollupEl || !totalEl) return; // tab not in DOM yet

        const seed = parseFloat(seedEl.value) || 0;
        const trackerRollup = computeTrackerRollup();
        const total = seed + trackerRollup;

        rollupEl.value = trackerRollup;
        // Only fire change if the total actually changed (avoids infinite loop
        // if a downstream listener triggers another recompute).
        if (parseFloat(totalEl.value) !== total) {
            totalEl.value = total;
            totalEl.dispatchEvent(new Event('change', { bubbles: true }));
            totalEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    /* Wire the seed-input + tax-rate change listeners + initial compute. */
    function setupSavingsRollup() {
        const seedEl = document.getElementById('currentSavingsSeed');
        if (seedEl && !seedEl._rollupWired) {
            seedEl.addEventListener('input', RP._computeSavingsRollup);
            seedEl._rollupWired = true;
        }
        // Re-compute when the tax rate changes (affects monthly compounding rate)
        const taxEl = document.getElementById('taxRate');
        if (taxEl && !taxEl._rollupWired) {
            taxEl.addEventListener('input', RP._computeSavingsRollup);
            taxEl._rollupWired = true;
        }
        // Initial compute after Financial Plan + Tracker have populated their state
        // (small delay so calc-financial-plan's RP._preReturn is set first).
        setTimeout(() => {
            try { RP._computeSavingsRollup(); } catch (e) { console.warn('savings rollup failed:', e); }
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSavingsRollup);
    } else {
        setupSavingsRollup();
    }
})();
