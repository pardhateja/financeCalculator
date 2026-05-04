# User Journeys — Phase 2 Monte Carlo Stress Test

For each persona, the top 1-3 task flows. Use this format:

---

## Journey 1: Pardha runs first Monte Carlo simulation (cold start)

**Trigger**: Pardha has finished configuring retirement plan in Phase 1 (Calculator inputs complete, Projections tab shows year-by-year Ideal Scenario table). He wants to stress-test whether the plan survives market volatility, not just the ideal case.

**Success state**: Sees "Success Rate vs. Age" chart showing color-coded bars (e.g., age 70: 99% green, age 80: 85% green, age 95: 42% red), plus plain-English summary ("Your plan is great until 80, risky after 95"), understands the risk timeline, feels confident in the Monte Carlo rigor.

**Failure state**: Clicks "Stress Test" toggle → sees infinite spinner or "Simulation failed" error → can't recover without refreshing → loses trust in the feature, reverts to using only the Ideal Scenario deterministic projection.

### Steps (happy path)
1. User opens Projections tab (sees existing Ideal Scenario table from Phase 1) → toggle at top reads "View: **Ideal Scenario** | Stress Test (Monte Carlo)"
2. User clicks "Stress Test (Monte Carlo)" segment → UI switches to Stress Test view
3. App shows empty state: gray placeholder card + "Configure your retirement plan to run Monte Carlo" + "Run Simulation" button (initially disabled if inputs incomplete)
4. User clicks "Run Simulation" → button changes to progress bar "Simulating... 3,847 / 10,000 (38%)" + "Cancel" button appears → UI remains interactive (can click other tabs)
5. Progress bar fills over 4-6 seconds → completion shows "✓ Simulation complete (10,000 runs in 4.2s)"
6. Chart renders: vertical bars for ages 70, 80, 90, 95, 100 → each bar height = success%, color per B3 thresholds (≥85% green, 75-84% blue, 50-74% amber, <50% red)
7. Above chart: callout box "Your plan is great until age 80 (85% success), risky after age 95 (42% success). Consider increasing monthly investment by ₹8,500 to reach 85% confidence at age 95." + "Adjust Investment →" button
8. User reads chart → sees age 95 is red (42%) → clicks "Adjust Investment →" → lands on Calculator tab, Income section, monthly investment input auto-focused
9. User increases monthly SIP ₹5K → ₹30K → switches back to Projections/Stress Test → clicks "Run Simulation" again → new chart shows age 95 now 78% (blue), age 100 still 38% (red)
10. User interprets: "Working 2 more years would be safer than increasing SIP" → feels equipped to make decision

