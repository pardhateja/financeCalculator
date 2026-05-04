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

  // ---- Variants (one per sub-tab) ----
  var VARIANTS = {
    live: {
      ids: {
        corpus: 'rtCorpusToday', monthlyExp: 'rtMonthlyExpense',
        ret: 'rtAnnualReturn', infl: 'rtInflation', horizon: 'rtHorizon',
        stratMC: 'rtStratMC', stratMCYears: 'rtStratMCYears',
        strat4pct: 'rtStrat4pct',
        stratBlended: 'rtStratBlended',
        stratBlendedRate: 'rtStratBlendedRate',
        stratBlendedYears: 'rtStratBlendedYears',
        survDet: 'rtSurvDet', survDetYears: 'rtSurvDetYears',
        survMCMed: 'rtSurvMCMed', survMCMedYears: 'rtSurvMCMedYears',
        survMCWorst: 'rtSurvMCWorst', survMCWorstYears: 'rtSurvMCWorstYears'
      },
      readSourceCorpus: function () {
        var csEl = document.getElementById('currentSavings');
        if (csEl && csEl.value) return parseFloat(csEl.value) || 0;
        return 0;
      },
      // Horizon = lifeExp - currentAge (you retire today, so retirement
      // window = remaining years of life).
      defaultHorizon: function (curAge, lifeExp) { return Math.max(1, lifeExp - curAge); }
    },
    mg: {
      ids: {
        corpus: 'rtMgCorpusToday', monthlyExp: 'rtMgMonthlyExpense',
        ret: 'rtMgAnnualReturn', infl: 'rtMgInflation', horizon: 'rtMgHorizon',
        stratMC: 'rtMgStratMC', stratMCYears: 'rtMgStratMCYears',
        strat4pct: 'rtMgStrat4pct',
        stratBlended: 'rtMgStratBlended',
        stratBlendedRate: 'rtMgStratBlendedRate',
        stratBlendedYears: 'rtMgStratBlendedYears',
        survDet: 'rtMgSurvDet', survDetYears: 'rtMgSurvDetYears',
        survMCMed: 'rtMgSurvMCMed', survMCMedYears: 'rtMgSurvMCMedYears',
        survMCWorst: 'rtMgSurvMCWorst', survMCWorstYears: 'rtMgSurvMCWorstYears'
      },
      readSourceCorpus: function () {
        if (RP._multigoal && typeof RP._multigoal._readCorpusAtRetirement === 'function') {
          try {
            var mg = RP._multigoal._readCorpusAtRetirement();
            if (Number.isFinite(mg) && mg > 0) return mg;
          } catch (_) {}
        }
        return 0;
      },
      // Horizon = lifeExp - retirementAge (Multi-Goal corpus is at the
      // retirement age, so retirement window = lifeExp - retAge).
      defaultHorizon: function (curAge, lifeExp) {
        var retAge = (typeof RP.val === 'function') ? (RP.val('retirementAge') || curAge) : curAge;
        return Math.max(1, lifeExp - retAge);
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
    var curAge = (typeof RP.val === 'function') ? (RP.val('currentAge') || 28) : 28;
    var lifeExp = (typeof RP.val === 'function') ? (RP.val('lifeExpectancy') || 85) : 85;
    var horizon = v.defaultHorizon(curAge, lifeExp);
    return { corpus: corpus, monthlyExp: monthlyExp, ret: ret, infl: infl, horizon: horizon };
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
    var horizonInput = parseFloat(document.getElementById(ids.horizon).value);
    var horizon = (isFinite(horizonInput) && horizonInput > 0) ? horizonInput : d.horizon;

    function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

    if (!corpus || corpus <= 0) {
      setText(ids.stratMC, '₹—'); setText(ids.strat4pct, '₹—'); setText(ids.stratBlended, '₹—');
      setText(ids.survDet, '— mo'); setText(ids.survMCMed, '— mo'); setText(ids.survMCWorst, '— mo');
      return;
    }

    // Strategies
    setText(ids.strat4pct, fmtINR(corpus * 0.04 / 12));
    var annuity = annuityWithdrawal(corpus, ret, horizon);
    setText(ids.stratBlended, fmtINR(annuity));
    setText(ids.stratBlendedRate, (ret * 100).toFixed(2) + '%');
    setText(ids.stratBlendedYears, horizon);
    var safeMC = findSafeWithdrawal(corpus, ret, SIGMA_ANNUAL, infl, horizon);
    setText(ids.stratMC, safeMC > 0 ? fmtINR(safeMC) : '₹—');
    setText(ids.stratMCYears, horizon);

    // Survival
    if (monthlyExp > 0) {
      var det = simulatePath(corpus, monthlyExp, ret, 0, infl, horizon);
      setText(ids.survDet, fmtMonths(det.monthsLasted));
      setText(ids.survDetYears, fmtYears(det.monthsLasted));
      var paths = runMC(corpus, monthlyExp, ret, SIGMA_ANNUAL, infl, horizon);
      var med = percentileBy(paths, 'monthsLasted', 0.5);
      var worst = percentileBy(paths, 'monthsLasted', MC_WORST_PERCENTILE);
      setText(ids.survMCMed, fmtMonths(med));
      setText(ids.survMCMedYears, fmtYears(med));
      setText(ids.survMCWorst, fmtMonths(worst));
      setText(ids.survMCWorstYears, fmtYears(worst));
    } else {
      setText(ids.survDet, '— mo'); setText(ids.survMCMed, '— mo'); setText(ids.survMCWorst, '— mo');
    }
  }

  function prefill(variant) {
    var v = VARIANTS[variant];
    var d = readDefaults(variant);
    var pairs = [
      [v.ids.corpus, d.corpus],
      [v.ids.monthlyExp, d.monthlyExp],
      [v.ids.ret, +(d.ret * 100).toFixed(2)],
      [v.ids.infl, +(d.infl * 100).toFixed(2)],
      [v.ids.horizon, d.horizon]
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
    [ids.corpus, ids.monthlyExp, ids.ret, ids.infl, ids.horizon].forEach(function (id) {
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
