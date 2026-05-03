/**
 * Projection engine — ANCHORED MODEL (Pardha v2026-05-03)
 *
 * Replaces the old "start from currentSavings, project forward, lose past
 * rows as you age" model with a CALENDAR-anchored timeline:
 *
 *   - Anchor date = Tracker start date (rp_tracker_start_date),
 *     fallback = today's birthday-year start.
 *   - Past rows STAY visible permanently.
 *   - Each row = one birthday-year window: [anchor + N years] -> [anchor + N+1 years].
 *   - Past rows: SIP comes from actual Tracker entries; intra-year monthly
 *     compounding using calc-sip.js style loop (FIXES bug #1: year-1 SIP
 *     used to earn zero interest).
 *   - Current row: hybrid = past Tracker entries already in this window +
 *     planned SIPs for remaining months.
 *   - Future rows: planned monthlyInvestAmt with step-up, monthly compounding.
 *   - Seed enters the chain ONCE at the anchor and grows naturally year over
 *     year (FIXES bug #2: seed used to never earn interest).
 *
 * Single compounding chain throughout. No rate-jump at "today". The
 * Tracker's "Interest earned" display becomes redundant — that interest is
 * now visible in past projection rows directly.
 *
 * `currentSavings` field becomes a computed display: it shows the running
 * balance at "today" (the boundary inside the current row), not an input.
 */

/* ---------- Helpers ---------- */

/* Tracker start date YYYY-MM-DD. Falls back to today if not set. */
RP._anchorDate = function () {
  let raw = null;
  try { raw = localStorage.getItem('rp_tracker_start_date'); } catch (_) {}
  if (raw && /^\d{4}-\d{2}/.test(raw)) {
    // raw is "YYYY-MM" or "YYYY-MM-DD". Normalize to first of month.
    const parts = raw.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parts[2] ? parseInt(parts[2], 10) : 1;
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt;
  }
  return new Date();
};

/* DOB-day-of-month, used as the SIP cutoff. Fallback = day 1. */
RP._sipCutoffDay = function () {
  const dobEl = document.getElementById('dateOfBirth');
  if (!dobEl || !dobEl.value) return 1;
  const dob = new Date(dobEl.value);
  if (isNaN(dob.getTime())) return 1;
  return dob.getDate();
};

/* Months remaining in the user's CURRENT birthday-year (for legacy callers
 * like What-If/Loan that still use the old partial-year scaling). */
RP._monthsRemainingThisBirthdayYear = function () {
  const now = new Date();
  const dobEl = document.getElementById('dateOfBirth');
  let dobMonth, dobDay;
  if (!dobEl || !dobEl.value) {
    dobMonth = now.getMonth();
    dobDay = 1;
  } else {
    const dob = new Date(dobEl.value);
    if (isNaN(dob.getTime())) { dobMonth = now.getMonth(); dobDay = 1; }
    else { dobMonth = dob.getMonth(); dobDay = dob.getDate(); }
  }
  let nextBday = new Date(now.getFullYear(), dobMonth, dobDay);
  if (nextBday <= now) nextBday = new Date(now.getFullYear() + 1, dobMonth, dobDay);
  let months = (nextBday.getFullYear() - now.getFullYear()) * 12
             + (nextBday.getMonth() - now.getMonth());
  if (now.getDate() > dobDay) months -= 1;
  return Math.max(0, Math.min(12, months));
};

/* Actual Tracker contributions inside [windowStart, windowEnd). Returns a
 * 12-element array of monthly amounts, indexed 0..11 from windowStart. */
RP._trackerSipsInWindow = function (windowStart, windowEnd) {
  const out = new Array(12).fill(0);
  const entries = RP._trackerEntries || {};
  Object.keys(entries).forEach(function (key) {
    const e = entries[key];
    if (!e || !e.completed) return;
    const amt = parseFloat(e.actual) || 0;
    if (amt <= 0) return;
    let date;
    if (e.date) date = new Date(e.date);
    else if (/^\d{4}-\d{2}$/.test(key)) date = new Date(key + '-01');
    else return;
    if (isNaN(date.getTime())) return;
    if (date < windowStart || date >= windowEnd) return;
    const monthIdx = (date.getFullYear() - windowStart.getFullYear()) * 12
                   + (date.getMonth() - windowStart.getMonth());
    if (monthIdx >= 0 && monthIdx < 12) out[monthIdx] += amt;
  });
  return out;
};

