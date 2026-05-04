# Stack Review — Phase 2 Monte Carlo

Reviewer: stack (pdlc-director-eng)
Date: 2026-04-30
Status: ✅ APPROVED

## 1. Stack inventory (existing)

Phase 1 established a **zero-dependency vanilla HTML/CSS/JS stack**:

| Component | Technology | Files |
|---|---|---|
| Markup | HTML5 | `build.sh` concatenates `pages/tab-*.html` into `index.html` |
| Styling | Vanilla CSS3 | `css/base.css`, `layout.css`, `forms.css`, `cards.css`, `tables.css`, `responsive.css`, `tracker.css`, `multigoal.css`, `dark.css` |
| Scripting | Vanilla ES6 JavaScript | 24 modules: `calc-*.js`, `utils.js`, `app.js`, `darkmode.js`, `sharelink.js`, `profiles.js`, `chart.js` |
| Charting | Canvas 2D API | `js/chart.js` (pure Canvas, no library) |
| State persistence | `localStorage` | via `profiles.js`, `sharelink.js` (base64-encoded JSON) |
| Build system | Bash script | `build.sh` (concatenation only, no transpilation) |
| Package manager | **NONE** | No `package.json`, no `node_modules`, no npm |
| CDN dependencies | **NONE** | No external script/stylesheet includes |
| Framework | **NONE** | Direct DOM manipulation via `document.getElementById` |

**Confirmed via index.html inspection**: 24 script tags, all local files, all vanilla JS. No React, no Vue, no jQuery. All computation is client-side; no server interaction.

**Phase 1 security surface**: localStorage only, no network calls, no third-party code, no XSS risk (all rendering via `textContent` or Canvas).

## 2. New stack additions for Phase 2

| Category | Proposal | Verdict |
|---|---|---|
| **New npm dependencies** | NONE | ✅ Nothing to add |
| **New CDN libraries** | NONE | ✅ Nothing to add |
| **New build tools** | NONE | ✅ `build.sh` unchanged |
| **New browser APIs** | Web Worker (via Blob URL), Canvas 2D (already used) | ✅ Reviewed in §3 |
| **New data files** | `js/historical-returns-data.js` (bundled NIFTY/debt/gold/CPI annual returns 1991-2025, ~35 years × 4 series ≈ 140 numbers, ~2KB) | ✅ Static data, no runtime dependency |
| **New JS modules** | `js/calc-montecarlo.js` (main logic), `js/calc-montecarlo-worker.js` (Web Worker), `js/chart-montecarlo.js` (Canvas charting) | ✅ All vanilla JS, Phase 1 pattern |
| **PRNG library** | **NONE** — mulberry32 seeded PRNG (8 lines inline, public domain) | ✅ No external dependency |
| **New localStorage keys** | `rp_projection_view` (toggle state: `'ideal'` \| `'montecarlo'`) | ✅ Non-sensitive, matches Phase 1 pattern |
| **New URL params** | `&view=montecarlo&mcseed=N` (share-link extension) | ✅ Backward compat maintained |

**Key observation**: Phase 2 adds **ZERO new external dependencies**. All "new stack" is browser-native APIs + plain JS following Phase 1's existing patterns.

### Web Worker delivery mechanism

