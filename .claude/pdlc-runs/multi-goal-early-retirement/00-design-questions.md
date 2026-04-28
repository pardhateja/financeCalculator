# Design Questions for Multi-Goal Age-Phased Early Retirement Planner

**Run:** multi-goal-early-retirement  
**Created:** 2026-04-27  
**Owner:** Design Lead

---

## BLOCKERS

These questions block Stage 1 wireframe/token delivery. We need answers before the UI Designer can proceed.

### 1. **Phase Representation: Timeline vs. Cards vs. Table**

**Question:** How should life phases be visually represented in the UI?

**Options:**
- **A. Horizontal timeline strip** — phases as colored bars on a horizontal axis (age 35 → 100), like a Gantt chart
- **B. Vertical card list** — each phase is a card (reusing `.section-group` pattern), stacked vertically with expand/collapse
- **C. Table rows** — phases as rows in a table (like Goals tab), with columns for Name, Age Range, Monthly Expense, Inflation Rate
- **D. Horizontal scrollable cards** — phase cards in a row, swipeable on mobile

**Why blocker:** The wireframe layout depends on this. Timeline needs a new visual component (horizontal axis + bars). Cards reuse existing patterns. Table is simplest but least visual. Scrollable cards are mobile-first but harder to see "whole picture."

**Recommendation needed from:** Pardha + team (user preference) or UX Researcher (based on which model best communicates "coverage" and "allocation")

---

### 2. **Phase Configuration: Modal vs. Inline vs. Split-Pane**

**Question:** Where does the user configure a phase (name, age range, monthly expense, inflation rate)?

**Options:**
- **A. Modal overlay** — click "Add Phase" → modal pops up (like Tracker modal pattern)
- **B. Inline form** — always-visible form at top of page (like Goals tab "Add Financial Goals")
- **C. Accordion expansion** — each phase card has a collapsed state (shows summary) and expanded state (shows inputs)
- **D. Split-pane** — left panel = phase list, right panel = config form for selected phase

**Why blocker:** This determines the wireframe structure. Modal = reuse existing pattern. Inline = simpler but takes space. Accordion = cleanest for editing existing phases but requires new expand/collapse logic. Split-pane = complex layout, probably overkill.

**Recommendation needed from:** Pardha (preference) or UI Designer (which fits existing patterns best)

---

### 3. **Allocation Visualization: How to Show Corpus Split Across Phases**

**Question:** How should we show "your ₹5Cr corpus will be split: ₹2Cr for early-retirement phase, ₹1.5Cr for kids-in-college phase, ₹1.5Cr for empty-nest phase"?

**Options:**
- **A. Donut chart** — each phase is a slice, Chart.js already loaded
- **B. Horizontal stacked bar** — 100% bar, each phase is a segment (CSS-only, no Chart.js needed)
- **C. Sankey diagram** — flow from "Total Corpus" → each phase → "Funded/Underfunded" (complex, probably overkill)
- **D. Table with "Allocated Amount" column** — text-only, no visualization
- **E. Card-based breakdown** — each phase card shows "₹2Cr allocated (40% of total)" in a summary badge

