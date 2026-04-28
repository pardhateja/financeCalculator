# Design Strategy — Multi-Goal Age-Phased Early Retirement Planner

**Run:** multi-goal-early-retirement  
**Design Lead:** design-lead  
**Date:** 2026-04-27  
**Mode:** EXTEND-EXISTING (brownfield addition to existing vanilla retirement planner)

---

## Strategic Direction

This is a **high-complexity calculator extension for power users**, not a marketing tool. We're adding age-phased life-expense modeling to an already data-dense retirement planner used by Indian early-retirement / FIRE community members who understand PV, inflation categories, and corpus allocation math.

### Tone
**Utilitarian calculator, not aspirational lifestyle app.**  
- Direct, unambiguous language ("Phase underfunded by ₹12L", not "You might need a little more")
- No motivational copy, no hand-holding onboarding flows
- Trust the user to understand financial concepts (inflation rates, present value, corpus allocation)
- Match the existing planner's voice: matter-of-fact, numeric-first, India-specific defaults

### Density
**Data-dense like existing Projections/Dashboard tabs.**  
- Pack information above the fold: phase summary cards + allocation breakdown + timeline visualization all visible without scroll on desktop
- Reuse existing summary-card grid pattern (4-card responsive wrapping)
- Tables are acceptable and expected (allocation pre-flight table, per-phase breakdown)
- Charts/timelines serve data communication, not decoration — every pixel must carry signal

### Visual Language
**Extend the existing blue/green/amber/red semantic palette.**  
- Phase colors auto-assigned from extended palette: blue (primary) → emerald (success) → amber (warning) → purple → teal → rotate
- Phase timeline uses horizontal colored bars (desktop) / vertical stack (mobile) — Gantt-chart mental model
- Status indicators reuse `.health-indicator` pattern: green dot + "Funded", red dot + "Underfunded ₹X"
- Allocation visualization uses horizontal stacked bar (CSS-only, no Chart.js extension)
- Dark mode mandatory for every new component

### Responsive Strategy
**Desktop-first information hierarchy, mobile-friendly degradation.**  
- Desktop (>1024px): horizontal timeline strip, 2-column phase cards, allocation table side-by-side with chart
- Tablet (768-1024px): timeline scrolls horizontally, phase cards stack to 1 column, allocation table full-width
- Mobile (<768px): timeline becomes vertical stepper, cards stack, tables scroll horizontally or collapse to summary view
- Match existing breakpoints in `responsive.css` — no new breakpoint thresholds

---

## Three Binding Decisions for the Design Squad

These decisions are locked based on intake answers A21-A27. The squad must design within these constraints.

### 1. Horizontal Gantt-Style Timeline on Desktop, Vertical Stack on Mobile

**Why:** The core mental model is "lifecycle phases covering age 35 → 100". A horizontal timeline communicates coverage, gaps, and overlaps at a glance. Vertical stack on mobile preserves the sequence without horizontal scroll hell.

**What this means:**
- UI Designer wireframes must show both layouts (desktop horizontal, mobile vertical)
- Design tokens must define phase bar height, spacing between bars, age-axis tick marks
- Timeline is NOT interactive in v1 (no drag-to-resize, no click-to-edit) — it's a read-only visualization of configured phases
- Auto-color-assign from phase palette (see Decision 3)

### 2. Pre-Flight Allocation Table + Horizontal Stacked Bar (No Chart.js Extension)

**Why:** Users need to see "corpus split" numerically (PV allocation table) AND visually (proportional bar). Horizontal stacked bar is CSS-only, mobile-friendly, and matches the project's "no npm, no frameworks" constraint.

**What this means:**
- Allocation table has columns: Phase Name, Duration (years), PV of Expenses, % of Corpus, Allocation Amount, Status (Funded/Underfunded)
- Horizontal stacked bar sits above or below table, each segment colored by phase palette, segment width = % of total corpus
- On mobile, bar shrinks gracefully; table switches to card layout or horizontal scroll
- NO donut chart, NO sankey diagram (would require Chart.js extension + poor mobile UX)

### 3. Auto-Color-Assign from Extended Palette

**Why:** Avoid color-picker UI complexity (not in existing design system). Auto-assign ensures visual distinction without user effort. Matches existing semantic color use.

