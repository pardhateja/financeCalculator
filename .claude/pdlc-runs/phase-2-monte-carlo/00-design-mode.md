# Design Mode Assessment — Phase 2 Monte Carlo

**Run:** phase-2-monte-carlo  
**Design Lead:** design-lead  
**Date:** 2026-04-29

---

## Declared Mode: **BROWNFIELD-EXTEND**

Phase 2 is NOT greenfield. Phase 1 (multi-goal-early-retirement) shipped a complete design system documented in `.claude/pdlc-runs/multi-goal-early-retirement/design/`:

- **Design tokens**: `03-design-tokens.json` (colors, typography, spacing, shadows, radii, transitions, borders)
- **Design strategy**: data-dense utilitarian calculator for FIRE community power users
- **A11y baseline**: WCAG 2.1 AA, focus states, color contrast verified, dark mode mandatory
- **Existing patterns**: `.summary-card`, `.health-indicator`, `.projection-table`, `.chart-container`, `.section-group`, `.input-group`

Phase 2 **extends** this system with probabilistic visualization. We are NOT redesigning the planner. The toggle sits at the top of the existing Projections tab; the "Ideal Scenario" view (existing year-by-year table) remains pixel-identical.

---

## What Phase 2 Reuses from Phase 1

### Colors — Direct Reuse

| Token | Value | Usage in Monte Carlo |
|-------|-------|---------------------|
| `color.brand.primary` | `#2563eb` | Success% chart bars, focus states, toggle active state |
| `color.semantic.secondary` | `#10b981` | High success% (green semantic — "good") |
| `color.semantic.warning` | `#f59e0b` | Borderline success% (50-75%) |
| `color.semantic.danger` | `#ef4444` | Low success% (<50%) — "risky" |
| `color.neutral.bg` | `#f8fafc` | Chart container background (light mode) |
| `color.neutral.border` | `#e2e8f0` | Chart gridlines, toggle border |
| `color.neutral.text-primary` | `#1e293b` | Chart axis labels, age labels |
| `color.neutral.text-secondary` | `#64748b` | Chart subtitle, helper text |
| `color.dark.panel-bg` | `#1e293b` | Dark mode chart container background |
| `color.dark.text-primary` | `#e2e8f0` | Dark mode chart labels |

### Typography — Direct Reuse

| Token | Value | Usage in Monte Carlo |
|-------|-------|---------------------|
| `typography.family.sans` | System font stack | All text (no custom fonts) |
| `typography.size.h3` | `1.15rem` (18.4px) | Section header "Stress Test (Monte Carlo)" |
| `typography.size.base` | `1rem` (16px) | Toggle label text, chart axis labels |
| `typography.size.label` | `0.85rem` (13.6px) | Chart data labels (success% on bars) |
| `typography.size.sm` | `0.8rem` (12.8px) | Plain-English interpretation sub-text |
| `typography.weight.semibold` | `600` | Toggle active state text, chart title |
| `typography.weight.bold` | `700` | Success% values in chart |

### Spacing — Direct Reuse

| Token | Value | Usage in Monte Carlo |
|-------|-------|---------------------|
| `spacing.16` | `16px` | Gap between toggle and chart, gap between chart and summary |
| `spacing.20` | `20px` | Chart container padding |
| `spacing.24` | `24px` | Bottom margin of chart (before existing projection table) |
| `spacing.12` | `12px` | Gap between bars in chart |

### Radii, Shadows, Transitions — Direct Reuse

| Token | Value | Usage in Monte Carlo |
|-------|-------|---------------------|
| `radii.card` | `12px` | Chart container, toggle container |
| `shadow.default` | `0 4px 6px -1px rgba(0,0,0,0.1)...` | Chart container box-shadow |
| `transition.fast` | `0.2s` | Toggle switch animation |

---

## What Phase 2 ADDS (Extensions to Token Set)

### New Color — Probability Thresholds (Semantic Extension)

Monte Carlo needs to map success% to color. We extend the semantic palette with **probability-specific tokens**:

```json
{
  "color": {
    "probability": {
      "high": {
        "value": "{color.semantic.secondary}",
        "type": "color",
        "description": "Success% ≥ 85% — 'safe' green (#10b981, matches Phase 1 'good' health indicator)"
      },
      "medium": {
        "value": "{color.brand.primary}",
        "type": "color",
        "description": "Success% 75-84% — 'acceptable' blue (#2563eb, matches Phase 1 primary)"
      },
      "borderline": {
        "value": "{color.semantic.warning}",
        "type": "color",
        "description": "Success% 50-74% — 'risky' amber (#f59e0b, matches Phase 1 warning)"
      },
      "low": {
        "value": "{color.semantic.danger}",
        "type": "color",
        "description": "Success% < 50% — 'likely fail' red (#ef4444, matches Phase 1 danger)"
      }
    }
  }
}
```

**Why this works:**
- Reuses existing semantic colors → no new hues to verify for contrast
- Mapping is intuitive: green = good, amber = caution, red = bad
- WCAG AA contrast already verified in Phase 1 a11y audit (see Phase 1 `03-a11y-defaults.md` lines 10-34)
- Dark mode variants already exist (`color.dark.*`)

### New Component Pattern — Segmented Control Toggle

Phase 1 has NO toggle UI (radio buttons exist for single-goal vs multi-goal on Dashboard, but styled as standard radios). Monte Carlo needs an **iOS-style segmented control** for "Ideal Scenario | Stress Test (Monte Carlo)".

**New tokens:**

