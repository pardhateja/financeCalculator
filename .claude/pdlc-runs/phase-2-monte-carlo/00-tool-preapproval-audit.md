---
audit_run: 2026-04-29
gate: Stage 0c.8 (HARD GATE)
---

# MCP tool pre-approval audit — Phase 2 Monte Carlo

## Predicted MCP tool footprint

| Stage / agent | Tool family | Reason |
|---|---|---|
| Stage 0a.1 question gathering (PM, Tech, Design) | none (read-only) | n/a |
| Stage 1 director-eng | WebSearch | CVE checks against historical-returns dataset (if any new dep) |
| Stage 4 FE engineers | mcp__playwright__*, mcp__plugin_chrome-devtools-mcp_* | Smoke tests of toggle + chart rendering |
| Stage 4i Pre-Exit Smoke | mcp__playwright__* | E2E flow: toggle → run sim → see chart |
| Stage 6 bug-bash adversary | mcp__playwright__*, mcp__plugin_chrome-devtools-mcp_* | UI fuzz |
| Stage 7 stakeholder-external | mcp__playwright__* | Fresh-eyes UX walkthrough |
| Stage 7 design-lead | mcp__playwright__*, mcp__plugin_chrome-devtools-mcp_* | Live design QA |
| Stage 8 director-eng (re-check) | WebSearch | Pre-launch CVE re-check |
| Stage 8 launch-checklist | WebFetch | Reference doc lookups |

## Verification result

| Tool family | Pre-approved BEFORE audit? | Pre-approved AFTER audit? |
|---|---|---|
| `mcp__playwright__*` | ✅ 18 specific rules | ✅ 18 specific rules |
| `mcp__plugin_chrome-devtools-mcp_*` | ✅ 24 specific rules | ✅ 24 specific rules |
| `WebSearch` | ❌ MISSING | ✅ added 2026-04-29 |
| `WebFetch` | ❌ MISSING | ✅ added 2026-04-29 |

## Action taken

Added `"WebSearch"` and `"WebFetch"` to top of `permissions.allow` array in `.claude/settings.local.json`. User-approved via `AskUserQuestion`.

## Result

✅ **HARD GATE PASSED** — proceed to Stage 0a.1 question gathering.
