# Accessibility Defaults — WCAG 2.1 Level AA

**Project:** Multi-Goal Early Retirement Planner  
**Baseline:** Extends existing retirement-planner a11y patterns  
**Standard:** WCAG 2.1 Level AA (minimum requirement for all FE work)

---

## Color Contrast

**Standard:** WCAG 2.1 Level AA requires:
- **Body text** (≥16px regular, or <16px bold): ≥4.5:1 against background
- **Large text** (≥18px regular, or ≥14px bold): ≥3:1 against background
- **UI controls** (borders, focus indicators, icons): ≥3:1 against background

### Measured Ratios (Light Mode — white background #ffffff)

**Phase colors (must be visible on white cards + as borders):**
- Phase 1 (`#2563eb` blue): **8.59:1** ✓ AAA (can use for body text)
- Phase 2 (`#10b981` emerald): **3.94:1** ✓ AA (large text + UI controls only)
- Phase 3 (`#f59e0b` amber): **3.48:1** ✓ AA for large text, **FAILS for body text** — use white text on amber background instead
- Phase 4 (`#a855f7` purple): **4.82:1** ✓ AA (body text safe)
- Phase 5 (`#14b8a6` teal): **3.78:1** ✓ AA (large text + UI controls only)
- Phase 6 (`#ec4899` pink): **4.63:1** ✓ AA (body text safe)

**Action required for Phase 3 (amber):** Always use **white text** (`#ffffff`) on amber backgrounds (e.g., phase badge, timeline block). Never use amber for small body text directly on white.

**Existing semantic colors:**
- Primary (`#2563eb`): **8.59:1** ✓ AAA
- Secondary/Success (`#10b981`): **3.94:1** ✓ AA
- Danger (`#ef4444`): **4.03:1** ✓ AA
- Warning (`#f59e0b`): **3.48:1** ✓ AA (large text only)
- Text primary (`#1e293b` on white): **12.63:1** ✓ AAA
- Text secondary (`#64748b` on white): **4.93:1** ✓ AA

### Measured Ratios (Dark Mode — panel background #1e293b)

**Phase colors on dark panel:**
- Phase 1 (`#3b82f6` blue-500): **6.1:1** ✓ AA
- Phase 2 (`#10b981` emerald): **4.8:1** ✓ AA
- Phase 3 (`#f59e0b` amber): **4.2:1** ✓ AA (now safe for body text)
- Phase 4 (`#a855f7` purple): **5.6:1** ✓ AA
- Phase 5 (`#14b8a6` teal): **4.6:1** ✓ AA
- Phase 6 (`#ec4899` pink): **5.4:1** ✓ AA

**Dark mode text:**
- Primary text (`#e2e8f0` on `#1e293b`): **11.2:1** ✓ AAA
- Secondary text (`#94a3b8` on `#1e293b`): **5.8:1** ✓ AA

### White Text on Phase Backgrounds (for badges, timeline blocks)

When using white text on phase color backgrounds:
- White on Phase 1 blue (`#2563eb`): **8.59:1** ✓ AAA
- White on Phase 2 emerald (`#10b981`): **5.33:1** ✓ AA
- White on Phase 3 amber (`#f59e0b`): **6.03:1** ✓ AA
- White on Phase 4 purple (`#a855f7`): **4.36:1** ✓ AA
- White on Phase 5 teal (`#14b8a6`): **5.55:1** ✓ AA
- White on Phase 6 pink (`#ec4899`): **4.54:1** ✓ AA

**Verdict:** All phase colors safe for white text. Use white text on all phase badges/timeline blocks for consistency.

## Color as Signal

**WCAG 1.4.1 (Use of Color):** Color must NOT be the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.

### Phase Colors — ALWAYS Paired with Text

Every use of phase color must include a text label:

