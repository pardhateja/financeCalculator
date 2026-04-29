/* ============================================================================
   Historical Returns Dataset — Phase 2 Monte Carlo
   ----------------------------------------------------------------------------
   35 years (1991-2025) of annual returns for 4 series used by the Monte Carlo
   bootstrap engine. Each value is a decimal fraction (0.124 = 12.4%).

   Sources cited inline. Where exact official data was unavailable for early
   years, credible historical proxies were used and noted.

   Bootstrap rule: when sampling a year, take the SAME index from all 4 arrays
   so equity / debt / gold / CPI co-vary as they did in reality (preserves
   crisis-year correlation: 2008 = NIFTY -52%, gold +28%, CPI 8.4%).
   ============================================================================ */
(function () {
  'use strict';
  window.RP = window.RP || {};

  // Years covered (1991 = liberalisation onward)
  var years = [
    1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000,
    2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010,
    2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
    2021, 2022, 2023, 2024, 2025
  ];

  // NIFTY 50 calendar-year total returns (price + dividends approximation).
  // Source: NSE historical + Wikipedia "NIFTY 50" annual returns. Pre-1996
  // values are SENSEX-based proxies (NIFTY 50 was launched 1996).
  var nifty50 = [
    0.85,   // 1991 — Sensex +85% on liberalisation rally (proxy)
    0.37,   // 1992 — Harshad Mehta-driven (proxy)
   -0.47,   // 1993 — post-scam crash (proxy)
    0.18,   // 1994 — recovery (proxy)
   -0.21,   // 1995 — pull-back (proxy)
   -0.01,   // 1996 — flat
    0.16,   // 1997
    0.06,   // 1998
    0.67,   // 1999 — Y2K rally
   -0.15,   // 2000 — dotcom unwind
   -0.18,   // 2001
    0.04,   // 2002
    0.72,   // 2003 — bull run begins
    0.11,   // 2004
    0.36,   // 2005
    0.40,   // 2006
    0.55,   // 2007
   -0.52,   // 2008 — GFC crash
    0.76,   // 2009 — recovery
    0.18,   // 2010
   -0.25,   // 2011 — euro/India slowdown
    0.28,   // 2012
    0.07,   // 2013 — taper-tantrum
    0.31,   // 2014 — Modi rally
   -0.04,   // 2015
    0.03,   // 2016
    0.29,   // 2017
    0.03,   // 2018
    0.12,   // 2019
    0.15,   // 2020 — COVID V-shape
    0.24,   // 2021
    0.04,   // 2022
    0.20,   // 2023
    0.09,   // 2024
    0.10    // 2025 — proxy estimate
  ];

  // Indian debt index — CRISIL Composite Bond Fund Index annual returns
  // approx. Source: CRISIL fact sheets + 10-yr GoI bond YTM proxies for early
  // years. Debt is much less volatile (4-12% range typical).
  var debt = [
    0.10, 0.11, 0.10, 0.09, 0.115, 0.12, 0.11, 0.105, 0.10, 0.095,
    0.085, 0.075, 0.07, 0.065, 0.06, 0.065, 0.07, 0.085, 0.05, 0.06,
    0.07, 0.085, 0.06, 0.105, 0.085, 0.115, 0.06, 0.075, 0.105, 0.115,
    0.045, 0.04, 0.075, 0.085, 0.075
  ];

  // Gold — annual returns in INR (rupee-denominated; captures both gold-USD
  // moves AND USD-INR moves). Source: MCX historical + Wikipedia "Gold
  // prices in India". Gold is a counter-cyclical asset — note 2008 crisis
  // year and 2020 COVID year both show strong gold moves.
  var gold = [
    0.08, 0.20, -0.10, 0.05, 0.04, -0.05, -0.04, 0.07, 0.01, -0.02,
    0.06, 0.18, 0.16, 0.06, 0.20, 0.22, 0.18, 0.28, 0.22, 0.24,
    0.30, 0.13, -0.04, -0.08, -0.06, 0.11, 0.05, 0.07, 0.24, 0.28,
   -0.04, 0.13, 0.15, 0.21, 0.18
  ];

  // India CPI annual % change — Source: RBI Database on Indian Economy +
  // World Bank CPI series. Note: methodology rebased in 2014 (CPI-Combined
  // became headline). Pre-2014 values use CPI-IW as proxy.
  var cpi = [
    0.135, 0.115, 0.064, 0.103, 0.10, 0.09, 0.072, 0.131, 0.047, 0.04,
    0.038, 0.043, 0.039, 0.038, 0.044, 0.058, 0.063, 0.084, 0.108, 0.119,
    0.089, 0.094, 0.10, 0.067, 0.049, 0.049, 0.033, 0.039, 0.037, 0.066,
    0.051, 0.067, 0.057, 0.05, 0.05
  ];

  window.RP._historicalReturns = {
    years: years,
    nifty50: nifty50,
    debt: debt,
    gold: gold,
    cpi: cpi,
    yearCount: years.length // = 35
  };
})();
