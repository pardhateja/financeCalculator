/**
 * Retire Today (Phase 3)
 *
 * Inverse question to the main projection: if you retired RIGHT NOW with
 * today's corpus, how much can you withdraw monthly + how long does it last?
 *
 * Three withdrawal strategies (how much / month):
 *   1. Monte Carlo 85% Safe — largest withdrawal where 85% of MC paths
 *      still leave money at end of horizon.
 *   2. 4% Rule — 4% of corpus / 12 (Bengen).
 *   3. Annuity-style — closed-form: max equal monthly withdrawal that
 *      drains corpus by end of horizon at the deterministic return.
 *
 * Three survival metrics (how many months / how many years your corpus
 * lasts at the user's CURRENT monthly expense):
 *   1. Deterministic — expense compounded at inflation, corpus at return.
 *   2. MC median — middle of randomized return paths.
 *   3. MC worst-10% — conservative (10th percentile bad outcome).
 *
 * Inputs prefill from elsewhere in the app + are editable inline.
 */

(function () {
  'use strict';

  // Default volatility assumption (annualized stdev of returns) for MC.
  // Roughly mid-cap-heavy India equity portfolio behavior. Could be made
  // editable later.
  var SIGMA_ANNUAL = 0.16;
  var MC_SIMS = 5000;
  var MC_SAFE_PERCENTILE = 0.15;   // 85% safe = 15th percentile of withdrawal
  var MC_WORST_PERCENTILE = 0.10;  // 10th percentile of survival months
  var SAFE_MIN = 1000;             // bisection lower bound
  var SAFE_MAX_MULTIPLIER = 5;     // upper bound = 5x the 4% rule withdrawal

  // ---- Helpers ----

  function gaussRand() {
    // Box–Muller
    var u1 = Math.random() || 1e-9, u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /* Simulate ONE retirement path with a given monthly withdrawal.
   * Returns { endingCorpus, monthsLasted, drained }.
   * - withdrawal grows with inflation each year.
   * - corpus earns return — randomized if sigma > 0, deterministic if sigma = 0.
   * - run for `years` years OR until corpus < 0. */
  function simulatePath(corpus0, monthlyWithdraw0, annualReturn, sigma, annualInflation, years) {
    var bal = corpus0;
    var monthlyWithdraw = monthlyWithdraw0;
    var monthsLasted = 0;
    var totalMonths = years * 12;
    for (var y = 0; y < years; y++) {
      var r;
      if (sigma > 0) {
        // Annual return drawn from normal(annualReturn, sigma).
        r = annualReturn + sigma * gaussRand();
      } else {
        r = annualReturn;
      }
      var rMonthly = Math.pow(1 + r, 1 / 12) - 1;
      for (var m = 0; m < 12; m++) {
        bal -= monthlyWithdraw;
        if (bal < 0) {
          return { endingCorpus: 0, monthsLasted: monthsLasted, drained: true };
        }
        bal *= (1 + rMonthly);
        monthsLasted++;
      }
      monthlyWithdraw *= (1 + annualInflation); // annual inflation step
    }
    return { endingCorpus: bal, monthsLasted: monthsLasted, drained: false };
  }

  /* Run N MC paths, return sorted array of { endingCorpus, monthsLasted }. */
  function runMC(corpus, monthly, ret, sigma, infl, years) {
    var out = [];
    for (var i = 0; i < MC_SIMS; i++) {
      out.push(simulatePath(corpus, monthly, ret, sigma, infl, years));
    }
    return out;
  }

  function percentileBy(arr, key, p) {
    var sorted = arr.slice().sort(function (a, b) { return a[key] - b[key]; });
    var idx = Math.floor(p * sorted.length);
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))][key];
  }

  /* Closed-form: max equal monthly withdrawal that drains corpus over N
   * months at monthly rate r (PMT formula). */
  function annuityWithdrawal(corpus, annualReturn, years, annualInflation) {
    // Use inflation-adjusted rate for level real-rupee withdrawals: but the
    // rest of the app uses nominal. Simpler: nominal withdrawal that drains
    // corpus over years; user can mentally inflate.
    var n = years * 12;
    var r = Math.pow(1 + annualReturn, 1 / 12) - 1;
    if (r <= 0) return corpus / n;
    return corpus * r / (1 - Math.pow(1 + r, -n));
  }

  /* Bisection: find largest monthlyWithdraw where percentile of
   * (monthsLasted >= years*12) >= safeFrac. Returns the safe withdrawal. */
  function findSafeWithdrawal(corpus, ret, sigma, infl, years) {
    var fourPct = corpus * 0.04 / 12;
    var lo = SAFE_MIN, hi = fourPct * SAFE_MAX_MULTIPLIER;
    var totalMonths = years * 12;
    function fractionSurviving(monthly) {
      var paths = runMC(corpus, monthly, ret, sigma, infl, years);
      var n = paths.filter(function (p) { return p.monthsLasted >= totalMonths; }).length;
      return n / paths.length;
    }
    // Confirm hi truly fails; if it doesn't, double it a few times.
    var bumps = 0;
    while (fractionSurviving(hi) >= 0.85 && bumps < 4) { hi *= 2; bumps++; }
    // Confirm lo passes; if not, can't find anything safe.
    if (fractionSurviving(lo) < 0.85) return 0;
    // Binary search to within ₹100/mo precision.
    while (hi - lo > 100) {
      var mid = (lo + hi) / 2;
      if (fractionSurviving(mid) >= 0.85) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  // ---- Defaults from elsewhere in the app ----

  function readDefaults() {
    var corpus = 0;
    var csEl = document.getElementById('currentSavings');
    if (csEl && csEl.value) corpus = parseFloat(csEl.value) || 0;
    var monthlyExp = (typeof RP.val === 'function') ? (RP.val('postRetireMonthly') || 0) : 0;
    var ret = (typeof RP._postReturn === 'number' && RP._postReturn > 0) ? RP._postReturn : 0.08;
    var infl = (typeof RP.val === 'function') ? ((RP.val('inflationRate') || 6) / 100) : 0.06;
    var curAge = (typeof RP.val === 'function') ? (RP.val('currentAge') || 28) : 28;
    var lifeExp = (typeof RP.val === 'function') ? (RP.val('lifeExpectancy') || 85) : 85;
    var horizon = Math.max(1, lifeExp - curAge);
    return {
      corpus: corpus,
      monthlyExp: monthlyExp,
      ret: ret,
      infl: infl,
      horizon: horizon
    };
  }

  function fmtINR(n) {
    if (typeof RP.formatCurrencyShort === 'function') return RP.formatCurrencyShort(n);
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function fmtMonths(m) {
    if (!isFinite(m) || m <= 0) return '— mo';
    return Math.round(m) + ' mo';
  }

  function fmtYears(m) {
    if (!isFinite(m) || m <= 0) return '— yrs';
    var y = m / 12;
    if (y >= 100) return '100+ years';
    return y.toFixed(1) + ' years';
  }

  // ---- Wiring ----

  RP.computeRetireToday = function () {
    var d = readDefaults();

    // Read current input values (or fallback to defaults if blank).
    var corpus = parseFloat(document.getElementById('rtCorpusToday').value) || d.corpus;
    var monthlyExp = parseFloat(document.getElementById('rtMonthlyExpense').value) || d.monthlyExp;
    var retInput = parseFloat(document.getElementById('rtAnnualReturn').value);
    var ret = (isFinite(retInput) && retInput > 0) ? (retInput / 100) : d.ret;
    var inflInput = parseFloat(document.getElementById('rtInflation').value);
    var infl = (isFinite(inflInput) && inflInput >= 0) ? (inflInput / 100) : d.infl;
    var horizonInput = parseFloat(document.getElementById('rtHorizon').value);
    var horizon = (isFinite(horizonInput) && horizonInput > 0) ? horizonInput : d.horizon;

    if (!corpus || corpus <= 0) {
      // Render dashes
      document.getElementById('rtStratMC').textContent = '₹—';
      document.getElementById('rtStrat4pct').textContent = '₹—';
      document.getElementById('rtStratBlended').textContent = '₹—';
      document.getElementById('rtSurvDet').textContent = '— mo';
      document.getElementById('rtSurvMCMed').textContent = '— mo';
      document.getElementById('rtSurvMCWorst').textContent = '— mo';
      return;
    }

    // --- WITHDRAWAL STRATEGIES ---

    // 4% rule
    var fourPctMonthly = corpus * 0.04 / 12;
    document.getElementById('rtStrat4pct').textContent = fmtINR(fourPctMonthly);

    // Annuity-style
    var annuityMonthly = annuityWithdrawal(corpus, ret, horizon, infl);
    document.getElementById('rtStratBlended').textContent = fmtINR(annuityMonthly);
    document.getElementById('rtStratBlendedRate').textContent = (ret * 100).toFixed(2) + '%';
    document.getElementById('rtStratBlendedYears').textContent = horizon;

    // MC 85% safe
    var safeMonthly = findSafeWithdrawal(corpus, ret, SIGMA_ANNUAL, infl, horizon);
    document.getElementById('rtStratMC').textContent = safeMonthly > 0 ? fmtINR(safeMonthly) : '₹—';
    document.getElementById('rtStratMCYears').textContent = horizon;

    // --- SURVIVAL METRICS (at user's monthly expense) ---
    if (monthlyExp > 0) {
      // Deterministic
      var detPath = simulatePath(corpus, monthlyExp, ret, 0, infl, horizon);
      document.getElementById('rtSurvDet').textContent = fmtMonths(detPath.monthsLasted);
      document.getElementById('rtSurvDetYears').textContent = fmtYears(detPath.monthsLasted);

      // MC median + worst-10
      var paths = runMC(corpus, monthlyExp, ret, SIGMA_ANNUAL, infl, horizon);
      var medianMonths = percentileBy(paths, 'monthsLasted', 0.5);
      var worstMonths = percentileBy(paths, 'monthsLasted', MC_WORST_PERCENTILE);
      document.getElementById('rtSurvMCMed').textContent = fmtMonths(medianMonths);
      document.getElementById('rtSurvMCMedYears').textContent = fmtYears(medianMonths);
      document.getElementById('rtSurvMCWorst').textContent = fmtMonths(worstMonths);
      document.getElementById('rtSurvMCWorstYears').textContent = fmtYears(worstMonths);
    } else {
      document.getElementById('rtSurvDet').textContent = '— mo';
      document.getElementById('rtSurvMCMed').textContent = '— mo';
      document.getElementById('rtSurvMCWorst').textContent = '— mo';
    }
  };

  // Prefill inputs from defaults (only when blank), then compute.
  RP._prefillRetireToday = function () {
    var d = readDefaults();
    var ids = [
      ['rtCorpusToday',     d.corpus],
      ['rtMonthlyExpense',  d.monthlyExp],
      ['rtAnnualReturn',    +(d.ret * 100).toFixed(2)],
      ['rtInflation',       +(d.infl * 100).toFixed(2)],
      ['rtHorizon',         d.horizon]
    ];
    ids.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el && (el.value === '' || el.value === '0' || el.value == null)) {
        el.value = pair[1];
      }
    });
  };

  // Recompute when any RT input changes (debounced).
  var rtTimer = null;
  function debouncedCompute() {
    if (rtTimer) clearTimeout(rtTimer);
    rtTimer = setTimeout(function () {
      try { RP.computeRetireToday(); } catch (e) { console.warn('retire-today compute failed:', e); }
    }, 200);
  }

  function wireRetireToday() {
    ['rtCorpusToday','rtMonthlyExpense','rtAnnualReturn','rtInflation','rtHorizon']
      .forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el._rtWired) return;
        el.addEventListener('input', debouncedCompute);
        el._rtWired = true;
      });
  }

  // Boot: prefill + wire after DOM ready and after main calc has populated state.
  function bootRetireToday() {
    // Wait for projection to populate currentSavings + RP._postReturn etc.
    setTimeout(function () {
      RP._prefillRetireToday();
      wireRetireToday();
      try { RP.computeRetireToday(); } catch (e) { console.warn('retire-today initial compute failed:', e); }
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootRetireToday);
  } else {
    bootRetireToday();
  }

  // Re-prefill + recompute when the user clicks into the Retire Today tab,
  // so a stale projection elsewhere gets refreshed. switchTab dispatches a
  // 'tab-switched' custom event in some setups; fall back to listening on
  // the nav-group buttons.
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-group="retire-today"]');
    if (btn) setTimeout(function () {
      RP._prefillRetireToday();
      try { RP.computeRetireToday(); } catch (_) {}
    }, 50);
  });
})();
