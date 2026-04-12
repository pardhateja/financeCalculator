/**
 * Expense Tracker — actual vs budget monthly comparison
 */
RP.getExpenseLog = function () {
    return JSON.parse(localStorage.getItem('rp_expense_log') || '{}');
};

RP.saveExpenseMonth = function () {
    const month = document.getElementById('etMonth').value;
    if (!month) return;

    const categories = ['Rent','Groceries','Utilities','Transport','Insurance','Entertainment','Shopping','Other'];
    const ids = ['etRent','etGroceries','etUtilities','etTransport','etInsurance','etEntertainment','etShopping','etOther'];
    const entry = {};
    ids.forEach((id, i) => { entry[categories[i]] = RP.val(id); });

    const log = RP.getExpenseLog();
    log[month] = { ...entry, date: new Date().toISOString() };
    localStorage.setItem('rp_expense_log', JSON.stringify(log));
    RP.renderExpenseTracker();
};

RP.renderExpenseTracker = function () {
    const log = RP.getExpenseLog();
    const months = Object.keys(log).sort().reverse();
    const container = document.getElementById('etHistory');

    // Budget from Expenses tab
    const budget = {
        Rent: RP.val('expRent'), Groceries: RP.val('expGroceries'),
        Utilities: RP.val('expUtilities'), Transport: RP.val('expTransport'),
        Insurance: RP.val('expInsurance'), Entertainment: RP.val('expEntertainment'),
        Shopping: RP.val('expShopping'), Other: RP.val('expOtherMonthly')
    };
    const totalBudget = Object.values(budget).reduce((a, b) => a + b, 0);

    if (months.length === 0) {
        container.innerHTML = '<div class="sub-text" style="padding:16px;text-align:center;color:var(--text-secondary);">No expense entries yet.</div>';
        RP.setText('etTotalBudget', RP.formatCurrency(totalBudget));
        RP.setText('etTotalActual', '-');
        RP.setText('etDifference', '-');
        return;
    }

    // Show latest month comparison
    const latest = log[months[0]];
    const totalActual = Object.entries(latest).filter(([k]) => k !== 'date').reduce((s, [, v]) => s + v, 0);
    const diff = totalBudget - totalActual;

    RP.setText('etTotalBudget', RP.formatCurrency(totalBudget));
    RP.setText('etTotalActual', RP.formatCurrency(totalActual));
    RP.setText('etDifference', (diff >= 0 ? '+' : '') + RP.formatCurrency(diff));
    document.getElementById('etDifference').parentElement.className = 'summary-card ' + (diff >= 0 ? 'success' : 'danger');

    // Category comparison for latest month
    const categories = ['Rent','Groceries','Utilities','Transport','Insurance','Entertainment','Shopping','Other'];
    const compHtml = categories.map(cat => {
        const b = budget[cat];
        const a = latest[cat] || 0;
        const d = b - a;
        const color = d >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)';
        const pct = b > 0 ? Math.min(100, a / b * 100) : 0;
        const barColor = pct > 100 ? 'var(--danger-color)' : pct > 80 ? 'var(--warning-color)' : 'var(--secondary-color)';
        return '<div style="margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:2px;">' +
            '<span>' + cat + '</span>' +
            '<span style="color:' + color + ';">' + RP.formatCurrency(a) + ' / ' + RP.formatCurrency(b) + '</span></div>' +
            '<div style="background:var(--border-color);border-radius:4px;height:6px;overflow:hidden;">' +
            '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + barColor + ';border-radius:4px;"></div></div></div>';
    }).join('');

    document.getElementById('etComparison').innerHTML = '<h3 style="margin-bottom:12px;">' + months[0] + ' Breakdown</h3>' + compHtml;

    // History table
    container.innerHTML = '<table class="projection-table"><thead><tr><th>Month</th><th>Total Actual</th><th>Budget</th><th>Diff</th></tr></thead><tbody>' +
        months.map(m => {
            const e = log[m];
            const total = Object.entries(e).filter(([k]) => k !== 'date').reduce((s, [, v]) => s + v, 0);
            const d = totalBudget - total;
            return '<tr><td style="text-align:center;">' + m + '</td><td>' + RP.formatCurrency(total) + '</td><td>' + RP.formatCurrency(totalBudget) + '</td>' +
                '<td style="color:' + (d >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)') + ';">' + (d >= 0 ? '+' : '') + RP.formatCurrency(d) + '</td></tr>';
        }).join('') + '</tbody></table>';
};

RP.initExpenseTracker = function () {
    document.getElementById('etSaveBtn').addEventListener('click', () => RP.saveExpenseMonth());
    const now = new Date();
    document.getElementById('etMonth').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    RP.renderExpenseTracker();
};
