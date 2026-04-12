/**
 * Goal Planning — track financial goals, detect conflicts with retirement
 */
RP._goals = [];

RP.initGoals = function () {
    document.getElementById('addGoalBtn').addEventListener('click', () => RP.addGoal());
};

RP.addGoal = function () {
    const name = document.getElementById('goalName').value.trim();
    const amount = RP.val('goalAmount');
    const year = RP.val('goalYear');
    if (!name || !amount || !year) return;

    RP._goals.push({ name, amount, year });
    document.getElementById('goalName').value = '';
    document.getElementById('goalAmount').value = '';
    document.getElementById('goalYear').value = '';
    RP.renderGoals();
};

RP.removeGoal = function (index) {
    RP._goals.splice(index, 1);
    RP.renderGoals();
};

RP.renderGoals = function () {
    const container = document.getElementById('goalsContainer');
    if (RP._goals.length === 0) {
        container.innerHTML = '<div class="sub-text" style="padding:16px;text-align:center;color:var(--text-secondary);">No goals added yet. Add your first financial goal above.</div>';
        RP.setText('totalGoalsAmount', '₹0');
        RP.setText('monthlyForGoals', '₹0');
        RP.setText('goalImpact', 'None');
        return;
    }

    const currentYear = new Date().getFullYear();
    const preReturn = RP._preReturn || 0.10;

    let totalAmount = 0;
    let totalMonthlyNeeded = 0;

    container.innerHTML = RP._goals.map((g, i) => {
        const yearsLeft = Math.max(1, g.year - currentYear);
        const monthlyRate = preReturn / 12;
        const months = yearsLeft * 12;
        const monthlyNeeded = g.amount / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
        totalAmount += g.amount;
        totalMonthlyNeeded += monthlyNeeded;

        return '<div class="summary-card" style="text-align:left;margin-bottom:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>' + g.name + '</strong><br>' +
            '<span style="font-size:0.85rem;color:var(--text-secondary);">' + RP.formatCurrency(g.amount) + ' by ' + g.year + ' (' + yearsLeft + ' yrs)</span><br>' +
            '<span style="font-size:0.85rem;color:var(--primary-color);">SIP needed: ' + RP.formatCurrency(monthlyNeeded) + '/mo</span></div>' +
            '<button onclick="RP.removeGoal(' + i + ')" style="background:var(--danger-color);color:white;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:0.8rem;">Remove</button>' +
            '</div>';
    }).join('');

    RP.setText('totalGoalsAmount', RP.formatCurrencyShort(totalAmount));
    RP.setText('monthlyForGoals', RP.formatCurrency(Math.round(totalMonthlyNeeded)));

    // Impact on retirement: how much less goes to retirement
    const monthlyInvest = RP.val('monthlyInvestAmt');
    const remaining = monthlyInvest - totalMonthlyNeeded;
    if (remaining < 0) {
        RP.setText('goalImpact', 'Deficit ' + RP.formatCurrency(Math.abs(remaining)) + '/mo');
        document.getElementById('goalImpact').parentElement.className = 'summary-card danger';
    } else {
        RP.setText('goalImpact', RP.formatCurrency(remaining) + '/mo left');
        document.getElementById('goalImpact').parentElement.className = 'summary-card success';
    }
};
