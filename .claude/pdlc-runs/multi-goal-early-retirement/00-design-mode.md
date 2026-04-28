# Design Mode Assessment

**Run:** multi-goal-early-retirement  
**Assessed:** 2026-04-27  
**Assessed by:** Design Lead

---

## Mode Declaration

**EXTEND-EXISTING**

This project already has a mature design system in place. The multi-goal age-phased planner is a new feature module within an existing vanilla HTML/CSS/JS retirement planning app.

---

## Existing Design System Summary

### Colors

**Light mode** (default):
- **Primary:** `#2563eb` (blue-600), dark variant `#1e40af` (blue-800), light `#dbeafe` (blue-50)
- **Secondary/Success:** `#10b981` (emerald-500), light `#d1fae5` (emerald-100)
- **Danger:** `#ef4444` (red-500), light `#fee2e2` (red-100)
- **Warning:** `#f59e0b` (amber-500), light `#fef3c7` (amber-100)
- **Background:** `#f8fafc` (slate-50)
- **Card background:** `#ffffff`
- **Text primary:** `#1e293b` (slate-800)
- **Text secondary:** `#64748b` (slate-500)
- **Border:** `#e2e8f0` (slate-200)
- **Body gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` (purple gradient behind all content)

**Domain-specific colors:**
- **Earning phase:** `#10b981` (emerald-500, matches secondary)
- **Retired phase:** `#3b82f6` (blue-500)
- **Dead/depleted:** `#94a3b8` (slate-400)
- **Danger row (money runs out):** `#fef2f2` (red-50 background)

**Dark mode** (via `body.dark-mode` class, toggled by darkmode.js):
- Body gradient becomes `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)` (dark blue-grays)
- Panel background: `#1e293b` (slate-800)
- Section groups: `#0f172a` (slate-900)
- Input backgrounds: `#1e293b`, borders `#334155` (slate-700)
- Text: `#e2e8f0` (slate-200 for primary), `#94a3b8` (slate-400 for secondary)
- Accent borders remain bright (blue `#3b82f6`, emerald `#10b981`, amber `#f59e0b`, red `#ef4444`)

**Semantic use:**
- Blue = primary action, default state, structural elements
- Green = success, healthy metrics, good status
- Amber/Orange = warning, neutral alerts, secondary emphasis
- Red = danger, critical alerts, depleted funds

### Typography

- **Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif` (system font stack, no custom fonts)
- **Body:** `1.6` line-height, `#1e293b` color
- **H1 (header):** `2.8rem`, white (overlays gradient), `text-shadow: 2px 2px 4px rgba(0,0,0,0.2)`
- **H2 (panel title):** `1.6rem`, primary color, bottom border `3px solid`
- **H3 (section title):** `1.15rem`, text-primary
- **Label:** `0.9rem`, `font-weight: 500`, text-secondary
- **Summary card value:** `1.5rem`, `font-weight: 700`
- **Summary card label:** `0.85rem`, text-secondary
- **Input fields:** `1rem`

### Spacing

**Margins/Padding:**
- Container max-width: `1500px`
- Body padding: `20px` (mobile: `10px`)
- Panel padding: `30px` (tablet: `20px`, mobile: `15px`)
- Panel border-radius: `16px` (top-left square due to tab overlap, rest rounded)
- Section group: `padding: 20px`, `margin-bottom: 25px`, `border-radius: 12px`
- Input group: `margin-bottom: 16px`
- Input field: `padding: 10px 14px`, `border-radius: 8px`, `border: 2px solid`
- Summary card: `padding: 16px 20px`, `border-radius: 12px`
- Summary row: `gap: 16px`, `margin-top: 20px`
- Panel-grid: `gap: 30px`

**Layout:**
- Two-column panels via `grid-template-columns: 1fr 1fr` (single column on mobile <1024px)
- Summary rows use `repeat(auto-fit, minmax(200px, 1fr))` (responsive card wrapping)
- Input-row uses `1fr 1fr` grid (single column on tablet)
- Input-row-3 uses `1fr 1fr 1fr` grid (single column on tablet)

### Component Patterns

**Section groups:**
- Left border accent: `4px solid` with semantic color
- Background: `var(--bg-color)` (light gray in light mode, darker slate in dark)
- Variants: `.green-accent`, `.orange-accent`, `.red-accent` change border color

**Summary cards:**
- White background (dark mode: `#0f172a`)
- Top border accent: `3px solid` with semantic color
- Variants: `.success`, `.warning`, `.danger` change top border
- Three-tier text hierarchy: `.label` (small gray), `.value` (large bold), `.sub-text` (tiny gray)

**Input groups:**
- Label block above input
- Unit indicator positioned absolutely to the right of input field
- Focus state: primary border + `box-shadow: 0 0 0 3px rgba(37,99,235,0.1)` (blue glow)

