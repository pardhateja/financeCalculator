/**
 * Save/Load Profiles — persist named input sets to localStorage
 */
RP._allInputIds = null;

/* v1.1: explicit allow-list for non-text/number inputs that must persist
 * (date pickers, checkboxes, and readonly-but-meaningful fields like currentAge
 * which becomes readonly when DOB is providing the value). */
RP._extraPersistedIds = ['dateOfBirth', 'currentAgeOverride', 'currentAge', 'currentSavingsSeed'];

RP.getAllInputIds = function () {
    if (!RP._allInputIds) {
        RP._allInputIds = [];
        document.querySelectorAll('input[type="number"], input[type="text"]').forEach(el => {
            if (el.id && !el.readOnly) RP._allInputIds.push(el.id);
        });
        // v1.1: append the explicit extras (date, checkbox, readonly-but-persist).
        RP._extraPersistedIds.forEach(id => {
            if (RP._allInputIds.indexOf(id) === -1 && document.getElementById(id)) {
                RP._allInputIds.push(id);
            }
        });
    }
    return RP._allInputIds;
};

RP.getProfiles = function () {
    return JSON.parse(localStorage.getItem('rp_profiles') || '{}');
};

RP.saveProfile = function (name) {
    if (!name) return;
    const profiles = RP.getProfiles();
    const data = {};
    RP.getAllInputIds().forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // v1.1: checkboxes save .checked; button toggles save aria-pressed; everything else .value
        if (el.type === 'checkbox') {
            data[id] = el.checked;
        } else if (el.tagName === 'BUTTON') {
            data[id] = el.getAttribute('aria-pressed') === 'true';
        } else {
            data[id] = el.value;
        }
    });
    profiles[name] = { data, savedAt: new Date().toISOString() };
    localStorage.setItem('rp_profiles', JSON.stringify(profiles));
    // v1.1: mark just-saved profile as active.
    RP._setActiveProfileName(name);
    RP.renderProfilesList();
};

/* v1.1 audit: track which profile (if any) is currently loaded so the UI
 * can show an "Active" badge + an "Update" button (re-save the current
 * inputs into the same profile name). Persists across reloads. */
RP._getActiveProfileName = function () {
    try { return localStorage.getItem('rp_active_profile') || null; } catch (e) { return null; }
};
RP._setActiveProfileName = function (name) {
    try {
        if (name) localStorage.setItem('rp_active_profile', name);
        else localStorage.removeItem('rp_active_profile');
    } catch (e) {}
};

RP.loadProfile = function (name) {
    const profiles = RP.getProfiles();
    const profile = profiles[name];
    if (!profile) return;
    Object.entries(profile.data).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        // v1.1: checkboxes restore from boolean; button toggles restore via aria-pressed
        if (el.type === 'checkbox') {
            el.checked = !!val;
        } else if (el.tagName === 'BUTTON') {
            el.setAttribute('aria-pressed', val ? 'true' : 'false');
        } else {
            el.value = val;
        }
    });
    // v1.1 Feature B backward compat: legacy profiles have `currentSavings` (typed)
    // but no `currentSavingsSeed`. Treat the legacy value as the seed so the rollup
    // produces the same Total the user originally typed (rollup is 0 → Total = seed).
    if (profile.data.currentSavings != null && profile.data.currentSavingsSeed == null) {
        const seedEl = document.getElementById('currentSavingsSeed');
        if (seedEl) seedEl.value = profile.data.currentSavings;
    }
    RP._investManuallySet = false;
    RP._emFundManuallySet = false;
    // v1.1: re-fire DOB→age compute after load (in case profile has new DOB but old currentAge)
    if (typeof RP._updateAgeFromDOB === 'function') RP._updateAgeFromDOB();
    // v1.1 Feature B: refresh rollup so Total reflects loaded seed + tracker
    if (typeof RP._computeSavingsRollup === 'function') RP._computeSavingsRollup();
    // Mark this profile as the active one so the list shows an "Active" badge
    // and the Update button is available.
    RP._setActiveProfileName(name);
    RP.renderProfilesList();
    RP.calculateAll();
};

RP.deleteProfile = function (name) {
    const profiles = RP.getProfiles();
    delete profiles[name];
    localStorage.setItem('rp_profiles', JSON.stringify(profiles));
    // If this was the active profile, clear the marker.
    if (RP._getActiveProfileName() === name) RP._setActiveProfileName(null);
    RP.renderProfilesList();
};

/* v1.1: re-save the currently-displayed inputs into an EXISTING profile
 * (no new entry created). Called from the per-row "Update" button. Useful
 * when you tweak something while a profile is loaded and want to persist
 * the change without typing the name again. */
RP.updateProfile = function (name) {
    if (!name) return;
    const profiles = RP.getProfiles();
    if (!profiles[name]) return; // shouldn't happen — Update only shown for saved profiles
    RP.saveProfile(name); // saveProfile already overwrites + sets active
};

RP.renderProfilesList = function () {
    const container = document.getElementById('profilesList');
    if (!container) return;
    const profiles = RP.getProfiles();
    const names = Object.keys(profiles);

    if (names.length === 0) {
        container.innerHTML = '<div class="sub-text" style="padding:12px;text-align:center;color:var(--text-secondary);">No saved profiles yet.</div>';
        return;
    }

    const active = RP._getActiveProfileName();
    container.innerHTML = names.map(name => {
        const p = profiles[name];
        const date = new Date(p.savedAt).toLocaleDateString('en-IN');
        const safe = name.replace(/'/g, "\\'");
        const isActive = name === active;
        // v1.1 audit: explicit color values per mode (no var(--text-primary) which
        // resolved wrong before the dark-mode --vars override). Active badge +
        // Update button shown only when this profile is currently loaded.
        const activeBadge = isActive
            ? '<span class="profile-active-badge">Active</span>'
            : '';
        const updateBtn = isActive
            ? '<button class="btn-primary profile-row-btn" onclick="RP.updateProfile(\'' + safe + '\')" title="Re-save current inputs into this profile">Update</button>'
            : '';
        return '<div class="profile-row' + (isActive ? ' profile-row--active' : '') + '">' +
            '<div class="profile-row-info"><strong>' + name + '</strong>' + activeBadge +
            '<br><span class="profile-row-date">Saved ' + date + '</span></div>' +
            '<div class="profile-row-actions">' +
            updateBtn +
            (isActive ? '' : '<button class="btn-primary profile-row-btn" onclick="RP.loadProfile(\'' + safe + '\')">Load</button>') +
            '<button class="btn-secondary profile-row-btn profile-row-btn--del" onclick="RP.deleteProfile(\'' + safe + '\')">Del</button>' +
            '</div></div>';
    }).join('');
};

RP.initProfiles = function () {
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const name = document.getElementById('profileName').value.trim();
        if (name) {
            RP.saveProfile(name);
            document.getElementById('profileName').value = '';
        }
    });
    RP.renderProfilesList();
};
