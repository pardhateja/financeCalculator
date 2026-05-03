/* ============================================================================
   Phase 3-A: Cloud persistence via Supabase
   ----------------------------------------------------------------------------
   Why this exists: localStorage gets wiped on browser-clear / incognito /
   device-switch. Pardha lost his April Tracker data this way. This module
   adds automatic cloud sync so data survives forever and follows the user
   across devices.

   Architecture:
   - One Supabase row per user in `app_data` (uuid PK, jsonb payload)
   - Row Level Security ensures only the row's own user_id can read/write
   - Auth: magic-link email (zero OAuth setup, ships fastest)
   - Auto-pull on app open (after login)
   - Auto-push on every input change (debounced 1500ms to batch rapid edits)
   - localStorage stays as a working cache + offline-disaster fallback
   - Manual JSON export retained as a paranoia backup

   Public API (under window.RP.persistence):
     RP.persistence.init()              — wire login UI, attach auto-sync
     RP.persistence.signIn(email)       — send magic link
     RP.persistence.signOut()           — clear session
     RP.persistence.getUser()           — current user object or null
     RP.persistence.pullNow()           — force pull from cloud
     RP.persistence.pushNow()           — force push to cloud
     RP.persistence.exportJson()        — download whole-app .json backup
     RP.persistence.importJson(file)    — restore from .json backup
   ============================================================================ */
