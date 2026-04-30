#!/bin/bash
# Assembles index.html from pages/, css refs, and js refs
# Run: ./build.sh

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/index.html"

cat > "$OUT" << 'HEAD'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retirement Financial Planner</title>
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/forms.css">
    <link rel="stylesheet" href="css/cards.css">
    <link rel="stylesheet" href="css/tables.css">
    <link rel="stylesheet" href="css/responsive.css">
    <link rel="stylesheet" href="css/tracker.css">
    <link rel="stylesheet" href="css/multigoal.css">
    <link rel="stylesheet" href="css/montecarlo.css">
    <link rel="stylesheet" href="css/dark.css">
</head>
<body>
    <div class="container">
        <header class="app-header">
            <div class="app-header-row">
                <div class="app-header-titles">
                    <h1>Retirement Financial Planner</h1>
                    <p class="subtitle">Comprehensive Income, Expense, Investment & Projection Planning</p>
                </div>
                <div class="app-header-actions">
                    <!-- v1.1 audit: settings popover. Single gear icon collapses
                         what used to be 4 separate header buttons (Dark/Light,
                         Include phases, Copy Share Link, Reset). Click outside
                         or press Esc to close. -->
                    <button id="settingsToggleBtn" class="header-action-btn header-settings-toggle" aria-label="Settings" aria-haspopup="true" aria-expanded="false" title="Settings">⚙</button>
                    <div id="settingsPopover" class="settings-popover" role="menu" aria-labelledby="settingsToggleBtn" hidden>
                        <button id="darkModeBtn" class="settings-item">
                            <span class="settings-item-icon">🌙</span>
                            <span class="settings-item-label">Dark mode</span>
                        </button>
                        <label for="includePhasesInShareLink" class="settings-item settings-item--checkbox" title="When on, your Multi-Goal phases are encoded into the share link so recipients see them too. Adds ~3KB to the URL.">
                            <span class="settings-item-icon">📋</span>
                            <span class="settings-item-label">Include phases in share link</span>
                            <input type="checkbox" id="includePhasesInShareLink" checked>
                        </label>
                        <button id="shareLinkBtn" class="settings-item" onclick="RP.generateShareLink()">
                            <span class="settings-item-icon">🔗</span>
                            <span class="settings-item-label">Copy Share Link</span>
                        </button>
                        <div class="settings-divider"></div>
                        <button id="resetBtn" class="settings-item settings-item--danger">
                            <span class="settings-item-icon">⚠️</span>
                            <span class="settings-item-label">Reset to defaults</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- v1.1 audit: two-tier navigation. Top-level = 6 intent groups,
             second tier = the sub-tabs of the active group (rendered by JS
             into #navSubtabs). All 17 underlying tabs preserved. -->
        <div class="nav-groups" role="tablist" aria-label="Sections">
            <button class="nav-group" data-group="setup">Setup</button>
            <button class="nav-group" data-group="plan">Plan</button>
            <button class="nav-group" data-group="project">Project</button>
            <button class="nav-group" data-group="track">Track</button>
            <button class="nav-group" data-group="tools">Tools</button>
            <button class="nav-group" data-group="profiles">Profiles</button>
        </div>
        <div class="nav-subtabs" id="navSubtabs" role="tablist" aria-label="Sub-sections"></div>

HEAD

# Append each tab page
for tab in basics expenses investments financial-plan projections dashboard whatif goals multigoal emergency sip tracker milestones loan exptrack networth profiles; do
    cat "$DIR/pages/tab-${tab}.html" >> "$OUT"
    echo "" >> "$OUT"
done

cat >> "$OUT" << 'FOOT'
        <footer>
            <p>Retirement Financial Planner &mdash; Plan your financial future with confidence</p>
            <div class="nav-links">
                <a href="../index.html">Home</a>
                <a href="../multi-method-calculator.html">Multi-Method Calculator</a>
            </div>
        </footer>
    </div>

    <!-- v1.1 audit: sticky summary bar. Always visible at the bottom of the
         viewport so the user sees their key numbers update as they edit any
         input. Three metrics: Corpus at retirement, Money lasts until,
         Savings Rate. Click jumps to Dashboard for full breakdown. -->
    <div id="stickySummary" class="sticky-summary" role="status" aria-label="Live financial summary">
        <button class="sticky-summary-item" onclick="RP.switchTab('dashboard')" title="Click for full breakdown">
            <span class="sticky-label">Corpus @ Retirement</span>
            <span class="sticky-value" id="stickyCorpus">—</span>
        </button>
        <button class="sticky-summary-item" onclick="RP.switchTab('projections')" title="Click for year-by-year projection">
            <span class="sticky-label">Money lasts until</span>
            <span class="sticky-value" id="stickyLastsUntil">—</span>
        </button>
        <button class="sticky-summary-item" onclick="RP.switchTab('expenses')" title="Click to adjust expenses">
            <span class="sticky-label">Savings Rate</span>
            <span class="sticky-value" id="stickySavingsRate">—</span>
        </button>
    </div>

    <script src="js/utils.js"></script>
    <script src="js/calc-income.js"></script>
    <script src="js/calc-expenses.js"></script>
    <script src="js/calc-investments.js"></script>
    <script src="js/calc-financial-plan.js"></script>
    <script src="js/calc-projections.js"></script>
    <script src="js/chart.js"></script>
    <script src="js/calc-dashboard.js"></script>
    <script src="js/calc-whatif.js"></script>
    <script src="js/calc-goals.js"></script>
    <script src="js/calc-multigoal.js"></script>
    <script src="js/calc-emergency.js"></script>
    <script src="js/calc-sip.js"></script>
    <script src="js/calc-tracker.js"></script>
    <script src="js/historical-returns-data.js"></script>
    <script src="js/chart-montecarlo.js"></script>
    <script src="js/calc-montecarlo.js"></script>
    <script src="js/calc-savings-rollup.js"></script>
    <script src="js/calc-milestones.js"></script>
    <script src="js/calc-loan.js"></script>
    <script src="js/calc-exptrack.js"></script>
    <script src="js/calc-networth.js"></script>
    <script src="js/profiles.js"></script>
    <script src="js/sharelink.js"></script>
    <script src="js/darkmode.js"></script>
    <script src="js/app.js"></script>

    <!-- Phase 2: Monte Carlo Worker source inlined as a string. The Web Worker
         is loaded via Blob URL (works from file:// AND http://). This script
         block runs after calc-montecarlo.js so window.RP is defined. -->
    <script>
    window.RP = window.RP || {};
    window.RP._workerSource = __WORKER_SOURCE_PLACEHOLDER__;
    </script>
</body>
</html>
FOOT

# Phase 2: inline the Monte Carlo worker source as a JS string literal so the
# main thread can wrap it in a Blob URL. Worker scripts cannot importScripts()
# from file:// origins, so inlining is required. Use python3 for both the
# JSON encoding AND the substitution so newlines stay escaped (\n, not raw).
python3 - "$OUT" "$DIR/js/calc-montecarlo-worker.js" <<'PY'
import json, sys, pathlib
out_path = sys.argv[1]
worker_path = sys.argv[2]
worker_json = json.dumps(pathlib.Path(worker_path).read_text())
html = pathlib.Path(out_path).read_text()
html = html.replace('__WORKER_SOURCE_PLACEHOLDER__', worker_json)
pathlib.Path(out_path).write_text(html)
PY

# v1.1 audit: cache-busting. Append a unique build version to every CSS/JS
# asset URL so the browser MUST refetch each rebuild. Without this, Chrome
# (especially) caches CSS for hours and serves stale styles after deploys.
# Use the OUT file's mtime as the version; changes every rebuild.
BUILD_VERSION="$(date +%Y%m%d%H%M%S)"
# In-place append ?v=<version> to every css/js asset reference.
# Uses macOS-compatible sed -i '' syntax (BSD sed).
sed -i '' -E "s#(href=\"css/[a-zA-Z0-9_.-]+\.css)\"#\1?v=$BUILD_VERSION\"#g" "$OUT"
sed -i '' -E "s#(src=\"js/[a-zA-Z0-9_.-]+\.js)\"#\1?v=$BUILD_VERSION\"#g" "$OUT"

echo "Built index.html ($(wc -l < "$OUT") lines, v=$BUILD_VERSION)"
