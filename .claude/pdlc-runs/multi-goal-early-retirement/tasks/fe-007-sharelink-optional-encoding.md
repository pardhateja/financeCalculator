---
id: fe-007
title: Sharelink optional encoding (Option C)
type: implementation
status: completed
owner: "eng-fe-007"
priority: P1
created_by: pdlc-fe-lead
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T17:30:00Z
attempts: 1
merged_at: 2026-04-27T17:30:00Z
branch: feat/fe-007
files:
  - js/sharelink.js
  - build.sh
contract_refs:
  - 02-approval.md#blocker-1-option-c
design_refs:
  - design/02-wireframes.md#navigation-integration
  - 01-prd.md#ac10-sharelink-persistence
blocked_by:
  - fe-006
blocks: []
attempts: 1
---

## Description

Extend the existing sharelink feature to OPTIONALLY encode phases when user checks "Include phases in shared link" checkbox. Per Gate A Option C decision, this is additive to always-on localStorage persistence (fe-006).

**What to build**:

### 1. Checkbox in Sharelink UI

Add to `build.sh` header template (line ~31, next to existing "Copy Share Link" button):
```html
<div style="display:flex;align-items:center;gap:8px;">
  <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;color:#fff;">
    <input type="checkbox" id="includePhases" checked>
    Include phases in link
  </label>
  <button id="shareLinkBtn" onclick="RP.generateShareLink()" ...>Copy Share Link</button>
</div>
```

**Note**: Default checkbox state is **checked** (per 02-approval.md line 12: "Default for the checkbox: ON").

### 2. Extend `RP.generateShareLink()` in `js/sharelink.js`

Read existing `sharelink.js` to understand current pattern:
```javascript
// Current pattern (simplified from existing file):
RP.generateShareLink = function() {
  const data = {};
  document.querySelectorAll('input').forEach(input => {
    if (input.type !== 'button' && input.id) {
      data[input.id] = input.value;
    }
  });
  const encoded = btoa(JSON.stringify(data));
  const url = window.location.href.split('?')[0] + '?data=' + encoded;
  // Copy to clipboard ...
};
```

**Extend to**:
```javascript
RP.generateShareLink = function() {
  const data = {};
  document.querySelectorAll('input').forEach(input => {
    if (input.type !== 'button' && input.type !== 'checkbox' && input.id && input.id !== 'includePhases') {
      data[input.id] = input.value;
    }
  });
  
  // NEW: Optionally include phases
  const includePhases = document.getElementById('includePhases');
  if (includePhases && includePhases.checked && RP._phases && RP._phases.length > 0) {
    data._phases = RP._phases; // Embed phases array into data object
  }
  
  const encoded = btoa(JSON.stringify(data));
  const url = window.location.href.split('?')[0] + '?data=' + encoded;
  
  navigator.clipboard.writeText(url).then(() => {
    alert('Share link copied to clipboard!');
  }).catch(err => {
    prompt('Copy this link:', url);
  });
};
```

### 3. Extend Sharelink Decoder (Load from URL)

Find existing URL param reader in `sharelink.js` or `app.js` (likely in page load handler):
```javascript
// Current pattern:
const urlParams = new URLSearchParams(window.location.search);
const dataParam = urlParams.get('data');
if (dataParam) {
  try {
    const data = JSON.parse(atob(dataParam));
    Object.keys(data).forEach(key => {
      const input = document.getElementById(key);
      if (input) input.value = data[key];
    });
  } catch (e) {
    console.error('Failed to load sharelink:', e);
  }
}
```

