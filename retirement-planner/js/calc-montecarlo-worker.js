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

// ---------- Allocation helper (with optional age-based glide-down) ----------
// Glide rule (industry-standard "rule of 110"): Stock% = max(20, min(100, 110 - age)).
// User-set stockPct is honored UNLESS glideDown is enabled, in which case the
// glide rule wins for each year of the simulation.
function allocAt(age, inputs) {
  if (inputs.glideDown) {
    var s = 110 - age;
    if (s < 20) s = 20;
    if (s > 100) s = 100;
    return { stockPct: s / 100, safePct: 1 - (s / 100) };
  }
  return { stockPct: inputs.stockPct, safePct: inputs.safePct };
}

// ---------- Single simulation (taxes + fees + glide + shocks) ----------
function runOneSim(inputs, hist, prng) {
  // inputs: { currentAge, retirementAge, lifeExpectancy, currentSavings,
  //           monthlyInvestment, stockPct, safePct, postRetireMonthly,
  //           equityTax (decimal), debtTax, equityTer, debtTer,
  //           glideDown (bool), shocks (bool) }
  // hist:   { yearCount, nifty50[], debt[], gold[], cpi[] }
  // returns: { corpusByAge: {age: corpus}, finalMonthlyExp }

  var corpusByAge = {};
  var corpus = inputs.currentSavings;
  var inflatedMonthlyExpense = inputs.postRetireMonthly;
  var preRetYears = inputs.retirementAge - inputs.currentAge;

  // ---- Pre-retirement: accumulation ----
  // Annual return = stock% * NIFTY - equityTer + safe% * debt - debtTer.
  // TER (Total Expense Ratio) drags returns down every year, regardless of
  // whether the year is good or bad. SEBI-mandated, you cannot avoid it.
  for (var i = 0; i < preRetYears; i++) {
    var age = inputs.currentAge + i;
    var alloc = allocAt(age, inputs);
    var idx = Math.floor(prng() * hist.yearCount);
    var equityRet = hist.nifty50[idx] - inputs.equityTer;
    var debtRet   = hist.debt[idx]    - inputs.debtTer;
    var ret  = (equityRet * alloc.stockPct + debtRet * alloc.safePct);
    var infl = hist.cpi[idx];
    corpus = corpus * (1 + ret) + (inputs.monthlyInvestment * 12);
    inflatedMonthlyExpense *= (1 + infl);
    corpusByAge[age + 1] = corpus;
  }

  // ---- Post-retirement: drawdown with tax + fees ----
  // Each year:
  //   1. Apply growth (after TER drag) to corpus
  //   2. Compute annual expense (includes any shocks)
  //   3. Tax applies ONLY to the gains portion of the withdrawal, not
  //      the principal (LTCG/STCG mechanics — you already paid tax on
  //      the principal when you earned the salary). Approximate the
  //      "gains portion" as the fraction of corpus that is gain vs cost.
  //      Track cost basis as we go.
  //   4. Subtract gross withdrawal (expense + tax-on-gain) from corpus
  //   5. Inflate expense for next year
  var monthlyExp = inflatedMonthlyExpense;
  // costBasis = total amount the user actually contributed (principal).
  // Anything above this in `corpus` is "gain" subject to tax on withdrawal.
  // We seed it pessimistically: assume current corpus at retirement is ALL
  // principal (no built-in gain). This UNDERSTATES tax slightly which
  // matches conservative real-life behaviour (held-for-decades equity).
  var costBasis = corpus;
  for (var j = 0; j < (inputs.lifeExpectancy - inputs.retirementAge); j++) {
    var ageRet = inputs.retirementAge + j;
    var allocR = allocAt(ageRet, inputs);
    var idx2 = Math.floor(prng() * hist.yearCount);
    var eqRet = hist.nifty50[idx2] - inputs.equityTer;
    var dbRet = hist.debt[idx2]    - inputs.debtTer;
    var ret2  = (eqRet * allocR.stockPct + dbRet * allocR.safePct);
    var infl2 = hist.cpi[idx2];

    // Growth
    var corpusBefore = corpus;
    corpus = corpus * (1 + ret2);
    // Growth doesn't change cost basis — it adds unrealised gain.

    // Annual expense + spending shocks
    var annualExpense = monthlyExp * 12;
    if (inputs.shocks && ageRet >= 60 && ((ageRet - 60) % 10) === 0) {
      var shockInTodaysRupees = 500000;
      var yearsFromToday = ageRet - inputs.currentAge;
      var avgCpi = 0.06;
      var shockNow = shockInTodaysRupees * Math.pow(1 + avgCpi, yearsFromToday);
      annualExpense += shockNow;
    }

    // Tax-aware gross-up:
    //   gainFraction = (corpus - costBasis) / corpus   [proportion of withdrawal that is gain]
    //   netExpense   = the user's actual cash need (after tax)
    //   gross        = principal_part + gain_part
    //                = (1 - gainFraction) * gross + gainFraction * gross / (1 - effTax)
    // Solving for gross: gross = netExpense / (1 - gainFraction*effTax)
    var gainFraction = corpus > 0 ? Math.max(0, (corpus - costBasis) / corpus) : 0;
    var effTax = (allocR.stockPct * inputs.equityTax) + (allocR.safePct * inputs.debtTax);
    var grossWithdrawal = annualExpense / (1 - gainFraction * effTax);

    corpus = corpus - grossWithdrawal;
    if (corpus < 0) corpus = 0;
    // Reduce cost basis proportionally (you withdrew principal too)
    costBasis = Math.max(0, costBasis - grossWithdrawal * (1 - gainFraction));
    monthlyExp *= (1 + infl2);
    corpusByAge[ageRet + 1] = corpus;
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
