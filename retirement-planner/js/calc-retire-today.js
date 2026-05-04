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

  // 3-Bucket strategy params (Pardha 2026-05-04). Standard Indian-equity-
  // tilted bucket sizing:
  //   B1 (cash) = 2 yrs of expenses, earns 5% (savings/FD/liquid).
  //   B2 (income) = 5 yrs of expenses, earns 8% (debt funds, bonds).
  //   B3 (growth) = whatever's left, earns the user's annual return
  //                 (post-retirement blended — equity-tilted in their plan).
  // Refill cycle: monthly draws from B1; once B1 empties, refill from B2;
  // once B2 empties, refill from B3.
  var BUCKET_B1_YEARS = 2;
  var BUCKET_B2_YEARS = 5;
  var BUCKET_B1_RETURN = 0.05;
  var BUCKET_B2_RETURN = 0.08;

  // Pardha 2026-05-04: triple-horizon view. Every metric is computed
  // three times and shown stacked: Short (to 60), Good (to 80), Best
  // (to 100). Horizons are targetAge - currentAge (shrink as user ages).
  var TARGET_AGES = { short: 60, good: 80, best: 100 };
  var HORIZON_KEYS = ['short', 'good', 'best'];

  // ---- Variants (one per sub-tab) ----
  var VARIANTS = {
    live: {
      idPrefix: 'rt',
      ids: {
        corpus: 'rtCorpusToday', monthlyExp: 'rtMonthlyExpense',
        ret: 'rtAnnualReturn', infl: 'rtInflation'
        // Per-horizon ids built dynamically: rt{Field}{Hkey} where
        // Hkey is 'Short' / 'Good' / 'Best'. See buildHIds() below.
      },
      readSourceCorpus: function () {
        var csEl = document.getElementById('currentSavings');
        if (csEl && csEl.value) return parseFloat(csEl.value) || 0;
        return 0;
      },
    },
    mg: {
      idPrefix: 'rtMg',
      ids: {
        corpus: 'rtMgCorpusToday', monthlyExp: 'rtMgMonthlyExpense',
        ret: 'rtMgAnnualReturn', infl: 'rtMgInflation'
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

  /* Compute initial bucket sizes for a given monthly expense.
   * B1 = 2yr × 12 × monthly. B2 = 5yr × 12 × monthly. B3 = remainder. */
  function bucketSizes(corpus, monthly) {
    var b1 = Math.min(corpus, monthly * 12 * BUCKET_B1_YEARS);
    var remaining = corpus - b1;
    var b2 = Math.min(Math.max(0, remaining), monthly * 12 * BUCKET_B2_YEARS);
    var b3 = Math.max(0, corpus - b1 - b2);
    return { b1: b1, b2: b2, b3: b3 };
  }

  /* Simulate ONE 3-bucket retirement path with a given STARTING monthly
   * withdrawal that grows with inflation each year. Bucket dynamics:
   *   - Each month: subtract monthly draw from B1.
   *   - Once B1 hits 0, refill from B2 (transfer up to 1yr of expenses).
   *   - Once B2 hits 0, refill from B1's exhausted slot from B3.
   *   - B1 earns 5% annually, B2 earns 8%, B3 earns annualRet (with
   *     volatility if sigma > 0 — the equity bucket bears all the risk).
   * Returns { monthsLasted, drained }. */
  function simulateBucketPath(corpus, monthly0, annualRet, sigma, infl, years) {
    var sizes = bucketSizes(corpus, monthly0);
    var b1 = sizes.b1, b2 = sizes.b2, b3 = sizes.b3;
    var monthly = monthly0;
    var monthsLasted = 0;
    var rB1 = Math.pow(1 + BUCKET_B1_RETURN, 1/12) - 1;
    var rB2 = Math.pow(1 + BUCKET_B2_RETURN, 1/12) - 1;
    for (var y = 0; y < years; y++) {
      // Sample annual return for B3 (random if sigma > 0).
      var b3AnnualR = sigma > 0 ? annualRet + sigma * gaussRand() : annualRet;
      var rB3 = Math.pow(1 + b3AnnualR, 1/12) - 1;
      for (var m = 0; m < 12; m++) {
        // Draw from B1 first.
        var draw = monthly;
        if (b1 >= draw) { b1 -= draw; }
        else if (b2 >= draw) {
          // Refill B1 from B2 by 1yr of expenses (or whatever B2 has),
          // then draw.
          var refill = Math.min(b2, monthly * 12);
          b2 -= refill; b1 += refill;
          if (b1 >= draw) { b1 -= draw; } else { return { monthsLasted: monthsLasted, drained: true }; }
        }
        else if (b3 >= draw) {
          // B2 also empty: refill B2 from B3 (5yr worth), then refill B1 from B2.
          var refill2 = Math.min(b3, monthly * 12 * BUCKET_B2_YEARS);
          b3 -= refill2; b2 += refill2;
          var refill1 = Math.min(b2, monthly * 12);
          b2 -= refill1; b1 += refill1;
          if (b1 >= draw) { b1 -= draw; } else { return { monthsLasted: monthsLasted, drained: true }; }
        }
        else {
          return { monthsLasted: monthsLasted, drained: true };
        }
        // Compound each bucket monthly.
        b1 *= (1 + rB1);
        b2 *= (1 + rB2);
        b3 *= (1 + rB3);
        monthsLasted++;
      }
      monthly *= (1 + infl);
    }
    return { monthsLasted: monthsLasted, drained: false };
  }

  /* Bisection: find largest monthly withdrawal where ≥85% of MC bucket
   * paths survive the full horizon. */
  function findSafeBucketWithdrawal(corpus, ret, sigma, infl, years) {
    var fourPct = corpus * 0.04 / 12;
    var lo = 1000, hi = fourPct * 5;
    var totalMonths = years * 12;
    function frac(monthly) {
      var ok = 0;
      for (var i = 0; i < MC_SIMS; i++) {
        var p = simulateBucketPath(corpus, monthly, ret, sigma, infl, years);
        if (p.monthsLasted >= totalMonths) ok++;
      }
      return ok / MC_SIMS;
    }
    var bumps = 0;
    while (frac(hi) >= 0.85 && bumps < 4) { hi *= 2; bumps++; }
    if (frac(lo) < 0.85) return 0;
    while (hi - lo > 100) {
      var mid = (lo + hi) / 2;
      if (frac(mid) >= 0.85) lo = mid;
      else hi = mid;
    }
    return lo;
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
    // 3-Bucket: safe withdrawal under bucket-refill dynamics.
    if (monthlyExp > 0) {
      var safeBucket = findSafeBucketWithdrawal(corpus, ret, SIGMA_ANNUAL, infl, horizon);
      out.bucket = safeBucket > 0 ? fmtINR(safeBucket) : '₹—';
      // Initial bucket sizes based on the user's own monthly expense.
      var sizes = bucketSizes(corpus, monthlyExp);
      out.bucketB1 = fmtINR(sizes.b1);
      out.bucketB2 = fmtINR(sizes.b2);
      out.bucketB3 = fmtINR(sizes.b3);
    } else {
      out.bucket = '₹—';
      out.bucketB1 = '₹—';
      out.bucketB2 = '₹—';
      out.bucketB3 = '₹—';
    }
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

  /* Build a per-horizon DOM id: e.g. ('rt', 'StratMC', 'short') -> 'rtStratMCShort'. */
  function hid(prefix, field, hkey) {
    return prefix + field + hkey.charAt(0).toUpperCase() + hkey.slice(1);
  }

  function compute(variant) {
    var V = VARIANTS[variant];
    var ids = V.ids;
    var prefix = V.idPrefix;
    var d = readDefaults(variant);
    var corpus = parseFloat(document.getElementById(ids.corpus).value) || d.corpus;
    var monthlyExp = parseFloat(document.getElementById(ids.monthlyExp).value) || d.monthlyExp;
    var retInput = parseFloat(document.getElementById(ids.ret).value);
    var ret = (isFinite(retInput) && retInput > 0) ? (retInput / 100) : d.ret;
    var inflInput = parseFloat(document.getElementById(ids.infl).value);
    var infl = (isFinite(inflInput) && inflInput >= 0) ? (inflInput / 100) : d.infl;

    function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

    if (!corpus || corpus <= 0) {
      HORIZON_KEYS.forEach(function (h) {
        ['StratMC', 'Strat4pct', 'StratBlended', 'StratBucket', 'StratBucketB1', 'StratBucketB2', 'StratBucketB3'].forEach(function (f) {
          setText(hid(prefix, f, h), '₹—');
        });
        ['SurvDet', 'SurvMCMed', 'SurvMCWorst'].forEach(function (f) {
          setText(hid(prefix, f, h), '— mo');
        });
      });
      return;
    }

    var curAge = (typeof RP.val === 'function') ? (RP.val('currentAge') || 28) : 28;
    var retPct = (ret * 100).toFixed(2) + '%';

    HORIZON_KEYS.forEach(function (h) {
      var horizon = Math.max(1, TARGET_AGES[h] - curAge);
      var r = computeForHorizon(corpus, monthlyExp, ret, infl, horizon);
      // Strategies
      setText(hid(prefix, 'StratMC', h),         r.mc);
      setText(hid(prefix, 'StratMCYears', h),    horizon + ' yr');
      setText(hid(prefix, 'Strat4pct', h),       r.fourPct);
      setText(hid(prefix, 'StratBlended', h),    r.annuity);
      setText(hid(prefix, 'StratBlendedYears', h), horizon + ' yr @ ' + retPct);
      // 3-Bucket: safe withdrawal + initial bucket sizes (B1/B2/B3 don't
      // depend on horizon since they're computed from monthly expense, but
      // we render them in each horizon row anyway for consistency).
      setText(hid(prefix, 'StratBucket', h),     r.bucket);
      setText(hid(prefix, 'StratBucketB1', h),   r.bucketB1);
      setText(hid(prefix, 'StratBucketB2', h),   r.bucketB2);
      setText(hid(prefix, 'StratBucketB3', h),   r.bucketB3);
      // Survival
      setText(hid(prefix, 'SurvDet', h),         r.detMo);
      setText(hid(prefix, 'SurvDetYears', h),    r.detYr);
      setText(hid(prefix, 'SurvMCMed', h),       r.medMo);
      setText(hid(prefix, 'SurvMCMedYears', h),  r.medYr);
      setText(hid(prefix, 'SurvMCWorst', h),     r.worstMo);
      setText(hid(prefix, 'SurvMCWorstYears', h), r.worstYr);
    });

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
      // Pardha 2026-05-04: when currentSavings changes upstream (e.g. user
      // adds a Tracker entry → cascade rewrites currentSavings), update
      // both Retire Today corpus inputs to match — but ONLY if the user
      // hasn't manually overridden the corpus value (we can't tell user-
      // edits from auto-prefills, so a simple heuristic: only auto-update
      // when the field shows the OLD currentSavings value).
      var csEl = document.getElementById('currentSavings');
      if (csEl && !csEl._rtListenerWired) {
        var lastSeen = csEl.value;
        function onCsChange() {
          var newVal = csEl.value;
          ['rtCorpusToday', 'rtMgCorpusToday'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el && el.value === lastSeen) {
              el.value = newVal;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
          lastSeen = newVal;
        }
        csEl.addEventListener('change', onCsChange);
        // currentSavings is set programmatically (no input event), so also
        // observe via MutationObserver on its value attribute. Browsers
        // don't fire input/change for programmatic .value writes; use a
        // periodic poll as the simplest cross-browser option.
        setInterval(function () {
          if (csEl.value !== lastSeen) onCsChange();
        }, 800);
        csEl._rtListenerWired = true;
      }
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
