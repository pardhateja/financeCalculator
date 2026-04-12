/**
 * Share Link — encode all inputs as base64 URL param
 * Auto-loads from URL on page open
 */
RP.generateShareLink = function () {
    const data = {};
    RP.getAllInputIds().forEach(id => { data[id] = document.getElementById(id).value; });
    const encoded = btoa(JSON.stringify(data));
    const url = window.location.origin + window.location.pathname + '?plan=' + encoded;

    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('shareLinkBtn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy Share Link'; }, 2000);
    }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        const btn = document.getElementById('shareLinkBtn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy Share Link'; }, 2000);
    });
};

RP.loadFromShareLink = function () {
    const params = new URLSearchParams(window.location.search);
    const planData = params.get('plan');
    if (!planData) return false;

    try {
        const data = JSON.parse(atob(planData));
        Object.entries(data).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });
        RP._investManuallySet = true; // Don't auto-override shared values
        RP._emFundManuallySet = true;
        return true;
    } catch (e) {
        return false;
    }
};
