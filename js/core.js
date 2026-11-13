/* Core: shared helpers + a tiny registry. Each section file registers itself with PF.section(). */
(function () {
  var osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var perf = { tier: 'full', known: false, source: 'default' };   // device performance tier: 'full' | 'medium' | 'lite'

  var PF = window.PF = {
    D: window.PORTFOLIO || {},
    root: document.documentElement,
    sections: [],
    readyFns: [],
    pageIds: [],
    perf: perf
  };
  // PF.reduced = the visitor's OS "reduce motion" setting OR a device that tested as too weak (tier 'lite').
  // It is a live getter, so code that reads it later sees the tier once the speed test has finished.
  Object.defineProperty(PF, 'reduced', { enumerable: true, get: function () { return osReduced || perf.tier === 'lite'; }, set: function () {} });

  /* ---- Console log ----
     Every decision about this visitor's device is logged with a "PF" badge (open DevTools > Console).
     Set LOG to false to silence it. PF.perf.state() prints a summary table at any time. */
  var LOG = true;
  PF.log = function (tag, msg, data) {
    if (!LOG || !window.console) { return; }
    var args = ['%c PF %c ' + tag + ' %c ' + msg,
      'background:#f26a1b;color:#fff;border-radius:3px;font-weight:700',
      'background:#1a2340;color:#fff;border-radius:3px', 'color:inherit'];
    if (data !== undefined) { args.push(data); }
    console.log.apply(console, args);
  };

  /* ---- Device performance tier ----
     Decides how much animation this device gets (used by All Projects and, through PF.reduced, the rest of the site).
       1. instant signals: OS reduce-motion, data saver, very few CPU cores / little memory
       2. a cached result from an earlier visit (21 days)
       3. otherwise a ~1s hidden 3D speed test, run once the home screen is idle (and cancelled if the intro starts first)
     Also sets class "calm" on <html> when PF.reduced is true, and fires a "pf:perf" event whenever the tier changes.
     Testing: ?motion=full|medium|lite in the URL forces a tier. It is remembered for this tab (so it survives the router
     dropping the query string, and reloads) until the tab is closed or you use ?motion=auto (or PF.perf.force('auto')).
     Console helpers: PF.perf.state()  PF.perf.force('lite' | 'medium' | 'full' | 'auto') */
  (function () {
    var KEY = 'pf-perf', MKEY = 'pf-motion', IKEY = 'pf-ap-intro', TTL = 21 * 864e5, ORDER = ['lite', 'medium', 'full'];
    var cancelled = false, raf = 0, box = null, cap = 'full';
    var info = { osReducedMotion: osReduced, saveData: false, cores: 'n/a', memoryGB: 'n/a', cap: 'full', urlOverride: null, tabOverride: null, cached: null };

    function rank(t) { return ORDER.indexOf(t); }
    function lower(a, b) { return rank(a) <= rank(b) ? a : b; }
    function forcedNow() { return perf.source === 'url' || perf.source === 'tab'; }
    function apply(tier, source, save) {
      var from = perf.tier, changed = from !== tier;
      perf.tier = tier; perf.known = true; perf.source = source;
      PF.root.classList.toggle('calm', PF.reduced);
      if (save) { try { localStorage.setItem(KEY, JSON.stringify({ tier: tier, t: Date.now() })); } catch (e) {} }
      PF.log('tier', (changed ? from + ' -> ' : 'tier = ') + tier + '   (source: ' + source + (save ? ', saved for next visits' : '') + ')   PF.reduced = ' + PF.reduced);
      if (changed) { try { window.dispatchEvent(new Event('pf:perf')); } catch (e) {} }
    }

    perf.cancelTest = function (why) {
      var was = !!box;
      cancelled = true; cancelAnimationFrame(raf);
      if (box && box.parentNode) { box.parentNode.removeChild(box); }
      box = null;
      if (was && why) { PF.log('test', 'speed test cancelled: ' + why); }
    };
    // one step down (full -> medium -> lite) and remembered for next time; used when an intro turns out to run badly
    perf.downgrade = function (why) { apply(ORDER[Math.max(0, rank(perf.tier) - 1)], why || 'downgrade', !forcedNow()); };

    perf.state = function () {
      var seen = 'n/a';
      try { seen = sessionStorage.getItem(IKEY) === '1'; } catch (e) {}
      var s = {
        tier: perf.tier, source: perf.source, 'tier decided': perf.known, 'PF.reduced': PF.reduced,
        'OS reduce-motion': info.osReducedMotion, 'data saver': info.saveData, 'cpu cores': info.cores, 'memory (GB)': info.memoryGB,
        'tier cap from hardware': info.cap, 'url override': info.urlOverride, 'tab override': info.tabOverride,
        'cached result': info.cached ? info.cached.tier + ' (' + info.cached.ageDays + ' days old)' : null,
        'speed test': perf.lastTest ? JSON.stringify(perf.lastTest) : 'not run',
        'all-projects intro seen this session': seen
      };
      if (console.table) { console.table(s); } else { console.log(s); }
    };
    // console testing helper: force a tier for this tab, or 'auto' to clear every override and the cached result
    perf.force = function (v) {
      if (v === 'auto' || !v) {
        try { sessionStorage.removeItem(MKEY); sessionStorage.removeItem(IKEY); localStorage.removeItem(KEY); } catch (e) {}
        PF.log('tier', 'overrides and cached result cleared, reloading'); location.reload(); return;
      }
      if (rank(v) < 0) { PF.log('tier', 'use "full", "medium", "lite" or "auto"'); return; }
      try { sessionStorage.setItem(MKEY, v); sessionStorage.removeItem(IKEY); } catch (e) {}
      info.tabOverride = v;
      apply(v, 'tab', false);
    };

    function schedule() {
      function go() {
        if (cancelled) { return; }
        if (document.hidden) {                       // frames don't run in a hidden tab: wait until it is visible
          PF.log('test', 'tab is hidden, speed test waits until it is visible');
          document.addEventListener('visibilitychange', function h() {
            if (!document.hidden) { document.removeEventListener('visibilitychange', h); schedule(); }
          });
          return;
        }
        run();
      }
      function afterLoad() {
        if ('requestIdleCallback' in window) { window.requestIdleCallback(go, { timeout: 3000 }); } else { setTimeout(go, 1200); }
      }
      if (document.readyState === 'complete') { setTimeout(afterLoad, 600); }
      else { window.addEventListener('load', function () { setTimeout(afterLoad, 600); }); }
    }

    // a small, nearly invisible copy of the tunnel (40 transformed 3D cards + camera tilt), timed for ~0.9s
    function run() {
      var W = 800, H = 450, P = W * 0.75, A = W / 2, B = H / 2, N = 10, S = W * 3.1 / N, L = N * S, OFF = [0, 0.5, 0.25, 0.75];
      PF.log('test', 'speed test running (hidden 3D scene, about 1 second)');
      box = document.createElement('div');
      box.setAttribute('aria-hidden', 'true');
      box.style.cssText = 'position:fixed;left:0;top:0;width:' + W + 'px;height:' + H + 'px;opacity:0.02;pointer-events:none;z-index:-1;overflow:hidden;perspective:' + P + 'px';
      var cam = document.createElement('div'), cards = [], k;
      cam.style.cssText = 'position:absolute;inset:0;transform-style:preserve-3d';
      for (k = 0; k < 4 * N; k++) {
        var side = Math.floor(k / N) < 2, c = document.createElement('div');
        c.style.cssText = 'position:absolute;left:50%;top:50%;transform-origin:0 0;border-radius:10px;overflow:hidden;backface-visibility:hidden;will-change:transform,opacity;' +
          'background:linear-gradient(135deg,#f26a1b,#0f1a3a);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);' +
          'width:' + (side ? S * 0.8 : W * 0.86) + 'px;height:' + (side ? H * 0.86 : S * 0.8) + 'px';
        cam.appendChild(c); cards.push(c);
      }
      box.appendChild(cam); document.body.appendChild(box);

      var deltas = [], last = 0, frames = 0, travel = 0, started = 0;
      function finish(verdict) {
        perf.cancelTest();
        if (!verdict) { PF.log('test', 'speed test: not enough frames measured, no verdict (tier stays ' + perf.tier + ')'); return; }
        var result = lower(verdict, cap);
        apply(result, 'test', true);
      }
      function step(now) {
        if (cancelled) { return; }
        if (document.hidden) { perf.cancelTest('tab went to the background, will retry'); cancelled = false; schedule(); return; }
        raf = requestAnimationFrame(step);
        var dt = last ? now - last : 16; last = now; frames++;
        if (frames > 6) { deltas.push(dt); }                    // skip the first frames (setup / layout)
        if (!started) { started = now; }
        travel += S * 1.5 * dt / 1000;
        cam.style.transform = 'rotateY(' + (Math.sin(now / 400) * 3) + 'deg) rotateX(' + (Math.cos(now / 500) * 2) + 'deg)';
        for (var i = 0; i < cards.length; i++) {
          var w = Math.floor(i / N), idx = i % N, z = ((((idx + OFF[w]) * S + travel) % L) + L) % L - L + 0.5 * P, tr;
          if (w === 0) { tr = 'translate3d(' + (-A) + 'px,0,' + z + 'px) rotateY(90deg)'; }
          else if (w === 1) { tr = 'translate3d(' + A + 'px,0,' + z + 'px) rotateY(-90deg)'; }
          else if (w === 2) { tr = 'translate3d(0,' + B + 'px,' + z + 'px) rotateX(90deg)'; }
          else { tr = 'translate3d(0,' + (-B) + 'px,' + z + 'px) rotateX(-90deg)'; }
          cards[i].style.transform = tr + ' translate(-50%,-50%)';
          cards[i].style.opacity = Math.max(0, Math.min(1, (0.5 * P - z) / L * 2)).toFixed(2);
        }
        if (now - started > 900 || frames > 100) {
          if (deltas.length < 8) { finish(null); return; }     // too little data: no verdict
          deltas.sort(function (a, b) { return a - b; });
          var p75 = deltas[Math.floor(deltas.length * 0.75)];  // judge the slower frames, not the average
          var verdict = p75 <= 24 ? 'full' : (p75 <= 38 ? 'medium' : 'lite');
          perf.lastTest = { frames: deltas.length, slowerFrameMs: +p75.toFixed(1), approxFps: Math.round(1000 / p75), verdict: verdict, cappedTo: lower(verdict, cap) !== verdict ? cap : null };
          PF.log('test', 'speed test result: slower frames take ' + p75.toFixed(1) + ' ms (about ' + Math.round(1000 / p75) + ' fps)  ->  ' + verdict +
            (perf.lastTest.cappedTo ? ', capped to ' + cap + ' by hardware' : '') + '   [full <= 24 ms, medium <= 38 ms, else lite]', perf.lastTest);
          finish(verdict);
        }
      }
      raf = requestAnimationFrame(step);
    }

    var nav = navigator, conn = nav.connection || {}, q = location.search;
    var forced = /[?&]motion=(full|medium|lite)\b/.exec(q);
    if (/[?&]motion=auto\b/.test(q)) { try { localStorage.removeItem(KEY); sessionStorage.removeItem(MKEY); sessionStorage.removeItem(IKEY); } catch (e) {} }
    var stored = null;
    try { stored = sessionStorage.getItem(MKEY); } catch (e) {}
    if (rank(stored) < 0) { stored = null; }
    if (forced) {                                      // remember it for this tab, and let the intro play again for testing
      try { sessionStorage.setItem(MKEY, forced[1]); sessionStorage.removeItem(IKEY); } catch (e) {}
    }
    var cores = nav.hardwareConcurrency || 8, mem = nav.deviceMemory || 8;
    info.saveData = !!conn.saveData; info.cores = nav.hardwareConcurrency || 'n/a'; info.memoryGB = nav.deviceMemory || 'n/a';
    info.urlOverride = forced ? forced[1] : null; info.tabOverride = stored;

    if (osReduced) { apply('lite', 'os'); }
    else if (forced) { apply(forced[1], 'url'); }
    else if (stored) { apply(stored, 'tab'); }
    else if (conn.saveData) { apply('lite', 'save-data'); }
    else if (cores <= 2 || mem <= 2) { apply('lite', 'hardware'); }
    else {
      if (cores <= 4 && mem <= 4) { cap = 'medium'; }
      info.cap = cap;
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      if (cached && rank(cached.tier) > -1 && Date.now() - cached.t < TTL) {
        info.cached = { tier: cached.tier, ageDays: +((Date.now() - cached.t) / 864e5).toFixed(1) };
        apply(lower(cached.tier, cap), 'cache');
      } else {
        perf.tier = cap;
        PF.log('tier', 'no saved result yet: starting as ' + cap + ', speed test will run when the home screen is idle');
        schedule();
      }
    }
    PF.log('start', 'device signals (PF.perf.state() prints this again)', Object.assign({}, info));
  })();

  PF.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  PF.ic = function (id) { return '<svg><use href="#i-' + id + '"/></svg>'; };
  PF.slug = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); };
  PF.chips = function (arr, cls) {
    return '<ul class="chips ' + (cls || '') + '">' + (arr || []).map(function (t) { return '<li>' + PF.esc(t) + '</li>'; }).join('') + '</ul>';
  };
  PF.head = function (icon, title) {
    return '<div class="card-head"><span class="badge">' + PF.ic(icon) + '</span><h2>' + PF.esc(title) + '</h2></div>';
  };
  PF.empty = function (msg) { return '<p class="empty">' + PF.esc(msg) + '</p>'; };
  PF.IMGLOAD = ' onload="this.parentNode.classList.add(\'has-img\')" onerror="this.remove()"';
  PF.initials = function () {
    var P = PF.D.profile || {};
    return (P.name || 'GB').split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  };
  PF.tile = function (item, label) {
    var title = item.title || label;
    return '<figure class="tile"><b>' + PF.esc(title) + '</b>' +
      (item.image ? '<img src="' + PF.esc(item.image) + '" alt="' + PF.esc(title) + '" loading="lazy"' + PF.IMGLOAD + '>' : '') +
      '<figcaption>' + PF.esc(title) + (item.issuer ? '<small>' + PF.esc(item.issuer) + '</small>' : '') + '</figcaption></figure>';
  };

  /* A section definition (every part is optional):
       top:  { order, html }   a block above the home grid (hero, tools strip)
       card: { order, html }   a card in the home grid
       page: { id, order, html } its own page (sidebar link target is #id)
       init: function          runs after everything is in the page                */
  PF.section = function (def) { PF.sections.push(def); };
  PF.onReady = function (fn) { PF.readyFns.push(fn); };

  function byOrder(key) {
    return PF.sections.filter(function (s) { return s[key]; })
      .sort(function (a, b) { return a[key].order - b[key].order; });
  }

  PF.start = function () {
    var tops = byOrder('top'), cards = byOrder('card'), pages = byOrder('page');
    PF.pageIds = ['home'].concat(pages.map(function (s) { return s.page.id; }));

    var home = '<div id="view-home" class="view active">' +
      tops.map(function (s) { return s.top.html(); }).join('') +
      '<div class="bento">' + cards.map(function (s) { return s.card.html(); }).join('') + '</div></div>';
    var rest = pages.map(function (s) { return s.page.html(); }).join('');
    document.getElementById('app').innerHTML = home + rest;

    PF.sections.forEach(function (s) { if (s.init) { s.init(); } });
    PF.readyFns.forEach(function (fn) { fn(); });
  };
})();