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
  // Aggressive debounce: 300ms. Long enough to batch rapid keystrokes (typing
  // a number doesn't fire 5 separate pushes); short enough that refresh
  // immediately after a delete is unlikely to lose the push. Original 1500ms
  // was too long — Pardha could refresh in <1s and see deleted data return.
  var DEBOUNCE_MS = 300;

  // Will be set once the Supabase JS SDK loads from CDN
  var supabase = null;
  var currentUser = null;
  var pushTimer = null;
  var pullingInProgress = false;
  var pushingInProgress = false;
  var lastPushedPayloadJson = ''; // dedupe — don't push if nothing changed
  // Guards against the "phantom phase comes back after delete" bug:
  //   initialPullDone — tracks whether we've done the once-per-load pull
  //                     (after that, we never auto-pull again — local wins)
  //   localChangedSinceLastPull — set true on any rp_* setItem; means a
  //                     pending push has unsaved local edits, so a pull
  //                     would clobber them
  var initialPullDone = false;
  var localChangedSinceLastPull = false;
  var restoringInProgress = false; // suppress dirty-flag during restoreAppState writes

  // ---- Snapshot the entire app state into a JSON object ----
  // Two layers of capture, both automatic so future Phase 4/5/N additions
  // get persisted without touching this file:
  //   1. inputs: every form-control id from RP.getAllInputIds()
  //   2. localStorage: EVERY key that starts with "rp_" except known UI-only
  //      keys (active tab, last-sub-tab — these are local navigation state,
  //      not data, and syncing them would override what device you're on).
  // The wholesale-localStorage approach replaces the previous hand-coded
  // list which was missing Net Worth, Expense Log, milestone source, tracker
  // mode, AND the new tracker start date — same bug class as the y0m3 issue.
  // Keys we never sync:
  //   - active_tab / last_tab_in_group_* — UI navigation state per device
  //   - multigoal_phases — DEAD KEY from a v1 bug; canonical key is rp_phases.
  //     Was getting empty "[]" written from somewhere and confusing the restore.
  var UI_ONLY_KEYS_RE = /^rp_(active_tab|last_tab_in_group_|multigoal_phases$)/;
  // Build a SECTIONED snapshot — one bag per logical area of the app, so the
  // Supabase Table Editor shows readable named columns instead of one giant
  // unreadable blob.
  function snapshotAppState() {
    var out = {
      // form inputs (Phase 1 + Phase 2 editable fields)
      inputs: {},
      // multigoal phases array
      phases: [],
      // tracker bundle (entries + anchor + view mode)
      tracker: { entries: {}, startDate: null, mode: 'default' },
      // networth log array
      networth: [],
      // expenses log object (keyed by month)
      expenses: {},
      // profiles bundle (all profiles + which is active)
      profiles: { all: {}, active: null },
      // MC + view settings
      mc_settings: { view: 'ideal', simCount: '10000', milestoneSrc: null },
      // Misc meta (theme, snapshot timestamp)
      meta: { darkMode: 'false', lastSnap: new Date().toISOString() }
    };

    // 1. form inputs
    if (typeof RP.getAllInputIds === 'function') {
      RP.getAllInputIds().forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') out.inputs[id] = el.checked;
        else if (el.tagName === 'BUTTON') out.inputs[id] = el.getAttribute('aria-pressed') === 'true';
        else out.inputs[id] = el.value;
      });
    }

    // 2. read each section from localStorage
    var readJson = function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) { return fallback; }
    };
    var readStr = function (key, fallback) {
      try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
    };

    out.phases = readJson('rp_phases', []);
    out.tracker.entries = readJson('rp_tracker_entries', {});
    out.tracker.startDate = readStr('rp_tracker_start_date', null);
    out.tracker.mode = readStr('rp_tracker_mode', 'default');
    out.networth = readJson('rp_networth_log', []);
    out.expenses = readJson('rp_expense_log', {});
    out.profiles.all = readJson('rp_profiles', {});
    out.profiles.active = readStr('rp_active_profile', null);
    out.mc_settings.view = readStr('rp_projection_view', 'ideal');
    out.mc_settings.simCount = readStr('rp_mc_sim_count', '10000');
    out.mc_settings.milestoneSrc = readStr('rp_milestone_source', null);
    out.meta.darkMode = readStr('rp_dark_mode', 'false');
    return out;
  }

  // ---- Restore app state from a snapshot (v6 sectioned format) ----
  // The snapshot is a SECTIONED object: { inputs, phases, tracker, networth,
  // expenses, profiles, mc_settings, meta }. Each section maps cleanly to
  // a Supabase column. We keep backward-compat for the old v2 single-blob
  // format (still readable from older Supabase rows or JSON exports).
  function restoreAppState(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    restoringInProgress = true;

    // v2-blob backward compat: detect old shape and translate to sectioned
    if (snapshot.storage && !snapshot.phases) {
      var oldStorage = snapshot.storage;
      snapshot = {
        inputs: snapshot.inputs || {},
        phases: oldStorage.rp_phases ? JSON.parse(oldStorage.rp_phases) : [],
        tracker: {
          entries: oldStorage.rp_tracker_entries ? JSON.parse(oldStorage.rp_tracker_entries) : {},
          startDate: oldStorage.rp_tracker_start_date || null,
          mode: oldStorage.rp_tracker_mode || 'default'
        },
        networth: oldStorage.rp_networth_log ? JSON.parse(oldStorage.rp_networth_log) : [],
        expenses: oldStorage.rp_expense_log ? JSON.parse(oldStorage.rp_expense_log) : {},
        profiles: {
          all: oldStorage.rp_profiles ? JSON.parse(oldStorage.rp_profiles) : {},
          active: oldStorage.rp_active_profile || null
        },
        mc_settings: {
          view: oldStorage.rp_projection_view || 'ideal',
          simCount: oldStorage.rp_mc_sim_count || '10000',
          milestoneSrc: oldStorage.rp_milestone_source || null
        },
        meta: { darkMode: oldStorage.rp_dark_mode || 'false' }
      };
    }

    // 1. Form inputs
    var inputs = snapshot.inputs || {};
    Object.keys(inputs).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var val = inputs[id];
      if (el.type === 'checkbox') el.checked = !!val;
      else if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', val ? 'true' : 'false');
      else el.value = val;
    });

    // 2. Each section → its localStorage key
    var writeJson = function (key, val) {
      if (val === undefined || val === null) return;
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
    };
    var writeStr = function (key, val) {
      if (val === undefined || val === null) return;
      try { localStorage.setItem(key, String(val)); } catch (_) {}
    };
    writeJson('rp_phases', snapshot.phases || []);
    if (snapshot.tracker) {
      writeJson('rp_tracker_entries', snapshot.tracker.entries || {});
      if (snapshot.tracker.startDate) writeStr('rp_tracker_start_date', snapshot.tracker.startDate);
      if (snapshot.tracker.mode) writeStr('rp_tracker_mode', snapshot.tracker.mode);
    }
    writeJson('rp_networth_log', snapshot.networth || []);
    writeJson('rp_expense_log', snapshot.expenses || {});
    if (snapshot.profiles) {
      writeJson('rp_profiles', snapshot.profiles.all || {});
      if (snapshot.profiles.active) writeStr('rp_active_profile', snapshot.profiles.active);
    }
    if (snapshot.mc_settings) {
      writeStr('rp_projection_view', snapshot.mc_settings.view || 'ideal');
      writeStr('rp_mc_sim_count', snapshot.mc_settings.simCount || '10000');
      if (snapshot.mc_settings.milestoneSrc) writeStr('rp_milestone_source', snapshot.mc_settings.milestoneSrc);
    }
    if (snapshot.meta) {
      writeStr('rp_dark_mode', snapshot.meta.darkMode || 'false');
    }

    // Cleanup: dead keys from v1 should never be in localStorage. If they
    // are (left over from a previous app version), remove them so they
    // don't pollute future snapshots.
    try { localStorage.removeItem('rp_multigoal_phases'); } catch (_) {}

    // Apply theme immediately
    if (localStorage.getItem('rp_dark_mode') === 'true') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    // Re-hydrate every module's in-memory cache from the now-restored
    // localStorage. CRITICAL: each module loaded its cache at BOOT time
    // (before cloud pull completed), so without this re-hydration the
    // renderer uses stale boot-time data even though localStorage now has
    // the cloud version.
    //
    // Bug Pardha hit: multi-goal phases "going off after refresh" —
    // restoreAppState wrote localStorage but RP._multigoal.phases (in-mem)
    // was never refreshed.
    //
    // Fix is bulletproof: re-call every init/_load function we know exists.
    // Each module's init reads localStorage and rebuilds its cache. This
    // covers all modules at once and is future-proof for new tabs.
    var rehydrators = [
      function () { return RP._multigoal && RP._multigoal._load && RP._multigoal._load(); },
      function () { return RP.initTracker && RP.initTracker(); },
      function () { return RP.initNetWorth && RP.initNetWorth(); },
      function () { return RP.initExpenseTracker && RP.initExpenseTracker(); },
      function () { return RP.initGoals && RP.initGoals(); },
      function () { return RP.initDarkMode && RP.initDarkMode(); }
    ];
    rehydrators.forEach(function (fn) { try { fn(); } catch (e) { console.warn('[persistence] rehydrator failed:', e); } });
    // Re-fire Phase 1 calculations so the restored values produce projections
    if (typeof RP._updateAgeFromDOB === 'function') RP._updateAgeFromDOB();
    if (typeof RP._computeSavingsRollup === 'function') RP._computeSavingsRollup();
    if (typeof RP.calculateAll === 'function') RP.calculateAll();
    if (typeof RP.renderPhases === 'function') RP.renderPhases();
    if (typeof RP.calculateMultiGoal === 'function') RP.calculateMultiGoal();
    if (typeof RP.renderTracker === 'function') RP.renderTracker();
    if (typeof RP.renderNetWorth === 'function') RP.renderNetWorth();
    if (typeof RP.renderExpenseTracker === 'function') RP.renderExpenseTracker();
    // Refresh the "Started using app from" dropdown to show restored anchor
    var sel = document.getElementById('trackerStartSelect');
    if (sel && sel._wired) {
      var stored = localStorage.getItem('rp_tracker_start_date');
      if (stored) sel.value = stored;
    }
    // Clear the restore guard NOW that everything has been written + re-rendered.
    // From this point any further setItem IS a user edit and should sync.
    restoringInProgress = false;
  }

  // ---- Pull latest from cloud ----
  // BUG FIX (2026-05-04): if local has unsaved edits (deleted phase still
  // in push debounce queue), pulling here would clobber them. Refuse the
  // pull and force-push instead.
  function pullFromCloud(opts) {
    opts = opts || {};
    if (!supabase || !currentUser || pullingInProgress) return Promise.resolve();
    if (localChangedSinceLastPull && !opts.force) {
      console.info('[persistence] skipping auto-pull because local has unsaved edits; pushing instead');
      return pushToCloud(true);
    }
    pullingInProgress = true;
    setStatus('Syncing...');
    // v6: select all sectioned columns. The fallback `payload` column is
    // kept for one-shot migration of old rows that haven't been split yet.
    return supabase.from(TABLE)
      .select('inputs, phases, tracker, networth, expenses, profiles, mc_settings, meta, payload, updated_at')
      .eq('user_id', currentUser.id).maybeSingle()
      .then(function (res) {
        pullingInProgress = false;
        if (res.error) {
          console.error('[persistence] pull error:', res.error);
          setStatus('Sync error — check console', 'error');
          return;
        }
        if (!res.data) {
          setStatus('First sync — saving current state...');
          return pushToCloud(true);
        }
        // v6: prefer sectioned columns. If they're empty (old row that hasn't
        // been migrated yet), fall back to the legacy `payload` blob.
        var hasSectioned = res.data.inputs || res.data.phases || res.data.tracker;
        var snap;
        if (hasSectioned) {
          snap = {
            inputs: res.data.inputs || {},
            phases: res.data.phases || [],
            tracker: res.data.tracker || {},
            networth: res.data.networth || [],
            expenses: res.data.expenses || {},
            profiles: res.data.profiles || {},
            mc_settings: res.data.mc_settings || {},
            meta: res.data.meta || {}
          };
        } else if (res.data.payload) {
          // Legacy row — restoreAppState handles the v2-blob backward compat
          snap = res.data.payload;
        } else {
          setStatus('First sync — saving current state...');
          return pushToCloud(true);
        }
        var pulledPhases = (snap.phases || []).map(function (p) { return p.name; });
        console.info('[persist] PULL got cloud snapshot with phases:', pulledPhases);
        restoreAppState(snap);
        lastPushedPayloadJson = JSON.stringify(snap);
        initialPullDone = true;
        localChangedSinceLastPull = false;
        setStatus('Synced ' + new Date(res.data.updated_at).toLocaleTimeString(), 'ok');
      })
      .catch(function (err) {
        pullingInProgress = false;
        console.error('[persistence] pull threw:', err);
        setStatus('Sync error', 'error');
      });
  }

  // ---- Push current state to cloud ----
  // If a push is already in-flight when called, mark "another push needed"
  // and re-fire when the in-flight one finishes. Without this, rapid edits
  // would silently drop later changes (3 deletes in 100ms = only first
  // makes it to cloud).
  var pushQueued = false;
  function pushToCloud(force) {
    if (!supabase || !currentUser) {
      console.warn('[persist] pushToCloud SKIPPED — no user yet (signed_in=' + !!currentUser + ')');
      return Promise.resolve();
    }
    if (pushingInProgress) {
      console.info('[persist] push already in-flight, queuing');
      pushQueued = true;
      return Promise.resolve();
    }
    var snapshot = snapshotAppState();
    var snapshotJson = JSON.stringify(snapshot);
    if (!force && snapshotJson === lastPushedPayloadJson) {
      console.info('[persist] push skipped — no diff vs lastPushed');
      return Promise.resolve();
    }
    pushingInProgress = true;
    setStatus('Saving...');
    var phasesPreview = (snapshot.phases || []).map(function (p) { return p.name; });
    console.info('[persist] PUSH STARTING with phases:', phasesPreview);
    // v6: upsert sectioned columns. Each section is its own JSONB column.
    return supabase.from(TABLE).upsert({
      user_id: currentUser.id,
      inputs: snapshot.inputs,
      phases: snapshot.phases,
      tracker: snapshot.tracker,
      networth: snapshot.networth,
      expenses: snapshot.expenses,
      profiles: snapshot.profiles,
      mc_settings: snapshot.mc_settings,
      meta: snapshot.meta
    }, { onConflict: 'user_id' })
      .then(function (res) {
        pushingInProgress = false;
        if (res.error) {
          console.error('[persist] PUSH FAILED:', res.error);
        } else {
          console.info('[persist] PUSH OK with phases:', phasesPreview);
        }
        if (pushQueued) { pushQueued = false; setTimeout(function () { pushToCloud(true); }, 50); }
        if (res.error) {
          console.error('[persistence] push error:', res.error);
          setStatus('Save error — check console', 'error');
          return;
        }
        lastPushedPayloadJson = snapshotJson;
        // Push successful — local state is now in cloud. Local-changes flag
        // can be cleared so next pull (if any) won't be blocked unnecessarily.
        localChangedSinceLastPull = false;
        setStatus('Saved ' + new Date().toLocaleTimeString(), 'ok');
      })
      .catch(function (err) {
        pushingInProgress = false;
        console.error('[persistence] push threw:', err);
        setStatus('Save error', 'error');
      });
  }

  // Debounced push — used for input-event auto-sync only (typing in form
  // fields). Mutator writes use pushToCloud(true) directly via the monkey-
  // patched localStorage.setItem above.
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

  // ---- Wire input events + monkey-patch localStorage to schedule sync ----
  // Two layers:
  //   1. listen for change/input on every form control (covers normal editing)
  //   2. monkey-patch localStorage.setItem so ANY write to an "rp_*" key
  //      triggers a push, even from code that doesn't use form events
  //      (Tracker, Net Worth, Expense Log, Milestone source, future tabs).
  // This is the bug-class fix: instead of remembering to add hooks per tab,
  // we capture all writes at the storage layer.
  function attachAutoSync() {
    if (typeof RP.getAllInputIds === 'function') {
      RP.getAllInputIds().forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el._persistenceWired) return;
        el._persistenceWired = true;
        el.addEventListener('change', schedulePush);
        el.addEventListener('input', schedulePush);
      });
    }
    // Explicit save-hook approach (replaces the brittle localStorage.setItem
    // monkey-patch which got reverted by browser extensions like uBlock).
    // Wrap each module's _save / save function so it ALSO triggers a cloud
    // push. This is direct + cannot be reverted by anything external.
    // Run multiple times since some modules (like _multigoal) may not yet
    // exist or may redefine themselves later in the boot sequence.
    wrapModuleSavers();
    setTimeout(wrapModuleSavers, 100);
    setTimeout(wrapModuleSavers, 500);
    setTimeout(wrapModuleSavers, 2000);
  }

  // Wrap each known mutator function so it auto-pushes after saving locally.
  // Idempotent — guards via _rpWrapped flag on each wrapped function.
  function wrapModuleSavers() {
    // Multi-Goal phases
    if (RP._multigoal && typeof RP._multigoal._save === 'function' && !RP._multigoal._save._rpWrapped) {
      var origMG = RP._multigoal._save;
      RP._multigoal._save = function () {
        var r = origMG.apply(this, arguments);
        if (!restoringInProgress) {
          console.info('[persist] _multigoal._save fired — pushing');
          localChangedSinceLastPull = true;
          pushToCloud(true);
        }
        return r;
      };
      RP._multigoal._save._rpWrapped = true;
    }
    // Tracker
    if (typeof RP.saveTrackerToStorage === 'function' && !RP.saveTrackerToStorage._rpWrapped) {
      var origT = RP.saveTrackerToStorage;
      RP.saveTrackerToStorage = function () {
        var r = origT.apply(this, arguments);
        if (!restoringInProgress) {
          console.info('[persist] saveTrackerToStorage fired — pushing');
          localChangedSinceLastPull = true;
          pushToCloud(true);
        }
        return r;
      };
      RP.saveTrackerToStorage._rpWrapped = true;
    }
    // Net Worth (uses raw localStorage in calc-networth.js)
    ['addNetWorthEntry', 'deleteNetWorthEntry'].forEach(function (fn) {
      if (typeof RP[fn] === 'function' && !RP[fn]._rpWrapped) {
        var orig = RP[fn];
        RP[fn] = function () {
          var r = orig.apply(this, arguments);
          if (!restoringInProgress) {
            console.info('[persist] ' + fn + ' fired — pushing');
            localChangedSinceLastPull = true;
            pushToCloud(true);
          }
          return r;
        };
        RP[fn]._rpWrapped = true;
      }
    });
    // Expense Log
    if (typeof RP.saveExpenseMonth === 'function' && !RP.saveExpenseMonth._rpWrapped) {
      var origE = RP.saveExpenseMonth;
      RP.saveExpenseMonth = function () {
        var r = origE.apply(this, arguments);
        if (!restoringInProgress) {
          console.info('[persist] saveExpenseMonth fired — pushing');
          localChangedSinceLastPull = true;
          pushToCloud(true);
        }
        return r;
      };
      RP.saveExpenseMonth._rpWrapped = true;
    }
    // Profiles (saveProfile / loadProfile / deleteProfile / _setActiveProfileName).
    // _setActiveProfileName is the actual localStorage writer for active-profile;
    // loadProfile calls it and also restores all the input values.
    ['saveProfile', 'loadProfile', 'deleteProfile', '_setActiveProfileName'].forEach(function (fn) {
      if (typeof RP[fn] === 'function' && !RP[fn]._rpWrapped) {
        var orig = RP[fn];
        RP[fn] = function () {
          var r = orig.apply(this, arguments);
          if (!restoringInProgress) {
            console.info('[persist] ' + fn + ' fired — pushing');
            localChangedSinceLastPull = true;
            pushToCloud(true);
          }
          return r;
        };
        RP[fn]._rpWrapped = true;
      }
    });
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
