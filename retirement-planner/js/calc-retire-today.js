/**
 * Retire Today (Phase 3)
 *
 * Inverse question to the main projection: what does retirement look
 * like with a given corpus, monthly expense, return, inflation, horizon?
 *
 * Two sub-tabs share this engine, parameterized by `variant`:
 *   - 'live' (Today / live corpus)         — corpus prefill = currentSavings
 *   - 'mg'   (Multi-Goal corpus variant)   — corpus prefill = projected
 *                                            corpus at retirement age,
 *                                            from RP._multigoal._readCorpusAtRetirement().
 *
 * Each variant has its own DOM ids (rtCorpusToday vs rtMgCorpusToday etc.)
 * so both sub-tabs can render their own values independently.
 *
 * Three withdrawal strategies (how much / month):
 *   1. Monte Carlo 85% Safe — largest withdrawal where 85% of MC paths
 *      still leave money at end of horizon.
 *   2. 4% Rule — 4% of corpus / 12 (Bengen).
 *   3. Annuity-style — closed-form: max equal monthly withdrawal that
 *      drains corpus by end of horizon at the deterministic return.
 *
 * Three survival metrics (how long money lasts at user's monthly expense):
 *   Deterministic, MC median, MC worst-10%.
 */

(function () {
  'use strict';

  var SIGMA_ANNUAL = 0.16;     // typical India equity-tilted volatility
  var MC_SIMS = 5000;
  var MC_WORST_PERCENTILE = 0.10;

  // Pardha 2026-05-04: dual-horizon view. Every metric is computed twice
  // and shown stacked: "Good (to 80)" + "Best (to 100)". Live horizons =
  // targetAge - currentAge (so horizons shrink as user ages).
  var TARGET_AGES = { good: 80, best: 100 };

  // ---- Variants (one per sub-tab) ----
  var VARIANTS = {
    live: {
      ids: {
        corpus: 'rtCorpusToday', monthlyExp: 'rtMonthlyExpense',
        ret: 'rtAnnualReturn', infl: 'rtInflation',
        // Dual-horizon: each metric has Good (to 80) + Best (to 100) ids.
        stratMCGood: 'rtStratMCGood', stratMCBest: 'rtStratMCBest',
        stratMCYearsGood: 'rtStratMCYearsGood', stratMCYearsBest: 'rtStratMCYearsBest',
        strat4pctGood: 'rtStrat4pctGood', strat4pctBest: 'rtStrat4pctBest',
        stratBlendedGood: 'rtStratBlendedGood', stratBlendedBest: 'rtStratBlendedBest',
        stratBlendedYearsGood: 'rtStratBlendedYearsGood', stratBlendedYearsBest: 'rtStratBlendedYearsBest',
        survDetGood: 'rtSurvDetGood', survDetBest: 'rtSurvDetBest',
        survDetYearsGood: 'rtSurvDetYearsGood', survDetYearsBest: 'rtSurvDetYearsBest',
        survMCMedGood: 'rtSurvMCMedGood', survMCMedBest: 'rtSurvMCMedBest',
        survMCMedYearsGood: 'rtSurvMCMedYearsGood', survMCMedYearsBest: 'rtSurvMCMedYearsBest',
        survMCWorstGood: 'rtSurvMCWorstGood', survMCWorstBest: 'rtSurvMCWorstBest',
        survMCWorstYearsGood: 'rtSurvMCWorstYearsGood', survMCWorstYearsBest: 'rtSurvMCWorstYearsBest'
      },
      readSourceCorpus: function () {
        var csEl = document.getElementById('currentSavings');
        if (csEl && csEl.value) return parseFloat(csEl.value) || 0;
        return 0;
      },
    },
    mg: {
      ids: {
        corpus: 'rtMgCorpusToday', monthlyExp: 'rtMgMonthlyExpense',
        ret: 'rtMgAnnualReturn', infl: 'rtMgInflation',
        stratMCGood: 'rtMgStratMCGood', stratMCBest: 'rtMgStratMCBest',
        stratMCYearsGood: 'rtMgStratMCYearsGood', stratMCYearsBest: 'rtMgStratMCYearsBest',
        strat4pctGood: 'rtMgStrat4pctGood', strat4pctBest: 'rtMgStrat4pctBest',
        stratBlendedGood: 'rtMgStratBlendedGood', stratBlendedBest: 'rtMgStratBlendedBest',
        stratBlendedYearsGood: 'rtMgStratBlendedYearsGood', stratBlendedYearsBest: 'rtMgStratBlendedYearsBest',
        survDetGood: 'rtMgSurvDetGood', survDetBest: 'rtMgSurvDetBest',
        survDetYearsGood: 'rtMgSurvDetYearsGood', survDetYearsBest: 'rtMgSurvDetYearsBest',
        survMCMedGood: 'rtMgSurvMCMedGood', survMCMedBest: 'rtMgSurvMCMedBest',
        survMCMedYearsGood: 'rtMgSurvMCMedYearsGood', survMCMedYearsBest: 'rtMgSurvMCMedYearsBest',
        survMCWorstGood: 'rtMgSurvMCWorstGood', survMCWorstBest: 'rtMgSurvMCWorstBest',
        survMCWorstYearsGood: 'rtMgSurvMCWorstYearsGood', survMCWorstYearsBest: 'rtMgSurvMCWorstYearsBest'
      },
      // Pardha decision 2026-05-04: MG sub-tab answers "if I retired NOW
      // with today's REAL corpus split across my Multi-Goal phases, what's
      // covered?" So source = currentSavings (today), NOT projected corpus.
      readSourceCorpus: function () {
        var csEl = document.getElementById('currentSavings');
        if (csEl && csEl.value) return parseFloat(csEl.value) || 0;
        return 0;
      }
    }
  };

  // ---- Math helpers ----

  function gaussRand() {
    var u1 = Math.random() || 1e-9, u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  function simulatePath(corpus0, monthly0, annualRet, sigma, infl, years) {
    var bal = corpus0;
    var monthly = monthly0;
    var monthsLasted = 0;
    for (var y = 0; y < years; y++) {
      var r = sigma > 0 ? annualRet + sigma * gaussRand() : annualRet;
      var rM = Math.pow(1 + r, 1 / 12) - 1;
      for (var m = 0; m < 12; m++) {
        bal -= monthly;
        if (bal < 0) return { endingCorpus: 0, monthsLasted: monthsLasted, drained: true };
        bal *= (1 + rM);
        monthsLasted++;
      }
      monthly *= (1 + infl);
    }
    return { endingCorpus: bal, monthsLasted: monthsLasted, drained: false };
  }

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

  function annuityWithdrawal(corpus, annualRet, years) {
    var n = years * 12;
    var r = Math.pow(1 + annualRet, 1 / 12) - 1;
    if (r <= 0) return corpus / n;
    return corpus * r / (1 - Math.pow(1 + r, -n));
  }

  function findSafeWithdrawal(corpus, ret, sigma, infl, years) {
    var fourPct = corpus * 0.04 / 12;
    var lo = 1000, hi = fourPct * 5;
    var totalMonths = years * 12;
    function fractionSurviving(monthly) {
      var paths = runMC(corpus, monthly, ret, sigma, infl, years);
      var n = paths.filter(function (p) { return p.monthsLasted >= totalMonths; }).length;
      return n / paths.length;
    }
    var bumps = 0;
    while (fractionSurviving(hi) >= 0.85 && bumps < 4) { hi *= 2; bumps++; }
    if (fractionSurviving(lo) < 0.85) return 0;
    while (hi - lo > 100) {
      var mid = (lo + hi) / 2;
      if (fractionSurviving(mid) >= 0.85) lo = mid;
      else hi = mid;
    }
    return lo;
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

  // ---- Generic compute / prefill ----

  function readDefaults(variant) {
    var v = VARIANTS[variant];
    var corpus = v.readSourceCorpus();
    var monthlyExp = (typeof RP.val === 'function') ? (RP.val('postRetireMonthly') || 0) : 0;
    var ret = (typeof RP._postReturn === 'number' && RP._postReturn > 0) ? RP._postReturn : 0.08;
    var infl = (typeof RP.val === 'function') ? ((RP.val('inflationRate') || 6) / 100) : 0.06;
    return { corpus: corpus, monthlyExp: monthlyExp, ret: ret, infl: infl };
  }

  /* Compute all 6 metrics for ONE horizon. Returns plain object with the
   * computed values (formatted strings). */
  function computeForHorizon(corpus, monthlyExp, ret, infl, horizon) {
    var out = {};
    out.fourPct = fmtINR(corpus * 0.04 / 12);
    out.annuity = fmtINR(annuityWithdrawal(corpus, ret, horizon));
    var safeMC = findSafeWithdrawal(corpus, ret, SIGMA_ANNUAL, infl, horizon);
    out.mc = safeMC > 0 ? fmtINR(safeMC) : '₹—';
    if (monthlyExp > 0) {
      var det = simulatePath(corpus, monthlyExp, ret, 0, infl, horizon);
      out.detMo = fmtMonths(det.monthsLasted);
      out.detYr = fmtYears(det.monthsLasted);
      var paths = runMC(corpus, monthlyExp, ret, SIGMA_ANNUAL, infl, horizon);
      var med = percentileBy(paths, 'monthsLasted', 0.5);
      var worst = percentileBy(paths, 'monthsLasted', MC_WORST_PERCENTILE);
      out.medMo = fmtMonths(med);   out.medYr = fmtYears(med);
      out.worstMo = fmtMonths(worst); out.worstYr = fmtYears(worst);
    } else {
      out.detMo = out.medMo = out.worstMo = '— mo';
      out.detYr = out.medYr = out.worstYr = '— yrs';
    }
    return out;
  }

  function compute(variant) {
    var ids = VARIANTS[variant].ids;
    var d = readDefaults(variant);
    var corpus = parseFloat(document.getElementById(ids.corpus).value) || d.corpus;
    var monthlyExp = parseFloat(document.getElementById(ids.monthlyExp).value) || d.monthlyExp;
    var retInput = parseFloat(document.getElementById(ids.ret).value);
    var ret = (isFinite(retInput) && retInput > 0) ? (retInput / 100) : d.ret;
    var inflInput = parseFloat(document.getElementById(ids.infl).value);
    var infl = (isFinite(inflInput) && inflInput >= 0) ? (inflInput / 100) : d.infl;

    function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
    function setBoth(idGood, idBest, valGood, valBest) { setText(idGood, valGood); setText(idBest, valBest); }

    if (!corpus || corpus <= 0) {
      ['mc','4pct','blended'].forEach(function (k) {
        setBoth(ids['strat' + k.charAt(0).toUpperCase() + k.slice(1) + 'Good'],
                ids['strat' + k.charAt(0).toUpperCase() + k.slice(1) + 'Best'], '₹—', '₹—');
      });
      ['Det','MCMed','MCWorst'].forEach(function (k) {
        setBoth(ids['surv' + k + 'Good'], ids['surv' + k + 'Best'], '— mo', '— mo');
      });
      return;
    }

    // Compute horizons live from currentAge, so they shrink as user ages.
    var curAge = (typeof RP.val === 'function') ? (RP.val('currentAge') || 28) : 28;
    var horizonGood = Math.max(1, TARGET_AGES.good - curAge);
    var horizonBest = Math.max(1, TARGET_AGES.best - curAge);

    var good = computeForHorizon(corpus, monthlyExp, ret, infl, horizonGood);
    var best = computeForHorizon(corpus, monthlyExp, ret, infl, horizonBest);

    // Strategies
    setBoth(ids.stratMCGood, ids.stratMCBest, good.mc, best.mc);
    setBoth(ids.stratMCYearsGood, ids.stratMCYearsBest, horizonGood + ' yr', horizonBest + ' yr');
    setBoth(ids.strat4pctGood, ids.strat4pctBest, good.fourPct, best.fourPct);
    setBoth(ids.stratBlendedGood, ids.stratBlendedBest, good.annuity, best.annuity);
    setBoth(ids.stratBlendedYearsGood, ids.stratBlendedYearsBest, horizonGood + ' yr @ ' + (ret*100).toFixed(2)+'%', horizonBest + ' yr @ ' + (ret*100).toFixed(2)+'%');

    // Survival
    setBoth(ids.survDetGood, ids.survDetBest, good.detMo, best.detMo);
    setBoth(ids.survDetYearsGood, ids.survDetYearsBest, good.detYr, best.detYr);
    setBoth(ids.survMCMedGood, ids.survMCMedBest, good.medMo, best.medMo);
    setBoth(ids.survMCMedYearsGood, ids.survMCMedYearsBest, good.medYr, best.medYr);
    setBoth(ids.survMCWorstGood, ids.survMCWorstBest, good.worstMo, best.worstMo);
    setBoth(ids.survMCWorstYearsGood, ids.survMCWorstYearsBest, good.worstYr, best.worstYr);

    // Multi-Goal variant: also render per-phase coverage table.
    if (variant === 'mg') renderPhaseCoverage(corpus);
  }

  /* Render the per-phase coverage table for the Multi-Goal sub-tab.
   * Shows: each phase's name, how much of today's corpus is allocated
   * to it, the present-value (PV) of what it actually needs, and the
   * coverage % (allocated / PV). */
  function renderPhaseCoverage(corpus) {
    var container = document.getElementById('rtMgPhaseCoverage');
    if (!container) return;
    if (!RP._multigoal || !Array.isArray(RP._multigoal.phases) || RP._multigoal.phases.length === 0) {
      container.innerHTML = '<p class="sub-text" style="text-align:center;padding:16px;">No Multi-Goal phases defined. Add some on the Multi-Goal tab.</p>';
      return;
    }
    try {
      var phases = RP._multigoal.phases;
      var curAge = RP.val('currentAge');
      var postReturn = RP._postReturn || 0.08;

      // Pardha 2026-05-04: "Retire Today" means user stops working NOW.
      // So pass curAge as the effective retirement age — phases are
      // evaluated from age curAge onward, including those whose startAge
      // is BEFORE the originally-planned retirement age (e.g. Pardha's
      // "Base" starts at 27, "Kid 1 at home" at 28, both BEFORE retAge=35).
      // Previously this used retAge which clipped phases to 35+, hiding
      // the gap-years coverage that already exists in the plan.
      var phasesForToday = phases.slice();
      var corpusPhases = RP._multigoal._phasesForCorpus(phasesForToday, curAge);
      var alloc = RP._multigoal.calculateAllocation(corpusPhases, corpus, curAge, curAge, postReturn);
      var totalPV = alloc.totalPV || 0;
      var deficit = Math.max(0, totalPV - corpus);
      var coveragePct = totalPV > 0 ? Math.min(100, (corpus / totalPV) * 100) : 100;

      // Build name + color lookup from the source phases array (allocation
      // result only has phaseId, not color or original phase fields).
      // Use phasesForToday so the synthetic Bridge phase is included.
      var phaseLookup = {};
      phasesForToday.forEach(function (ph) { phaseLookup[ph.id] = ph; });

      var rows = (alloc.phases || []).map(function (p) {
        var pv = p.pvRequired || 0;
        var allocated = p.allocated || 0;
        var pct = pv > 0 ? Math.min(100, (allocated / pv) * 100) : 100;
        var pctClass = pct >= 100 ? 'mg-cov-full' : (pct >= 50 ? 'mg-cov-partial' : 'mg-cov-low');
        var src = phaseLookup[p.phaseId] || {};
        return '<tr>' +
          '<td><span class="mg-phase-dot" style="background:' + (src.color || '#888') + '"></span>' + (p.phaseName || '—') + '</td>' +
          '<td>' + (p.ageRange || '—') + '</td>' +
          '<td>' + fmtINR(pv) + '</td>' +
          '<td>' + fmtINR(allocated) + '</td>' +
          '<td><div class="mg-cov-bar"><div class="mg-cov-fill ' + pctClass + '" style="width:' + pct.toFixed(1) + '%"></div></div><div class="mg-cov-pct">' + pct.toFixed(0) + '%</div></td>' +
          '</tr>';
      }).join('');

      container.innerHTML =
        '<div class="mg-cov-summary">' +
          '<div class="mg-cov-summary-card"><div class="mg-cov-label">Today\'s corpus</div><div class="mg-cov-value">' + fmtINR(corpus) + '</div></div>' +
          '<div class="mg-cov-summary-card"><div class="mg-cov-label">Total needed (PV)</div><div class="mg-cov-value">' + fmtINR(totalPV) + '</div></div>' +
          '<div class="mg-cov-summary-card ' + (deficit > 0 ? 'mg-cov-card-deficit' : 'mg-cov-card-surplus') + '">' +
            '<div class="mg-cov-label">' + (deficit > 0 ? 'Deficit' : 'Surplus') + '</div>' +
            '<div class="mg-cov-value">' + fmtINR(Math.abs(deficit > 0 ? deficit : (corpus - totalPV))) + '</div>' +
          '</div>' +
          '<div class="mg-cov-summary-card"><div class="mg-cov-label">Coverage</div><div class="mg-cov-value">' + coveragePct.toFixed(0) + '%</div></div>' +
        '</div>' +
        '<table class="mg-cov-table">' +
          '<thead><tr><th>Phase</th><th>Ages</th><th>Needed (PV)</th><th>Allocated</th><th>Coverage</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>';
    } catch (e) {
      console.warn('renderPhaseCoverage failed:', e);
      container.innerHTML = '<p class="sub-text" style="color:var(--danger-color);padding:16px;">Could not compute phase coverage. Error in console.</p>';
    }
  }

  function prefill(variant) {
    var v = VARIANTS[variant];
    var d = readDefaults(variant);
    var pairs = [
      [v.ids.corpus, d.corpus],
      [v.ids.monthlyExp, d.monthlyExp],
      [v.ids.ret, +(d.ret * 100).toFixed(2)],
      [v.ids.infl, +(d.infl * 100).toFixed(2)]
    ];
    pairs.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el && (el.value === '' || el.value === '0' || el.value == null)) el.value = pair[1];
    });
  }

  // Public legacy API
  RP.computeRetireToday = function () { compute('live'); };
  RP._prefillRetireToday = function () { prefill('live'); };
  RP.computeRetireTodayMG = function () { compute('mg'); };
  RP._prefillRetireTodayMG = function () { prefill('mg'); };

  // ---- Wiring ----

  var rtTimer = null;
  function debouncedCompute(variant) {
    if (rtTimer) clearTimeout(rtTimer);
    rtTimer = setTimeout(function () {
      try { compute(variant); } catch (e) { console.warn('RT compute failed:', e); }
    }, 200);
  }

  function wireVariant(variant) {
    var ids = VARIANTS[variant].ids;
    [ids.corpus, ids.monthlyExp, ids.ret, ids.infl].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el._rtWired) return;
      el.addEventListener('input', function () { debouncedCompute(variant); });
      el._rtWired = true;
    });
  }

  function bootRetireToday() {
    setTimeout(function () {
      ['live', 'mg'].forEach(function (variant) {
        try { prefill(variant); } catch (_) {}
        wireVariant(variant);
        try { compute(variant); } catch (e) { console.warn('RT initial compute failed:', e); }
      });
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootRetireToday);
  } else {
    bootRetireToday();
  }

  // Recompute current variant when user clicks the sub-tab (so prefill
  // picks up any fresh values from elsewhere in the app).
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.nav-subtab');
    if (!btn) return;
    var t = btn.dataset && btn.dataset.tab;
    if (t === 'retire-today') setTimeout(function () { prefill('live'); compute('live'); }, 50);
    else if (t === 'retire-today-mg') setTimeout(function () { prefill('mg'); compute('mg'); }, 50);
  });
})();