(function () {
  'use strict';
  window.RP = window.RP || {};

  // ---- Config (from Stage 0) ----
  var SUPABASE_URL = 'https://xjyebiztvfxgkounymfh.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ocOvtPFrv6Jf4i_Rf2EC5g_QeS5iIgA';
  var TABLE = 'app_data';
  var DEBOUNCE_MS = 1500; // batch rapid input edits

  // Will be set once the Supabase JS SDK loads from CDN
  var supabase = null;
  var currentUser = null;
  var pushTimer = null;
  var pullingInProgress = false;
  var pushingInProgress = false;
  var lastPushedPayloadJson = ''; // dedupe — don't push if nothing changed

  // ---- Snapshot the entire app state into a JSON object ----
  // Reuses Phase 1's RP.getAllInputIds() so any new input added in Phase 4/5/N
  // automatically gets persisted without changes here.
  function snapshotAppState() {
    var out = { _v: 1, _ts: new Date().toISOString(), inputs: {}, extras: {} };
    if (typeof RP.getAllInputIds === 'function') {
      RP.getAllInputIds().forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') out.inputs[id] = el.checked;
        else if (el.tagName === 'BUTTON') out.inputs[id] = el.getAttribute('aria-pressed') === 'true';
        else out.inputs[id] = el.value;
      });
    }
    // Also persist the Phase 1 multi-goal phases (kept in RP._multigoal.phases)
    if (RP._multigoal && Array.isArray(RP._multigoal.phases)) {
      out.extras.multigoalPhases = RP._multigoal.phases;
    }
    // Phase 1 tracker entries (assumed under RP.tracker.entries — adapt if different)
    try {
      var trackerJson = localStorage.getItem('rp_tracker_entries');
      if (trackerJson) out.extras.trackerEntries = JSON.parse(trackerJson);
    } catch (_) {}
    // Phase 1 active profile + all profiles
    try {
      var profilesJson = localStorage.getItem('rp_profiles');
      if (profilesJson) out.extras.profiles = JSON.parse(profilesJson);
      var activeProfile = localStorage.getItem('rp_active_profile');
      if (activeProfile) out.extras.activeProfile = activeProfile;
    } catch (_) {}
    // Phase 2 toggle state + sim count + MC editable overrides
    try {
      out.extras.mcView = localStorage.getItem('rp_projection_view') || 'ideal';
      out.extras.mcSimCount = localStorage.getItem('rp_mc_sim_count') || '10000';
    } catch (_) {}
    // Theme
    try {
      out.extras.darkMode = localStorage.getItem('rp_dark_mode') || 'false';
    } catch (_) {}
    return out;
  }

  // ---- Restore app state from a snapshot ----
  function restoreAppState(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    var inputs = snapshot.inputs || {};
    Object.keys(inputs).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var val = inputs[id];
      if (el.type === 'checkbox') el.checked = !!val;
      else if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', val ? 'true' : 'false');
      else el.value = val;
    });
    var extras = snapshot.extras || {};
    if (extras.multigoalPhases && RP._multigoal) {
      RP._multigoal.phases = extras.multigoalPhases;
      try { localStorage.setItem('rp_multigoal_phases', JSON.stringify(extras.multigoalPhases)); } catch (_) {}
    }
    if (extras.trackerEntries) {
      try { localStorage.setItem('rp_tracker_entries', JSON.stringify(extras.trackerEntries)); } catch (_) {}
    }
    if (extras.profiles) {
      try { localStorage.setItem('rp_profiles', JSON.stringify(extras.profiles)); } catch (_) {}
    }
    if (extras.activeProfile) {
      try { localStorage.setItem('rp_active_profile', extras.activeProfile); } catch (_) {}
    }
    if (extras.mcView) {
      try { localStorage.setItem('rp_projection_view', extras.mcView); } catch (_) {}
    }
    if (extras.mcSimCount) {
      try { localStorage.setItem('rp_mc_sim_count', extras.mcSimCount); } catch (_) {}
    }
    if (extras.darkMode === 'true') {
      try { localStorage.setItem('rp_dark_mode', 'true'); document.body.classList.add('dark-mode'); } catch (_) {}
    }
    // Re-fire Phase 1 calculations so the restored values produce projections
    if (typeof RP._updateAgeFromDOB === 'function') RP._updateAgeFromDOB();
    if (typeof RP._computeSavingsRollup === 'function') RP._computeSavingsRollup();
    if (typeof RP.calculateAll === 'function') RP.calculateAll();
    if (typeof RP.renderPhases === 'function') RP.renderPhases();
    if (typeof RP.calculateMultiGoal === 'function') RP.calculateMultiGoal();
    if (typeof RP.renderTracker === 'function') RP.renderTracker();
  }

  // ---- Pull latest from cloud ----
  function pullFromCloud() {
    if (!supabase || !currentUser || pullingInProgress) return Promise.resolve();
    pullingInProgress = true;
    setStatus('Syncing...');
    return supabase.from(TABLE).select('payload, updated_at').eq('user_id', currentUser.id).maybeSingle()
      .then(function (res) {
        pullingInProgress = false;
        if (res.error) {
          console.error('[persistence] pull error:', res.error);
          setStatus('Sync error — check console', 'error');
          return;
        }
        if (!res.data || !res.data.payload) {
          // First-time user — push current local state up so we don't lose it
          setStatus('First sync — saving current state...');
          return pushToCloud(true);
        }
        restoreAppState(res.data.payload);
        lastPushedPayloadJson = JSON.stringify(res.data.payload);
        setStatus('Synced ' + new Date(res.data.updated_at).toLocaleTimeString(), 'ok');
      })
      .catch(function (err) {
        pullingInProgress = false;
        console.error('[persistence] pull threw:', err);
        setStatus('Sync error', 'error');
      });
  }

  // ---- Push current state to cloud (debounced via schedulePush) ----
  function pushToCloud(force) {
    if (!supabase || !currentUser || pushingInProgress) return Promise.resolve();
    var snapshot = snapshotAppState();
    var snapshotJson = JSON.stringify(snapshot);
    if (!force && snapshotJson === lastPushedPayloadJson) return Promise.resolve();
    pushingInProgress = true;
    setStatus('Saving...');
    return supabase.from(TABLE).upsert({ user_id: currentUser.id, payload: snapshot }, { onConflict: 'user_id' })
      .then(function (res) {
        pushingInProgress = false;
        if (res.error) {
          console.error('[persistence] push error:', res.error);
          setStatus('Save error — check console', 'error');
          return;
        }
        lastPushedPayloadJson = snapshotJson;
        setStatus('Saved ' + new Date().toLocaleTimeString(), 'ok');
      })
      .catch(function (err) {
        pushingInProgress = false;
        console.error('[persistence] push threw:', err);
        setStatus('Save error', 'error');
      });
  }

  function schedulePush() {
    if (!currentUser) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushToCloud(false); }, DEBOUNCE_MS);
  }

  // ---- Sign-in flow (magic link) ----
  function signIn(email) {
    if (!supabase) return Promise.reject(new Error('Supabase not loaded'));
    var emailRedirectTo = window.location.origin + window.location.pathname;
    return supabase.auth.signInWithOtp({ email: email, options: { emailRedirectTo: emailRedirectTo } })
      .then(function (res) {
        if (res.error) throw res.error;
        return { sent: true };
      });
  }

  function signOut() {
    if (!supabase) return Promise.resolve();
    return supabase.auth.signOut().then(function () {
      currentUser = null;
      lastPushedPayloadJson = '';
      renderAuthUI();
    });
  }

  function getUser() { return currentUser; }

  // ---- JSON export / import (offline-disaster backup) ----
  function exportJson() {
    var snapshot = snapshotAppState();
    var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'retirement-planner-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function importJson(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var snapshot = JSON.parse(e.target.result);
          restoreAppState(snapshot);
          if (currentUser) pushToCloud(true);
          resolve();
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // ---- Auth UI: drawer in the Settings popover ----
  function setStatus(text, kind) {
    var el = document.getElementById('persistence-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'persistence-status' + (kind ? ' persistence-status--' + kind : '');
  }

  function renderAuthUI() {
    var box = document.getElementById('persistence-box');
    if (!box) return;
    if (currentUser) {
      box.innerHTML = ''
        + '<div class="persistence-row">'
        + '  <span class="persistence-row__label">Signed in as</span>'
        + '  <strong class="persistence-row__value">' + escapeHtml(currentUser.email || 'unknown') + '</strong>'
        + '</div>'
        + '<div class="persistence-row persistence-row--actions">'
        + '  <button id="persistence-pull-btn" class="btn-secondary" type="button" title="Pull latest data from cloud now">Pull now</button>'
        + '  <button id="persistence-push-btn" class="btn-secondary" type="button" title="Force-save current state to cloud now">Save now</button>'
        + '  <button id="persistence-export-btn" class="btn-link" type="button" title="Download a JSON backup file">Download backup</button>'
        + '  <label class="btn-link" title="Restore data from a previously downloaded backup file">'
        + '    Restore from file<input type="file" id="persistence-import-input" accept="application/json" hidden>'
        + '  </label>'
        + '  <button id="persistence-signout-btn" class="btn-link" type="button">Sign out</button>'
        + '</div>'
        + '<div id="persistence-status" class="persistence-status"></div>';
      document.getElementById('persistence-pull-btn').addEventListener('click', function () { pullFromCloud(); });
      document.getElementById('persistence-push-btn').addEventListener('click', function () { pushToCloud(true); });
      document.getElementById('persistence-export-btn').addEventListener('click', exportJson);
      document.getElementById('persistence-signout-btn').addEventListener('click', signOut);
      document.getElementById('persistence-import-input').addEventListener('change', function (e) {
        if (e.target.files[0]) importJson(e.target.files[0]).catch(function (err) { setStatus('Restore failed: ' + err.message, 'error'); });
      });
    } else {
      box.innerHTML = ''
        + '<p class="persistence-row__hint">Cloud sync keeps your data safe across devices and browser-clears. Sign in once with your email.</p>'
        + '<div class="persistence-row">'
        + '  <input type="email" id="persistence-email-input" placeholder="your@email.com" class="persistence-email-input">'
        + '  <button id="persistence-signin-btn" class="btn-primary" type="button">Send login link</button>'
        + '</div>'
        + '<div class="persistence-row persistence-row--actions">'
        + '  <button id="persistence-export-btn" class="btn-link" type="button" title="Download a JSON backup of current local data">Download local backup</button>'
        + '  <label class="btn-link" title="Restore data from a previously downloaded backup file">'
        + '    Restore from file<input type="file" id="persistence-import-input" accept="application/json" hidden>'
        + '  </label>'
        + '</div>'
        + '<div id="persistence-status" class="persistence-status"></div>';
      document.getElementById('persistence-signin-btn').addEventListener('click', function () {
        var email = document.getElementById('persistence-email-input').value.trim();
        if (!email || !/.+@.+\..+/.test(email)) { setStatus('Enter a valid email', 'error'); return; }
        setStatus('Sending magic link...');
        signIn(email).then(function () {
          setStatus('Login link sent! Check ' + email + ' and click the link.', 'ok');
        }).catch(function (err) {
          setStatus('Failed: ' + err.message, 'error');
        });
      });
      document.getElementById('persistence-export-btn').addEventListener('click', exportJson);
      document.getElementById('persistence-import-input').addEventListener('change', function (e) {
        if (e.target.files[0]) importJson(e.target.files[0]).catch(function (err) { setStatus('Restore failed: ' + err.message, 'error'); });
      });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Wire input events to schedulePush() ----
  function attachAutoSync() {
    if (typeof RP.getAllInputIds !== 'function') return;
    RP.getAllInputIds().forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el._persistenceWired) return;
      el._persistenceWired = true;
      el.addEventListener('change', schedulePush);
      el.addEventListener('input', schedulePush);
    });
    // Catch programmatic changes (Tracker add/edit/delete) by listening on the
    // tab-tracker container if it exists
    var trackerTab = document.getElementById('tab-tracker');
    if (trackerTab) {
      trackerTab.addEventListener('change', schedulePush, true);
      trackerTab.addEventListener('click', function (e) {
        // Tracker mutations happen on Save / Delete buttons
        if (e.target.matches('button')) setTimeout(schedulePush, 100);
      }, true);
    }
  }

  // ---- Init ----
  function init() {
    // Load Supabase JS SDK from CDN
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = function () {
      // The UMD bundle exposes window.supabase with a createClient function
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('[persistence] Supabase SDK loaded but createClient missing');
        return;
      }
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
          flowType: 'pkce' // works with magic-link + later social providers
        }
      });
      // Re-expose under RP so we don't shadow the global
      RP._supabase = supabase;
      // Helpful debug log — visible in browser console
      console.info('[persistence] SDK ready, project:', SUPABASE_URL,
                   'hash present:', !!window.location.hash);
      // Initial session check (if user clicked magic link, the URL has the auth tokens)
      supabase.auth.getSession().then(function (res) {
        console.info('[persistence] getSession result:', res.data && res.data.session ? 'SIGNED IN' : 'no session');
        if (res.data && res.data.session && res.data.session.user) {
          currentUser = res.data.session.user;
          renderAuthUI();
          pullFromCloud();
        } else {
          renderAuthUI();
        }
      });
      supabase.auth.onAuthStateChange(function (event, session) {
        if (event === 'SIGNED_IN' && session && session.user) {
          currentUser = session.user;
          renderAuthUI();
          pullFromCloud();
        } else if (event === 'SIGNED_OUT') {
          currentUser = null;
          renderAuthUI();
        }
      });
      // Wire auto-sync once everything else has had a chance to render
      setTimeout(attachAutoSync, 1000);
    };
    script.onerror = function () {
      console.error('[persistence] Failed to load Supabase SDK from CDN');
    };
    document.head.appendChild(script);
  }

  RP.persistence = {
    init: init,
    signIn: signIn,
    signOut: signOut,
    getUser: getUser,
    pullNow: pullFromCloud,
    pushNow: function () { return pushToCloud(true); },
    exportJson: exportJson,
    importJson: importJson
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