### Branches / edge cases
- **If inputs incomplete** (no currentAge or retirementAge configured): "Run Simulation" button stays disabled, tooltip says "Complete Calculator inputs first" + "Go to Calculator" link
- **If simulation takes >8s** (slow device, 10K sims): footer shows warning "Simulation slow (9.3s). Try 5,000 sims or close other browser tabs."
- **If Web Worker fails to initialize** (Safari file:// edge case): fallback to synchronous chunked compute with warning "Simulation running in main thread — UI may freeze briefly"
- **If user switches to another tab mid-sim**: simulation continues in background (Web Worker keeps running), when user returns to Projections/Stress Test, progress bar still updating
- **If localStorage `rp_projection_view` = `'montecarlo'`**: on next app load, Projections tab opens directly to Stress Test view (persisted preference)

### Friction we're solving for
1. **"I don't know if my deterministic plan accounts for market crashes"** — Ideal Scenario assumes 12% equity return every year. Real markets crash. Monte Carlo shows what happens when they do.
2. **"When does my plan start to fail?"** — Single overall success% (e.g., "68% success") is not actionable. Age-specific breakpoints ("great until 80") enable concrete decisions.
3. **"I want to share this with my spouse but they won't trust a single-path Excel model"** — "85% success in 10,000 random scenarios" is more credible than "Excel says it works."

---

## Journey 2: Pardha tweaks inputs while Monte Carlo is running (cross-tab navigation)

**Trigger**: Monte Carlo simulation is running (progress bar at 42%, ~3s remaining). Pardha remembers he forgot to update his monthly investment amount in the Calculator tab. He wants to fix it without losing the current sim.

**Success state**: Switches to Calculator tab, edits monthly investment, switches back to Projections/Stress Test, sees progress bar still advancing (sim didn't crash), sim completes successfully, new inputs will be used on next "Run Simulation" click.

**Failure state**: Switches to Calculator tab → sim crashes silently in background → returns to Projections tab → sees frozen progress bar at 42% forever → has to refresh page to recover → loses work, loses trust.

### Steps (happy path)
1. User clicks "Run Simulation" in Projections/Stress Test → progress bar starts "Simulating... 1,247 / 10,000 (12%)"
2. User remembers "I need to update monthly SIP" → clicks Calculator tab in top nav → Calculator tab renders
3. Simulation continues in Web Worker (background thread) → progress bar NOT visible on Calculator tab (that's expected — it's a Projections-tab UI element)
4. User edits "Monthly Investment" ₹20K → ₹25K → no auto-rerun (inputs staged, not applied until next sim)
5. User switches back to Projections tab → clicks Stress Test segment (if not already active) → sees progress bar now at 78%, still advancing
6. Simulation completes → chart renders using OLD inputs (₹20K monthly SIP, because that's what the running sim started with)
7. User clicks "Run Simulation" again → NEW sim starts with ₹25K monthly SIP → new chart reflects updated inputs

### Branches / edge cases
- **If user edits Calculator inputs while sim is running**: app does NOT auto-cancel the running sim. The running sim completes with old inputs. User must manually click "Run Simulation" again to use new inputs.
- **If user closes the app tab while sim is running**: Web Worker terminates (browser kills it), sim lost. On next app open, Stress Test view shows last cached result (if any) OR empty state "Run Simulation to see results."
- **If user rapidly switches tabs 10x while sim is running**: sim keeps running undisturbed (Web Worker isolated from main thread UI churn).
- **If user clicks "Run Simulation" AGAIN while a sim is already running**: current sim auto-cancels (postMessage `{type:'CANCEL'}`), new sim starts immediately.

### Friction we're solving for
1. **"I don't want to wait 5 seconds to fix a typo"** — Blocking the UI during sim means user can't navigate, can't fix errors, feels stuck. Web Worker keeps UI responsive.
2. **"I forgot to update one input and now I have to wait or cancel"** — Non-blocking sim means user can fix it in parallel, then re-run.
3. **"The app froze and I don't know if it crashed or is still working"** — Progress bar + wall-clock time in footer ("Last run: 4.2s") gives continuous feedback that sim is alive.

---

## Journey 3: Pardha cancels mid-simulation to change inputs

**Trigger**: Monte Carlo simulation is running (progress bar at 58%). Pardha realizes he entered the wrong retirement age (35 instead of 40) and wants to fix it immediately, not wait for the current sim to finish.

**Success state**: Clicks "Cancel" button → progress bar disappears, "Run Simulation" button re-enables → switches to Calculator, fixes retirement age → returns to Stress Test, clicks "Run Simulation" → new sim starts with correct inputs → completes successfully.

**Failure state**: Clicks "Cancel" → button grays out but progress bar keeps advancing → user trapped, can't stop the sim → has to wait 4 more seconds or refresh the page → frustration, feels loss of control.

### Steps (happy path)
1. User clicks "Run Simulation" → progress bar starts "Simulating... 2,384 / 10,000 (24%)" + "Cancel" button visible next to it
2. User realizes "Wait, I set retirement age to 35 but I meant 40" → clicks "Cancel" button
3. App sends `postMessage({type:'CANCEL'})` to Web Worker → Worker ACKs and exits gracefully
4. Progress bar disappears → UI reverts to "Run Simulation" button (enabled) + shows last cached chart (if any) OR empty state (if this was first run)
5. User clicks Calculator tab → changes "Retirement Age" 35 → 40 → returns to Projections/Stress Test
6. User clicks "Run Simulation" → new sim starts with corrected inputs (retirement age 40) → completes in 4.1s → chart renders
7. User sees new results reflect 5 extra working years (more corpus accumulation, higher success rates at all ages)

### Branches / edge cases
- **If user clicks "Cancel" at 99% progress**: sim still cancels immediately (doesn't finish the last 1%). Worker exits, no result rendered.
- **If Worker is stuck and doesn't ACK cancel within 2s**: main thread assumes Worker crashed, kills it via `worker.terminate()`, shows error toast "Simulation canceled (forced). Refresh if issues persist."
- **If user cancels, THEN immediately clicks "Run Simulation" before UI fully resets**: debounce prevents double-start. UI waits for cancel ACK before allowing new sim.
- **If user cancels, then switches to another tab without re-running**: next time they return to Stress Test tab, they see empty state OR last successful result (not the canceled partial result).

### Friction we're solving for
1. **"I can't fix my mistake until the sim finishes"** — 5-8 second wait feels long when you know the result will be wrong. Cancel gives immediate control back.
2. **"I don't know if I can safely stop it or if that will break something"** — Explicit "Cancel" button with instant feedback (progress bar disappears) makes it safe and obvious.
3. **"The app is computing wrong data and I'm stuck watching"** — Lack of cancel = user either rage-refreshes (losing all state) or waits resentfully. Cancel preserves state while allowing correction.

---

## Journey 4: Pardha shares reproducible Monte Carlo result with a friend

**Trigger**: Pardha has run a Monte Carlo sim, sees concerning results (age 95: 42% success), wants to share the EXACT chart with a friend in the FIRE community to get feedback ("Am I interpreting this correctly? Should I work 2 more years?").

**Success state**: Copies share-link URL from browser address bar (auto-updated with `&view=montecarlo&mcseed=1714406392847`), sends to friend via WhatsApp, friend opens link, sees IDENTICAL chart (same success% at each age), both can discuss the same data, friend suggests "Reduce post-retirement spend 10% instead of working longer."

**Failure state**: Sends link without seed → friend opens it → their browser runs a NEW Monte Carlo sim with different random seed → sees different results (age 95: 38% instead of 42%) → confusion, can't have productive conversation, loses credibility ("Your tool gives different answers every time?").

### Steps (happy path)
1. User runs Monte Carlo sim in Projections/Stress Test → chart renders with specific results (age 70: 99%, age 80: 85%, age 95: 42%)
2. Browser URL bar auto-updates from `index.html?plan=base64data` to `index.html?plan=base64data&view=montecarlo&mcseed=1714406392847` (seed appended)
3. User copies URL from address bar → sends to friend via WhatsApp: "Check this out, risky after 95. Should I work longer or cut spending?"
4. Friend (on different device) clicks link → app loads, parses `&mcseed=1714406392847` param → auto-navigates to Projections/Stress Test tab
5. App runs Monte Carlo sim using SEEDED PRNG (mulberry32 initialized with seed 1714406392847) → produces IDENTICAL results (age 70: 99%, age 80: 85%, age 95: 42%) → chart renders
6. Friend sees exact same chart Pardha saw → replies "Your spend drops 40% when kids leave at 55, right? Just trim that phase 10% and you're fine" → actionable feedback based on shared ground truth
7. Pardha returns to Calculator, adjusts Phase 3 spend, re-runs MC, shares NEW link with new seed → iterative collaboration

### Branches / edge cases
- **If friend's link is missing `&mcseed=` param** (e.g., Pardha manually typed URL instead of copying): friend's browser generates NEW random seed (`Date.now()`), runs different sim, sees different results. No error, but results don't match.
- **If friend edits inputs before running sim**: seeded sim uses friend's EDITED inputs + Pardha's seed → results differ (inputs changed, not just randomness). This is expected behavior.
- **If Pardha shares link but friend opens it 2 weeks later**: results identical (seed is deterministic, historical data is static 1991-2025). No drift over time.
- **If Pardha runs sim TWICE with same inputs without refreshing page**: each run gets a NEW seed (current timestamp), results differ slightly. To get reproducible result, must use the seed from the URL.

### Friction we're solving for
1. **"Monte Carlo is random, so how do I share a specific result?"** — Without seeded PRNG, every run is different. Seeding makes the randomness reproducible.
2. **"My friend sees different numbers and thinks the tool is broken"** — Non-reproducible results destroy trust and make collaboration impossible.
3. **"I want to compare 'what if I work 2 more years' vs 'what if I cut spending 10%' but I can't isolate the variable"** — Seeded sim means the ONLY difference between two runs is the input change, not random noise.

---

## Journey 5: Non-technical user sees risky plan and takes action

**Trigger**: Non-technical user (Persona 2 — first-time MC user, shared link from Pardha) opens the app, clicks Projections → Stress Test, runs Monte Carlo, sees RED bars at age 90+ and wants to know what to do about it, but doesn't understand what "42% success" means or how to fix it.

**Success state**: Sees plain-English callout "Your plan is risky after age 90 (42% success). You may run out of money. Increase monthly investment by ₹8,500 to reach 85% confidence." → clicks "Adjust Investment →" button → lands on Calculator/Income tab with monthly investment input auto-focused → increases ₹5K → returns to Stress Test, re-runs sim → sees age 90 now BLUE (78%) instead of red → feels reassured, understands the action-result link.

**Failure state**: Sees chart with red bars and percentages → no explanation of what "42% success" means → no suggestion for what to do → feels anxious but paralyzed → closes app, posts in FIRE forum "My Monte Carlo says 42%, is that bad?", wastes time waiting for strangers to interpret.

### Steps (happy path)
1. User opens Projections tab → sees toggle "Ideal Scenario | Stress Test (Monte Carlo)" → clicks Stress Test (curious what it means)
2. Empty state shows "Run Simulation" button → user clicks it (no idea what will happen, but button is inviting)
3. Progress bar runs → completes → chart renders with bars: age 70 green (99%), age 80 blue (85%), age 90 amber (68%), age 95 red (42%), age 100 red (28%)
4. Above chart: callout box (orange/warning background per Phase 1 `.alert-warning` style) with text: "⚠️ Your plan is great until age 80 (85% success), risky after age 90 (68% success). At age 95, you may run out of money (42% success). **Increase monthly investment by ₹8,500** to reach 85% confidence at age 95."
5. User reads "may run out of money" → understands risk without needing to know what Monte Carlo is → sees concrete number "₹8,500" → clicks "Adjust Investment →" button in callout
6. App navigates to Calculator tab, scrolls to Income section, focuses monthly investment input (currently ₹20,000) → input glows with focus ring
7. User edits ₹20,000 → ₹28,500 → switches back to Projections/Stress Test → clicks "Run Simulation" again
8. New chart renders: age 90 now blue (81%), age 95 now blue (76%), age 100 still amber (54%) → callout updates: "✓ Your plan is OK until age 95 (76% success), risky after age 100 (54% success)."
9. User thinks "Age 100 is very old, 54% is acceptable" → feels satisfied, closes app

### Branches / edge cases
- **If user sees ALL GREEN bars (≥85% at all ages)**: callout shows "✓ Your plan is strong at all ages. You have a 99% chance of having money left at age 100." + green background (`.alert-success`). No CTA button (nothing to fix).
- **If user sees ALL RED bars (<50% at all ages)**: callout shows "🔴 Your plan is high-risk at all ages. Even at age 70, success rate is only 48%. Consider working 5 more years or reducing expenses 20%." + red background (`.alert-danger`). CTA: "Adjust Plan →" links to Calculator tab.
- **If increasing monthly investment by suggested amount is not enough** (e.g., suggestion says ₹8,500 but user's budget only allows ₹3,000): user increases by ₹3K, re-runs, sees age 95 improves from 42% → 58% (still amber) → callout updates with new suggestion "Increase by ₹5,500 more..." User iterates until satisfied OR accepts risk.
- **If user doesn't understand "85% confidence"**: callout includes tooltip icon next to first mention, hover shows "In 85 out of 100 random market scenarios, you still have money left at this age."

### Friction we're solving for
1. **"I don't know what Monte Carlo means or what these percentages mean"** — Plain-English interpretation ("may run out of money") translates jargon into consequences.
2. **"I see a problem but don't know how to fix it"** — Concrete suggestion ("Increase by ₹8,500") + CTA button removes decision paralysis.
3. **"I changed something but don't know if it worked"** — Color change (red → blue) + updated callout text gives instant feedback that the action had the desired effect.
