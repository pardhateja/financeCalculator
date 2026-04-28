/**
 * Dark Mode toggle — saves preference to localStorage.
 *
 * v1.1 audit: button now lives inside the Settings popover with a child
 * span structure (icon + label). Update the spans, not .textContent.
 * Falls back to setting textContent for older builds where the button
 * was a flat-text element (no spans inside).
 */
function updateDarkBtnLabel(btn, isDark) {
    if (!btn) return;
    const iconEl = btn.querySelector('.settings-item-icon');
    const labelEl = btn.querySelector('.settings-item-label');
    if (iconEl && labelEl) {
        iconEl.textContent = isDark ? '☀' : '🌙';
        labelEl.textContent = isDark ? 'Light mode' : 'Dark mode';
    } else {
        btn.textContent = isDark ? '☀ Light' : '🌙 Dark';
    }
}

RP.initDarkMode = function () {
    const saved = localStorage.getItem('rp_dark_mode');
    if (saved === 'true') document.body.classList.add('dark-mode');

    const btn = document.getElementById('darkModeBtn');
    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('rp_dark_mode', isDark);
        updateDarkBtnLabel(btn, isDark);
    });

    // Set initial label
    updateDarkBtnLabel(btn, document.body.classList.contains('dark-mode'));
};
