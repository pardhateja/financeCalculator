/**
 * RP — Retirement Planner namespace
 * Shared utilities: DOM helpers, currency formatting
 */
window.RP = {
    // Shared state
    _preReturn: 0,
    _postReturn: 0,
    _chartData: [],
    _projectionRows: [],
    _investManuallySet: false,
    _emFundManuallySet: false,
    _debounceTimer: null,

    /** Read a numeric input value by ID */
    val(id) {
        return parseFloat(document.getElementById(id).value) || 0;
    },

    /** Set text content of an element by ID */
    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    /** Format number as Indian ₹ (e.g. ₹12,34,567) */
    formatCurrency(amount) {
        const abs = Math.abs(Math.round(amount));
        const sign = amount < 0 ? '-' : '';
        const str = abs.toString();
        if (str.length <= 3) return sign + '₹' + str;
        let lastThree = str.substring(str.length - 3);
        let otherNumbers = str.substring(0, str.length - 3);
        if (otherNumbers !== '') lastThree = ',' + lastThree;
        const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
        return sign + '₹' + formatted;
    },

    /** Format as short Indian notation (e.g. ₹5.21 Cr, ₹3.5 L) */
    formatCurrencyShort(amount) {
        const abs = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        if (abs >= 10000000) return sign + '₹' + (abs / 10000000).toFixed(2) + ' Cr';
        if (abs >= 100000) return sign + '₹' + (abs / 100000).toFixed(2) + ' L';
        if (abs >= 1000) return sign + '₹' + (abs / 1000).toFixed(1) + ' K';
        return sign + '₹' + Math.round(abs);
    }
};
