/**
 * Tracker contributions display + currentSavings sync (Pardha v2026-05-03)
 *
 * BEFORE: this module owned `currentSavings` — computed it as
 *   seed + sum(trackerEntries) + compound-interest-on-trackerEntries.
 * That created a parallel compounding chain that didn't match Projections.
 *
 * AFTER (anchored projection model): Projection engine owns `currentSavings`.
 * It computes today's running balance directly from the seed + actual
 * Tracker SIPs through monthly compounding inside the calendar-anchored
 * timeline, and writes the result into the #currentSavings field.
 *
 * This module now only:
 *   1. Computes the raw sum of completed Tracker contributions (display-only)
 *      and writes it into #trackerContributions.
 *   2. Triggers Projection recompute when seed changes, so the chain re-runs
 *      with the new anchor balance.
 */

(function () {
    'use strict';

    function sumTrackerContributions() {
        if (typeof RP._trackerEntries !== 'object' || !RP._trackerEntries) return 0;
        let sum = 0;
        Object.keys(RP._trackerEntries).forEach(function (key) {
            const e = RP._trackerEntries[key];
            if (!e || !e.completed) return;
            const amt = parseFloat(e.actual) || 0;
            if (amt > 0) sum += amt;
        });
        return Math.round(sum);
    }

    /* Refresh the Tracker contributions display + force a Projection recompute
     * (which writes the live currentSavings value). */
    RP._computeSavingsRollup = function () {
        const contribEl = document.getElementById('trackerContributions');
        const interestEl = document.getElementById('trackerInterest'); // hidden now
        const rollupEl = document.getElementById('trackerRollupAmount'); // hidden legacy

        const contributions = sumTrackerContributions();
        if (contribEl) contribEl.value = contributions;
        // Hidden fields kept for backwards compat with any non-migrated reader:
        if (interestEl) interestEl.value = 0;
        if (rollupEl) rollupEl.value = contributions;

        // Trigger Projection recompute. It owns currentSavings now and will
        // populate the field via its anchored-chain math.
        if (typeof RP.calculateAll === 'function') {
            try { RP.calculateAll(); } catch (e) { console.warn('calculateAll after rollup failed:', e); }
        }
        if (typeof RP.renderPhases === 'function') {
            try { RP.renderPhases(); } catch (e) { console.warn('renderPhases after rollup failed:', e); }
        }
    };

    function setupSavingsRollup() {
        const seedEl = document.getElementById('currentSavingsSeed');
        if (seedEl && !seedEl._rollupWired) {
            seedEl.addEventListener('input', RP._computeSavingsRollup);
            seedEl._rollupWired = true;
        }
        // Initial compute after Financial Plan + Tracker have populated state.
        setTimeout(function () {
            try { RP._computeSavingsRollup(); } catch (e) { console.warn('savings rollup failed:', e); }
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSavingsRollup);
    } else {
        setupSavingsRollup();
    }
})();