**Proposed pattern**: Blob URL (works on both file:// and localhost per B6). Worker script (`calc-montecarlo-worker.js`) is loaded as text, wrapped in `new Blob([code], {type: 'application/javascript'})`, converted to URL via `URL.createObjectURL(blob)`, then passed to `new Worker(blobUrl)`.

**Why not external file**: External Worker files trigger CORS errors on file:// protocol. Blob URL pattern sidesteps this.

**Fallback**: If Blob URL Worker creation fails (e.g. Safari edge case), Tech Lead proposes sync chunked-compute fallback (run sim in 100-sim chunks, yield to UI thread between chunks). This is acceptable as graceful degradation but will NOT meet B5 "all tabs stay accessible" requirement. Blob URL is expected to work on all modern browsers.

### Historical returns dataset

**Source**: `js/historical-returns-data.js` will contain:
- NIFTY 50 annual returns 1991-2025 (35 data points)
- Indian debt index annual returns 1991-2025 (35 data points)
- Gold annual returns 1991-2025 (35 data points)
- Indian CPI annual inflation 1991-2025 (35 data points)
- Data sourced from RBI / NSE / Wikipedia, cited inline

**Format**: Plain JS `const RP.historicalReturns = { equity: [...], debt: [...], gold: [...], inflation: [...] };`

**Size**: ~140 numbers × ~10 bytes per number = ~1.4KB raw, ~2KB with object structure and comments. Trivial.

**License**: Historical market data is factual, not copyrightable. No license concern.

## 3. Browser API compatibility

### Web Worker (via Blob URL)

**Browser support**: Universal in modern browsers.

| Browser | Worker support | Blob URL support | Status |
|---|---|---|---|
| Chrome | v4+ (2010) | v23+ (2012) | ✅ Full support |
| Firefox | v3.5+ (2009) | v19+ (2013) | ✅ Full support |
| Safari | v4+ (2009) | v6+ (2012) | ✅ Full support |
| Edge | All versions | All versions | ✅ Full support |

**Verified**: [MDN Worker() constructor](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) confirms Worker API is stable and widely supported. [Can I Use Blob URLs](https://caniuse.com/bloburls) reports 100% support in all modern browsers as of 2026.

**file:// protocol concern (B6)**: Blob URLs are same-origin by definition; they inherit the origin of the creating document. On file://, this means `file://` origin. Web Workers created from Blob URLs work on file:// because the blob is treated as same-origin. **Verified safe pattern** per [Web Worker via blob URL gist](https://gist.github.com/nolanlawson/23eff93d27ad09ff44b7e4d56ffd1d54).

**Safari file:// edge case**: No known Safari-specific failures for Blob URL Workers on file:// in Safari 14+ (2020+). Historical Safari 6-13 had quirks with blob MIME types, but modern Safari (15-26.4 as of 2026) fully supports blob URLs. **Recommendation**: Tech Lead should smoke-test on Safari file:// during Stage 3 spike; if failure found, document as known limitation + offer sync fallback.

### Canvas 2D API

**Browser support**: Universal. Already in use in Phase 1 (`chart.js`).

**Verified**: [Can I Use Canvas](https://caniuse.com/canvas) reports 100% support across all browsers as of 2026. Phase 2 charts reuse existing Canvas 2D patterns (bar chart, axis rendering). No new Canvas features proposed beyond what Phase 1 already uses.

### localStorage

**Already used in Phase 1**. Phase 2 adds one new key (`rp_projection_view`). No compatibility concern.

### URLSearchParams

**Already used in Phase 1** (`sharelink.js`). Phase 2 extends with `&view=montecarlo&mcseed=N`. No compatibility concern.

### Other browser APIs (no change from Phase 1)

- `btoa()` / `atob()`: share-link encoding (Phase 1 pattern)
- `getBoundingClientRect()`: Canvas responsive sizing (Phase 1 pattern)
- `Date.now()`: default PRNG seed (standard since ES5)

**Conclusion**: All browser APIs proposed for Phase 2 are **stable, universally supported, and already battle-tested** (Worker + Blob URL since ~2012-2014; Canvas 2D since ~2010). No cutting-edge features. No experimental APIs. No polyfills needed.

## 4. Security review

### Threat model (unchanged from Phase 1)

Phase 2 inherits Phase 1's **client-side personal-use tool** threat model:

| Asset | Location | Protection | Risk |
|---|---|---|---|
| User financial data | Client `localStorage` only | None (plaintext JSON) | **Low** — personal-use tool, no multi-user, no server |
| Sharelink data | Base64-encoded URL fragment | None (URL params visible) | **Low** — user understands sharelinks are not encrypted |
| Computation logic | Client-side JS + Web Worker | None | **None** — no server trust boundary |
| Auth/identity | N/A | N/A | **None** — no accounts, no login |
| PII transmission | N/A | Never leaves device | **None** — fully offline-capable |

**Monte Carlo simulation data** (asset returns, inflation, sim results) is **non-sensitive**. PRNG seed is publicly shareable (enables reproducibility). No new sensitive data surfaces in Phase 2.

### Web Worker same-origin security

**Verified**: [MDN Worker() security](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) and [Chromium Service Worker Security FAQ](https://chromium.googlesource.com/chromium/src/+/main/docs/security/service-worker-security-faq.md) confirm Web Workers are same-origin restricted by default.

**Phase 2 implementation**: Worker is created from Blob URL derived from inline JS code in the same document. **Blob URL inherits the origin of the creating document** → same-origin by construction. No cross-origin data leakage risk.

**Worker sandbox**: Web Worker runs in **separate thread** but **same origin**. Worker has no DOM access (cannot manipulate UI), no `localStorage` access (cannot exfiltrate data), no network access beyond what the page itself could do. In Phase 2, Worker performs pure computation (Monte Carlo sim) and posts results back via `postMessage`. **No new attack surface** compared to running the same computation on the main thread.

### Content Security Policy (CSP)

Phase 1 has **no CSP headers** (served as static HTML, no server). Phase 2 does not change this.

**If user later adds CSP**: Worker creation from Blob URL requires `worker-src blob:` or `default-src blob:` in CSP. This is a standard pattern for inline workers. **Not a security concern** — blob URLs are same-origin and cannot load external scripts.

### No XSS surface

Phase 2 adds no new user input that renders as HTML. All new UI is:
- Canvas-drawn charts (no HTML injection risk)
- `textContent` updates for success% labels (no HTML injection risk)
- Pre-defined plain-English messages (hardcoded strings, not user-derived)

**Conclusion**: ZERO new XSS surface. Inherits Phase 1's clean profile.

### No dependency supply-chain risk

**Phase 2 adds ZERO npm dependencies, ZERO CDN scripts.** No supply-chain risk. No `npm audit` surface. No third-party code to vet.

**mulberry32 PRNG**: 8 lines of code, public domain, widely used. Inline in `calc-montecarlo.js`, not imported from npm. **No external trust boundary.**

### Historical data integrity

Historical returns dataset (`historical-returns-data.js`) is **static, bundled at build time**. Sourced from RBI / NSE / Wikipedia. Data is **factual** (public historical records), not executable code.

**Risk**: If data is wrong (typo, bad source), Monte Carlo results will be wrong. **Mitigation**: Tech Lead will cite sources inline and spot-check against known data (e.g., NIFTY 50 2008 crash = ~50% drawdown, 2021 boom = ~25% gain). This is a **data quality** issue, not a **security** issue.

**No runtime data fetching**: Data is hardcoded in JS, not fetched from API. **No network request risk.** **No MITM risk.**

### Share-link PRNG seed exposure

Share-link URL includes `&mcseed=N` (integer seed for reproducibility). **This is not a secret.** Exposing the seed enables anyone with the link to reproduce the exact same Monte Carlo run (deterministic randomness). This is **intentional** for collaboration/debugging.

**No security implication**: PRNG seed is not cryptographic; it's a simulator input. Comparable to sharing a spreadsheet's random seed for Monte Carlo in Excel.

### Performance-based DoS (client-side)

User can configure 10K+ simulations, which could hang the browser if Worker fails to yield. **Mitigation already planned** (per B5): Worker posts progress updates every 1000 sims; UI shows cancel button; cancel sends `{type:'CANCEL'}` postMessage to Worker, Worker exits gracefully.

**Not a security issue** — user can already hang their own browser by entering absurd inputs (e.g., lifeExpectancy = 1000 years in Phase 1 projection table). This is a **UX quality** issue, not a **security vulnerability**.

---

### Summary: ZERO new security surface

Phase 2 proposes:
- ✅ No new network requests
- ✅ No new third-party code
- ✅ No new user-generated HTML rendering
- ✅ No new persistent storage beyond one localStorage key (non-sensitive toggle state)
- ✅ No new authentication/authorization surface
- ✅ No new cross-origin interactions

**Verdict**: Phase 2 inherits Phase 1's **minimal attack surface** and adds nothing concerning. Same-origin Web Worker is **standard practice** for offloading compute. Blob URL delivery is **safer than external script** (no CORS, no CDN compromise risk).

## 5. Verdict

**✅ APPROVED — no concerns**

---

### Justification

Phase 2 proposes **ZERO new dependencies** and **ZERO new security surface**. All "new stack" is:

1. **Browser-native APIs** (Web Worker, Blob URL, Canvas 2D) — all stable since 2012-2014, universally supported in 2026, already proven at scale across the web.
2. **Plain vanilla JS** following Phase 1's established patterns (`calc-*.js` modules, Canvas charting, localStorage state).
3. **Static historical data** (~2KB of factual numbers) bundled at build time, no runtime network dependency.
4. **8-line public-domain PRNG** (mulberry32) — inline, no external import.

**Nothing to CVE-check.** **Nothing to license-review.** **Nothing to block.**

Phase 2 is **the simplest possible stack extension** — it's the computational equivalent of Phase 1's multi-goal allocator (which also added zero dependencies and just used more vanilla JS math).

---

### Required actions before Stage 2

**None.** Stack is approved as-is.

---

### Notes for Tech Lead

1. **Blob URL Worker smoke-test on Safari file://** — Not a blocker, but verify during Stage 3 spike that Safari 15+ can create Workers from Blob URLs when the page is opened via `file://`. If it fails (unlikely), document as known limitation and offer sync chunked fallback. Do NOT pre-implement the fallback; only add if Safari test fails.

2. **Historical data citation** — Inline comments in `historical-returns-data.js` must cite sources (e.g., "NIFTY 50 data from NSE historical archives, CPI from RBI Handbook of Statistics"). This isn't a security requirement; it's a **data quality / audit trail** requirement. Spot-check against known events (2008 crash, 2020 pandemic dip, 2021 recovery).

3. **PRNG determinism test** — `test-montecarlo.html` must include a test: "Given seed=42, two consecutive 10K-sim runs produce identical success% for all age points." This proves reproducibility (critical for share-link debugging). 8 lines of code = low complexity, but determinism is the contract.

4. **No framework temptation** — Phase 2 will involve ~400-500 lines of new JS (MC engine ~150L, Worker ~80L, charts ~150L, UI glue ~100L). DO NOT "upgrade to a framework while we're at it." Vanilla JS is the locked constraint. If the complexity feels unwieldy, that's a signal to simplify the feature, not to introduce React.

5. **build.sh update** — Single 3-line change required:
   - Add `historical-returns-data.js` to script list (after `utils.js`, before `calc-*.js`)
   - Add `calc-montecarlo.js` to script list (after `calc-tracker.js`, before `sharelink.js`)
   - Add `chart-montecarlo.js` to script list (after `chart.js`, before `app.js`)
   
   Worker script (`calc-montecarlo-worker.js`) is **NOT concatenated** into `index.html` — it's loaded as text by `calc-montecarlo.js` and blobified at runtime.

6. **Performance contract verification** — The "10K sims in <8s on 2020 MacBook Air" requirement is **non-negotiable** (locked in B5). If your Monte Carlo implementation is slower:
   - Profile the hot loop (likely the per-year corpus draw loop)
   - Optimize tight loops (avoid repeated `Math.log`, cache inflation-adjusted multipliers, etc.)
   - If still slow, reduce sim count to 5K and document the tradeoff
   
   Do NOT ship a laggy experience and blame the user's hardware. 10K sims × 100 years × 3 asset classes = 3M operations. Modern JS can do this in <5s if written tightly.

---

### Final checklist

- ✅ No new dependencies to approve
- ✅ No CVEs to investigate (zero external libs)
- ✅ No license conflicts
- ✅ Security model reviewed and accepted (client-side personal tool, same-origin Worker, no new attack surface)
- ✅ Browser API compatibility verified (Worker + Blob URL + Canvas 2D all universally supported)
- ✅ Performance contract stated (10K sims <8s, verifiable in Stage 4)
- ✅ No ADRs required (continuation of Phase 1 zero-dependency architecture)
- ✅ No blocking concerns

**Stage 1 complete. Tech Lead may proceed to Stage 2 (Tech Spec).**

---

### Sources

Browser API compatibility verified via:
- [MDN Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker)
- [Can I Use: Blob URLs](https://caniuse.com/bloburls) — 100% modern browser support
- [Can I Use: Canvas 2D](https://caniuse.com/canvas) — 100% modern browser support
- [Web Worker Blob URL pattern (GitHub gist)](https://gist.github.com/nolanlawson/23eff93d27ad09ff44b7e4d56ffd1d54)
- [MDN Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [Chromium Service Worker Security FAQ](https://chromium.googlesource.com/chromium/src/+/main/docs/security/service-worker-security-faq.md)