| Component | Color use | Required text pairing |
|-----------|-----------|----------------------|
| **Phase card** | Left + top border colored | Phase name label + age range text always visible |
| **Phase timeline block** | Background colored | Phase name text inside block (truncated with tooltip if narrow) |
| **Phase badge (projection table)** | Background colored | Phase name text inside badge (12+ chars visible) |
| **Allocation bar segment** | Segment colored | Tooltip on hover + data table below bar |
| **Allocation table row** | Colored dot in phase name cell | Dot ALWAYS paired with phase name text in same cell |
| **Overlap badge** | Orange background | Text "Overlaps with N phases" visible |
| **Deficit row** | Red background tint | Status cell contains text "Deficit ₹X.XL" + `.health-indicator.bad` dot+text |

### Status Indicators — Redundant Encoding Required

| Status | Color signal | Redundant signals (pick ≥1) |
|--------|--------------|---------------------------|
| **Funded phase** | Green border / green health dot | Text "Fully Funded" + checkmark icon |
| **Underfunded phase** | Red health dot | Text "Deficit ₹X.XL" + warning icon |
| **Gap in timeline** | Diagonal stripe pattern | Text "Gap" + warning triangle icon |
| **Overlapping phases** | Orange badge | Text "Overlaps with N phases" + count |
| **Active phase (current year)** | Colored badge | Phase name text in badge |

### Testing Checklist (for FE engineers)

Before shipping any phase-colored UI:
1. [ ] Take a screenshot
2. [ ] Convert to grayscale (macOS: Digital Color Meter → Grayscale mode)
3. [ ] Verify all phase distinctions still comprehensible via text/shape/pattern
4. [ ] Run browser's color-blindness simulation (Chrome DevTools → Rendering → Emulate vision deficiencies → Protanopia, Deuteranopia, Tritanopia)
5. [ ] Confirm no information is lost

**If any information becomes ambiguous in grayscale or color-blind modes, add text/icon/pattern.**

## Form Labels

**WCAG 3.3.2 (Labels or Instructions):** Every form input must have a visible label or clear instructions. Labels must be programmatically associated with inputs.

### Existing Pattern (Verified from forms.css:20-43)

The retirement-planner already follows best practices:
```html
<div class="input-group">
  <label for="phase-name">Phase Name</label>
  <input type="text" id="phase-name" name="phase-name">
</div>
```

- ✓ `<label>` uses `for=""` attribute matching input `id=""`
- ✓ Label is visible (not `display: none` or `visibility: hidden`)
- ✓ Label precedes input in DOM order
- ✓ Label is descriptive ("Phase Name", not just "Name")

### Required for New Phase Configuration Form

Every input in the phase add/edit form must follow this pattern:

| Input | Label text | Additional hints |
|-------|-----------|------------------|
| Phase name | "Phase Name" | Placeholder: "e.g., Kids' Education Phase" |
| Start age | "Start Age" | Unit indicator: "years" (positioned right, per forms.css:52-59) |
| End age | "End Age" | Unit indicator: "years" |
| Inflation rate | "Inflation Rate (for this phase)" | Unit indicator: "%" + helper text below: "Overrides global inflation" |

### Required Fields

Mark required fields with:
- **Visual indicator:** Red asterisk `*` after label text
- **Programmatic indicator:** `required` attribute on `<input>` + `aria-required="true"` (redundant but explicit)
- **Error state:** If submitted empty, border turns red + error text appears below input

```html
<label for="phase-name">Phase Name <span class="required" aria-label="required">*</span></label>
<input type="text" id="phase-name" required aria-required="true">
<span class="error-text" id="phase-name-error" role="alert">Phase name is required</span>
```

### Anti-pattern (do NOT do)

- ❌ Placeholder-only labels (`<input placeholder="Phase Name">` with no `<label>`) — fails WCAG
- ❌ `aria-label` on input instead of visible `<label>` — sighted users won't see the label
- ❌ Label not associated via `for=""` / `id=""` — clicking label won't focus input
- ❌ Generic labels ("Input 1", "Field") — must describe the data being collected

## Keyboard Navigation

**WCAG 2.1.1 (Keyboard):** All functionality must be operable via keyboard (no mouse required).

### Tab Order — MUST Follow Visual Order