**Nav tabs:**
- Horizontal flex row, pill-shaped (rounded top only)
- Active tab: white background, primary color text
- Inactive: `rgba(255,255,255,0.2)` with white text, hover `rgba(255,255,255,0.35)`
- Backdrop-filter blur on inactive tabs

**Buttons:**
- `.btn-primary`: gradient `linear-gradient(135deg, primary, primary-dark)`, white text, shadow, hover lift `translateY(-2px)`
- `.btn-secondary`: white background, primary border, primary text, hover changes to primary-light background

**Tables:**
- `.inv-table`, `.projection-table`, `.matrix-table` all share similar structure
- Thead background: primary-dark blue
- Tbody rows: alternating backgrounds, borders between rows
- Row status classes: `.row-earning`, `.row-retired`, `.row-dead`, `.row-warning` change background color

**Health indicators:**
- `.health-indicator.good` / `.bad`: colored background (light mode uses light tints, dark mode uses dark variants)
- Dot + text layout via flexbox

**Charts:**
- Chart.js canvases inside `.chart-container` divs

---

## Figma / External Design References

**None.** Intake explicitly says "discuss everything within the team and come up with proper designs and plan." No Figma URL, no design mocks provided. This is a brownfield feature addition to an existing app.

---

## Implications for Design Squad Deliverables

Given **EXTEND-EXISTING** mode, the design team must:

1. **Design Tokens (Design System Engineer)**  
   - EXTRACT tokens from existing CSS (colors, spacing, typography, shadows already defined in `:root` and CSS files)
   - DO NOT invent new colors or spacing scales — document what exists
   - If the phased-goals feature needs additional tokens (e.g., phase color palette for 4+ distinct life phases), propose them as EXTENSIONS to the existing palette, not replacements
   - Ensure new tokens support both light and dark modes

2. **Wireframes (UI Designer)**  
   - Reuse existing component patterns (summary cards, section groups, input groups, tables)
   - New screens must visually integrate with existing tabs (Basics, Expenses, Projections, Goals, Dashboard, etc.)
   - Match the tab layout structure: `.tab-content` -> `.panel` -> `.panel-grid` or single-column content
   - Match the visual density and information hierarchy of existing screens (e.g., Projections tab has summary cards at top, then chart, then table; Goals tab has input form, then list, then summary cards)
   - Represent new concepts (life phases, phase timeline, allocation donut/sankey, per-phase config) using existing building blocks

3. **Accessibility Baseline + Extensions (UX Researcher)**  
   - AUDIT existing baseline:
     - Color contrast ratios (do existing primary/secondary/danger colors meet WCAG AA on white and on dark mode backgrounds?)
     - Focus states (existing inputs have blue glow focus — does it meet contrast requirements?)
     - Semantic HTML (are tables using `<table>`, headings in order, form labels associated?)
     - Keyboard navigation (can user tab through forms and activate buttons?)
   - EXTEND for new components:
     - If phase timeline is interactive (click to edit phase), ensure keyboard access + focus management
     - If allocation visualization is a chart (Chart.js canvas), ensure accessible alt/data table fallback
     - If per-phase config is a modal or accordion, ensure focus trap + escape-to-close + ARIA attributes
     - Error states (overlapping phases, under-funded phase) must use ARIA live regions or inline error text, not color alone

4. **Empty States / Error States (UX Researcher + UI Designer)**  
   - Existing empty state pattern: Goals tab shows gray text "No goals added yet. Add your first financial goal above."
   - Error state pattern: Projections table has `.row-warning` class with red background when balance < 0
   - New feature should match these patterns: plain text + icon for empty, colored row/card for error, plain language explanation

5. **Mobile / Responsive (UI Designer)**  
   - Existing breakpoints: `max-width: 1024px` (tablet, 1-col panels), `768px` (mobile, smaller fonts), `480px` (very small, tighter padding)
   - New screens must degrade gracefully to mobile (summary cards stack, forms go single-column, tables scroll horizontally or collapse to cards)
   - Test phase timeline visualization on mobile (does it become vertical? does it scroll horizontally?)

6. **Dark Mode Support (Design System Engineer + UI Designer)**  
   - Every new component must have a `body.dark-mode` CSS override
   - Use existing dark mode color tokens (dark backgrounds, light text, bright accent borders)
   - Test contrast in both modes

---

## What the Design Squad Should NOT Do

- DO NOT propose a CSS framework (Tailwind, Bootstrap, etc.) — this is vanilla CSS
- DO NOT redesign the existing planner — leave tabs 1-10 unchanged
- DO NOT invent a new color palette or rebrand — extend the existing blue/green/amber/red system
- DO NOT produce PNG/SVG mockups — wireframes are markdown/ASCII, deliverable is CSS + HTML structure spec

---

## Next Steps (Stage 1)

Design Lead will:
1. Brief UX Researcher, UI Designer, Design System Engineer with this baseline
2. Set design direction (tone, density, constraints) based on intake analysis
3. Review their draft outputs (user journeys, wireframes, tokens)
4. Sign off before Stage 2 planning begins
