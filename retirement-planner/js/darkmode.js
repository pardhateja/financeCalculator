/**
 * Dark Mode toggle — saves preference to localStorage
 */
RP.initDarkMode = function () {
    const saved = localStorage.getItem('rp_dark_mode');
    if (saved === 'true') document.body.classList.add('dark-mode');

    document.getElementById('darkModeBtn').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('rp_dark_mode', isDark);
        document.getElementById('darkModeBtn').textContent = isDark ? '☀ Light' : '🌙 Dark';
    });

    // Set initial button text
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('darkModeBtn').textContent = isDark ? '☀ Light' : '🌙 Dark';
};