/* Run a 12-month SIP loop using calc-sip.js style monthly compounding.
 * sips[i] = amount invested at start of month i.
 *
 * Returns { ending, sipTotal, growth, growthOnLumpsum, growthOnSips,
 * expenses }. To split growth between "interest on the existing corpus
 * (lumpsum)" and "interest on new SIPs deposited this year", we track
 * two parallel balances:
 *   - lumpBalance: starts at seedStart, only compounds (no SIP added)
 *   - sipBalance:  starts at 0, accumulates sips and compounds them
 * In retirement, expenses are debited from the lumpsum balance first
 * (since SIPs are zero anyway). */
RP._compoundYear = function (seedStart, sips, monthlyRate, expensesMonthly) {
  let lumpBalance = seedStart;
  let sipBalance = 0;
  let sipTotal = 0;
  let expenseTotal = 0;
  for (let m = 0; m < 12; m++) {
    if (sips && sips[m]) {
      sipBalance += sips[m];
      sipTotal += sips[m];
    }
    if (expensesMonthly) {
      lumpBalance -= expensesMonthly;
      expenseTotal += expensesMonthly;
    }
    lumpBalance *= (1 + monthlyRate);
    sipBalance  *= (1 + monthlyRate);
  }
  const balance = lumpBalance + sipBalance;
  const growthOnLumpsum = lumpBalance - (seedStart - expenseTotal);
  const growthOnSips    = sipBalance - sipTotal;
  const growth = growthOnLumpsum + growthOnSips;
  return {
    ending: balance,
    sipTotal: sipTotal,
    growth: growth,
    growthOnLumpsum: growthOnLumpsum,
    growthOnSips: growthOnSips,
    expenses: expenseTotal
  };
};

/* ---------- Main projection ---------- */

