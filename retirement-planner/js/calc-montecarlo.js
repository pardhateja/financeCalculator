/* ============================================================================
   Monte Carlo main-thread orchestrator (Phase 2)
   ----------------------------------------------------------------------------
   - Manages the Web Worker lifecycle (Blob URL → spawn → post inputs → recv)
   - Reads user inputs from existing Phase 1 DOM elements
   - Renders progress, charts, callout, data tables
   - Persists toggle state in localStorage
   - Handles share-link URL params (&view=montecarlo&mcseed=N)
   ============================================================================ */
(function () {
  'use strict';
  window.RP = window.RP || {};

  var STORAGE_KEY = 'rp_projection_view';
  var DEFAULT_SIM_COUNT = 10000;
  var workerInstance = null;
  var workerBlobUrl = null;
  var lastSeed = null;
  var lastResults = null;
  var cancelRequested = false;

  // ---------- Read user inputs from existing Phase 1 DOM ----------
  // Phase 1 reality: stockPercent + safePercent split (no separate gold).
  // Pre/post-retirement returns already blended in RP._preReturn / _postReturn.
  // We use stockPercent → bootstrap from NIFTY (volatile equity), safePercent
  // → bootstrap from debt (low-vol fixed income). Gold not modelled by Phase 1.
  function readInputs() {
    // Strict reader: returns null for missing/empty/non-numeric values so the
    // empty-state check actually triggers. Allocation %s default to 100/0
    // (all-stock) so a partial setup doesn't crash, but core inputs must be
    // present — currentAge is the only one with a generous default since
    // most users have it set early in onboarding.
    var strict = function (id) {
      var el = document.getElementById(id);
      if (!el || el.value === '' || el.value === null) return null;
      var v = parseFloat(el.value);
      return isNaN(v) ? null : v;
    };
    var inputs = {
      currentAge: strict('currentAge'),
      retirementAge: strict('retirementAge'),
      lifeExpectancy: strict('lifeExpectancy'),
      currentSavings: strict('currentSavings'),
      monthlyInvestment: strict('monthlyInvestAmt'),
      stockPct: strict('stockPercent'),
      safePct: strict('safePercent'),
      postRetireMonthly: strict('postRetireMonthly')
    };
    // Validation — every required field must be set and sane
    if (inputs.currentAge === null || inputs.currentAge < 0) return null;
    if (inputs.retirementAge === null || inputs.retirementAge <= inputs.currentAge) return null;
    if (inputs.lifeExpectancy === null || inputs.lifeExpectancy <= inputs.retirementAge) return null;
    if (inputs.currentSavings === null || inputs.currentSavings < 0) return null;
    if (inputs.monthlyInvestment === null || inputs.monthlyInvestment <= 0) return null;
    if (inputs.postRetireMonthly === null || inputs.postRetireMonthly <= 0) return null;
    // Allocation %s — if both null, default to 100% stock (single-asset MC)
    if (inputs.stockPct === null && inputs.safePct === null) {
      inputs.stockPct = 100; inputs.safePct = 0;
    } else {
      if (inputs.stockPct === null) inputs.stockPct = 0;
      if (inputs.safePct === null) inputs.safePct = 0;
    }
    // Convert percent to fraction
    inputs.stockPct = inputs.stockPct / 100;
    inputs.safePct = inputs.safePct / 100;
    return inputs;
  }

  // ---------- Build Worker via Blob URL (works on file:// + http://) ----------
  function buildWorker() {
    if (!window.RP._workerSource) {
      throw new Error('Worker source not loaded. Make sure calc-montecarlo-worker-source.js was inlined OR fetched.');
    }
    if (workerBlobUrl) URL.revokeObjectURL(workerBlobUrl);
    var blob = new Blob([window.RP._workerSource], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
    return new Worker(workerBlobUrl);
  }

  // ---------- Run sim ----------
  function runMonteCarlo(opts) {
    opts = opts || {};
    var inputs = readInputs();
    if (!inputs) {
      showState('empty');
      return;
    }
    if (!window.RP._historicalReturns) {
      showError('Historical returns data not loaded.');
      return;
    }
    cancelMonteCarlo(); // clean up any in-flight
    cancelRequested = false;

    showState('progress');
    updateProgress(0);

    try {
      workerInstance = buildWorker();
    } catch (err) {
      showError('Web Worker unavailable in this browser: ' + err.message);
      return;
    }

    var seed = opts.seed || Date.now();
    lastSeed = seed;

    workerInstance.onmessage = function (e) {
      var msg = e.data;
      if (cancelRequested) {
        // Race: user clicked Cancel just before DONE arrived. Discard.
        cleanupWorker();
        return;
      }
      if (msg.type === 'PROGRESS') {
        updateProgress(msg.completed);
      } else if (msg.type === 'DONE') {
        lastResults = msg;
        renderResults(msg);
        cleanupWorker();
      } else if (msg.type === 'CANCELLED') {
        showState('idle');
        cleanupWorker();
      }
    };
    workerInstance.onerror = function (err) {
      showError('Simulation error: ' + (err.message || 'unknown'));
      cleanupWorker();
    };

    workerInstance.postMessage({
      type: 'RUN',
      inputs: inputs,
      hist: window.RP._historicalReturns,
      seed: seed,
      simCount: opts.simCount || DEFAULT_SIM_COUNT
    });
  }

  function cancelMonteCarlo() {
    if (workerInstance) {
      cancelRequested = true;
      try { workerInstance.postMessage({ type: 'CANCEL' }); } catch (_) {}
      // Give it a moment to ack via CANCELLED msg, but also force-cleanup
      // after 1s in case worker is busy
      setTimeout(cleanupWorker, 1000);
    }
  }

  function cleanupWorker() {
    if (workerInstance) {
      try { workerInstance.terminate(); } catch (_) {}
      workerInstance = null;
    }
    if (workerBlobUrl) {
      try { URL.revokeObjectURL(workerBlobUrl); } catch (_) {}
      workerBlobUrl = null;
    }
  }

  // ---------- UI state machine ----------
  function showState(state) {
    var ids = ['mc-empty-state', 'mc-idle', 'mc-progress', 'mc-results', 'mc-error'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    var map = { empty: 'mc-empty-state', idle: 'mc-idle', progress: 'mc-progress', results: 'mc-results', error: 'mc-error' };
    var target = document.getElementById(map[state]);
    if (target) target.hidden = false;
  }

  function showError(msg) {
    showState('error');
    var t = document.getElementById('mc-error-text');
    if (t) t.textContent = msg;
  }

  function updateProgress(completed) {
    var fill = document.getElementById('mc-progress-fill');
    var count = document.getElementById('mc-progress-count');
    var bar = fill && fill.parentElement;
    var pct = Math.round((completed / DEFAULT_SIM_COUNT) * 100);
    if (fill) fill.style.width = pct + '%';
    if (bar) bar.setAttribute('aria-valuenow', String(pct));
    if (count) count.textContent = 'Running ' + completed.toLocaleString() + ' / ' + DEFAULT_SIM_COUNT.toLocaleString();
  }

  // ---------- Render results ----------
  function renderResults(msg) {
    showState('results');
    var results = msg.results;

    // Determine overall plan health → callout variant + message
    var summary = summarize(results);
    renderCallout(summary);

    // Bar chart data
    var ages = results.map(function (r) { return r.age; });
    var successPct = results.map(function (r) { return r.successPct; });
    var riskTier = results.map(function (r) { return tierFor(r.successPct); });

    if (typeof RP.renderMcBarChart === 'function') {
      RP.renderMcBarChart('mc-bar-chart',
        { ages: ages, successPct: successPct, riskTier: riskTier },
        { darkMode: document.body.classList.contains('dark-mode') });
    }
    renderBarTable(results);

    // Line chart data
    if (typeof RP.renderMcLineChart === 'function') {
      RP.renderMcLineChart('mc-line-chart',
        { ages: ages,
          p10: results.map(function (r) { return r.p10; }),
          p50: results.map(function (r) { return r.p50; }),
          p90: results.map(function (r) { return r.p90; }) },
        { darkMode: document.body.classList.contains('dark-mode') });
    }
    renderLineTable(results);

    // Perf footer — show ms when sub-second, seconds otherwise
    var pf = document.getElementById('mc-perf-footer');
    if (pf) {
      var elapsedStr = msg.elapsedMs < 1000
        ? msg.elapsedMs + 'ms'
        : (msg.elapsedMs / 1000).toFixed(1) + 's';
      pf.textContent = msg.simCount.toLocaleString() + ' sims completed in ' + elapsedStr + ' · seed ' + msg.seed;
    }
  }

  function tierFor(pct) {
    if (pct >= 85) return 'high';
    if (pct >= 75) return 'medium';
    if (pct >= 50) return 'borderline';
    return 'low';
  }

  function summarize(results) {
    // Find the age where plan transitions from green/blue to amber/red
    var lastSafeAge = null;
    var firstRiskyAge = null;
    var firstFailAge = null;
    results.forEach(function (r) {
      if (r.successPct >= 75 && (lastSafeAge === null || r.age > lastSafeAge)) lastSafeAge = r.age;
      if (r.successPct < 75 && r.successPct >= 50 && firstRiskyAge === null) firstRiskyAge = r.age;
      if (r.successPct < 50 && firstFailAge === null) firstFailAge = r.age;
    });
    var minPct = Math.min.apply(Math, results.map(function (r) { return r.successPct; }));
    var maxAge = results[results.length - 1].age;

    var variant, icon, text;
    if (minPct >= 85) {
      variant = 'success'; icon = '✓';
      text = 'Your plan has high confidence (' + minPct + '%+) all the way through age ' + maxAge + '. Excellent.';
    } else if (minPct >= 75) {
      variant = 'info'; icon = 'ℹ';
      text = 'Your plan is solid (' + minPct + '%+ success) through age ' + maxAge + '. Acceptable risk.';
    } else if (firstRiskyAge !== null && firstFailAge === null) {
      variant = 'warning'; icon = '⚠';
      var safePhrase = lastSafeAge ? 'is great until age ' + lastSafeAge + ', then risky after' : 'shows risk early';
      text = 'Your plan ' + safePhrase + '. Lowest success rate: ' + minPct + '% at age ' + maxAge + '.';
    } else {
      variant = 'danger'; icon = '✕';
      var failPhrase = firstFailAge
        ? 'starts failing at age ' + firstFailAge
        : 'has only ' + minPct + '% confidence by age ' + maxAge;
      text = 'Your plan ' + failPhrase + ' (lowest success rate: ' + minPct + '% at age ' + maxAge + '). Significant changes needed.';
    }

    return { variant: variant, icon: icon, text: text, showCta: variant === 'warning' || variant === 'danger' };
  }

  function renderCallout(summary) {
    var box = document.getElementById('mc-callout');
    var icon = document.getElementById('mc-callout-icon');
    var text = document.getElementById('mc-callout-text');
    var cta = document.getElementById('mc-callout-cta');
    if (!box) return;
    box.className = 'alert alert--' + summary.variant;
    if (icon) icon.textContent = summary.icon;
    if (text) text.textContent = summary.text;
    if (cta) cta.hidden = !summary.showCta;
  }

  function tierLabel(tier) {
    return ({ high: 'Safe', medium: 'OK', borderline: 'Risky', low: 'Likely fail' })[tier] || tier;
  }

  function renderBarTable(results) {
    var tbody = document.getElementById('mc-bar-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    results.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + r.age + '</td><td>' + r.successPct + '%</td><td>' + tierLabel(tierFor(r.successPct)) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function fmtINR(v) {
    if (v >= 1e7) return '₹' + (v / 1e7).toFixed(1) + 'Cr';
    if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + 'L';
    if (v >= 1e3) return '₹' + Math.round(v / 1e3) + 'K';
    return '₹' + Math.round(v);
  }

  function renderLineTable(results) {
    var tbody = document.getElementById('mc-line-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    results.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + r.age + '</td><td>' + fmtINR(r.p10) + '</td><td>' + fmtINR(r.p50) + '</td><td>' + fmtINR(r.p90) + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ---------- Toggle handlers ----------
  function setToggle(view) {
    var ideal = document.getElementById('mc-toggle-ideal');
    var mc = document.getElementById('mc-toggle-mc');
    var pIdeal = document.getElementById('mc-panel-ideal');
    var pMc = document.getElementById('mc-panel-mc');
    if (!ideal || !mc || !pIdeal || !pMc) return;
    var isMc = view === 'montecarlo';
    ideal.classList.toggle('mc-toggle__btn--active', !isMc);
    mc.classList.toggle('mc-toggle__btn--active', isMc);
    ideal.setAttribute('aria-selected', String(!isMc));
    mc.setAttribute('aria-selected', String(isMc));
    pIdeal.hidden = isMc;
    pMc.hidden = !isMc;
    try { localStorage.setItem(STORAGE_KEY, isMc ? 'montecarlo' : 'ideal'); } catch (_) {}
    if (isMc) {
      // Always re-check inputs on switch-in: empty state takes precedence
      // even if a previous run produced results, in case inputs were cleared.
      if (!readInputs()) {
        showState('empty');
      } else if (!lastResults) {
        showState('idle');
      } else {
        showState('results');
      }
    }
  }

  // ---------- Init ----------
  function init() {
    var ideal = document.getElementById('mc-toggle-ideal');
    var mc = document.getElementById('mc-toggle-mc');
    if (!ideal || !mc) return;
    ideal.addEventListener('click', function () { setToggle('ideal'); });
    mc.addEventListener('click', function () { setToggle('montecarlo'); });

    var runBtn = document.getElementById('mc-run-btn');
    if (runBtn) runBtn.addEventListener('click', function () { runMonteCarlo(); });

    var cancelBtn = document.getElementById('mc-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      cancelMonteCarlo();
      lastResults = null;  // wipe so empty/idle shows on next switch-in
      showState('idle');
    });

    var emptyCta = document.getElementById('mc-empty-cta');
    if (emptyCta) emptyCta.addEventListener('click', function () {
      var calcTab = document.querySelector('[data-tab="basics"], [data-tab="calculator"]');
      if (calcTab) calcTab.click();
    });

    var calloutCta = document.getElementById('mc-callout-cta');
    if (calloutCta) calloutCta.addEventListener('click', function () {
      var calcTab = document.querySelector('[data-tab="basics"], [data-tab="calculator"]');
      if (calcTab) calcTab.click();
    });

    // Data-table toggles
    ['mc-bar-table-toggle', 'mc-line-table-toggle'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var ctrl = btn.getAttribute('aria-controls');
        var tbl = document.getElementById(ctrl);
        if (!tbl) return;
        var nowVisible = tbl.hidden;
        tbl.hidden = !nowVisible;
        btn.setAttribute('aria-expanded', String(nowVisible));
        btn.textContent = nowVisible ? 'Hide data table' : 'Show data table';
      });
    });

    // Restore from localStorage OR URL params
    var fromUrl = parseUrlParams();
    var initialView = fromUrl.view || (function () {
      try { return localStorage.getItem(STORAGE_KEY) || 'ideal'; } catch (_) { return 'ideal'; }
    })();
    setToggle(initialView);

    if (fromUrl.view === 'montecarlo' && fromUrl.seed) {
      // Auto-run with URL-provided seed. Delay 800ms to let Phase 1 finish
      // populating computed fields (currentSavings is computed by tracker).
      // After delay, re-check inputs and re-render state if they're now valid.
      setTimeout(function () {
        if (readInputs()) {
          runMonteCarlo({ seed: fromUrl.seed });
        } else {
          // Inputs still missing — refresh state to empty/idle as appropriate
          setToggle('montecarlo');
        }
      }, 800);
    }
  }

  function parseUrlParams() {
    try {
      var p = new URLSearchParams(window.location.search);
      var view = p.get('view');
      var seedStr = p.get('mcseed');
      var seed = seedStr ? parseInt(seedStr, 10) : null;
      return { view: view === 'montecarlo' ? 'montecarlo' : null, seed: (seed && !isNaN(seed)) ? seed : null };
    } catch (_) { return {}; }
  }

  // ---------- Public API ----------
  RP.runMonteCarlo = runMonteCarlo;
  RP.cancelMonteCarlo = cancelMonteCarlo;
  RP.getLastSeed = function () { return lastSeed; };
  RP.getProjectionView = function () {
    try { return localStorage.getItem(STORAGE_KEY) || 'ideal'; } catch (_) { return 'ideal'; }
  };

  // ---------- Bootstrap on DOMContentLoaded ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
