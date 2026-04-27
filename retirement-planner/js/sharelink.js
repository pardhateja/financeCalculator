/**
 * Share Link — encode all inputs as base64 URL param
 * Auto-loads from URL on page open
 *
 * Multi-goal phases (fe-007, Gate A Option C):
 *   When the "Include phases" checkbox in the header is CHECKED and
 *   RP._multigoal.phases is non-empty, the encoded sharelink also carries
 *   a separate `&phases=<base64(JSON)>` param. localStorage `rp_phases`
 *   (owned by fe-006) remains the primary store; sharelink encoding is
 *   strictly opt-in and additive. Backward compat: links without `phases`
 *   continue to work — multi-goal tab falls back to localStorage.
 */
RP.generateShareLink = function () {
    const data = {};
    RP.getAllInputIds().forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // v1.1: checkboxes encode .checked
        data[id] = (el.type === 'checkbox') ? el.checked : el.value;
    });
    const encoded = btoa(JSON.stringify(data));
    let url = window.location.origin + window.location.pathname + '?plan=' + encoded;

    // fe-007: optional phases encoding. Checkbox lives in build.sh header heredoc
    // (id="includePhasesInShareLink"). Gracefully no-op if the element or the
    // multigoal namespace isn't present (e.g. during test fragments).
    const includePhasesCb = document.getElementById('includePhasesInShareLink');
    const phases = (RP._multigoal && Array.isArray(RP._multigoal.phases))
        ? RP._multigoal.phases : [];
    if (includePhasesCb && includePhasesCb.checked && phases.length > 0) {
        try {
            const phasesEncoded = btoa(JSON.stringify(phases));
            url += '&phases=' + phasesEncoded;
        } catch (e) {
            console.warn('Failed to encode phases for share link:', e);
        }
    }

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
    const phasesData = params.get('phases');

    let loadedSomething = false;

    if (planData) {
        try {
            const data = JSON.parse(atob(planData));
            Object.entries(data).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (!el) return;
                // v1.1: checkboxes restore .checked
                if (el.type === 'checkbox') {
                    el.checked = !!val;
                } else {
                    el.value = val;
                }
            });
            RP._investManuallySet = true; // Don't auto-override shared values
            RP._emFundManuallySet = true;
            // v1.1: re-fire DOB→age compute after sharelink load
            if (typeof RP._updateAgeFromDOB === 'function') RP._updateAgeFromDOB();
            loadedSomething = true;
        } catch (e) {
            // fall through — phases may still be loadable
        }
    }

    // fe-007: optional phases param. Independent of `plan` so a sharelink that
    // only carries phases (or only carries plan) still works.
    if (phasesData && RP._multigoal && typeof RP._multigoal._validatePhase === 'function') {
        try {
            const decoded = JSON.parse(atob(phasesData));
            if (!Array.isArray(decoded)) {
                console.warn('Sharelink `phases` param is not an array, skipping.');
            } else {
                // Validate against current age inputs (after planData has populated them).
                // Mirror calc-multigoal._load()'s permissive fallback when RP.val isn't ready.
                let retAge = 0;
                let lifeExp = 150;
                if (typeof RP.val === 'function') {
                    const r = RP.val('retirementAge');
                    const l = RP.val('lifeExpectancy');
                    if (Number.isFinite(r) && r > 0) retAge = r;
                    if (Number.isFinite(l) && l > 0) lifeExp = l;
                }

                const valid = [];
                decoded.forEach(phase => {
                    if (RP._multigoal._validatePhase(phase, retAge, lifeExp)) {
                        valid.push(phase);
                    } else {
                        console.warn('Sharelink phase failed validation, skipping:', phase);
                    }
                });

                if (valid.length < decoded.length) {
                    console.warn('Some shared phases were skipped (' +
                        (decoded.length - valid.length) + ' of ' + decoded.length + ').');
                }

                RP._multigoal.phases = valid;
                // Overwrite localStorage so the shared phases survive a reload
                // (and so the user's local phases aren't silently shadowed).
                if (typeof RP._multigoal._save === 'function') {
                    RP._multigoal._save();
                }
                // If fe-002's renderer is on the page, refresh it.
                if (typeof RP.renderPhases === 'function') RP.renderPhases();
                if (typeof RP.calculateMultiGoal === 'function') RP.calculateMultiGoal();
                loadedSomething = true;
            }
        } catch (e) {
            console.warn('Failed to decode sharelink `phases` param, skipping:', e);
        }
    }

    return loadedSomething;
};