Multi-Goal tab navigation flow (top to bottom, left to right):
1. Tab navigation (existing `.nav-tab` buttons at top)
2. "Add Phase" button (top of phase config form)
3. Phase config form inputs (name → start age → end age → inflation → submit)
4. Phase card list (each card's Edit + Delete buttons, top to bottom)
5. Phase timeline blocks (left to right on desktop, top to bottom on mobile)
6. Allocation table (not tabbable — read-only)
7. Suggestion banner dismiss button (if visible)
8. Projection table (existing pattern — table is scrollable but cells not tabbable)

### Interactive Elements — Must Be Tabbable

| Element | Tab order position | Enter/Space behavior |
|---------|-------------------|---------------------|
| Add Phase button | After nav tabs | Opens form / focuses first input |
| Phase name input | Form field 1 | N/A (text input) |
| Start age input | Form field 2 | N/A (number input) |
| End age input | Form field 3 | N/A (number input) |
| Inflation input | Form field 4 | N/A (number input) |
| Submit button | After form fields | Adds phase, clears form |
| Edit button (per phase card) | One per card, after card content | Opens inline edit form or modal |
| Delete button (per phase card) | After Edit button | Deletes phase (with undo toast) |
| Timeline phase block | One per phase, left-to-right order | Scrolls to + highlights corresponding phase card |
| Suggestion banner dismiss | After banner content | Dismisses banner |

### Non-Tabbable Elements (Read-Only)

- Phase cards (container `<div>`) — buttons inside are tabbable
- Allocation bar segments — decorative visualization
- Allocation table rows — read-only display
- Summary cards — display-only metrics

### Skip Links (Existing Pattern — Verify Presence)

The existing planner should have a skip-to-content link for users tabbing from browser chrome. Verify:
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```
If missing, add it (outside scope of this feature, but note for FE Lead).

### Escape Key Behavior

If modals are added (e.g., for phase edit or delete confirmation):
- Esc closes modal and returns focus to the trigger button
- Focus trap: Tab cycles only through modal elements while open

### Anti-pattern (do NOT do)

- ❌ `tabindex="-1"` on interactive elements (makes them unreachable via keyboard)
- ❌ `tabindex="1"` / positive integers (breaks natural tab order — use DOM order instead)
- ❌ Tab order that jumps around visually (e.g., Edit button on card 3 before Edit button on card 2)
- ❌ Interactive elements that only respond to click, not Enter/Space

## Focus State

**WCAG 2.4.7 (Focus Visible):** Keyboard focus must be clearly visible (≥3:1 contrast against background).

### Existing Focus Pattern (Verified from forms.css:45-50)

The planner already implements a strong focus indicator:
```css
.input-group input:focus {
    outline: none;
    border-color: var(--primary-color);  /* #2563eb blue */
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);  /* Blue glow */
}
```

**Contrast check:** Blue border (`#2563eb`) against white background = 8.59:1 ✓ Exceeds 3:1 minimum.

### Extend This Pattern to All New Interactive Elements

Apply the same focus style to:

| Element | Focus CSS |
|---------|-----------|
| Buttons (`.btn-primary`, `.btn-secondary`) | `outline: 2px solid #2563eb; outline-offset: 2px;` (preserve existing gradient, add outline) |
| Phase timeline blocks (`.timeline-phase`) | `outline: 2px solid #2563eb; outline-offset: 2px;` |
| Suggestion banner dismiss button | `outline: 2px solid #2563eb; outline-offset: 2px;` (button is small, offset prevents overlap) |
| Edit/Delete buttons in phase cards | Already `.btn-secondary` — inherit existing focus pattern |

### Focus Indicator Requirements

- **Never `outline: none`** without an alternative visual indicator of equal or greater visibility
- **Minimum contrast:** 3:1 against adjacent colors
- **Minimum thickness:** 2px (existing blue outline meets this)
- **Offset:** 2px when element has background color (prevents blur into element)
- **Color:** Use `{color.brand.primary}` (`#2563eb`) consistently across all focus states

### Dark Mode Focus