RP.generateProjections = function () {
  const seed = RP.val('currentSavingsSeed');
  const monthlyInvest = RP.val('monthlyInvestAmt');
  const stepUpPct = RP.val('stepUpRate') / 100;
  const inflation = RP.val('inflationRate') / 100;
  const postRetireMonthly = RP.val('postRetireMonthly');
  const retAge = RP.val('retirementAge');
  const lifeExp = RP.val('lifeExpectancy');

  const preReturn = RP._preReturn || 0.08;
  const postReturn = RP._postReturn || 0.05;
  const monthlyPre = Math.pow(1 + preReturn, 1 / 12) - 1;
  const monthlyPost = Math.pow(1 + postReturn, 1 / 12) - 1;

  const anchor = RP._anchorDate();
  const cutoffDay = RP._sipCutoffDay();
  const today = new Date();

  // Anchor age = how old the user was at the anchor date.
  const dobEl = document.getElementById('dateOfBirth');
  let dob = null;
  if (dobEl && dobEl.value) {
    const d = new Date(dobEl.value);
    if (!isNaN(d.getTime())) dob = d;
  }
  // Anchor age = the user's age in the BIRTHDAY-YEAR that contains the anchor.
  // Since each projection row spans birthday-to-birthday (anchored on the
  // anchor day), the row's age is the age the user is during MOST of that row.
  // Concretely: if anchor is in the calendar month of (or after) the user's
  // birthday in that year, anchorAge = year-diff. If anchor is BEFORE the
  // birthday in that calendar year, anchorAge = year-diff - 1.
  // BUT: we want the row to represent "the year you started tracking AS X
  // years old", so we use the upcoming/just-passed birthday closest to anchor.
  let anchorAge;
  if (dob) {
    anchorAge = anchor.getFullYear() - dob.getFullYear();
    // If anchor is BEFORE this year's birthday, the user hasn't turned
    // (year-diff) yet — they're still (year-diff - 1).
    const thisYearBday = new Date(anchor.getFullYear(), dob.getMonth(), dob.getDate());
    if (anchor < thisYearBday) anchorAge -= 1;
    // If anchor is within ~1 month BEFORE this year's birthday, consumers
    // typically think of it as "year I turn X" — round up to that age so
    // the first row reads as the upcoming birthday-year.
    const daysUntilBday = (thisYearBday - anchor) / (1000 * 60 * 60 * 24);
    if (daysUntilBday > 0 && daysUntilBday <= 31) anchorAge += 1;
  } else {
    anchorAge = RP.val('currentAge') || 28;
  }

  // Build rows from anchor up to lifeExp.
  const yearsTotal = lifeExp - anchorAge + 1;
  const rows = [];
  let balance = seed;
  let corpusAtRetirement = 0;
  let runsOutAge = null;
  RP._chartData = [];
  RP._currentRowIdx = -1;
  let runningTodayBalance = null; // captured when we cross "today" inside CURRENT row

  for (let i = 0; i < yearsTotal; i++) {
    const windowStart = new Date(anchor.getFullYear() + i, anchor.getMonth(), anchor.getDate());
    const windowEnd   = new Date(anchor.getFullYear() + i + 1, anchor.getMonth(), anchor.getDate());
    const age = anchorAge + i;
    const isPast    = windowEnd <= today;
    const isCurrent = windowStart <= today && today < windowEnd;
    const isFuture  = windowStart > today;
    const status = age < retAge ? 'Earning' : (age < lifeExp ? 'Retired' : 'Dead');
    const monthlyRate = age < retAge ? monthlyPre : monthlyPost;

    // Build the 12-element SIP array for this window.
    let sips;
    if (isPast || isCurrent) {
      // Past part = real Tracker entries within window.
      sips = RP._trackerSipsInWindow(windowStart, windowEnd);
    } else {
      sips = new Array(12).fill(0);
    }
    if (isCurrent && status === 'Earning') {
      // Fill remaining months with planned SIPs (months from "today" to windowEnd).
      const todayMonthIdx = (today.getFullYear() - windowStart.getFullYear()) * 12
                          + (today.getMonth() - windowStart.getMonth());
      const cutoffPassedThisMonth = today.getDate() > cutoffDay;
      const firstPlannedMonth = cutoffPassedThisMonth ? todayMonthIdx + 1 : todayMonthIdx;
      for (let m = firstPlannedMonth; m < 12; m++) {
        if (!sips[m]) sips[m] = monthlyInvest;
      }
    }
    if (isFuture && status === 'Earning') {
      // Step-up: each future year's planned SIP grows from the CURRENT-row
      // baseline. yearsSinceCurrent = i - currentRowIdx. If currentRowIdx
      // hasn't been set yet (anchor in future), use i (years since anchor).
      const baseIdx = (RP._currentRowIdx >= 0) ? RP._currentRowIdx : 0;
      const yearsSinceCurrent = i - baseIdx;
      const steppedAnnual = monthlyInvest * 12 * Math.pow(1 + stepUpPct, yearsSinceCurrent);
      for (let m = 0; m < 12; m++) sips[m] = steppedAnnual / 12;
    }

    // Retirement: drain monthly inflated expenses; no SIPs.
    let expensesMonthly = 0;
    let inflatedAnnualExpense = 0;
    if (status === 'Retired') {
      const yearsFromAnchor = i; // calendar years since anchor
      inflatedAnnualExpense = postRetireMonthly * Math.pow(1 + inflation, yearsFromAnchor) * 12;
      expensesMonthly = inflatedAnnualExpense / 12;
      sips = new Array(12).fill(0);
    }

    let row;
    if (status === 'Dead') {
      // Dead row inherits the same past/current/future flags as any
      // row — based on whether its window has passed today's date.
      row = { age, starting: 0, annualSavings: 0, growth: 0, ending: 0,
              status: 'Dead', expenses: 0, monthsInYear: 12,
              isPast: isPast, isCurrent: isCurrent, isFuture: isFuture,
              windowStart: windowStart };
    } else {
      const starting = balance;
      const result = RP._compoundYear(starting, sips, monthlyRate, expensesMonthly);
      const ending = result.ending;

      // For CURRENT row, capture running balance at "today" so currentSavings
      // can reflect today's actual corpus (not start-of-year).
      // Only count SIPs from FULLY-COMPLETED months before today's month.
      // Today's own month is "in progress" — not yet deposited (the engine
      // adds the user's monthly SIP only when the cutoff day passes; until
      // then it's not in the actual balance).
      // Pardha bug catch 2026-05-03: previously included today's-month SIP
      // (e.g. May 2.1L on May 3), inflating "Current Total Savings" by that
      // amount of money the user hadn't actually invested yet.
      if (isCurrent) {
        let bal = starting;
        const todayMonthIdx = (today.getFullYear() - windowStart.getFullYear()) * 12
                            + (today.getMonth() - windowStart.getMonth());
        // Walk through fully-completed months (m < todayMonthIdx).
        for (let m = 0; m < todayMonthIdx; m++) {
          if (sips[m]) bal += sips[m];
          bal *= (1 + monthlyRate);
        }
        // Today's-month: include the SIP only if today's day has passed the
        // SIP cutoff day (e.g. on May 20 May's 2.1L is already invested).
        // Compound from start-of-month to today proportionally (days/30).
        if (today.getDate() > cutoffDay && sips[todayMonthIdx]) {
          bal += sips[todayMonthIdx];
        }
        // Partial-month interest from start-of-month to today.
        const dayOfMonth = today.getDate();
        const partialMonthFraction = (dayOfMonth - 1) / 30;
        bal *= Math.pow(1 + monthlyRate, partialMonthFraction);
        runningTodayBalance = bal;
        RP._currentRowIdx = rows.length;
      }

      row = {
        age, starting,
        annualSavings: result.sipTotal,
        growth: result.growth,
        growthOnLumpsum: result.growthOnLumpsum,
        growthOnSips: result.growthOnSips,
        ending: ending,
        status, expenses: result.expenses,
        monthsInYear: 12,
        isPast, isCurrent, isFuture,
        windowStart: windowStart
      };

      if (ending < 0 && runsOutAge === null) runsOutAge = age;
      if (age === retAge - 1) corpusAtRetirement = ending;
      balance = ending;
    }

    rows.push(row);
    RP._chartData.push({ age: row.age, ending: row.ending });
  }

  RP._projectionRows = rows;

  // Update currentSavings field to reflect today's running balance (computed,
  // not user-input). Falls back to anchor seed if no current row found.
  const csEl = document.getElementById('currentSavings');
  if (csEl && runningTodayBalance !== null) {
    csEl.value = Math.round(runningTodayBalance);
  } else if (csEl) {
    csEl.value = Math.round(seed);
  }

  // Summary cards
  RP.setText('corpusAtRetirement', RP.formatCurrencyShort(corpusAtRetirement));
  RP.setText('yearsEarning', Math.max(0, retAge - anchorAge));
  RP.setText('yearsRetired', Math.max(0, lifeExp - retAge));
  RP.setText('runsOutAge', runsOutAge ? 'Age ' + runsOutAge : 'Never');

  // Render table
  const tbody = document.getElementById('projectionTableBody');
  if (tbody) {
    tbody.innerHTML = rows.map(function (r) {
      let rowClass = 'row-' + r.status.toLowerCase();
      if (r.ending < 0) rowClass += ' row-warning';
      if (r.isPast) rowClass += ' row-past';
      if (r.isCurrent) rowClass += ' row-current';
      const yr = r.windowStart ? r.windowStart.getFullYear() : '';
      const phaseTag = r.isPast    ? '<span class="phase-tag past">Past</span>'
                     : r.isCurrent ? '<span class="phase-tag current">Now</span>'
                     :               '';
      const ageLabel = r.age + ' <span style="font-size:0.78em;color:var(--text-secondary,#94a3b8);font-weight:normal;">(' + yr + ') ' + phaseTag + '</span>';
      const lumpG = r.growthOnLumpsum || 0;
      const sipG  = r.growthOnSips || 0;
      const growthCell = (r.status === 'Dead')
        ? '<div style="text-align:center;color:var(--text-secondary,#94a3b8);">—</div>'
        : '<div class="growth-stack">'
        +   '<div class="growth-row growth-row--lumpsum" title="Interest on the corpus carried in from prior years">'
        +     '<span class="growth-icon">📦</span>'
        +     '<span class="growth-label">Lumpsum</span>'
        +     '<span class="growth-value">' + RP.formatCurrency(lumpG) + '</span>'
        +   '</div>'
        +   '<div class="growth-row growth-row--sip" title="Interest on this year’s SIP contributions, compounded month by month">'
        +     '<span class="growth-icon">💧</span>'
        +     '<span class="growth-label">SIP</span>'
        +     '<span class="growth-value">' + RP.formatCurrency(sipG) + '</span>'
        +   '</div>'
        +   '<div class="growth-row growth-row--total" title="Total growth = Lumpsum + SIP">'
        +     '<span class="growth-icon">∑</span>'
        +     '<span class="growth-label">Total</span>'
        +     '<span class="growth-value">' + RP.formatCurrency(r.growth) + '</span>'
        +   '</div>'
        + '</div>';
      return '<tr class="' + rowClass + '">' +
        '<td>' + ageLabel + '</td>' +
        '<td>' + RP.formatCurrency(r.starting) + '</td>' +
        '<td>' + RP.formatCurrency(r.annualSavings) + '</td>' +
        '<td>' + growthCell + '</td>' +
        '<td>' + RP.formatCurrency(r.ending) + '</td>' +
        '<td><span class="status-badge ' + r.status.toLowerCase() + '">' + r.status + '</span></td>' +
        '<td>' + (r.expenses ? RP.formatCurrency(r.expenses) : '-') + '</td>' +
        '</tr>';
    }).join('');
  }

  const projTab = document.getElementById('tab-projections');
  if (projTab && projTab.classList.contains('active') && typeof RP.renderChart === 'function') {
    RP.renderChart();
  }
};
