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
                    <button id="darkModeBtn" class="header-action-btn">🌙 Dark</button>
                    <label for="includePhasesInShareLink" class="header-action-btn header-action-checkbox" title="When checked, your Multi-Goal life phases are encoded into the Copy Share Link URL so the recipient sees them too. Adds ~3KB. Uncheck for a shorter link."><input type="checkbox" id="includePhasesInShareLink" checked>Include phases in share link</label>
                    <button id="shareLinkBtn" class="header-action-btn" onclick="RP.generateShareLink()">Copy Share Link</button>
                    <button id="resetBtn" class="header-action-btn header-action-btn--danger">Reset</button>
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
    <script src="js/calc-savings-rollup.js"></script>
    <script src="js/calc-milestones.js"></script>
    <script src="js/calc-loan.js"></script>
    <script src="js/calc-exptrack.js"></script>
    <script src="js/calc-networth.js"></script>
    <script src="js/profiles.js"></script>
    <script src="js/sharelink.js"></script>
    <script src="js/darkmode.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
FOOT

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