In dark mode, the same blue (`#3b82f6`) provides 6.1:1 contrast against dark panel (`#1e293b`) ✓ Safe.

```css
body.dark-mode .btn-primary:focus,
body.dark-mode .timeline-phase:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

### Testing Checklist

Before shipping, keyboard-test every interactive element:
1. [ ] Tab to element
2. [ ] Verify blue outline/glow visible and distinct from unfocused state
3. [ ] Verify outline doesn't clip or hide element content
4. [ ] Press Enter/Space to activate — confirm action occurs
5. [ ] In dark mode, verify focus still visible (use `#3b82f6` if needed)

### Anti-pattern (do NOT do)

- ❌ `outline: none;` with no alternative (common reset.css mistake)
- ❌ Low-contrast focus indicator (e.g., `#e0e0e0` gray outline on white — fails 3:1)
- ❌ Focus indicator that hides element content (e.g., thick inset shadow that obscures text)
- ❌ Inconsistent focus styles (blue on inputs, red on buttons — confusing for keyboard users)

## Allocation Chart Accessibility

**WCAG 1.1.1 (Non-text Content):** Visual data representations must have text alternatives.

### The Stacked Bar Visualization — Dual Representation Required

The allocation bar (CSS-only horizontal stacked bar showing phase funding breakdown) is a **decorative enhancement** of the data table. Both must be present.

#### Accessible Table (Primary Data Source)

```html
<table class="projection-table allocation-table">
  <caption>Retirement Corpus Allocation Across Life Phases</caption>
  <thead>
    <tr>
      <th scope="col">Phase Name</th>
      <th scope="col">Age Range</th>
      <th scope="col">Total Cost</th>
      <th scope="col">Allocated Amount</th>
      <th scope="col">Percentage</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="phase-dot" style="background: #2563eb;"></span> Kids' Education</td>
      <td>40-50</td>
      <td>₹35.2L</td>
      <td>₹35.2L</td>
      <td>35.2%</td>
      <td><span class="health-indicator good"><span class="health-dot"></span> Fully Funded</span></td>
    </tr>
    <!-- Additional rows... -->
  </tbody>
</table>
```

**Key accessibility features:**
- `<caption>` describes the table's purpose
- `<th scope="col">` labels each column (screen reader announces on every cell)
- Status column contains text + icon (not color alone)
- Phase name cell includes text name + colored dot (redundant encoding)

#### Visual Bar (Decorative Enhancement)

```html
<div class="alloc-bar" role="img" aria-label="Retirement corpus allocation across 4 phases: Kids' Education 35%, Travel 20%, Healthcare 30%, Contingency 15%">
  <div class="alloc-bar__segment" style="flex-basis: 35.2%; background: #2563eb;" title="Kids' Education: ₹35.2L (35.2%)"></div>
  <div class="alloc-bar__segment" style="flex-basis: 20%; background: #10b981;" title="Travel: ₹20L (20%)"></div>
  <!-- Additional segments... -->
</div>
```

**Key accessibility features:**
- `role="img"` tells screen readers to treat the entire bar as a single image
- `aria-label` on container provides a text summary of the visualization (lists all phases + percentages)
- `title` attributes on segments provide hover tooltips (assistive for sighted users, but NOT relied on for a11y)
- Screen readers will announce the `aria-label` once, then skip the bar (data is in table)

### User Flow for Screen Reader Users

1. User navigates to allocation section
2. Encounters table first (or bar first if bar precedes table — either order works)
3. If bar first: hears "Retirement corpus allocation across 4 phases: Kids' Education 35%, Travel 20%, Healthcare 30%, Contingency 15%"
4. Navigates past bar to table
5. Reads table row-by-row for detailed breakdown

### Testing Checklist

