# User Journeys — Multi-Goal Age-Phased Early Retirement Planner

---

## Journey 1: First-time use → configure phases → validate funding (happy path)

**Trigger**: Pardha has been using the single-bucket retirement planner but realizes it doesn't model his actual life-phase cost structure. He wants to see if his ₹8Cr corpus will cover: (1) active early retirement with kids at home, (2) college years spike, (3) empty-nest reduced spending, (4) old-age medical costs.

**Success state**: Multi-goal projection shows all four phases are fully funded (green indicators), with corpus lasting until lifeExpectancy age 85. Pardha saves the profile and trusts the numbers enough to stop using his spreadsheet.

**Failure state**: User gets stuck during phase config (e.g., enters endAge before startAge, creating invalid phase), sees cryptic error, can't proceed, abandons feature and returns to single-bucket planner.

### Steps (happy path)

1. **User navigates to Multi-Goal tab** (new tab between "Goals" and "Emergency" in nav bar)  
   → App shows empty state: "No phases added yet. Life phases help you model varying retirement expenses over time."  
   → User sees "Load Example" button (gray, secondary style)  
   → User feels: curious but slightly uncertain what a "phase" is

2. **User clicks "Load Example"**  
   → App pre-fills 4 phases based on intake template (00-intake.md table):
   - Phase 1: "Active Retirement" | ages 35-50 | ₹80K/mo | 6% inflation
   - Phase 2: "Kids in College" | ages 42-46 | ₹1.2L/mo | 10% inflation
   - Phase 3: "Empty Nest" | ages 51-70 | ₹40K/mo | 6% inflation
   - Phase 4: "Medical Years" | ages 71-85 | ₹60K/mo | 12% inflation  
   → Timeline visualization appears (horizontal Gantt-style strip showing 4 colored phase bars, overlapping phases 1+2 visible)  
   → User feels: "Ah, this matches my mental model exactly"

3. **User reviews pre-filled phases**  
   → Notices Phase 2 overlaps Phase 1 (college years happen DURING active retirement, not after)  
   → App shows info banner: "⚠️ Years 42-46 are covered by multiple phases. Expenses will be summed for those years."  
   → User feels: relieved this is allowed, not an error