**Why blocker:** This affects whether we need new Chart.js chart types or can use pure CSS. Also affects mobile layout (donut/sankey don't shrink well, bar/table do).

**Recommendation needed from:** Pardha (does allocation math need to be visually prominent, or is a table sufficient?)

---

### 4. **Projections Table Extension: New Columns or New Table?**

**Question:** The existing Projections tab has a 7-column table (Age, Starting, Annual Savings, Growth, Ending, Status, Expenses). For multi-goal, we need to show "which phase is active this year" and "phase-specific expense." How?

**Options:**
- **A. Add 2 new columns** — "Active Phase" (text label) + "Phase Monthly Expense" (replace single "Expenses" with phase-aware value)
- **B. Replace "Expenses" column** — make it dynamic, show expense value with a colored badge indicating phase
- **C. New table below existing** — keep single-goal table as-is, add a second "Multi-Goal Projections" table with different columns
- **D. Toggle mode** — radio button at top: "Single-Goal Mode" vs "Multi-Goal Mode", swaps table structure entirely

**Why blocker:** Wireframe for Projections tab depends on this. Adding columns is simplest. New table duplicates layout. Toggle mode is cleanest separation but adds complexity.

**Recommendation needed from:** Pardha (should single-goal and multi-goal projections co-exist, or is multi-goal a replacement?)

---

### 5. **Phase Color Assignment: Auto or User-Selectable?**

**Question:** When a user creates 4 life phases, do they each get a distinct color automatically, or does the user pick the color?

**Options:**
- **A. Auto-assign from palette** — Phase 1 = blue, Phase 2 = green, Phase 3 = amber, Phase 4 = purple, Phase 5 = teal, etc. (rotate through a predefined palette)
- **B. User-selectable** — each phase has a color picker (adds UI complexity)
- **C. No phase-specific colors** — all phases use the same primary blue, differentiate by labels only

**Why blocker:** Affects token design. If auto-assign, Design System Engineer needs to define a phase palette extension. If user-selectable, UI Designer needs a color-picker component (not currently in the design system). If no colors, simpler but less visual.

**Recommendation:** Auto-assign from extended palette (simplest, maintains existing design language). But need Pardha confirmation.

---

## NICE-TO-RESOLVE

These questions improve UX but aren't blockers. We can proceed with sensible defaults and refine later.

### 6. **Empty State: First-Time User Experience**

**Question:** When a user first opens the Multi-Goal Planner tab and has no phases defined, what do they see?

**Proposed default:** Show an empty state message (like Goals tab: "No phases added yet. Add your first life phase above.") + a prominent "Add Phase" button. Optionally, include a "Load Example" button that pre-populates 3 sample phases (e.g., "Early Retirement with Kids (35-50)", "Kids in College (18yo-22yo)", "Empty Nest (50-70)", "Late Retirement / Medical (70-100)").

**Why nice-to-resolve:** Helps new users understand the feature. But if we skip the "Load Example" feature initially, the plain empty state still works.

---

### 7. **Phase Overlap / Gap Detection: Inline Warnings or Summary Banner?**

**Question:** If the user creates overlapping phases (e.g., Phase 1 ends at age 50, Phase 2 starts at age 48) or leaves a gap (Phase 1 ends at 50, Phase 2 starts at 55), where do we show the error?

**Proposed default:** Inline error text below the phase config form (like form validation), colored red with danger icon. Example: "⚠️ Warning: Phase 2 overlaps with Phase 1 between ages 48-50. Adjust age ranges to fix."

**Alternative:** Summary banner at top of page (like Dashboard "Risk Alerts" pattern) that lists all issues.

**Why nice-to-resolve:** Both approaches work. Inline is more immediate. Banner is less cluttered. Lean toward inline for form-style errors, but banner for "global" issues (e.g., "Total allocation exceeds 100%").

---

### 8. **Phase Underfunded / Overfunded Indicator**

**Question:** After running the projections, if a phase is underfunded (corpus won't cover the expense + inflation for that phase's duration), how do we show that?

**Proposed default:** Each phase card (or table row) gets a status badge:
- **"Funded"** — green badge (`.category-tag.needs` pattern)
- **"Underfunded"** — red badge (`.category-tag.wants` but red variant)
- **"Overfunded"** — amber badge (optional, indicates surplus)

Alternatively, use the `.health-indicator` pattern (colored dot + text).

**Why nice-to-resolve:** We can calculate funded/underfunded status in JS easily. The visual representation is a refinement. Start with simple badges, refine in Stage 7 review if needed.

---

### 9. **Mobile Timeline Visualization**

**Question:** If we use a horizontal timeline (blocker #1 option A), how does it work on mobile (<768px width)?

**Proposed default:** 
- On desktop: full horizontal timeline, phases as bars
- On tablet: same but scrollable horizontally
- On mobile: collapse to vertical timeline (phases stacked top-to-bottom, like a vertical stepper) OR switch to card list view

**Why nice-to-resolve:** Responsive behavior is specified in Stage 1, but implementation details can adjust in Stage 5 (FE implementation) based on what looks best. Wireframe should show both layouts.

---

### 10. **Comparison View: Single-Goal vs. Multi-Goal Side-by-Side**

**Question:** Should there be a view that shows "with single-goal retirement expense of ₹100k/mo, you run out at age 82" vs "with multi-goal phased expenses, you run out at age 88" side by side?

**Proposed default:** NOT in initial release. This is a "nice-to-have" for Stage 2 roadmap. Initial release focuses on getting multi-goal working, not comparing the two models.

**Why nice-to-resolve:** Intake doesn't mention this. User wants multi-goal as "a separate page or version", which implies they understand it's different, not necessarily that they need to compare. Defer to post-launch enhancement.

---

### 11. **Phase Deletion: Confirmation or Undo?**

**Question:** When a user deletes a phase, do we ask "Are you sure?" or provide an Undo toast?

**Proposed default:** No confirmation modal (reduces friction). Instead, show a toast notification "Phase deleted. Undo?" with a 5-second auto-dismiss. Clicking Undo restores the phase. (This pattern is more modern than confirmation modals.)

**Why nice-to-resolve:** Either approach works. Undo is friendlier but requires toast component (not currently in design system). Confirmation modal is simpler. Start with no confirmation (trust the user, data is local-storage so recoverable), add Undo if user feedback requests it.

---

### 12. **Phase Reordering: Drag-and-Drop or Manual Sort?**

**Question:** If phases are displayed as cards or table rows, can the user reorder them (e.g., move "Empty Nest" before "Kids in College" in the display)?

**Proposed default:** No reordering initially. Phases are displayed in chronological order by start age (auto-sorted). If user creates phases out of order, the UI auto-sorts them by start age.

**Why nice-to-resolve:** Drag-and-drop is a complex interaction, not in current design system. Auto-sort by age is simpler and makes logical sense (phases are time-based). User can always edit ages to change order.

---

### 13. **Dark Mode: Design Priority or Test After?**

**Question:** Should dark mode styling be designed in Stage 1 (wireframes include dark mode screenshots) or tested/refined in Stage 7 (post-implementation review)?

**Proposed default:** Design System Engineer includes dark mode overrides in token spec. UI Designer documents dark mode behavior in wireframes (e.g., "phase cards use `body.dark-mode .phase-card { background: #1e293b }"`). But visual testing happens in Stage 7.

**Why nice-to-resolve:** Dark mode is mandatory (project already supports it), but the exact shade tweaks can be refined after seeing it live. Design intent should be documented now, pixel-perfect tuning happens later.

---

### 14. **Inflation Rate per Phase: Single Input or Per-Category?**

**Question:** The intake mentions "each goal might have a different inflation as well." Does this mean:
- **A. Single inflation rate per phase** (e.g., Kids-in-College phase has 8% inflation applied to all expenses in that phase)
- **B. Category-level inflation** (e.g., "education expenses in this phase inflate at 8%, medical at 10%, lifestyle at 6%")

**Proposed default:** Single inflation rate per phase (option A). This matches the existing single-goal model ("inflationRate" is a global input in Basics tab). Per-category inflation is a much more complex model and wasn't explicitly requested.

**Why nice-to-resolve:** Intake says "different inflation" but gives examples at the phase level ("college inflation is 8-10%", "medical inflation is 10-12%"). If user meant category-level, they'll clarify in review. Start with simpler model.

---

### 15. **Phase Duration: Explicit End Age or Duration in Years?**

**Question:** When configuring a phase, does the user input:
- **A. Start age + end age** (e.g., "35 to 50")
- **B. Start age + duration** (e.g., "starts at 35, lasts 15 years")

**Proposed default:** Start age + end age (option A). This matches how people think about life stages ("kids in college from age 18-22 of the kids, which is when I'm 45-49"). Duration is a derived value we can show ("Duration: 15 years").

**Why nice-to-resolve:** Both are valid. Start+end is more intuitive for life phases. Start+duration is better for goals (existing Goals tab uses target year, not duration). Lean toward start+end for consistency with "age-phased" mental model.

---

## Summary

- **BLOCKERS:** 5 questions (need answers to complete wireframes)
- **NICE-TO-RESOLVE:** 10 questions (proposed defaults, can proceed without blocking)

Next step: Present blockers to Pardha for direction-setting, then proceed with Stage 1 specialist work.
