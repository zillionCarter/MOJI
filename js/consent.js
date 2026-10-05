/*
 * Unchained — lightweight cookie consent.
 *
 * Goals: no annoying full-screen popup, and no tracking before it's allowed.
 *
 *  - Visitors in regions that require opt-in consent (EU/EEA, UK, Switzerland,
 *    Indonesia) see ONE small, non-blocking card in the corner. Meta Pixel,
 *    Google Tag Manager and Crisp chat stay off until they press Accept.
 *    If we can't tell where someone is, they get the same card (fail closed).
 *  - Everyone else gets the tools loaded as normal and can switch them off any
 *    time from "Cookie settings" in the footer.
 *  - The choice is remembered in localStorage and never asked again.
 *
 * Add the attribute  data-ads  to the <script> tag on pages that should also
 * load Meta Pixel + Google Tag Manager (home + shop).
 */
(function () {
  'use strict';

  var KEY = 'unchained_consent';
  var PIXEL_ID = '190767944016508';
  var GTM_ID = 'GTM-PVPHRR2X';
  var CRISP_ID = 'b6127354-60e0-4682-aabd-df7d4349906d';
  var adsPage = !!(document.currentScript && document.currentScript.hasAttribute('data-ads'));

  // EU + EEA + UK + Switzerland + Indonesia (our main audience): opt-in regions.
  var OPT_IN = ('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE ' +
                'IS LI NO GB CH ID').split(' ');

  // Until tracking is allowed, these globals exist but do nothing, so page code can
  // call fbq(...) safely without sending anything anywhere.
  window.dataLayer = window.dataLayer || [];
  window.fbq = function () {};

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  var loaded = false;

  function loadTracking() {
    if (loaded) return;
    loaded = true;

    if (adsPage) {
      // Meta Pixel (official snippet, run only now that it's allowed)
      window.fbq = undefined;
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', PIXEL_ID);
      window.fbq('track', 'PageView');

      // Google Tag Manager
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
      document.head.appendChild(g);
    }

    // Crisp live chat
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_ID;
    window.$crisp.push(['config', 'color:theme', ['red']]);
    var c = document.createElement('script');
    c.async = true;
    c.src = 'https://client.crisp.chat/l.js';
    document.head.appendChild(c);
  }

  // Best-effort removal of cookies the third-party tools set on our domain.
  function clearTrackingCookies() {
    var names = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); });
    var host = location.hostname;
    var parts = host.split('.');
    var domains = [host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    names.forEach(function (name) {
      if (!/^(_fbp|_fbc|_ga|_gid|_gat|_gcl|crisp-client)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + d;
      });
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
  }

  // ---- The little card -------------------------------------------------

  function injectStyles() {
    if (document.getElementById('uc-consent-css')) return;
    var st = document.createElement('style');
    st.id = 'uc-consent-css';
    st.textContent =
      '#uc-consent{position:fixed;left:16px;bottom:16px;z-index:9000;max-width:330px;box-sizing:border-box;' +
      'background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;color:#b5b5b5;' +
      'font:12px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6)}' +
      '#uc-consent p{margin:0 0 10px}' +
      '#uc-consent a{color:#fff;text-decoration:underline}' +
      '#uc-consent .uc-row{display:flex;gap:8px}' +
      '#uc-consent button{flex:1;cursor:pointer;font:700 11px/1 system-ui,sans-serif;letter-spacing:1px;' +
      'text-transform:uppercase;padding:9px 10px;border-radius:4px;border:1px solid #444;background:transparent;color:#fff}' +
      '#uc-consent button.uc-yes{background:#fff;color:#000;border-color:#fff}' +
      '#uc-consent button:hover{opacity:.85}' +
      '@media(max-width:560px){#uc-consent{left:10px;right:10px;bottom:10px;max-width:none}}';
    document.head.appendChild(st);
  }

  function hideCard() {
    var el = document.getElementById('uc-consent');
    if (el) el.remove();
  }

  function showCard(mode) {
    hideCard();
    injectStyles();

    var state = read();
    var on = state === 'granted' || (state === null && loaded);

    var card = document.createElement('div');
    card.id = 'uc-consent';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Cookie preferences');

    var p = document.createElement('p');
    p.appendChild(document.createTextNode(
      mode === 'settings'
        ? 'Analytics, ad and live-chat cookies are currently ' + (on ? 'ON' : 'OFF') + '. '
        : 'We use cookies for analytics, ads and live chat. Saying no is fine — the site works the same. '
    ));
    var a = document.createElement('a');
    a.href = '/privacy#cookies';
    a.textContent = 'Cookie policy';
    p.appendChild(a);
    card.appendChild(p);

    var row = document.createElement('div');
    row.className = 'uc-row';

    var no = document.createElement('button');
    no.type = 'button';
    no.textContent = 'Decline';
    no.addEventListener('click', function () {
      var wasLoaded = loaded;
      save('denied');
      clearTrackingCookies();
      hideCard();
      if (wasLoaded) location.reload(); // drop the already-loaded third-party scripts
    });

    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'uc-yes';
    yes.textContent = 'Accept';
    yes.addEventListener('click', function () {
      save('granted');
      hideCard();
      loadTracking();
    });

    row.appendChild(no);
    row.appendChild(yes);
    card.appendChild(row);
    document.body.appendChild(card);
  }

  window.openCookieSettings = function () { showCard('settings'); };

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (t) {
      e.preventDefault();
      showCard('settings');
    }
  });

  // ---- Decide what to do on page load ----------------------------------

  function whenBodyReady(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  var saved = read();
  if (saved === 'granted') {
    loadTracking();
  } else if (saved === 'denied') {
    // respect it; nothing to do
  } else {
    var done = false;
    var decide = function (country) {
      if (done) return;
      done = true;
      if (country && OPT_IN.indexOf(country) === -1) {
        loadTracking(); // outside opt-in regions: on by default, opt-out in footer
      } else {
        whenBodyReady(function () { showCard('ask'); }); // opt-in region or unknown
      }
    };
    var timer = setTimeout(function () { decide(null); }, 3000);
    fetch('/api/region', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) { clearTimeout(timer); decide(d && d.country); })
      .catch(function () { clearTimeout(timer); decide(null); });
  }
})();