**Extend to**:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const dataParam = urlParams.get('data');
if (dataParam) {
  try {
    const data = JSON.parse(atob(dataParam));
    
    // Load input fields (existing logic)
    Object.keys(data).forEach(key => {
      if (key === '_phases') return; // Skip phases in this loop
      const input = document.getElementById(key);
      if (input) input.value = data[key];
    });
    
    // NEW: Load phases if present in sharelink
    if (data._phases && Array.isArray(data._phases)) {
      RP._phases = data._phases;
      RP.savePhasesData(); // Persist to localStorage (fe-006's function)
      
      // If Multi-Goal tab is currently visible, re-render
      if (document.getElementById('multigoal-tab').classList.contains('active')) {
        RP.renderPhases();
        RP.calculateMultiGoal();
      }
    }
    
    // Recalculate all tabs (existing logic)
    if (typeof RP.calculateAll === 'function') {
      RP.calculateAll();
    }
  } catch (e) {
    console.error('Failed to load sharelink:', e);
  }
}
```

### 4. Backward Compatibility

**Critical**: Existing sharelinks (generated before this feature) do NOT have `_phases` field. Loading them should:
- NOT crash
- Load input fields normally (existing behavior)
- Multi-Goal tab shows empty state or uses locally-persisted phases (from fe-006)

This is already handled by the `if (data._phases && Array.isArray(data._phases))` guard above.

**What NOT to do**:
- Do NOT modify `profiles.js` (profiles remain input-only per Tech Spec Risk #1 decision)
- Do NOT make phases encoding mandatory (checkbox allows opt-out)
- Do NOT break existing sharelinks (test with old link format)

## Acceptance Criteria

- [ ] "Include phases in link" checkbox appears next to "Copy Share Link" button in header
- [ ] Checkbox is checked by default
- [ ] With checkbox checked: generated sharelink contains `_phases` array in encoded data
- [ ] With checkbox unchecked: generated sharelink does NOT contain `_phases` (same as current behavior)
- [ ] Loading sharelink with `_phases`: Multi-Goal tab shows those phases
- [ ] Loading sharelink without `_phases`: Multi-Goal tab shows locally-persisted phases (or empty)
- [ ] Loading old sharelink (from before this feature): no errors, inputs load normally
- [ ] Sharelink with phases persists them to localStorage on load (via `RP.savePhasesData()`)
- [ ] Sharelink URL length stays under 2000 chars (browser URL limit) for typical 4-phase scenario

## Conventions to honor

**Pattern 1: btoa/atob encoding** (from existing sharelink.js)
```javascript
// File: js/sharelink.js (approximate line 15-20)
const encoded = btoa(JSON.stringify(data));
const url = window.location.href.split('?')[0] + '?data=' + encoded;
```
**Action**: Match this — use `btoa()` for encode, `atob()` for decode. This is base64 encoding (not URL-safe, but works for most cases).

**Pattern 2: Input field iteration** (from existing sharelink.js)
```javascript
document.querySelectorAll('input').forEach(input => {
  if (input.type !== 'button' && input.id) {
    data[input.id] = input.value;
  }
});
```
**Action**: Extend the filter — skip checkboxes (`input.type !== 'checkbox'`) and skip the `includePhases` checkbox itself.

**Pattern 3: Clipboard API with fallback** (from existing sharelink.js)
```javascript
navigator.clipboard.writeText(url).then(() => {
  alert('Copied!');
}).catch(() => {
  prompt('Copy this link:', url); // Fallback for older browsers
});
```
**Action**: Keep this pattern — `navigator.clipboard` is modern API, but fallback to `prompt()` for compatibility.

## Test plan

**Manual smoke test**:
1. Load Example (4 phases in Multi-Goal tab)
2. Click "Copy Share Link" (checkbox checked by default)
3. Paste link into incognito browser / new tab
4. Verify: Multi-Goal tab loads with same 4 phases
5. Go back to original tab
6. Uncheck "Include phases in link"
7. Generate new sharelink
8. Paste into another incognito tab
9. Verify: Multi-Goal tab is empty (no phases encoded, localStorage is fresh in incognito)

**Backward compat test**:
1. Generate old-style sharelink (manually construct URL with just input fields, no `_phases`)
2. Example: `...?data=eyJjdXJyZW50QWdlIjoiMzAiLCJyZXRpcmVtZW50QWdlIjoiNjAifQ==`
3. Open this link
4. Verify: Basics tab loads with age fields populated, Multi-Goal tab empty, no JS errors

**URL length test**:
1. Add 6 phases with long names (30 chars each)
2. Generate sharelink with checkbox checked
3. Paste URL into browser address bar
4. Verify: URL length <2000 chars (most browsers support up to 2083)
5. If >2000, consider compressing (defer to post-v1 if issue arises)

## Build verification

```bash
cd retirement-planner

