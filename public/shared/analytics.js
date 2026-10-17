/*!
 * DTCampaign Analytics SDK  v2.0.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared, centralized analytics SDK for all DT_Campaign projects.
 * Framework-independent — drop in via a plain <script> tag.
 *
 * IMPORTANT — DEPLOY THIS FILE to a path that is NOT overwritten during
 * campaign file-manager uploads. Recommended path: /shared/analytics.js
 * (i.e. the server root's /shared/ directory, never inside a campaign folder).
 * See gas/SETUP.md for alternatives.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   <!-- In <head>, before campaign JS -->
 *   <script src="/shared/analytics.js"></script>
 *
 *   <!-- In campaign <script>, immediately at top -->
 *   if (typeof DTCampaign !== 'undefined') {
 *     DTCampaign.init({
 *       campaignId: 'my-campaign-v1',
 *       endpoint:   'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
 *     });
 *   }
 *
 *   // Later, in any event handler:
 *   if (typeof DTCampaign !== 'undefined') {
 *     DTCampaign.track('button_click', { element_id: 'my-btn', label: 'Buy Now' });
 *   }
 *
 * ─── Public API (window.DTCampaign) ──────────────────────────────────────────
 *
 *   .init(config)                   Must be called once per page load.
 *   .track(eventName, props)        Send a named event with optional properties.
 *   .setConsent(bool)               Grant (true) or revoke (false) visitor-ID
 *                                   persistence.  Call BEFORE init() for strict
 *                                   consent regimes.
 *   .observeSection(el, id, thr)    Auto-fire 'section_view' when element
 *                                   enters the viewport.  thr = 0–1 (default 0.5).
 *   ._debug()                       Return internal state object (dev only).
 *
 * ─── config object ───────────────────────────────────────────────────────────
 *
 *   campaignId   {string}  required  Slug, e.g. 'lamp_campaign1'
 *   endpoint     {string}  required  Deployed Apps Script web-app URL
 *   campaignName {string}  optional  Human name (server resolves canonical name
 *                                   from Campaign Registry; this is only used
 *                                   as a client-side fallback label)
 *
 * ─── Browser → Apps Script transport notes ───────────────────────────────────
 *
 *   Events are batched and sent as HTTP POST with Content-Type: text/plain.
 *   Using a "simple request" (text/plain body) avoids the CORS preflight that
 *   Apps Script cannot respond to correctly.  fetch() is called with
 *   mode:'no-cors' so the browser accepts the opaque response without throwing
 *   a CORS error.  Apps Script exec URLs may issue an internal redirect;
 *   fetch() and sendBeacon() both follow redirects transparently in no-cors
 *   mode.  sendBeacon() is used for session_end events because it survives the
 *   page unload lifecycle even when fetch() keepalive is unreliable.
 *
 *   Server-side validation:
 *   • The Apps Script receiver validates each event's campaign_id against the
 *     Campaign Registry sheet. Unknown or inactive campaigns are rejected.
 *   • The canonical campaign_name is resolved server-side from the registry.
 *
 *   Failure modes:
 *   • If analytics.js fails to load, typeof DTCampaign === 'undefined' and all
 *     campaign guards short-circuit silently — the campaign is unaffected.
 *   • Network errors trigger up to 3 retries with exponential back-off.
 *   • After all retries fail, events are dropped silently.
 *   • The event queue is bounded (MAX_QUEUE) to prevent memory growth.
 */
