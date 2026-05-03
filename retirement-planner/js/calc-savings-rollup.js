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

    /* Read the active annual return used to compound past Tracker contributions
     * forward to today. Aligned with the same rate Projections uses, so the
     * compounded value of a contribution doesn't change at the today/tomorrow
     * boundary (Pardha v2026-05-03: V1 was applying a redundant flat-30% tax
     * to a portfolio that's mostly equity, producing 8.84% here while
     * Projections grew the same money at 12.63% — internally inconsistent).
     * Falls back to a sane default if Financial Plan hasn't computed yet. */
    function getActiveAnnualRate() {
        if (typeof RP._preReturn === 'number' && isFinite(RP._preReturn) && RP._preReturn > 0) {
            return RP._preReturn;
        }
        return 0.10; // 10% default if not yet computed
    }

    /* Walk RP._trackerEntries (object keyed by "y{N}m{N}"), compound each
     * completed contribution from its date (or implicit y/m offset) to today.
     * v1.1 audit: returns { contributions, interest, total } so the UI can
     * surface the split. Previously returned a single rounded total, which
     * made it impossible to see "how much did I put in vs. how much grew." */
    function computeTrackerRollup() {
        if (typeof RP._trackerEntries !== 'object' || !RP._trackerEntries) {
            return { contributions: 0, interest: 0, total: 0 };
        }
        const entries = RP._trackerEntries;
        const annualRate = getActiveAnnualRate();
        if (!Number.isFinite(annualRate) || annualRate < 0) {
            return { contributions: 0, interest: 0, total: 0 };
        }
        const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

        const today = new Date();
        let contributions = 0;
        let totalWithInterest = 0;

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
            contributions += amount;
            totalWithInterest += amount * Math.pow(1 + monthlyRate, monthsElapsed);
        });

        const contribRounded = Math.round(contributions);
        const totalRounded = Math.round(totalWithInterest);
        return {
            contributions: contribRounded,
            interest: Math.max(0, totalRounded - contribRounded),
            total: totalRounded
        };
    }

    /* Main entry point — refreshes the readonly Tracker rollup + Total fields,
     * then fires a 'change' event on #currentSavings so all downstream readers
     * (Projections, What-If, Multi-Goal, Dashboard, etc.) recompute.
     * v1.1 audit: split rollup into Contributions + Interest fields for clarity. */
    RP._computeSavingsRollup = function () {
        const seedEl = document.getElementById('currentSavingsSeed');
        const rollupEl = document.getElementById('trackerRollupAmount');
        const contribEl = document.getElementById('trackerContributions');
        const interestEl = document.getElementById('trackerInterest');
        const totalEl = document.getElementById('currentSavings');
        if (!seedEl || !rollupEl || !totalEl) return; // tab not in DOM yet

        const seed = parseFloat(seedEl.value) || 0;
        const breakdown = computeTrackerRollup();
        const trackerRollup = breakdown.total;
        const total = seed + trackerRollup;

        rollupEl.value = trackerRollup;
        // v1.1: optional split fields. If markup hasn't been bundled yet
        // (older index.html), silently skip — the legacy rollupEl still works.
        if (contribEl) contribEl.value = breakdown.contributions;
        if (interestEl) interestEl.value = breakdown.interest;
        // Only fire change if the total actually changed (avoids infinite loop
        // if a downstream listener triggers another recompute).
        if (parseFloat(totalEl.value) !== total) {
            totalEl.value = total;
            totalEl.dispatchEvent(new Event('change', { bubbles: true }));
            totalEl.dispatchEvent(new Event('input', { bubbles: true }));
            // v1.1 audit (Pardha bug): #currentSavings is readonly + tabindex=-1,
            // so the auto-calc input listener in app.js was made to skip readonly
            // inputs (round-1 fix to prevent feedback loop). Result: Projections,
            // Dashboard, Net Worth, What-If all read the STALE old #currentSavings
            // value because no listener fires calculateAll after the late
            // rollup. Fire it directly. Re-entry is guarded by the value-changed
            // check above (calculateAll doesn't write to currentSavings → no loop).
            if (typeof RP.calculateAll === 'function') {
                try { RP.calculateAll(); } catch (e) { console.warn('calculateAll after rollup failed:', e); }
            }
            // v1.1 Gate-B: the multi-goal renderers don't listen for
            // currentSavings change events — they're triggered via renderPhases
            // cascade. Force-fire it so renderAllocation re-runs with the fresh
            // corpus, populating RP._lastAllocationData (which renderProjection
            // depends on). Without this, projection silently shows the
            // misleading "Run the Projections tab first" empty state.
            if (typeof RP.renderPhases === 'function') {
                try { RP.renderPhases(); } catch (e) { console.warn('renderPhases failed after savings rollup:', e); }
            }
        }
    };

    /* Wire the seed-input + tax-rate change listeners + initial compute. */
    function setupSavingsRollup() {
        const seedEl = document.getElementById('currentSavingsSeed');
        if (seedEl && !seedEl._rollupWired) {
            seedEl.addEventListener('input', RP._computeSavingsRollup);
            seedEl._rollupWired = true;
        }
        // Pardha v2026-05-03: dropped taxRate listener — Tracker rollup now
        // uses the same gross blended return as Projections (no separate tax
        // multiplier), so changes to the global taxRate field don't affect
        // it anymore. The Financial Plan inputs (returns/shares) still
        // trigger recompute via calc-financial-plan's calculateAll cascade.
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
