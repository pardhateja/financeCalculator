# Data Contracts — Multi-Goal Early Retirement Planner

**Owner**: pdlc-tech-lead
**Status**: published
**Date**: 2026-04-27
**Linked Tech Spec**: 01-tech-spec.md

## Purpose

This document defines the **internal data shapes** for the Multi-Goal feature. Since this is a client-only application (no API, no backend), these contracts govern the structure of:
1. Phase objects stored in localStorage
2. Allocation results computed by the engine
3. Projection rows rendered in the table
4. Sharelink URL encoding/decoding

**Contract stability rule**: These schemas are **locked as of Stage 3 publication**. Any modification requires Tech Lead approval + notification to FE Lead (same protocol as API contract changes in full-stack projects).

---

## 1. Phase Object Schema

**Storage location**: `localStorage.rp_phases` (JSON-stringified array)
**Runtime location**: `RP._phases` (in-memory array)

### Schema
```javascript
{
  id: string,                    // Unique identifier (e.g., "phase-1714156800000" from Date.now())
  name: string,                  // User-provided label, max 60 chars (e.g., "Kids in college")
  startAge: number,              // Integer, user's age at phase start (e.g., 50)
  endAge: number,                // Integer, user's age at phase end (e.g., 54)
  baseMonthlyExpense: number,    // INR, monthly expense at TODAY's value (e.g., 200000)
  inflationRate: number,         // Percent per year, NOT /100 (e.g., 10.0 for 10%)
  color: string                  // Auto-assigned: "blue" | "emerald" | "amber" | "purple" | "teal" | "pink"
}
```

### Field constraints
| Field | Type | Constraint | Validation |
|---|---|---|---|
| `id` | string | Unique within array | Generated via `"phase-" + Date.now()` OR valid UUID v4 |
| `name` | string | Length 1-60, trimmed | `name.trim().length >= 1 && name.trim().length <= 60` |
| `startAge` | number | Integer, `retirementAge ≤ startAge ≤ lifeExpectancy` | Read from existing inputs: `RP.val('retirementAge')`, `RP.val('lifeExpectancy')` |
| `endAge` | number | Integer, `startAge < endAge ≤ lifeExpectancy` | Must be > `startAge` AND ≤ `RP.val('lifeExpectancy')` |
| `baseMonthlyExpense` | number | Must be > 0 | `baseMonthlyExpense > 0` |
| `inflationRate` | number | Range 0-25 (percent, not decimal) | `0 ≤ inflationRate ≤ 25` |
| `color` | string | One of 6 predefined colors | Auto-assigned by index mod 6 (see Color Rotation Rule below) |

### Color rotation rule
Phases are **auto-assigned** colors by their index in the `RP._phases` array, modulo 6:

| Index mod 6 | Color | Hex (for reference) |
|---|---|---|
| 0 | `"blue"` | `#3b82f6` |
| 1 | `"emerald"` | `#10b981` |
| 2 | `"amber"` | `#f59e0b` |
| 3 | `"purple"` | `#a855f7` |
| 4 | `"teal"` | `#14b8a6` |
| 5 | `"pink"` | `#ec4899` |

**Color assignment logic**:
```javascript
const colors = ["blue", "emerald", "amber", "purple", "teal", "pink"];
phase.color = colors[index % 6];
```

**On phase deletion**: Remaining phases **keep their existing color** (no re-assignment). This preserves visual consistency when user deletes a middle phase.

### Validation contract
Every phase object MUST pass validation **before being accepted** into `RP._phases`. This applies to:
1. User-created phases (via UI form)
2. Sharelink-imported phases (via URL param decoding)
3. LocalStorage-loaded phases (on page boot)

**Validation function signature**:
```javascript
/**
 * Validates a phase object against contract constraints
 * @param {object} phase - The phase object to validate
 * @param {number} retirementAge - From RP.val('retirementAge')
 * @param {number} lifeExpectancy - From RP.val('lifeExpectancy')
 * @returns {boolean} - true if valid, false otherwise
 */
RP.validatePhase = function (phase, retirementAge, lifeExpectancy) {
  if (!phase.id || typeof phase.id !== 'string') return false;
  if (!phase.name || typeof phase.name !== 'string') return false;
  if (phase.name.trim().length < 1 || phase.name.trim().length > 60) return false;
  if (!Number.isInteger(phase.startAge) || phase.startAge < retirementAge || phase.startAge > lifeExpectancy) return false;
  if (!Number.isInteger(phase.endAge) || phase.endAge <= phase.startAge || phase.endAge > lifeExpectancy) return false;
  if (typeof phase.baseMonthlyExpense !== 'number' || phase.baseMonthlyExpense <= 0) return false;
  if (typeof phase.inflationRate !== 'number' || phase.inflationRate < 0 || phase.inflationRate > 25) return false;
  return true;
};
```

