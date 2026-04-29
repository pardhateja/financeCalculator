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
  var SIM_COUNT_KEY = 'rp_mc_sim_count';
  var DEFAULT_SIM_COUNT = 10000;
  var currentSimCount = DEFAULT_SIM_COUNT;
  var workerInstance = null;
  var workerBlobUrl = null;
  var lastSeed = null;
  var lastResults = null;
  var cancelRequested = false;
  // Track recent run minPct values so we can display a "this vs prior runs"
  // ticker that proves randomness (small variation across seeds).
  var runHistory = [];

  // ---------- Read user inputs from existing Phase 1 DOM ----------
  // Phase 1 reality: stockPercent + safePercent split (no separate gold).
  // Pre/post-retirement returns already blended in RP._preReturn / _postReturn.
  // We use stockPercent → bootstrap from NIFTY (volatile equity), safePercent
  // → bootstrap from debt (low-vol fixed income). Gold not modelled by Phase 1.
  // Read inputs in priority order:
  //   1. Editable MC fields (#mc-edit-*) if non-empty — these are local overrides
  //   2. Phase 1 source fields — fallback for first-load and after Reset
  // This means the user can scrub values inline AND we still default to their
  // Setup tab inputs.
  function readInputs() {
    var fromEdit = function (editId, sourceId) {
      var ed = document.getElementById(editId);
      if (ed && ed.value !== '' && ed.value !== null) {
        var v = parseFloat(ed.value);
        if (!isNaN(v)) return v;
      }
      var src = document.getElementById(sourceId);
      if (src && src.value !== '' && src.value !== null) {
        var sv = parseFloat(src.value);
        if (!isNaN(sv)) return sv;
      }
      return null;
    };
    var fromEditNum = function (editId, fallback) {
      var ed = document.getElementById(editId);
      if (ed && ed.value !== '' && ed.value !== null) {
        var v = parseFloat(ed.value);
        if (!isNaN(v)) return v;
      }
      return fallback;
    };
    var fromCheckbox = function (id) {
      var el = document.getElementById(id);
      return el ? !!el.checked : false;
    };

    var inputs = {
      currentAge:        fromEdit('mc-edit-currentAge',        'currentAge'),
      retirementAge:     fromEdit('mc-edit-retirementAge',     'retirementAge'),
      lifeExpectancy:    fromEdit('mc-edit-lifeExpectancy',    'lifeExpectancy'),
      currentSavings:    fromEdit('mc-edit-currentSavings',    'currentSavings'),
      monthlyInvestment: fromEdit('mc-edit-monthlyInvestAmt',  'monthlyInvestAmt'),
      stockPct:          fromEdit('mc-edit-stockPercent',      'stockPercent'),
      postRetireMonthly: fromEdit('mc-edit-postRetireMonthly', 'postRetireMonthly'),
      // Realism knobs (no Phase 1 equivalent — pure MC additions)
      equityTax:  fromEditNum('mc-edit-equityTax',  12.5) / 100,
      debtTax:    fromEditNum('mc-edit-debtTax',    30)   / 100,
      equityTer:  fromEditNum('mc-edit-equityTer',  1.0)  / 100,
      debtTer:    fromEditNum('mc-edit-debtTer',    0.5)  / 100,
      glideDown:  fromCheckbox('mc-edit-glideDown'),
      shocks:     fromCheckbox('mc-edit-shocks')
    };
    // Validation — every required field must be set and sane
    if (inputs.currentAge === null || inputs.currentAge < 0) return null;
    if (inputs.retirementAge === null || inputs.retirementAge <= inputs.currentAge) return null;
    if (inputs.lifeExpectancy === null || inputs.lifeExpectancy <= inputs.retirementAge) return null;
    if (inputs.currentSavings === null || inputs.currentSavings < 0) return null;
    if (inputs.monthlyInvestment === null || inputs.monthlyInvestment <= 0) return null;
    if (inputs.postRetireMonthly === null || inputs.postRetireMonthly <= 0) return null;
    // Allocation %s — stockPct present, safePct = 100 - stockPct (the editable
    // UI only exposes Stock; Safe is auto-computed for clarity).
    if (inputs.stockPct === null) inputs.stockPct = 72; // sensible default
    inputs.stockPct = Math.max(0, Math.min(100, inputs.stockPct));
    inputs.safePct = 100 - inputs.stockPct;
    inputs.stockPct = inputs.stockPct / 100;
    inputs.safePct  = inputs.safePct / 100;
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

    var simCount = opts.simCount || currentSimCount || DEFAULT_SIM_COUNT;
    currentSimCount = simCount; // remember for the progress label
    workerInstance.postMessage({
      type: 'RUN',
      inputs: inputs,
      hist: window.RP._historicalReturns,
      seed: seed,
      simCount: simCount
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
    var total = currentSimCount || DEFAULT_SIM_COUNT;
    var pct = Math.round((completed / total) * 100);
    if (fill) fill.style.width = pct + '%';
    if (bar) bar.setAttribute('aria-valuenow', String(pct));
    if (count) count.textContent = 'Running ' + completed.toLocaleString() + ' / ' + total.toLocaleString();
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

    // Perf footer — moved into a collapsed Run-details expander; user-facing
    // copy avoids "seed" jargon; full info kept for debugging on demand.
    var pf = document.getElementById('mc-perf-footer');
    if (pf) {
      var elapsedStr = msg.elapsedMs < 1000
        ? msg.elapsedMs + 'ms'
        : (msg.elapsedMs / 1000).toFixed(1) + 's';
      pf.textContent = msg.simCount.toLocaleString() + ' simulated lives · completed in ' + elapsedStr + ' · run id ' + msg.seed;
    }

    // Render the 5 random-future samples (proves individual sims ARE random)
    renderSamples(msg.samples);

    // Append this run's worst-age %% to history and render the ticker
    var minPct = Math.min.apply(Math, results.map(function (r) { return r.successPct; }));
    runHistory.push(minPct);
    if (runHistory.length > 6) runHistory.shift(); // keep last 6
    renderHistory();
  }

  // Threshold tiers calibrated for LONG retirements (50-65 years, common for
  // FIRE planning in India). For traditional 25-30 year retirements the bar
  // would be higher; for 65-year retirements anything above 60% is genuinely
  // good and 35-60% is the realistic "needs adjustment but not disaster" zone.
  function tierFor(pct) {
    if (pct >= 75) return 'high';        // green — solidly safe
    if (pct >= 60) return 'medium';      // blue — likely safe
    if (pct >= 35) return 'borderline';  // amber — needs adjustment but workable
    return 'low';                         // red — genuine disaster zone
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

    // Helper: a single sentence framing the headline number in everyday terms.
    // Calibrated for LONG retirement horizons (50-65 yrs). Anything ≥60 is
    // genuinely OK for a 65-year retirement; <35 is the disaster zone.
    function colloquial(pct) {
      if (pct >= 95) return 'almost guaranteed to last';
      if (pct >= 75) return 'very likely to last';
      if (pct >= 60) return 'likely to last';
      if (pct >= 45) return 'more likely than not to last, with real risk in the late years';
      if (pct >= 30) return 'risky — needs adjustment to sleep well';
      if (pct >= 15) return 'unlikely to last as-is';
      return 'very unlikely to last as-is';
    }

    // Tier banding for the callout (matches tierFor() used by the bar chart):
    //   ≥75 success / 60-74 info / 35-59 warning / <35 danger.
    var variant, icon, text;
    if (minPct >= 75) {
      variant = 'success'; icon = '✓';
      text = 'Your plan has a ' + minPct + '% chance of lasting all the way to age ' + maxAge + '. ' +
             'Out of 100 possible market futures, at least ' + minPct + ' would still have money in your account by then. ' +
             'It\'s ' + colloquial(minPct) + ' — solid.';
    } else if (minPct >= 60) {
      variant = 'info'; icon = 'ℹ';
      text = 'Your plan has a ' + minPct + '% chance of lasting to age ' + maxAge + '. ' +
             'Out of 100 possible market futures, about ' + minPct + ' end with money still in the bank at ' + maxAge + '; ' + (100 - minPct) + ' run out before then. ' +
             'It\'s ' + colloquial(minPct) + ' — acceptable for a long retirement, worth monitoring.';
    } else if (minPct >= 35) {
      variant = 'warning'; icon = '⚠';
      if (lastSafeAge && lastSafeAge < maxAge) {
        text = 'Your plan looks reasonable through age ' + lastSafeAge + ' but weakens after that. ' +
               'By age ' + maxAge + ' the chance of still having money drops to ' + minPct + '% — meaning out of 100 possible futures, ' + (100 - minPct) + ' would run out before you turn ' + maxAge + '. ' +
               'It\'s ' + colloquial(minPct) + '. Consider increasing monthly investment, retiring a year or two later, or trimming late-life expenses.';
      } else {
        text = 'Your plan has a ' + minPct + '% chance of lasting to age ' + maxAge + '. ' +
               'Out of 100 possible futures, about ' + (100 - minPct) + ' run out of money before then — usually because of bad luck in the early retirement years. ' +
               'It\'s ' + colloquial(minPct) + '.';
      }
    } else {
      variant = 'danger'; icon = '✕';
      if (firstFailAge && firstFailAge < maxAge) {
        text = 'Your plan has only a ' + minPct + '% chance of lasting to age ' + maxAge + '. ' +
               'Things start to break around age ' + firstFailAge + ' — in more than half of possible futures, you\'d be running out of money by then. ' +
               'It\'s ' + colloquial(minPct) + '. Significant changes needed: increase monthly investment, retire later, or reduce post-retirement expenses.';
      } else {
        text = 'Your plan has only a ' + minPct + '% chance of lasting to age ' + maxAge + '. ' +
               'Put another way: if you replayed your retirement 100 times with different market luck each time, you\'d run out of money before age ' + maxAge + ' in about ' + (100 - minPct) + ' of them. ' +
               'It\'s ' + colloquial(minPct) + '. Consider increasing your monthly investment or reducing post-retirement expenses.';
      }
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

  // ---------- Random sample futures + run-history ticker ----------
  function renderSamples(samples) {
    var ul = document.getElementById('mc-samples-list');
    if (!ul) return;
    ul.innerHTML = '';
    if (!samples || samples.length === 0) {
      document.getElementById('mc-samples').hidden = true;
      return;
    }
    document.getElementById('mc-samples').hidden = false;
    samples.forEach(function (s, i) {
      var li = document.createElement('li');
      if (s.ranOutAge !== null && s.ranOutAge !== undefined) {
        li.className = 'mc-sample-fail';
        li.textContent = 'Future ' + (i + 1) + ': ran out at age ' + s.ranOutAge + ' ✕';
      } else {
        li.className = 'mc-sample-pass';
        li.textContent = 'Future ' + (i + 1) + ': lasted to the end with ' + fmtINR(s.finalCorpus) + ' ✓';
      }
      ul.appendChild(li);
    });
  }

  function renderHistory() {
    var box = document.getElementById('mc-history');
    var items = document.getElementById('mc-history-items');
    if (!box || !items) return;
    if (runHistory.length < 2) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    items.textContent = runHistory.map(function (p, i) {
      return (i === runHistory.length - 1)
        ? p + '% (this run)'
        : p + '%';
    }).join('  ·  ');
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

    // Sim-count dropdown — restore persisted choice, save on change
    var simSelect = document.getElementById('mc-sim-count-select');
    if (simSelect) {
      try {
        var saved = parseInt(localStorage.getItem(SIM_COUNT_KEY) || '', 10);
        if (!isNaN(saved) && [1000, 10000, 50000, 100000, 1000000].indexOf(saved) >= 0) {
          simSelect.value = String(saved);
          currentSimCount = saved;
        }
      } catch (_) {}
      simSelect.addEventListener('change', function () {
        var n = parseInt(simSelect.value, 10);
        if (!isNaN(n)) {
          currentSimCount = n;
          try { localStorage.setItem(SIM_COUNT_KEY, String(n)); } catch (_) {}
        }
      });
    }

    var runBtn = document.getElementById('mc-run-btn');
    if (runBtn) runBtn.addEventListener('click', function () {
      // Always use the latest dropdown value at click time
      var n = simSelect ? parseInt(simSelect.value, 10) : currentSimCount;
      if (isNaN(n) || n <= 0) n = DEFAULT_SIM_COUNT;
      runMonteCarlo({ simCount: n });
    });

    var cancelBtn = document.getElementById('mc-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      cancelMonteCarlo();
      lastResults = null;  // wipe so empty/idle shows on next switch-in
      showState('idle');
    });

    // Both empty-state and callout CTAs jump to Investments tab + focus the
    // monthly-investment input. Setting location.hash triggers Phase 1's
    // hashchange handler which calls switchTab + renders subtabs. Then we
    // wait two RAFs so the panel is laid out and the body scroll happens
    // before we move focus to the field.
    function jumpToInvestments() {
      // monthlyInvestAmt actually lives in the Financial Plan tab, NOT
      // Investments. (The Investments tab has Asset Allocation %s and the
      // mutual-fund matrix; Financial Plan has the monthly-investment field.)
      if (typeof RP.switchTab === 'function') {
        RP.switchTab('financial-plan');
      } else {
        location.hash = '#financial-plan';
      }
      // Wait two RAFs for tab visibility to flush, then measure + scroll.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var input = document.getElementById('monthlyInvestAmt');
          if (!input) return;
          // scrollIntoView is the simplest way that works across all browsers
          // even when the element was display:none milliseconds ago.
          input.scrollIntoView({ block: 'center', behavior: 'auto' });
          try { input.focus({ preventScroll: true }); } catch (_) { try { input.focus(); } catch (_) {} }
          try { input.select(); } catch (_) {}
          // Highlight ring + pulse so the user sees where they landed
          input.classList.add('mc-input-pulse');
          setTimeout(function () {
            input.classList.remove('mc-input-pulse');
          }, 2200);
        });
      });
    }
    var emptyCta = document.getElementById('mc-empty-cta');
    if (emptyCta) emptyCta.addEventListener('click', jumpToInvestments);
    var calloutCta = document.getElementById('mc-callout-cta');
    if (calloutCta) calloutCta.addEventListener('click', jumpToInvestments);

    // Re-run button (results state)
    var rerunBtn = document.getElementById('mc-rerun-btn');
    if (rerunBtn) rerunBtn.addEventListener('click', function () {
      var n = simSelect ? parseInt(simSelect.value, 10) : currentSimCount;
      if (isNaN(n) || n <= 0) n = DEFAULT_SIM_COUNT;
      // New seed every time the user clicks re-run; clear lastResults so
      // the run starts cleanly.
      lastResults = null;
      runMonteCarlo({ simCount: n });
    });

    // Reset button — re-pulls all values from Phase 1 source fields, clears
    // realism overrides back to India-typical defaults.
    var resetBtn = document.getElementById('mc-inputs-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      refreshInputsCard(true);
      // Discard run history because the inputs changed
      runHistory = [];
      lastResults = null;
      var hist = document.getElementById('mc-history');
      if (hist) hist.hidden = true;
    });

    // Any edit to an MC editable field invalidates run history (different inputs
    // = not comparable to prior runs). Don't auto-rerun (cheap) — let user click Run.
    [
      'mc-edit-currentAge', 'mc-edit-retirementAge', 'mc-edit-lifeExpectancy',
      'mc-edit-currentSavings', 'mc-edit-monthlyInvestAmt', 'mc-edit-stockPercent',
      'mc-edit-postRetireMonthly',
      'mc-edit-equityTax', 'mc-edit-debtTax', 'mc-edit-equityTer', 'mc-edit-debtTer',
      'mc-edit-glideDown', 'mc-edit-shocks'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function () {
        runHistory = [];
        var hist = document.getElementById('mc-history');
        if (hist) hist.hidden = true;
      });
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
    // Set toggle visually right away so the active button + panel-visibility
    // are correct even before inputs settle.
    setToggle(initialView);
    // ALWAYS populate the inputs card on init (regardless of view) AND defer
    // a re-evaluation of state in 800ms — Phase 1 computes currentSavings
    // asynchronously after DOMContentLoaded, so a strict readInputs() at
    // init time can falsely return null. Without this defer the user sees
    // the empty-state on page load even when their inputs are valid.
    refreshInputsCard();
    setTimeout(function () {
      refreshInputsCard();
      if (initialView === 'montecarlo') {
        // Re-evaluate state now that Phase 1 has had a chance to compute.
        setToggle('montecarlo');
      }
    }, 800);

    // Also keep the inputs card in sync with Phase 1 changes — listen for
    // input events on relevant fields. Cheaper than a MutationObserver.
    ['currentAge', 'retirementAge', 'lifeExpectancy', 'currentSavings',
     'monthlyInvestAmt', 'stockPercent', 'safePercent', 'postRetireMonthly']
      .forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', refreshInputsCard);
      });

    if (fromUrl.view === 'montecarlo' && fromUrl.seed) {
      // Auto-run with URL-provided seed (after the 800ms inputs-settle defer).
      setTimeout(function () {
        if (readInputs()) {
          runMonteCarlo({ seed: fromUrl.seed });
        }
      }, 850);
    }
  }

  // ---------- Inputs-being-simulated card (editable) ----------
  function fmtINRShort(v) {
    if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
    if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
    if (v >= 1e3) return '₹' + Math.round(v).toLocaleString('en-IN');
    return '₹' + Math.round(v);
  }
  // Populate the editable fields from Phase 1 source values, but ONLY when the
  // editable field is currently empty (don't blast over user edits in flight).
  // resetAll=true forces overwrite (for the Reset button).
  function refreshInputsCard(resetAll) {
    var raw = function (id) {
      var el = document.getElementById(id);
      if (!el || el.value === '' || el.value === null) return null;
      var v = parseFloat(el.value);
      return isNaN(v) ? null : v;
    };
    var seedField = function (editId, sourceVal) {
      var ed = document.getElementById(editId);
      if (!ed) return;
      if (resetAll || ed.value === '' || ed.value === null) {
        if (sourceVal !== null && sourceVal !== undefined) ed.value = sourceVal;
      }
    };
    seedField('mc-edit-currentAge',        raw('currentAge'));
    seedField('mc-edit-retirementAge',     raw('retirementAge'));
    seedField('mc-edit-lifeExpectancy',    raw('lifeExpectancy'));
    seedField('mc-edit-currentSavings',    raw('currentSavings'));
    seedField('mc-edit-monthlyInvestAmt',  raw('monthlyInvestAmt'));
    seedField('mc-edit-stockPercent',      raw('stockPercent'));
    seedField('mc-edit-postRetireMonthly', raw('postRetireMonthly'));
    if (resetAll) {
      // Realism knobs back to India-typical defaults
      var setVal = function (id, v) { var el = document.getElementById(id); if (el) el.value = v; };
      var setChk = function (id, v) { var el = document.getElementById(id); if (el) el.checked = v; };
      setVal('mc-edit-equityTax', 12.5);
      setVal('mc-edit-debtTax',   30);
      setVal('mc-edit-equityTer', 1.0);
      setVal('mc-edit-debtTer',   0.5);
      setChk('mc-edit-glideDown', false);
      setChk('mc-edit-shocks',    false);
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