```json
{
  "spacing": {
    "toggle-padding": {
      "value": "4px",
      "type": "spacing",
      "description": "Padding inside toggle container around segments"
    }
  },
  "color": {
    "toggle": {
      "bg": {
        "value": "{color.neutral.bg}",
        "type": "color",
        "description": "Toggle container background (light mode) — #f8fafc"
      },
      "inactive-text": {
        "value": "{color.neutral.text-secondary}",
        "type": "color",
        "description": "Inactive segment text — #64748b"
      },
      "active-bg": {
        "value": "white",
        "type": "color",
        "description": "Active segment background (light mode) — white with shadow for raised effect"
      },
      "active-text": {
        "value": "{color.neutral.text-primary}",
        "type": "color",
        "description": "Active segment text — #1e293b"
      }
    }
  },
  "shadow": {
    "toggle-active": {
      "value": "0 1px 3px rgba(0, 0, 0, 0.12)",
      "type": "boxShadow",
      "description": "Subtle shadow on active toggle segment (raised appearance)"
    }
  }
}
```

**Dark mode variants:**

```json
{
  "color": {
    "dark": {
      "toggle": {
        "bg": {
          "value": "#0f172a",
          "type": "color",
          "description": "Dark mode toggle container background (slate-900)"
        },
        "active-bg": {
          "value": "#1e293b",
          "type": "color",
          "description": "Dark mode active segment background (slate-800)"
        }
      }
    }
  }
}
```

### New Typography — Chart-Specific Sizes

Phase 1 has chart axes (via Chart.js `projectionChart`), but those are Canvas-rendered. Monte Carlo may use HTML/SVG for success% bars (decision pending UI Designer wireframe). If HTML:

```json
{
  "typography": {
    "size": {
      "chart-axis": {
        "value": "0.75rem",
        "type": "fontSize",
        "description": "12px — age axis labels on Monte Carlo chart"
      },
      "chart-data-label": {
        "value": "0.85rem",
        "type": "fontSize",
        "description": "13.6px — success% labels on bars (matches existing .label size)"
      }
    }
  }
}
```

**If Chart.js canvas:** These tokens unused (Chart.js config uses pixel sizes directly). But we document them for consistency.

---

## What Phase 2 Does NOT Add

### Anti-Patterns Avoided

1. **NO new color hues** — we use green/blue/amber/red from Phase 1. No purple, teal, or other phase colors (those are for multi-goal phases, not Monte Carlo).
2. **NO Chart.js extension beyond existing** — Phase 1 already loads Chart.js for line/area chart in Projections. Monte Carlo uses the same instance. No sankey, donut, radar, or other plugins.
3. **NO new CSS framework** — vanilla CSS only, tokens in `:root` CSS variables.
4. **NO redesign of existing Projections tab** — the summary cards (Corpus at Retirement, Years Earning, etc.) stay byte-identical. The year-by-year table stays byte-identical (just hidden when "Stress Test" toggle active).
5. **NO new fonts** — system font stack only.

---

## Constraints for the Design Squad

### UX Researcher
- Extend Phase 1 a11y baseline (WCAG 2.1 AA). New chart must work with screen readers (data table fallback or `aria-label` on Canvas).
- Verify new probability color thresholds meet contrast minimums in both light and dark mode (already verified in Phase 1 for semantic colors, but double-check success% text-on-bar contrast).
- Empty state pattern: reuse Phase 1 "No data yet" message style (see multi-goal tab empty state).
- Error state: reuse Phase 1 inline alert pattern (see Phase 1 overlap/gap warnings).

### UI Designer
- Wireframe the toggle (segmented control) above existing Projections tab content.
- Wireframe the "Success Rate vs. Age" chart — RECOMMEND chart type (bar? line? lollipop?) with defense in design-questions doc.
- Wireframe the plain-English interpretation placement ("Your plan is great until 80, risky after").
- Reuse `.chart-container` (white card with shadow, 20px padding, 12px border-radius).
- Reuse `.projection-summary` grid for any new summary cards (if needed — e.g., "Median Corpus at 80: ₹X").
- Mobile: chart layout must degrade gracefully (no horizontal scroll hell).

### Design System Engineer
- Extract new tokens (probability colors, toggle tokens, chart axis sizes) into `.claude/pdlc-runs/phase-2-monte-carlo/design/03-design-tokens-extensions.json`.
- Provide dark mode CSS variable mappings for new components (toggle, chart).
- Document component pattern for segmented control (HTML structure + CSS classes).
- NO new CSS files — extend existing `forms.css` (for toggle) and `tables.css` or new `monte-carlo.css` (scoped to `.monte-carlo-chart` only).

---

## Sign-off Criteria (Stage 2 Gate)

I will approve Phase 2 design artifacts when:

1. ✅ All new colors are EITHER reused from Phase 1 OR explicitly justified as extensions with contrast verified.
2. ✅ All new components reuse Phase 1 patterns (`.section-group`, `.summary-card`, `.chart-container`) OR are minimal additions (toggle only).
3. ✅ Dark mode specified for every new component.
4. ✅ Mobile responsive behavior documented (what changes at 768px, 1024px breakpoints per Phase 1 `responsive.css`).
5. ✅ Accessibility baseline extended (focus states, keyboard nav, screen reader support for chart).
6. ✅ NO framework adoption, NO Chart.js plugins, NO redesign of Phase 1 work.

---

**Design Lead signature:** Brownfield-extend mode confirmed. Phase 1 design system is the foundation. Phase 2 adds probabilistic visualization layer with minimal new patterns. Ready for design-questions doc next.