4. **User edits Phase 3 inflation**  
   → Changes "Empty Nest" inflation from 6% to 5% (believes his spending will be more stable)  
   → Clicks "Update Phase" or presses Enter  
   → Phase card updates, timeline remains unchanged (ages didn't move)  
   → User feels: in control, no page reload

5. **User scrolls to "Allocation & Funding" section**  
   → App shows pre-flight allocation table:
     | Phase | PV (₹Cr) | Allocation (₹Cr) | Status |
     |---|---|---|---|
     | Active Retirement | 3.2 | 3.2 | 🟢 Funded |
     | Kids in College | 0.9 | 0.9 | 🟢 Funded |
     | Empty Nest | 2.1 | 2.1 | 🟢 Funded |
     | Medical Years | 1.5 | 1.5 | 🟢 Funded |
     | **Total** | **7.7** | **7.7** | 🟢 Fully funded |  
   → Horizontal stacked bar below table shows 4 colored segments (blue, emerald, amber, purple) proportional to allocation  
   → User feels: confident all phases are covered

6. **User scrolls to "Year-by-Year Projection" section**  
   → App shows projection table (same format as existing Projections tab) with new "Active Phase(s)" column showing colored badges  
   → Chart.js line chart shows balance over time, with vertical shaded regions for each phase (blue region 35-50, green spike 42-46, amber 51-70, purple 71-85)  
   → Chart legend shows phase names + colors  
   → User feels: visual confirmation matches the numbers

7. **User clicks "Save Profile"** (existing Profiles tab integration)  
   → App saves `RP._phases` array to localStorage + generates sharelink with `_phases` field  
   → Toast notification: "✅ Profile saved with 4 life phases"  
   → User feels: done, can iterate tomorrow

8. **Success state reached**: User closes browser. Returns next day, loads profile, multi-goal tab auto-populates phases. User tweaks Phase 4 medical inflation to 14%, recalculates, sees new allocation. Stops using external spreadsheet.

---

### Branches / edge cases

- **If corpus is insufficient (see Journey 2 below)**: User sees red deficit rows, gets actionable suggestion, proceeds to adjust SIP amount in Investments tab
- **If user deletes a phase by accident**: Toast shows "Phase deleted" with 5s undo button; user clicks undo, phase restores
- **If user tries to create phase with endAge < startAge**: Input validation prevents submission; inline error text appears: "End age must be after start age"
- **If user leaves a gap (e.g., ages 50-60 uncovered)**: Info banner shows "⚠️ Years 50-60 have no phases. Post-retirement expense will be ₹0 for those years." User can proceed (intentional) or add a phase to cover gap

---

### Friction we're solving for

1. **Single-bucket model breaks for early retirement**: Existing planner assumes flat post-retirement expense. For early retirees, this is dangerously wrong — it either over-allocates (wastes money) or under-allocates (runs out). Multi-goal fixes this by modeling reality.
2. **Manual spreadsheet overhead**: Pardha currently builds PV calculations in Excel for each phase, then manually sums them. Multi-goal automates the PV math + allocation algorithm, reducing error risk and iteration time.
3. **Invisible phase overlaps**: In a spreadsheet, overlapping phases (college during active retirement) require careful cell formulas to sum expenses. Multi-goal handles this automatically and SHOWS the user it's happening via the info banner, reducing cognitive load.

---

## Journey 2: Insufficient corpus → identify deficit → get actionable suggestion (deficit path)

**Trigger**: User configures 4 phases with total PV requirement ₹15Cr, but projected accumulated corpus (from existing Investments tab) is only ₹8Cr. User wants to know WHICH phases are underfunded and HOW to fix it.

**Success state**: Multi-goal shows red deficit indicators in allocation table, projection chart shows balance hitting zero in Phase 3, and suggestion banner says "Increase monthly SIP by ₹18,500 OR reduce Empty Nest phase by 35%." User adjusts Investments tab or reduces phase expenses, re-runs, sees green.

**Failure state**: App shows vague error "Insufficient funds" with no breakdown of which phases fail or how much shortfall exists. User doesn't know whether to save more, reduce expenses, or delay retirement. Gives up.

### Steps (deficit path)

1. **User enters 4 phases** (same as Journey 1)  
   → Timeline and phase cards render normally

2. **User scrolls to Allocation table**  
   → App calculates total PV = ₹15Cr  
   → App reads accumulated corpus from existing planner = ₹8Cr (via `RP.accumulatedCorpus` or equivalent state)  
   → Shortfall = ₹7Cr  
   → User sees allocation table with red backgrounds:
     | Phase | PV (₹Cr) | Allocation (₹Cr) | Status |
     |---|---|---|---|
     | Active Retirement | 6.0 | 3.2 | 🔴 -₹2.8Cr |
     | Kids in College | 1.8 | 1.0 | 🔴 -₹0.8Cr |
     | Empty Nest | 4.2 | 2.2 | 🔴 -₹2.0Cr |
     | Medical Years | 3.0 | 1.6 | 🔴 -₹1.4Cr |
     | **Total** | **15.0** | **8.0** | 🔴 **Shortfall: ₹7Cr** |  
   → Horizontal bar shows proportional segments, but total bar width is 53% (8/15), with grayed-out "unfunded" section  
   → User feels: worried but clear on the problem

3. **User scrolls to suggestion banner** (appears above projection section when shortfall exists)  
   → Banner shows:  
     > ⚠️ **Shortfall detected: ₹7Cr**  
     > **Option 1**: Increase monthly SIP by ₹18,500 (from ₹50K to ₹68.5K) to fully fund all phases  
     > **Option 2**: Reduce total phase expenses by 47% (e.g., cut Empty Nest from ₹40K/mo to ₹21K/mo)  
   → User feels: has concrete next steps, not lost

4. **User scrolls to projection chart**  
   → Chart shows balance starting at ₹8Cr, declining through phases  
   → Balance hits zero at age 64 (midway through Phase 3)  
   → Vertical line marks "Funds depleted" with red annotation  
   → Shaded regions for Phase 4 appear grayed out (never reached)  
   → User feels: visual confirmation of the problem

5. **User chooses Option 1: increase SIP**  
   → Navigates to Investments tab  
   → Changes monthly SIP from ₹50K to ₹68.5K  
   → Returns to Multi-Goal tab  
   → App re-calculates accumulated corpus = ₹15.2Cr (now exceeds PV)  
   → Allocation table turns green 🟢  
   → Projection chart shows balance lasting until age 85  
   → User feels: problem solved

6. **Success state reached**: User saves profile with updated SIP amount + phases. Multi-goal validated the new plan works.

---

### Branches / edge cases

- **If user chooses Option 2 (reduce expenses)**: Edits Phase 3 monthly expense from ₹40K to ₹21K, table recalculates, shortfall reduced or eliminated
- **If deficit is small (<10% shortfall)**: Suggestion banner shows orange warning instead of red, softer language: "Consider increasing SIP by ₹X for full coverage"
- **If user ignores deficit and tries to save**: Profile saves anyway (no blocking), but toast shows "⚠️ Profile saved with ₹7Cr shortfall"

---

### Friction we're solving for

1. **Opaque failure**: Single-bucket planner just shows "money runs out at age 67" but doesn't tell you WHY. Multi-goal breaks down the deficit by phase, so you know "college years are the problem, not retirement overall."
2. **Trial-and-error tuning**: Without suggestions, user would manually adjust SIP by ₹5K, re-run, still short, adjust again, etc. Multi-goal gives the exact number needed upfront.
3. **No prioritization guidance**: If you can't afford all phases, which one should you cut? Multi-goal doesn't make the decision, but showing per-phase deficits helps user prioritize (e.g., "I'll reduce Empty Nest by 20% but keep Medical Years fully funded").

---

## Journey 3: Edit existing saved profile with multi-goal phases (returning user path)

**Trigger**: User saved a profile 2 days ago with 4 phases. Returns to planner, wants to tweak Phase 3 inflation rate from 5% to 6% because he read a new CPI forecast.

**Success state**: User loads profile, multi-goal tab auto-populates phases, user edits one field, sees updated allocation and chart, saves again. No data loss, no re-entry of 20+ fields.

**Failure state**: User loads profile but multi-goal tab is blank (phases didn't persist), or phases loaded but chart shows stale data after edit (no auto-recalc). User loses trust in persistence.

### Steps (edit-existing path)

1. **User opens planner** (bookmark or URL)  
   → App auto-loads last-used profile from localStorage (existing behavior from Profiles tab)  
   → Basics tab shows currentAge 32, retirementAge 35, etc. (existing data)

2. **User navigates to Multi-Goal tab**  
   → App reads `RP._phases` array from loaded profile  
   → Timeline + 4 phase cards render with saved values  
   → Allocation table + chart render with existing numbers  
   → User feels: data is there, can continue where I left off

3. **User clicks "Edit" on Phase 3 card** (or re-enters values in input form)  
   → Input form pre-fills with Phase 3 data: name "Empty Nest", startAge 51, endAge 70, monthlyExpense 40000, inflation 5  
   → User changes inflation from 5 to 6  
   → Clicks "Update Phase"  
   → Phase 3 card updates to show "6% inflation"

4. **App auto-recalculates allocation + projection**  
   → New PV for Phase 3 = ₹2.3Cr (was ₹2.1Cr at 5% inflation)  
   → Total PV now ₹7.9Cr (was ₹7.7Cr)  
   → Allocation table updates, still green (corpus ₹8Cr > ₹7.9Cr)  
   → Projection chart re-renders with new Phase 3 shaded region slope  
   → User feels: change took effect immediately

5. **User scrolls to verify numbers**  
   → Checks projection table, sees Phase 3 years (51-70) have higher annual expenses than before  
   → Chart shows slightly steeper decline in balance during Phase 3  
   → User feels: math is correct, inflation adjustment propagated

6. **User clicks "Save Profile"**  
   → Toast: "✅ Profile updated"  
   → Updated `_phases` array persists to localStorage  
   → User feels: done

7. **Success state reached**: User closes browser. Returns next week, loads same profile, phases are still there with 6% inflation. No data loss.

---

### Branches / edge cases

- **If user loads a pre-multi-goal profile** (saved before this feature shipped): `_phases` field is absent. Multi-goal tab shows empty state "No phases added yet." User can add phases without breaking existing data.
- **If user loads a sharelink with `_phases` field**: URL deserializes `_phases`, multi-goal tab populates. Same behavior as localStorage.
- **If user edits a phase to create overlap**: Info banner appears (same as Journey 1), allocation recalculates summing overlapping years. No error.
- **If user deletes Phase 2** (college years): Timeline gap appears, allocation table drops to 3 rows, total PV recalculates. Projection chart removes green shaded region.

---

### Friction we're solving for

1. **No session persistence**: Without localStorage integration, user would re-enter 4 phases × 5 fields = 20 inputs every time they open the planner. Multi-goal inherits existing profile system, eliminating this friction.
2. **Stale calculations after edit**: If allocation table didn't auto-recalculate, user would see inconsistent numbers (old PV, new inflation rate). Auto-recalc on every edit prevents confusion.
3. **Migration anxiety**: Users with existing profiles fear new features will break their data. By making `_phases` optional (empty state if absent), we ensure backward compatibility — existing users can ignore multi-goal entirely or adopt it incrementally.

---

## Common failure modes across all journeys (error recovery)

### Input validation errors

- **End age ≤ start age**: Inline error text "End age must be after start age." Submit button disabled until fixed.
- **Monthly expense = 0 or negative**: Error text "Expense must be positive." Input turns red border.
- **Inflation rate > 20%**: Warning text "Inflation above 20% is unusual. Double-check." (Warning, not error — user can proceed.)
- **Phase name blank**: Auto-fill with "Phase N" on submit, or show placeholder "Unnamed phase."

### Runtime errors

- **Accumulated corpus = 0** (user hasn't configured Investments tab): Multi-goal shows error banner "Configure investments first to see allocation." Allocation table shows "–" in Allocation column.
- **RetirementAge > lifeExpectancy**: Error banner "Retirement age exceeds life expectancy. Update Basics tab." Projection chart doesn't render.
- **Overlapping phases create >100% allocation shortfall**: Allocation table shows total PV, suggests reducing all phases proportionally. No crash.

### Edge case: user has 0 phases

- Empty state shows. Allocation section hidden. Projection section hidden. "Load Example" is the primary CTA.

### Edge case: user has 1 phase

- Timeline shows single bar. Allocation table has 1 row. Projection chart has 1 shaded region. Functionally works, but UX nudges user to add more phases via empty-state-style text: "Single-phase model. Consider adding phases for college, medical, etc."

---

## Journey prioritization for wireframing + implementation

1. **Journey 1 (happy path)** — PRIMARY. All wireframes + AC must cover this flow.
2. **Journey 2 (deficit path)** — CRITICAL. Deficit handling is a core value-add (per intake Q3). Must be in v1.
3. **Journey 3 (edit-existing)** — REQUIRED for persistence story. Drives localStorage integration AC.

All three journeys are in scope for Stage 4 implementation. No deferral.