(function (global) {
  'use strict';

  // Guard against double-load (e.g. script tag duplicated across templates).
  if (global.DTCampaign && global.DTCampaign.__loaded) { return; }

  // ── Constants ──────────────────────────────────────────────────────────────
  var SDK_VERSION   = '2.0.0';
  var LS_VID        = 'dtc_vid';       // localStorage key — visitor ID
  var LS_CONSENT    = 'dtc_consent';   // localStorage key — consent flag
  var MAX_QUEUE     = 150;             // discard oldest when over limit
  var BATCH_MS      = 2000;            // coalesce events before sending (ms)
  var RETRY_MS      = [1000, 4000, 12000]; // back-off delays (3 attempts)

  // ── Private state ──────────────────────────────────────────────────────────
  var _ready        = false;
  var _cfg          = null;
  var _vid          = null;   // visitor ID (persisted across sessions)
  var _sid          = null;   // session ID  (new each page load)
  var _sstart       = null;   // session start ISO timestamp
  var _loadAt       = 0;      // Date.now() at init() call
  var _visibleSince = 0;      // epoch ms when page last became visible
  var _visibleMs    = 0;      // total visible milliseconds accumulated
  var _queue        = [];     // pending events not yet sent
  var _sent         = {};     // map: event_id → 1  (dedup within session)
  var _batchTimer   = null;
  var _exitFired    = false;  // ensures session_end fires at most once

  // ── Utility helpers ────────────────────────────────────────────────────────

  function _uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for browsers without crypto.randomUUID (Safari < 15.4).
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function _iso() { return new Date().toISOString(); }

  function _ls(k)    { try { return localStorage.getItem(k); }    catch (_) { return null; } }
  function _lsW(k,v) { try { localStorage.setItem(k, v); }        catch (_) {} }
  function _lsD(k)   { try { localStorage.removeItem(k); }        catch (_) {} }

  function _warn(msg)  { try { console.warn('[DTCampaign] ' + msg); }  catch (_) {} }
  function _error(msg) { try { console.error('[DTCampaign] ' + msg); } catch (_) {} }

  // ── Consent & visitor identity ─────────────────────────────────────────────
  //
  // Default behaviour: implied consent unless an explicit opt-out is stored.
  // For regimes requiring explicit consent (e.g. GDPR), call
  //   DTCampaign.setConsent(false)
  // BEFORE init().  Only call setConsent(true) after the user actively agrees.
  // When consent is denied, visitor_id is sent as the literal string 'anon'
  // and no identifier is written to localStorage.

  function _consented() {
    return _ls(LS_CONSENT) !== 'false'; // anything other than 'false' = allowed
  }

  function _getOrCreateVid() {
    if (!_consented()) return 'anon';
    var v = _ls(LS_VID);
    if (!v) { v = _uuid(); _lsW(LS_VID, v); }
    return v;
  }

  // ── Referral / URL parameter extraction ───────────────────────────────────

  function _referral() {
    try {
      var p = new URLSearchParams(location.search);
      return {
        ref:          p.get('ref') || p.get('utm_source') || null,
        utm_medium:   p.get('utm_medium')   || null,
        utm_campaign: p.get('utm_campaign') || null,
        m_param:      p.get('m')            || null, // lamp-style message slug
      };
    } catch (_) { return {}; }
  }

  // ── Event factory ──────────────────────────────────────────────────────────

  function _makeEvent(name, props) {
    var ref  = _referral();
    var base = {
      event_id:      _uuid(),
      event_time:    _iso(),
      sdk_version:   SDK_VERSION,
      campaign_id:   _cfg.campaignId,
      campaign_name: _cfg.campaignName || '',
      visitor_id:    _vid,
      session_id:    _sid,
      session_start: _sstart,
      event_name:    name,
      page_url:      location.href,
      page_referrer: document.referrer || null,
      ref:           ref.ref,
      utm_medium:    ref.utm_medium,
      utm_campaign:  ref.utm_campaign,
      m_param:       ref.m_param,
      ui_language:   (navigator.language || null),
      screen_w:      (typeof screen !== 'undefined' ? screen.width  : null),
      screen_h:      (typeof screen !== 'undefined' ? screen.height : null),
    };
    // Merge campaign-specific properties (shallow, primitives only for safety).
    if (props && typeof props === 'object') {
      var keys = Object.keys(props);
      for (var i = 0; i < keys.length; i++) {
        base[keys[i]] = props[keys[i]];
      }
    }
    return base;
  }

  // ── Queue management ───────────────────────────────────────────────────────

  function _enqueue(evt) {
    if (_sent[evt.event_id]) return;   // already delivered — skip
    if (_queue.length >= MAX_QUEUE) _queue.shift(); // enforce memory bound
    _queue.push(evt);
  }

  function _scheduleBatch() {
    if (_batchTimer) return;
    _batchTimer = setTimeout(function () {
      _batchTimer = null;
      _flush(false);
    }, BATCH_MS);
  }

  function _cancelBatch() {
    if (_batchTimer) { clearTimeout(_batchTimer); _batchTimer = null; }
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  function _flush(isExit) {
    if (!_cfg || !_cfg.endpoint) return;
    if (_queue.length === 0) return;
    var batch = _queue.splice(0); // drain the entire queue
    _send(batch, 0, isExit);
  }

  function _send(batch, attempt, isExit) {
    var payload = JSON.stringify({ events: batch });

    // ── Exit path ──────────────────────────────────────────
    // sendBeacon() is fire-and-forget and survives page unload on most
    // browsers.  It sends the Blob as text/plain (a simple request with no
    // CORS preflight).  The boolean return value indicates whether the UA
    // queued the request; true does not guarantee server delivery.
    if (isExit && typeof navigator.sendBeacon === 'function') {
      var queued = navigator.sendBeacon(
        _cfg.endpoint,
        new Blob([payload], { type: 'text/plain' })
      );
      if (queued) {
        batch.forEach(function (e) { _sent[e.event_id] = 1; });
      }
      return;
    }

    // ── Regular path ───────────────────────────────────────
    // Content-Type: text/plain → simple request → no CORS preflight.
    // mode: 'no-cors' → browser accepts Apps Script's opaque response.
    // keepalive: true → request may outlive the page (best-effort).
    fetch(_cfg.endpoint, {
      method:    'POST',
      mode:      'no-cors',
      keepalive: true,
      headers:   { 'Content-Type': 'text/plain' },
      body:      payload,
    }).then(function () {
      // Opaque response — assume success when fetch resolves without throwing.
      batch.forEach(function (e) { _sent[e.event_id] = 1; });
    }).catch(function () {
      // Network failure: retry with exponential back-off.
      if (attempt < RETRY_MS.length) {
        setTimeout(function () {
          _send(batch, attempt + 1, false);
        }, RETRY_MS[attempt]);
      }
      // All retries exhausted → silently drop.
      // Analytics failures must NEVER interrupt campaign functionality.
    });
  }

  // ── Page-visibility & session-end lifecycle ────────────────────────────────

  function _onVisibility() {
    if (document.visibilityState === 'hidden') {
      // Page hidden — accumulate visible time and flush immediately.
      // The tab may be killed without ever firing pagehide.
      if (_visibleSince > 0) {
        _visibleMs += Date.now() - _visibleSince;
        _visibleSince = 0;
      }
      _cancelBatch();
      _flush(false);
    } else {
      // Page became visible again — restart visible-time counter.
      _visibleSince = Date.now();
    }
  }

  function _onExit() {
    if (_exitFired) return; // pagehide and beforeunload can both fire; guard once
    _exitFired = true;

    // Final visible-time accumulation.
    if (_visibleSince > 0) {
      _visibleMs += Date.now() - _visibleSince;
    }

    var totalMs = Date.now() - _loadAt;
    _enqueue(_makeEvent('session_end', {
      duration_ms:         totalMs,
      visible_duration_ms: _visibleMs,
    }));
    _cancelBatch();
    _flush(true); // use sendBeacon
  }

  // ── Section-visibility helper (IntersectionObserver) ──────────────────────

  var _io = null;

  function _observeSection(el, sectionId, threshold) {
    if (!el || !_ready) return;
    if (typeof IntersectionObserver === 'undefined') return; // Safari 12 and older

    if (!_io) {
      _io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            _io.unobserve(entry.target); // fire once per element
            _track('section_view', {
              section_id:  entry.target.getAttribute('data-dtc-section') || sectionId,
              visible_pct: Math.round(entry.intersectionRatio * 100),
            });
          }
        });
      }, { threshold: (threshold != null) ? threshold : 0.5 });
    }

    try { el.setAttribute('data-dtc-section', sectionId); } catch (_) {}
    _io.observe(el);
  }

  // ── Core track ─────────────────────────────────────────────────────────────

  function _track(name, props) {
    if (!_ready) {
      _warn('track("' + name + '") called before init() — event dropped.');
      return;
    }
    _enqueue(_makeEvent(name, props));
    _scheduleBatch();
  }

  // ── init ───────────────────────────────────────────────────────────────────

  function _init(cfg) {
    if (_ready) {
      _warn('Duplicate init() call ignored.');
      return;
    }
    if (!cfg || !cfg.campaignId || !cfg.endpoint) {
      _error('init() requires { campaignId, endpoint }.');
      return;
    }
    // Silently skip if the placeholder endpoint was not replaced.
    if (cfg.endpoint === 'REPLACE_WITH_YOUR_APPS_SCRIPT_WEB_APP_URL') {
      _warn('Endpoint not configured — analytics disabled.');
      return;
    }

    _cfg          = cfg;
    _vid          = _getOrCreateVid();
    _sid          = _uuid();
    _sstart       = _iso();
    _loadAt       = Date.now();
    _visibleSince = (document.visibilityState !== 'hidden') ? Date.now() : 0;
    _ready        = true;

    document.addEventListener('visibilitychange', _onVisibility);
    window.addEventListener('pagehide',     _onExit);
    window.addEventListener('beforeunload', _onExit);

    // Automatic page_view fires immediately on init.
    var ref = _referral();
    _track('page_view', {
      page_title:   document.title || null,
      m_param:      ref.m_param,
      ref:          ref.ref,
      utm_medium:   ref.utm_medium,
      utm_campaign: ref.utm_campaign,
    });
  }

  // ── Consent control ────────────────────────────────────────────────────────

  function _setConsent(allowed) {
    _lsW(LS_CONSENT, allowed ? 'true' : 'false');
    if (!allowed) {
      _lsD(LS_VID);
      _vid = 'anon';
    } else if (_vid === 'anon') {
      // Re-generate a persistent ID now that consent is granted.
      _vid = _getOrCreateVid();
    }
  }

  // ── Expose public API ──────────────────────────────────────────────────────

  global.DTCampaign = {
    __loaded:       true,       // idempotent double-load guard
    init:           _init,
    track:          _track,
    setConsent:     _setConsent,
    observeSection: _observeSection,
    /** Development helper — do not rely on in production. */
    _debug: function () {
      return {
        ready:        _ready,
        visitorId:    _vid,
        sessionId:    _sid,
        sessionStart: _sstart,
        queueSize:    _queue.length,
        sentCount:    Object.keys(_sent).length,
        visibleMs:    _visibleMs,
        endpoint:     _cfg ? _cfg.endpoint : null,
        campaignId:   _cfg ? _cfg.campaignId : null,
      };
    },
  };

}(typeof window !== 'undefined' ? window : this));
