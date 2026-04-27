/**
 * Save/Load Profiles — persist named input sets to localStorage
 */
RP._allInputIds = null;

/* v1.1: explicit allow-list for non-text/number inputs that must persist
 * (date pickers, checkboxes, and readonly-but-meaningful fields like currentAge
 * which becomes readonly when DOB is providing the value). */
RP._extraPersistedIds = ['dateOfBirth', 'currentAgeOverride', 'currentAge'];

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
    RP.renderProfilesList();
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
    RP._investManuallySet = false;
    RP._emFundManuallySet = false;
    // v1.1: re-fire DOB→age compute after load (in case profile has new DOB but old currentAge)
    if (typeof RP._updateAgeFromDOB === 'function') RP._updateAgeFromDOB();
    RP.calculateAll();
};

RP.deleteProfile = function (name) {
    const profiles = RP.getProfiles();
    delete profiles[name];
    localStorage.setItem('rp_profiles', JSON.stringify(profiles));
    RP.renderProfilesList();
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

    container.innerHTML = names.map(name => {
        const p = profiles[name];
        const date = new Date(p.savedAt).toLocaleDateString('en-IN');
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;margin-bottom:6px;background:var(--bg-color);border-radius:8px;border-left:3px solid var(--primary-color);">' +
            '<div><strong>' + name + '</strong><br><span style="font-size:0.8rem;color:var(--text-secondary);">Saved ' + date + '</span></div>' +
            '<div style="display:flex;gap:6px;">' +
            '<button class="btn-primary" style="padding:6px 14px;font-size:0.8rem;" onclick="RP.loadProfile(\'' + name.replace(/'/g, "\\'") + '\')">Load</button>' +
            '<button class="btn-secondary" style="padding:6px 10px;font-size:0.8rem;color:var(--danger-color);border-color:var(--danger-color);" onclick="RP.deleteProfile(\'' + name.replace(/'/g, "\\'") + '\')">Del</button>' +
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
