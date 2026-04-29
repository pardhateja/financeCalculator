/* ============================================================================
   Monte Carlo Worker (Phase 2)
   ----------------------------------------------------------------------------
   Runs in a Web Worker context. Receives RUN message with inputs + seed,
   loops 10K simulations using historical bootstrap of NIFTY/debt/gold/CPI
   1991-2025, postMessages PROGRESS every 1000 sims and DONE at completion.
   Listens for CANCEL to exit early.

   IMPORTANT: this file is loaded as a Blob URL by calc-montecarlo.js — it
   must be self-contained (cannot importScripts other project files because
   file:// origin doesn't allow that). The historical-returns dataset is
   passed in via the RUN message payload, NOT importScripts'd.
   ============================================================================ */

'use strict';

// ---------- Seeded PRNG (mulberry32) ----------
function makePRNG(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Single simulation ----------
function runOneSim(inputs, hist, prng) {
  // inputs: { currentAge, retirementAge, lifeExpectancy, currentSavings,
  //           monthlyInvestment, stockPct, safePct, postRetireMonthly }
  // hist:   { yearCount, nifty50[], debt[], gold[], cpi[] }
  // Phase 1 model: Safe (debt) vs Stock (NIFTY) — no gold bucket.
  // returns: { corpusByAge: Map<age, corpus>, finalMonthlyExp }

  var corpusByAge = {};
  var corpus = inputs.currentSavings;
  var monthlyExpenseAtRet = inputs.postRetireMonthly;
  // Apply CPI inflation from currentAge → retirementAge to compute
  // expense-at-retirement in nominal terms (Phase 1 mental model: user
  // enters today's-rupees expense, we inflate to retirement year).
  var preRetYears = inputs.retirementAge - inputs.currentAge;
  var inflatedMonthlyExpense = monthlyExpenseAtRet;

  // Pre-retirement accumulation
  for (var i = 0; i < preRetYears; i++) {
    var idx = Math.floor(prng() * hist.yearCount);
    var ret = (hist.nifty50[idx] * inputs.stockPct
             + hist.debt[idx]    * inputs.safePct);
    var infl = hist.cpi[idx];
    corpus = corpus * (1 + ret) + (inputs.monthlyInvestment * 12);
    inflatedMonthlyExpense *= (1 + infl);
    corpusByAge[inputs.currentAge + i + 1] = corpus;
  }

  // Post-retirement drawdown
  var monthlyExp = inflatedMonthlyExpense;
  for (var j = 0; j < (inputs.lifeExpectancy - inputs.retirementAge); j++) {
    var idx2 = Math.floor(prng() * hist.yearCount);
    var ret2 = (hist.nifty50[idx2] * inputs.stockPct
              + hist.debt[idx2]    * inputs.safePct);
    var infl2 = hist.cpi[idx2];
    var annualExpense = monthlyExp * 12;
    corpus = corpus * (1 + ret2) - annualExpense;
    if (corpus < 0) corpus = 0;
    monthlyExp *= (1 + infl2);
    corpusByAge[inputs.retirementAge + j + 1] = corpus;
  }

  return { corpusByAge: corpusByAge, finalMonthlyExp: monthlyExp };
}

// ---------- Aggregate N sims into success% + corpus percentiles ----------
function aggregate(allSims, ages) {
  // ages: target milestone ages [70,80,90,...]
  // For each age: success% = pct of sims where corpus[age] > 6mo expense buffer
  // Plus per-age P10/P50/P90 corpus values
  var n = allSims.length;
  var results = ages.map(function (age) {
    var corpora = [];
    var successes = 0;
    for (var i = 0; i < n; i++) {
      var c = allSims[i].corpusByAge[age];
      if (c === undefined) continue;
      corpora.push(c);
      // 6-month buffer = monthly expense at this age × 6
      // Use that sim's final monthly expense as proxy (close enough since
      // we approach lifeExpectancy)
      var sixMoBuffer = allSims[i].finalMonthlyExp * 6;
      if (c > sixMoBuffer) successes++;
    }
    corpora.sort(function (a, b) { return a - b; });
    var pct = function (p) {
      var idx = Math.floor(corpora.length * p);
      return corpora[Math.min(idx, corpora.length - 1)] || 0;
    };
    return {
      age: age,
      successPct: corpora.length > 0 ? Math.round((successes / corpora.length) * 100) : 0,
      p10: pct(0.10),
      p50: pct(0.50),
      p90: pct(0.90)
    };
  });
  return results;
}

// ---------- Determine age milestones (5 evenly spaced from retAge+1 → lifeExp) ----------
function ageMilestones(retAge, lifeExp) {
  var span = lifeExp - retAge;
  if (span < 5) {
    // very short retirement — show every year
    var arr = [];
    for (var a = retAge + 1; a <= lifeExp; a++) arr.push(a);
    return arr;
  }
  // 5 evenly spaced milestones from retAge+span/5 to lifeExp
  var step = span / 5;
  var ages = [];
  for (var k = 1; k <= 5; k++) {
    ages.push(Math.round(retAge + k * step));
  }
  // Ensure final point is exactly lifeExp (rounding may have produced lifeExp-1)
  ages[ages.length - 1] = lifeExp;
  // Dedupe in case of small spans
  return ages.filter(function (v, i, self) { return self.indexOf(v) === i; });
}

// ---------- Worker message handler ----------
var cancelled = false;

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.type === 'CANCEL') {
    cancelled = true;
    return;
  }
  if (msg.type !== 'RUN') return;

  cancelled = false;
  var inputs = msg.inputs;
  var hist = msg.hist;
  var seed = msg.seed || Date.now();
  var simCount = msg.simCount || 10000;
  var prng = makePRNG(seed);
  var startMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  var ages = ageMilestones(inputs.retirementAge, inputs.lifeExpectancy);
  var allSims = [];

  for (var i = 0; i < simCount; i++) {
    if (cancelled) {
      self.postMessage({ type: 'CANCELLED', completed: i });
      return;
    }
    allSims.push(runOneSim(inputs, hist, prng));
    if ((i + 1) % 1000 === 0) {
      self.postMessage({ type: 'PROGRESS', completed: i + 1 });
    }
  }

  var endMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  var results = aggregate(allSims, ages);

  // Sample 5 random individual futures so the user can see the underlying
  // randomness (vs the aggregate, which stabilises around the true probability).
  // Each sample includes: the age the corpus first hit zero (or "lasted" if it
  // never did) and the final corpus value at lifeExpectancy.
  function sampleFiveFutures() {
    var samples = [];
    var picked = {};
    var safety = 0;
    while (samples.length < Math.min(5, allSims.length) && safety < 50) {
      safety++;
      var idx = Math.floor(prng() * allSims.length);
      if (picked[idx]) continue;
      picked[idx] = true;
      var sim = allSims[idx];
      // Find first age where corpus hit zero
      var keys = Object.keys(sim.corpusByAge).map(Number).sort(function (a, b) { return a - b; });
      var ranOutAge = null;
      for (var k = 0; k < keys.length; k++) {
        if (sim.corpusByAge[keys[k]] <= 0) { ranOutAge = keys[k]; break; }
      }
      var finalCorpus = sim.corpusByAge[keys[keys.length - 1]] || 0;
      samples.push({
        ranOutAge: ranOutAge,
        finalCorpus: finalCorpus
      });
    }
    return samples;
  }

  self.postMessage({
    type: 'DONE',
    results: results,
    elapsedMs: Math.round(endMs - startMs),
    simCount: simCount,
    seed: seed,
    samples: sampleFiveFutures()
  });
};