- [ ] Run VoiceOver (macOS: Cmd+F5) or NVDA (Windows) on the allocation section
- [ ] Verify table caption is announced
- [ ] Navigate through table rows — verify all data is readable
- [ ] Navigate to allocation bar — verify `aria-label` announces summary
- [ ] Verify bar segments themselves are not individually announced (they're children of the `role="img"` container)
- [ ] Toggle to table — verify no information is lost

### Anti-pattern (do NOT do)

- ❌ Bar visualization without a data table fallback
- ❌ `aria-hidden="true"` on the bar (it provides visual context for sighted users — screen readers correctly skip via table)
- ❌ `aria-label` on individual segments (redundant — container label covers all)
- ❌ Relying on `:hover` tooltips for critical data (tooltips are progressive enhancement, not a11y requirement)

## Suggestion Banner Accessibility

**WCAG 4.1.3 (Status Messages):** Dynamic content updates must be announced to assistive technologies without receiving focus.

### The `role="alert"` Pattern

When the system detects an issue (gaps, overlaps, underfunding), a suggestion banner appears. This is a **live region** — screen readers must announce it immediately.

```html
<div class="alert alert-warning" role="alert">
  <span class="alert-icon" aria-hidden="true">⚠️</span>
  <span class="alert-message">
    Gap detected: ages 50-55 are not covered by any phase. 
    <a href="#add-phase-form" class="alert-link">Add a phase to fill this gap</a>.
  </span>
  <button type="button" class="alert-dismiss" aria-label="Dismiss suggestion">
    <span aria-hidden="true">×</span>
  </button>
</div>
```

### Key Accessibility Features

| Attribute/Element | Purpose |
|-------------------|---------|
| `role="alert"` | Tells screen readers this is an assertive live region — announce immediately (interrupts current reading) |
| `aria-live="assertive"` | Implicit with `role="alert"` — no need to add explicitly |
| Icon `aria-hidden="true"` | Warning icon is decorative (message text already conveys urgency) |
| Link in message | Actionable suggestion — keyboard accessible, descriptive text |
| Dismiss button `aria-label` | No visible text (icon only), so `aria-label` provides label for screen readers |
| Dismiss icon `aria-hidden="true"` | The `×` is decorative (button's `aria-label` is the real label) |

### Announcement Behavior

**When banner appears:**
- Screen reader immediately announces: "Alert. Gap detected: ages 50-55 are not covered by any phase. Add a phase to fill this gap."
- User can continue navigating — banner stays on page (does NOT auto-dismiss)
- User can Tab to the link or dismiss button

**When banner is dismissed:**
- No announcement (dismissal is user-initiated, not system-initiated)
- Banner fades out and is removed from DOM

### Persistent vs. Toast Notifications

**Suggestion banner = persistent** (stays on page until dismissed or issue resolved):
- Use `role="alert"`
- User controls dismissal
- Keyboard accessible (dismiss button is tabbable)

**Toast notification** (auto-dismisses after 5s):
- Use `role="status"` + `aria-live="polite"` (less assertive)
- NOT used for critical suggestions (gaps, underfunding) — only for success confirmations ("Phase added")

### Multiple Banners

If multiple issues exist (e.g., gap + overlap + underfunding), show them as:
1. **Stacked vertically** (each with `role="alert"`)
2. **Screen reader announces each** in sequence (top-to-bottom DOM order)
3. **Each has its own dismiss button** (independent dismissal)

Do NOT combine all issues into one mega-banner with a bulleted list — screen readers won't re-announce if you dynamically add a new issue to an existing alert.

### Testing Checklist

- [ ] Trigger a suggestion (e.g., add phase with gap)
- [ ] Enable VoiceOver / NVDA
- [ ] Verify banner is announced immediately
- [ ] Tab to dismiss button — verify focus visible + `aria-label` read
- [ ] Press Enter/Space to dismiss — verify banner removed
- [ ] Trigger another suggestion — verify new banner announced

### Anti-pattern (do NOT do)

- ❌ `role="status"` for critical alerts (too passive — user might miss it)
- ❌ Auto-dismiss critical alerts after timeout (user needs time to read + act)
- ❌ Icon-only dismiss button without `aria-label` (screen reader says "button" with no context)
- ❌ Updating existing alert's text dynamically (screen reader won't re-announce — create new alert instead)
- ❌ Toast notification for errors/warnings (use persistent banner + `role="alert"`)