**Palette extension (Design System Engineer to formalize):**
1. `--phase-1-color: #3b82f6` (blue-500, existing primary)
2. `--phase-2-color: #10b981` (emerald-500, existing success)
3. `--phase-3-color: #f59e0b` (amber-500, existing warning)
4. `--phase-4-color: #8b5cf6` (purple-500, NEW)
5. `--phase-5-color: #14b8a6` (teal-500, NEW)
6. Rotate if user creates 6+ phases (Phase 6 = blue again, etc.)

Each phase color gets light/dark mode variants for backgrounds, borders, badges.

---

## Anti-Patterns to Avoid

These are explicit NO-GOs based on project constraints and existing system limits:

1. **NO CSS framework adoption** (Tailwind, Bootstrap, MUI, etc.) — this is vanilla CSS with design tokens in `:root`
2. **NO new font families** — system font stack stays (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, etc.`)
3. **NO Chart.js extension** — existing planner uses Chart.js for line/bar charts, but adding donut/sankey/radar for this feature is out of scope
4. **NO new component library** — accordion, drag-and-drop, color picker, date picker are all out; use existing patterns (section groups, input forms, summary cards, tables, badges)
5. **NO redesigning existing tabs** — Basics, Expenses, Projections, Goals, Dashboard, etc. stay pixel-identical; multi-goal lives in its own tab
6. **NO comparison-with-single-goal screen** — deferred per A16; v1 is standalone multi-goal planner only
7. **NO onboarding modals or tutorial overlays** — user is Pardha, an expert; empty state = simple "No phases yet" message + "Load Example" button

---

## Accessibility Baseline (for UX Researcher to Audit + Extend)

### Existing Baseline to Preserve
- **Color contrast:** Verify existing primary (`#2563eb`), success (`#10b981`), danger (`#ef4444`), warning (`#f59e0b`) meet WCAG AA on white and dark-mode backgrounds
- **Focus states:** Existing inputs have blue glow (`box-shadow: 0 0 0 3px rgba(37,99,235,0.1)`); ensure new phase inputs follow same pattern
- **Semantic HTML:** Forms use `<label for="...">` + `<input id="...">`, tables use `<table><thead><tbody>`, headings in logical order
- **Keyboard navigation:** Tab order through phase config form, enter to submit, escape to clear

### Extensions for Multi-Goal
- **Phase timeline:** If clickable (future enhancement), ensure keyboard access via tab + enter; v1 is read-only so no interaction needed
- **Allocation table:** Standard HTML `<table>` with `<caption>` describing "Corpus allocation across life phases"
- **Status indicators:** `.health-indicator` dots must NOT rely on color alone — include text ("Funded", "Underfunded ₹12L") next to dot
- **Error states:** Phase overlap/gap warnings use inline text below form (`role="alert"`), not toast (toast component doesn't exist yet)
- **Dark mode contrast:** Verify new purple/teal phase colors meet AA contrast on dark slate backgrounds

---

## Mobile / Responsive Behavior Summary

| Component | Desktop (>1024px) | Tablet (768-1024px) | Mobile (<768px) |
|---|---|---|---|
| **Phase timeline** | Horizontal bar, full width | Horizontal, scrolls left/right | Vertical stack (stepper-style) |
| **Phase config form** | 3-column grid (name, age range, expense, inflation) | 2-column grid | Single column |
| **Phase summary cards** | 4-card grid (2×2) | 2-card grid | Single column stack |
| **Allocation table** | Full table, 6 columns visible | Full table, horizontal scroll if needed | Card layout OR horizontal scroll |
| **Allocation bar** | Full width, segment labels inline | Full width, smaller labels | Shrink to 90% width, no labels (rely on table) |
| **Panel grid** | 2-column (timeline left, allocation right) | Single column stack | Single column stack |

---

## Empty States + Error States

### Empty State (No Phases Yet)
Reuse Goals tab pattern:
```
┌─────────────────────────────────────┐
│  No life phases added yet.          │
│  Add your first phase above, or:    │
│  [Load Example] ← button            │
└─────────────────────────────────────┘
```
"Load Example" pre-populates 4 phases from intake (Early Retirement w/ Kids 35-50, Kids in College when user is 45-49, Empty Nest 50-70, Late Retirement 70-100), with India inflation defaults (6% / 10% / 6% / 12%).

### Error States
- **Phase overlap:** Inline text below age-range inputs, red color + warning icon: "⚠️ Warning: Phase 2 overlaps with Phase 1 between ages 48-50."
- **Phase gap:** Informational message (amber): "ℹ️ No phase covers ages 55-60. Expenses for those years will be zero."
- **Underfunded phase:** Red `.health-indicator` in phase card: "🔴 Underfunded by ₹12,45,000"
- **Over-allocated corpus:** Banner at top of page (red background): "⚠️ Total allocation (₹6.2Cr) exceeds projected corpus (₹5Cr). Reduce phase expenses or increase savings."

---

## Dark Mode Design Intent

Every new component must have `body.dark-mode` CSS overrides. Match existing dark-mode patterns:

- **Panel background:** `#1e293b` (slate-800) instead of white
- **Section group background:** `#0f172a` (slate-900) instead of light gray
- **Input backgrounds:** `#1e293b`, borders `#334155` (slate-700)
- **Text primary:** `#e2e8f0` (slate-200)
- **Text secondary:** `#94a3b8` (slate-400)
- **Phase timeline bars:** Keep bright phase colors (`#3b82f6`, `#10b981`, etc.) — they pop against dark background
- **Allocation bar segments:** Same bright colors, thin white separator between segments
- **Table alternating rows:** `#1e293b` / `#0f172a` instead of white / light-gray

Visual testing happens in Stage 7, but design intent must be documented now.

---

## Success Criteria for Design Squad Outputs

At the end of Stage 1, I will review and sign off on:

### UX Researcher Deliverables
- ✅ **User journey map** covering: first-time setup → load example → edit phase → run projection → interpret underfunded warning → adjust
- ✅ **Accessibility audit** of existing baseline + new component extensions (table caption, ARIA labels, focus order, color-contrast check for purple/teal)
- ✅ **Empty/error state catalog** (empty phases, phase overlap, phase gap, underfunded, over-allocated)

### UI Designer Deliverables
- ✅ **Wireframes** for desktop + mobile layouts of: phase config form, phase timeline (horizontal + vertical), allocation table + bar, phase summary cards, multi-goal tab integration
- ✅ **Component reuse map** showing which existing patterns are used (`.section-group`, `.summary-card`, `.input-group`, `.health-indicator`, etc.)
- ✅ **Responsive behavior spec** for each new component (what changes at 1024px, 768px, 480px breakpoints)

### Design System Engineer Deliverables
- ✅ **Design tokens extraction** from existing CSS (colors, spacing, typography, shadows) in `03-design-tokens.json`
- ✅ **Phase palette extension** (purple, teal) with light/dark mode variants
- ✅ **Dark mode override spec** for new components (CSS variable mappings for `body.dark-mode` context)
- ✅ **Component pattern catalog** (timeline bar structure, allocation stacked bar structure, phase badge structure)

---

## Design Lead Review Checkpoints

I will approve each deliverable with:
- ✅ **Approved** — matches strategy, move to Stage 2
- ⚠️ **Needs revision** — specific notes on what to adjust

Review criteria:
1. **Does it extend, not replace?** (existing tabs unchanged, new patterns build on old)
2. **Does it match the tone?** (utilitarian, data-dense, no fluff)
3. **Does it honor the three binding decisions?** (horizontal timeline, stacked bar, auto-color)
4. **Does it avoid anti-patterns?** (no framework, no Chart.js extension, no redesign of existing)
5. **Is dark mode accounted for?** (every new component has dark-mode spec)
6. **Is mobile degradation sensible?** (no horizontal scroll hell, information hierarchy preserved)

---

## Timeline

- **Now:** Strategy posted, squad reads this doc
- **Next 1-2 hours:** Squad produces drafts in parallel (user journeys, wireframes, tokens)
- **After drafts land:** Design Lead reviews, approves or requests revision
- **Once all approved:** Stage 2 planning begins (FE/BE/QA read design artifacts)

No daily standups, no Slack check-ins. Work is asynchronous. Drafts land in `design/` folder, I review when notified.

---

**Design Lead signature:** Ready for squad execution. Notifying team-lead now.
