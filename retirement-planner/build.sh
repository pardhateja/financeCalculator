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
        <header style="position:relative;">
            <h1>Retirement Financial Planner</h1>
            <p class="subtitle">Comprehensive Income, Expense, Investment & Projection Planning</p>
            <div style="position:absolute;top:20px;right:20px;display:flex;gap:8px;">
                <button id="darkModeBtn" style="background:rgba(0,0,0,0.35);color:#fff;border:2px solid rgba(255,255,255,0.5);padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;backdrop-filter:blur(10px);">🌙 Dark</button>
                <button id="shareLinkBtn" onclick="RP.generateShareLink()" style="background:rgba(0,0,0,0.35);color:#fff;border:2px solid rgba(255,255,255,0.5);padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;backdrop-filter:blur(10px);">Copy Share Link</button>
                <button id="resetBtn" style="background:rgba(0,0,0,0.35);color:#fff;border:2px solid rgba(255,255,255,0.5);padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;backdrop-filter:blur(10px);" onmouseover="this.style.background='rgba(239,68,68,0.8)'" onmouseout="this.style.background='rgba(0,0,0,0.35)'" onfocus="this.style.background='rgba(239,68,68,0.8)'" onblur="this.style.background='rgba(0,0,0,0.35)'">Reset</button>
            </div>
        </header>

        <div class="nav-tabs">
            <button class="nav-tab active" data-tab="basics">Basics & Income</button>
            <button class="nav-tab" data-tab="expenses">Expenses</button>
            <button class="nav-tab" data-tab="investments">Investments</button>
            <button class="nav-tab" data-tab="financial-plan">Financial Plan</button>
            <button class="nav-tab" data-tab="projections">Projections</button>
            <button class="nav-tab" data-tab="dashboard">Dashboard</button>
            <button class="nav-tab" data-tab="whatif">What-If</button>
            <button class="nav-tab" data-tab="goals">Goals</button>
            <button class="nav-tab" data-tab="multigoal">Multi-Goal</button>
            <button class="nav-tab" data-tab="emergency">Emergency Fund</button>
            <button class="nav-tab" data-tab="sip">SIP Calculator</button>
            <button class="nav-tab" data-tab="tracker">Tracker</button>
            <button class="nav-tab" data-tab="milestones">Milestones</button>
            <button class="nav-tab" data-tab="loan">Loan/EMI</button>
            <button class="nav-tab" data-tab="exptrack">Expense Log</button>
            <button class="nav-tab" data-tab="networth">Net Worth</button>
            <button class="nav-tab" data-tab="profiles">Profiles</button>
        </div>

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

echo "Built index.html ($(wc -l < "$OUT") lines)"