**On validation failure**:
- **UI form submission**: Show inline error message, block add/update
- **Sharelink import**: Log `console.warn('Invalid phase data, skipping:', phase)` + skip that phase (don't crash)
- **LocalStorage load**: Same as sharelink (skip invalid, load valid ones)

---

## 2. Allocation Result Object

**Purpose**: Output of PV-proportional allocation algorithm (pre-flight display before running projection)
**Runtime location**: `RP._phaseAllocations` (object with `phases` array + summary fields)

### Schema
```javascript
{
  phaseId: string,               // Matches phase.id
  phaseName: string,             // Matches phase.name (for display convenience)
  ageRange: string,              // e.g., "50-54" (startAge-endAge)
  pvRequired: number,            // Present Value of all future expenses for this phase (₹)
  allocated: number,             // Actual corpus allocated to this phase (₹)
  percentOfCorpus: number,       // % of total corpus (e.g., 42.5)
  deficit: number,               // If pvRequired > allocated, else 0 (₹)
  status: string                 // "funded" | "underfunded" | "overfunded"
}
```

### Field definitions
| Field | Type | Calculation | Display |
|---|---|---|---|
| `phaseId` | string | Copy from `phase.id` | Hidden (internal key) |
| `phaseName` | string | Copy from `phase.name` | Table column 1 |
| `ageRange` | string | `phase.startAge + "-" + phase.endAge` | Table column 2 |
| `pvRequired` | number | Sum of discounted inflated expenses for this phase (see Appendix A in Tech Spec) | `RP.formatCurrency(pvRequired)` |
| `allocated` | number | `(pvRequired / totalPV) * totalCorpus` (proportional) | `RP.formatCurrency(allocated)` |
| `percentOfCorpus` | number | `(allocated / totalCorpus) * 100` | `percentOfCorpus.toFixed(1) + "%"` |
| `deficit` | number | `Math.max(0, pvRequired - allocated)` | If > 0: red text + `RP.formatCurrency(deficit)` |
| `status` | string | `allocated >= pvRequired ? "funded" : "underfunded"` (overfunded only if user manually overrides allocation in v2) | Badge: green/"funded", red/"underfunded" |

### Summary fields (parent object `RP._phaseAllocations`)
```javascript
{
  phases: [ /* array of allocation objects above */ ],
  totalPV: number,               // Sum of all pvRequired
  totalCorpus: number,           // Available corpus at retirement (from projections)
  surplus: number,               // Math.max(0, totalCorpus - totalPV)
  overallDeficit: number         // Math.max(0, totalPV - totalCorpus)
}
```

**Display logic**:
- If `overallDeficit > 0`: Show red warning banner above allocation table + actionable suggestion ("Increase monthly investment by ₹X OR reduce Phase Y by Z%")
- If `surplus > 0`: Show green info banner ("Surplus: ₹X available as emergency buffer")

---

## 3. Projection Row Object

**Purpose**: One row in the year-by-year multi-goal projection table
**Runtime location**: `RP._multiGoalProjectionRows` (array of row objects, one per year from `retirementAge` to `lifeExpectancy`)

### Schema
```javascript
{
  age: number,                   // User's age for this row (e.g., 50)
  activePhaseIds: string[],      // IDs of phases covering this age (can be 0, 1, or many)
  starting: number,              // Total corpus at start of year (sum across all phase buckets, ₹)
  growth: number,                // Total growth (sum of all phase buckets' growth, ₹)
  expenses: number,              // Total expenses withdrawn (sum across active phases, ₹)
  ending: number,                // Total corpus at end of year (₹)
  status: string,                // "healthy" | "depleting" | "depleted"
  activePhases: [                // Detailed per-phase breakdown for this year
    {
      phaseId: string,           // Matches phase.id
      phaseName: string,         // Matches phase.name
      color: string,             // Matches phase.color (for colored badge rendering)
      bucketStarting: number,    // This phase's sub-corpus at start of year (₹)
      bucketGrowth: number,      // Growth for this phase's bucket (₹)
      bucketExpense: number,     // Inflated expense for this phase this year (₹)
      bucketEnding: number,      // This phase's sub-corpus at end of year (₹)
      isExhausted: boolean       // true if bucket hit zero this year or earlier
    }
  ]
}
```

### Field constraints
| Field | Type | Constraint |
|---|---|---|
| `age` | number | Integer, `retirementAge ≤ age ≤ lifeExpectancy` |
| `activePhaseIds` | string[] | Subset of `RP._phases.map(p => p.id)` where `p.startAge ≤ age ≤ p.endAge` |
| `starting` | number | Sum of `activePhases[].bucketStarting` |
| `growth` | number | Sum of `activePhases[].bucketGrowth` |
| `expenses` | number | Sum of `activePhases[].bucketExpense` |
| `ending` | number | `starting + growth - expenses` (can go negative if corpus exhausted) |
| `status` | string | `"healthy"` if `ending > expenses * 5`, `"depleting"` if `0 < ending ≤ expenses * 5`, `"depleted"` if `ending ≤ 0` |
| `activePhases` | array | Length = `activePhaseIds.length` (can be empty if no phases cover this age — gap year) |

### Per-phase breakdown (`activePhases[i]` object)
| Field | Calculation |
|---|---|
| `bucketStarting` | Carried forward from previous year's `bucketEnding` (or initial `allocated` for first year of phase) |
| `bucketGrowth` | `bucketStarting * RP._postReturn` |
| `bucketExpense` | `phase.baseMonthlyExpense * Math.pow(1 + phase.inflationRate/100, age - currentAge) * 12` |
| `bucketEnding` | `Math.max(0, bucketStarting + bucketGrowth - bucketExpense)` (clamped to zero, no negative balances) |
| `isExhausted` | `true` if `bucketEnding === 0 && bucketExpense > bucketStarting + bucketGrowth` |

### Edge cases
- **Gap year** (no phases covering this age): `activePhaseIds = []`, `expenses = 0`, `ending = starting + growth`
- **Overlap year** (multiple phases covering this age): `expenses = sum(bucketExpense)`, badges for all active phases shown in table cell
- **Phase exhaustion**: Once a phase's bucket hits zero, `isExhausted = true` for ALL subsequent years (even if phase is still "active" by age range)

---

## 4. LocalStorage Shape

**Key**: `rp_phases`
**Value**: JSON-stringified array of Phase objects (see Section 1)

### Example
```json
[
  {
    "id": "phase-1714156800000",
    "name": "Kids in college",
    "startAge": 50,
    "endAge": 54,
    "baseMonthlyExpense": 200000,
    "inflationRate": 10.0,
    "color": "blue"
  },
  {
    "id": "phase-1714156801234",
    "name": "Late retirement medical",
    "startAge": 70,
    "endAge": 85,
    "baseMonthlyExpense": 150000,
    "inflationRate": 12.0,
    "color": "emerald"
  }
]
```

### Persistence operations
| Operation | Function | Trigger |
|---|---|---|
| **Save** | `RP.savePhasesData()` | After add/edit/delete phase, after sharelink import |
| **Load** | `RP.loadPhasesData()` | On page boot (`RP.initMultiGoal()`), returns `[]` if key absent |
| **Clear** | `localStorage.removeItem('rp_phases')` | Not exposed in UI (manual browser console only) |

**Collision handling**: None needed (single-user, client-only tool).

---

## 5. Sharelink URL Parameter

**Parameter name**: `phases`
**Format**: Base64-encoded JSON array of Phase objects
**Encoding trigger**: User clicks "Copy Share Link" button AND checks "Include phases in shared link" checkbox (default: ON)

### URL structure
```
https://example.com/retirement-planner/?plan=<existing_inputs_base64>&phases=<phases_base64>
```

### Encoding logic
```javascript
// In sharelink.js, RP.generateShareLink() extension
const includePhases = document.getElementById('includePhasesCb')?.checked;
if (includePhases && RP._phases && RP._phases.length > 0) {
  const phasesJson = JSON.stringify(RP._phases);
  const phasesEncoded = btoa(phasesJson);
  url += '&phases=' + phasesEncoded;
}
```

### Decoding logic
```javascript
// In sharelink.js, RP.loadFromShareLink() extension
const phasesData = params.get('phases');
if (phasesData) {
  try {
    const decoded = JSON.parse(atob(phasesData));
    const retAge = parseInt(RP.val('retirementAge'));
    const lifeExp = parseInt(RP.val('lifeExpectancy'));
    
    // Validate each phase
    RP._phases = decoded.filter(phase => RP.validatePhase(phase, retAge, lifeExp));
    
    if (decoded.length > RP._phases.length) {
      console.warn('Some phases in share link failed validation and were skipped');
    }
    
    RP.savePhasesData(); // Persist locally
    if (RP.renderPhases) RP.renderPhases(); // Render UI
  } catch (e) {
    console.warn('Invalid phases data in share link, skipping:', e);
  }
}
```

### Backward compatibility
| Scenario | Behavior |
|---|---|
| Old sharelink (no `phases` param) | Multi-goal tab starts empty, user in single-bucket mode |
| New sharelink with valid `phases` | Auto-populates multi-goal tab + persists to `rp_phases` |
| New sharelink with malformed `phases` | Log `console.warn` + skip phases (input fields still load normally) |
| Phases fail validation | Skip invalid phases + log warning, load valid ones |

**Security**: No XSS risk (phases array contains only numbers/strings, rendered as `.textContent`, not `.innerHTML`).

---

## 6. Validation Contract (Cross-Cutting)

**Rule**: Every phase entering `RP._phases` MUST pass validation, regardless of source (UI form, sharelink, localStorage).

### Validation gates
1. **UI form submission** (`RP.addPhase()`, `RP.updatePhase()`):
   - Validate BEFORE adding to `RP._phases`
   - On failure: show inline error message, block submission
   
2. **Sharelink import** (`RP.loadFromShareLink()`):
   - Validate AFTER decoding, BEFORE adding to `RP._phases`
   - On failure: log `console.warn`, skip invalid phase, continue with valid ones
   
3. **LocalStorage load** (`RP.loadPhasesData()`):
   - Validate AFTER parsing JSON, BEFORE setting `RP._phases`
   - On failure: same as sharelink (skip invalid, load valid)

### Validation error messages (UI only)
| Constraint violation | Error message |
|---|---|
| `name` length < 1 | "Phase name cannot be empty" |
| `name` length > 60 | "Phase name too long (max 60 characters)" |
| `startAge < retirementAge` | "Phase cannot start before retirement (age X)" |
| `startAge > lifeExpectancy` | "Phase cannot start after life expectancy (age Y)" |
| `endAge <= startAge` | "Phase end age must be after start age" |
| `endAge > lifeExpectancy` | "Phase cannot extend beyond life expectancy (age Y)" |
| `baseMonthlyExpense <= 0` | "Monthly expense must be greater than zero" |
| `inflationRate < 0` | "Inflation rate cannot be negative" |
| `inflationRate > 25` | "Inflation rate too high (max 25%)" |

**No validation for overlaps/gaps** — these are informational warnings (badges), not errors. User may intentionally create overlapping phases (e.g., "kids college" + "general lifestyle" for same years).

---

## 7. India Inflation Defaults (Reference Only)

**Not part of contract** — these are suggested values for "Load Example" button, user can override.

| Category | Default Inflation Rate |
|---|---|
| General CPI (lifestyle, food, housing) | 6% |
| Education (kids' college) | 10% |
| Medical (late retirement) | 12% |
| Travel/Leisure | 7% |

**Source**: Common India FIRE community rule-of-thumb (not regulatory, user can adjust per phase).

---

## 8. Contract Change Protocol

**Locked as of Stage 3 publication (2026-04-27).**

If any schema in Sections 1-6 needs modification during Stages 4-7:
1. Engineer identifies needed change → SendMessage `pdlc-tech-lead` with justification
2. Tech Lead reviews: is this a bug fix (missing field) OR scope creep (new feature)?
   - Bug fix: approve, notify FE Lead
   - Scope creep: escalate to PM + Engineering Manager for scope re-approval
3. Tech Lead updates this doc (03-data-contracts.md) with changelog table (below)
4. Tech Lead SendMessage `pdlc-fe-lead` with diff
5. FE Lead notifies affected engineers

### Change log
| Date | Changed by | Section | Change | Reason | Approved by |
|---|---|---|---|---|---|
| 2026-04-27 | pdlc-tech-lead | Initial | All schemas published | Stage 3 kickoff | N/A (initial) |

---

**End of Data Contracts**