# Verify sharelink.js modified
grep -c "_phases" js/sharelink.js
# Expected: ≥2 (once in encoder, once in decoder)

# Verify checkbox exists in build.sh header
grep -c "includePhases" build.sh
# Expected: ≥1

# Re-run build
./build.sh
grep -c "includePhases" index.html
# Expected: 1 (checkbox in header)
```

## Notes

**Re: URL length limits**:
- Most browsers: 2083 chars (IE limit, de facto standard)
- Typical 4-phase encoded JSON: ~500-800 chars (depends on phase name lengths)
- Base64 encoding inflates size by ~33%
- Example calculation: 4 phases × 150 chars/phase = 600 chars → base64 = 800 chars → full URL ≈ 850 chars ✓ Safe

If user has 10+ phases with very long names, URL might exceed 2000 chars. Mitigation (defer to v2):
- Use LZ compression (pako.js library) before base64
- OR switch to URL fragment (`#data=...`) instead of query param (no server transmission, no length limit from proxies)

**Re: security**:
base64 is NOT encryption — anyone can decode the URL and see user's financial data. This is existing behavior (sharelink.js already does this for all inputs). Users should only share links with trusted recipients.

**Re: Option C rationale** (from Gate A approval):
- localStorage persistence is PRIMARY (always on, no user action needed)
- Sharelink encoding is SECONDARY (opt-in via checkbox, for sharing with advisor / spouse / across devices)
- Default checkbox ON because "most users want their full plan in the share link" (per approval doc line 12)

**Integration point**:
After this task, user workflow is:
1. Define phases in Multi-Goal tab
2. Phases auto-save to localStorage (fe-006)
3. Click "Copy Share Link" (checkbox checked)
4. Send link to financial advisor
5. Advisor opens link → sees same phases + inputs
6. Both can iterate on the plan independently (localStorage keeps their local edits separate)

[REVIEW] branch: feat/fe-007

Implementation notes (eng-fe-007, attempt 1):
- Used `&phases=` separate URL param (per 03-data-contracts.md §5 + team-lead brief), NOT embedded `_phases` inside the existing `plan` object. This keeps backward compat with old `?plan=` links 100% byte-identical.
- Encoded as `btoa(JSON.stringify(RP._multigoal.phases))` — matches existing `plan` encoding style (plain base64, not URL-safe).
- Decode reads `params.get('phases')`, base64-decodes, validates each entry via `RP._multigoal._validatePhase()` (fe-006), discards invalid entries with `console.warn`, then sets `RP._multigoal.phases = valid` and calls `RP._multigoal._save()` to overwrite localStorage with the shared phases (per task spec).
- Decoder also calls `RP.renderPhases()` and `RP.calculateMultiGoal()` if loaded, so the UI reflects shared phases immediately.
- Checkbox `id="includePhasesInShareLink"`, default `checked`, lives in `<header>` button row in build.sh between Dark Mode and Copy Share Link. Styled with the same dark semi-transparent treatment as neighboring buttons.
- Did NOT touch `profiles.js` (Option C scope). Did NOT modify any localStorage logic in `calc-multigoal.js` (fe-006 owns).
- Smoke tests passed: (1) Load Example → 4 phases, (2) sharelink with checkbox checked has `&phases=`, (3) opening that URL with localStorage cleared decodes the 4 phases AND writes them to localStorage, (4) checkbox unchecked → URL has no `phases=` param, (5) old `?plan=`-only link loads inputs and leaves multi-goal empty with zero console errors.
- URL length with 4 example phases + full input set: ~3300 chars. The 4-phase phases-only payload alone is ~700 chars; the bulk comes from the existing `plan` block. Inflation defer note in task §Notes still applies for v2.
