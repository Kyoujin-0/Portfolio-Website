/* All Projects page (#allprojects)
   Full / medium device tier (see PF.perf in core.js):
     1. A 3D "card tunnel" plays as a loading intro (project images preload meanwhile).
     2. The darkness crawls over every tunnel card (diagonal fill, bottom-left to top-right, like the dark-mode fill),
        spreading from the centre outwards until everything is dark.
     3. The real page appears: every project card flies out of the centre into its grid slot.
   Lite tier (weak device, data saver, OS reduce-motion): no tunnel, the grid just fades in.
   Click or Esc skips to the engulf. Plays once per browser session (sessionStorage); the link under the title replays it.
   Safety net: if the real tunnel runs badly in its first second, it cuts to the lite reveal and lowers this device's tier.
   The final grid is a placeholder; its content will be planned later. No sidebar link. Class prefix: ap- */
(function () {
  var PF = window.PF, esc = PF.esc, chips = PF.chips, empty = PF.empty;

  var KEY = 'pf-ap-intro';                      // sessionStorage flag: intro already seen
  var T_FLY = 1200;                             // ms: fly-in (rush that settles into a drift)
  var HOLE_MAX = 3.5;                           // how much the dark centre grows during the engulf
  var OFF = [0, 0.5, 0.25, 0.75];               // per wall: left, right, floor, ceiling (staggers the walls)
  var narrow = window.innerWidth < 900;
  var CFG = {                                   // per tier: cards per wall, ms until the engulf, engulf length, mouse tilt
    full:   { n: narrow ? 8 : 12, engulf: 4600, dur: 1100, tilt: true },
    medium: { n: narrow ? 5 : 6,  engulf: 3200, dur: 900,  tilt: false }
  };
  var osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function log() { if (PF.log) { PF.log.apply(PF, arguments); } }   // console log (see PF.log in core.js)

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // cover gradient from the project's `cover` colour (hex), falling back to the accent
  function bg(p) {
    var c = /^#[0-9a-f]{3,8}$/i.test(p.cover || '') ? p.cover : 'var(--accent)';
    return 'background:linear-gradient(135deg,' + c + ',color-mix(in srgb,' + c + ' 35%,#0f1a3a))';
  }

  /* ---------- final page: placeholder grid ---------- */
  function card(p) {
    var isGit = /github\.com/i.test(p.link || '');
    return '<section class="card ap-card">' +
      (p.image ? '<img class="ap-shot" src="' + esc(p.image) + '" alt="" onerror="this.remove()">' : '') +
      '<h3>' + esc(p.title) + (p.subtitle ? ' <small>(' + esc(p.subtitle) + ')</small>' : '') + '</h3>' +
      '<p>' + esc(p.desc) + '</p>' + chips(p.tags, 'small') +
      (p.link ? '<a class="ap-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + (isGit ? 'View on GitHub' : 'View project') + ' &rarr;</a>' : '') +
      '</section>';
  }

  PF.section({
    id: 'allprojects',
    page: { id: 'allprojects', order: 0.5, html: function () {
      var projects = PF.D.projects || [];
      return '<div id="view-allprojects" class="view"><div class="ap-root ap-playing" id="apRoot">' +
        '<div class="ap-stage" id="apStage"><div class="ap-cam" id="apCam"></div>' +
        '<div class="ap-hole" id="apHole"></div>' +
        '<div class="ap-label">All Projects</div>' +
        '<div class="ap-count" id="apCount"><b id="apNum">000</b><span>Loading projects</span></div></div>' +
        '<div class="ap-content"><div class="vhead ap-head"><h1>All Projects</h1><p>The full list. This page is still a placeholder.</p>' +
        '<a class="ap-back" href="#projects">&larr; Back to top projects</a>' +
        '<button class="ap-replay" id="apReplay" type="button">&#8635; Replay intro</button></div>' +
        '<div class="ap-grid">' + (projects.map(card).join('') || empty('No projects yet.')) + '</div></div></div></div>';
    } },

    init: function () {
      var root = document.getElementById('apRoot');
      if (!root) { return; }
      var view = root.closest('.view'), stage = document.getElementById('apStage'), cam = document.getElementById('apCam');
      var hole = document.getElementById('apHole'), count = document.getElementById('apCount'), num = document.getElementById('apNum');
      var head = root.querySelector('.ap-head'), replay = document.getElementById('apReplay');

      var list = (PF.D.projects && PF.D.projects.length) ? PF.D.projects : [{ title: 'Projects' }];
      var N = CFG.full.n, T_ENGULF = CFG.full.engulf, D_ENGULF = CFG.full.dur, TILT = true;   // set per play() from the tier
      var tcs = [], dk = [];                                           // tunnel cards, and how dark each has become (0..1, never goes back)

      /* ----- state ----- */
      var W = 0, H = 0, P = 0, A = 0, B = 0, S = 0, L = 0, D = 0;     // tunnel geometry (px), set by measure()
      var t = 0, travel = 0, last = 0, raf = 0, token = 0;
      var playing = false, ready = false, visible = false, restart = false, started = false, checked = false, samples = [], waitLogged = false, engulfLogged = false;
      var rx = 0, ry = 0, tx = 0, ty = 0;                              // camera tilt (eased) and its target

      function tier() { return (PF.perf && PF.perf.tier) || 'full'; }

      // 4 walls x N cards (each wall cycles through the projects, offset so the walls differ)
      function build() {
        var html = '';
        for (var w = 0; w < 4; w++) {
          for (var i = 0; i < N; i++) {
            var p = list[(i + w * 2 + (w > 1 ? 1 : 0)) % list.length];
            html += '<div class="ap-tc" style="' + bg(p) + '">' +
              (p.image ? '<img src="' + esc(p.image) + '" alt="" decoding="async" onerror="this.remove()">' : '') +
              '<span>' + esc(p.title) + '</span></div>';
          }
        }
        cam.innerHTML = html;
        tcs = cam.children; dk = [];
        for (var q = 0; q < tcs.length; q++) { dk.push(0); }
      }

      function measure() {
        W = stage.clientWidth; H = stage.clientHeight;
        P = W * 0.75;            // perspective distance
        A = W / 2; B = H / 2;    // half width / height of the tunnel (walls touch the stage edges at depth 0)
        L = W * 3.12;            // total tunnel length (same for every tier)
        S = L / N;               // depth spacing between cards
        D = S * 0.8;             // card length along the tunnel (the rest is the gap)
        stage.style.perspective = P + 'px';
        for (var k = 0; k < tcs.length; k++) {
          var side = Math.floor(k / N) < 2;
          tcs[k].style.width = (side ? D : W * 0.86) + 'px';
          tcs[k].style.height = (side ? H * 0.86 : D) + 'px';
        }
      }

      function preload() {
        var urls = (PF.D.projects || []).map(function (q) { return q.image; }).filter(Boolean);
        if (!urls.length) { return Promise.resolve(); }
        return Promise.race([
          Promise.all(urls.map(function (u) { return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = res; im.src = u; }); })),
          new Promise(function (res) { setTimeout(res, 4000); })
        ]);
      }

      /* ----- one animation frame of the tunnel + engulf ----- */
      function frame(now) {
        raf = requestAnimationFrame(frame);
        var raw = now - last, dt = Math.min(50, raw); last = now;

        // safety net: judge the real frame rate during the first second of the intro; if it is bad, drop to the lite reveal
        if (!checked) {
          if (t > 350 && t < 1800) { samples.push(raw); }
          else if (t >= 1800) {
            checked = true;
            if (samples.length >= 10) {
              samples.sort(function (a, b) { return a - b; });
              var p75 = samples[Math.floor(samples.length * 0.75)];                       // slower frames above ~45ms (under ~22fps) fail
              if (p75 > 45) { log('intro', 'frame check FAILED: slower frames take ' + p75.toFixed(1) + ' ms (limit 45 ms, ' + samples.length + ' frames measured)'); bail(); return; }
              log('intro', 'frame check ok: slower frames take ' + p75.toFixed(1) + ' ms (limit 45 ms, ' + samples.length + ' frames measured)');
            } else { log('intro', 'frame check skipped: only ' + samples.length + ' frames measured'); }
          }
        }

        var nt = t + dt;
        if (!ready && nt > T_ENGULF) { nt = T_ENGULF; }       // keep the tunnel going until the images are in
        t = nt;
        var p = clamp((t - T_ENGULF) / D_ENGULF, 0, 1);       // engulf progress 0..1
        if (!ready && t >= T_ENGULF && !waitLogged) { waitLogged = true; log('intro', 'holding the tunnel: project images are still loading'); }
        if (p > 0 && !engulfLogged) { engulfLogged = true; log('intro', 'engulf started at ' + Math.round(t) + ' ms: darkness is crawling over the cards'); }

        // speed in cards/second: rush that settles, slow build-up, then a surge during the engulf
        var v;
        if (t < T_FLY) { v = lerp(5, 0.6, 1 - Math.pow(1 - t / T_FLY, 3)); }
        else if (t < T_ENGULF) { var u = (t - T_FLY) / (T_ENGULF - T_FLY); v = lerp(0.6, 2.4, u * u); }
        else { v = 2.4 + 10 * p * p; }
        travel += v * S * dt / 1000;

        // camera tilt follows the pointer (full tier); the whole tunnel pushes forward during the engulf
        rx += (tx - rx) * 0.06; ry += (ty - ry) * 0.06;
        cam.style.transform = 'rotateY(' + rx.toFixed(2) + 'deg) rotateX(' + ry.toFixed(2) + 'deg) scale(' + (1 + 0.6 * p * p).toFixed(3) + ')';

        var gk = smooth(0, 700, t) * (1 - smooth(0.75, 1, p));     // global fade: in at the start, out at the very end of the engulf
        for (var k = 0; k < tcs.length; k++) {
          var wall = Math.floor(k / N), idx = k % N;
          var pos = (((idx + OFF[wall]) * S + travel) % L + L) % L;
          var z = pos - L + 0.5 * P;                           // from far away up to just in front of the screen
          var depth = (0.5 * P - z) / L;                       // 0 = nearest, 1 = farthest
          var a = clamp(depth * L / (0.4 * P), 0, 1) * (1 - smooth(0.45, 1, depth)) * gk;   // fade out near and far (the dark fog)
          var tr;
          if (wall === 0) { tr = 'translate3d(' + (-A) + 'px,0,' + z + 'px) rotateY(90deg)'; }
          else if (wall === 1) { tr = 'translate3d(' + A + 'px,0,' + z + 'px) rotateY(-90deg)'; }
          else if (wall === 2) { tr = 'translate3d(0,' + B + 'px,' + z + 'px) rotateX(90deg)'; }
          else { tr = 'translate3d(0,' + (-B) + 'px,' + z + 'px) rotateX(-90deg)'; }
          tcs[k].style.transform = tr + ' translate(-50%,-50%)';
          tcs[k].style.opacity = a.toFixed(3);
          if (p > 0) {                                        // darkness crawls over the cards: far ones first, near ones last
            var d = clamp((p - 0.5 * (1 - depth)) / 0.45, 0, 1);
            if (d > dk[k]) { dk[k] = d; tcs[k].style.setProperty('--d', d.toFixed(3)); }
          }
        }

        // the dark centre (always there) swells while the darkness crawls over the cards
        var sc = 1 + (HOLE_MAX - 1) * p * p;
        hole.style.transform = 'translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';

        // loading counter in the dark centre
        var pct = Math.floor(100 * clamp(t / T_ENGULF, 0, 1));
        if (!ready && pct > 99) { pct = 99; }
        num.textContent = ('00' + pct).slice(-3);
        count.style.opacity = (smooth(0, 500, t) * (1 - clamp(p * 5, 0, 1))).toFixed(3);

        if (p >= 1) { reveal(); }
      }

      /* ----- the real page: cards burst out of the centre into their slots (FLIP) ----- */
      function reveal() {
        cancelAnimationFrame(raf); playing = false;
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        log('intro', 'reveal: project cards burst out of the dark (intro complete)');
        var sr = stage.getBoundingClientRect(), cx = sr.left + sr.width / 2, cy = sr.top + sr.height / 2;   // centre of the dark
        cam.style.display = 'none'; count.style.opacity = 0;
        root.className = 'ap-root ap-revealing';              // page height is free again; the stage stays as a dark cover
        var cards = Array.prototype.slice.call(root.querySelectorAll('.ap-card'));
        var rects = cards.map(function (c) { return c.getBoundingClientRect(); });
        cards.forEach(function (c, k) {
          var r = rects[k], rot = (k % 2 ? 1 : -1) * (6 + (k * 3) % 8);
          c.style.transition = 'none'; c.style.opacity = '0';
          c.style.transform = 'translate(' + (cx - r.left - r.width / 2) + 'px,' + (cy - r.top - r.height / 2) + 'px) scale(0.12) rotate(' + rot + 'deg)';
        });
        void root.offsetHeight;
        var total = 0;
        cards.forEach(function (c, k) {
          var delay = 150 + k * 110; total = Math.max(total, delay + 1100);
          c.style.transition = 'transform 1s cubic-bezier(0.16,1,0.3,1) ' + delay + 'ms, opacity 0.5s ease ' + delay + 'ms';
          c.style.transform = 'none'; c.style.opacity = '1';
          setTimeout(function () { c.style.transition = ''; c.style.transform = ''; c.style.opacity = ''; }, delay + 1150);
        });
        head.style.transition = 'opacity 0.8s ease 0.6s'; head.style.opacity = '1';
        stage.style.transition = 'opacity 0.9s ease 0.1s'; stage.style.opacity = '0';
        setTimeout(function () { head.style.transition = ''; head.style.opacity = ''; settle(); }, Math.max(total, 1400));
      }

      function label() {                                       // replay link text depends on the tier
        replay.hidden = osReduced;                             // people who asked the OS for less motion are not offered the intro
        replay.innerHTML = tier() === 'lite' ? '&#9654; Play lightweight intro' : '&#8635; Replay intro';
      }

      function settle() {                                      // final state: just the page
        cancelAnimationFrame(raf); playing = false;
        root.className = 'ap-root ap-done';
        stage.style.cssText = ''; cam.style.display = '';
        Array.prototype.forEach.call(root.querySelectorAll('.ap-card, .ap-head'), function (el) { el.style.cssText = ''; });
        label();
      }

      // lite reveal: no tunnel; the page appears with a cheap opacity-only fade (nothing at all for OS reduce-motion)
      function liteReveal() {
        cancelAnimationFrame(raf);
        log('intro', 'lite reveal: ' + (osReduced ? 'OS reduce-motion is on, page shows with no animation' : 'device tier is lite, no tunnel, quick fade-in only'));
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        settle();
        if (osReduced) { return; }
        var els = Array.prototype.slice.call(root.querySelectorAll('.ap-head, .ap-card'));
        els.forEach(function (el) { el.style.transition = 'none'; el.style.opacity = '0'; });
        void root.offsetHeight;
        els.forEach(function (el, k) {
          el.style.transition = 'opacity 0.45s ease ' + (k * 70) + 'ms'; el.style.opacity = '1';
          setTimeout(function () { el.style.transition = ''; el.style.opacity = ''; }, k * 70 + 550);
        });
      }

      function bail() {                                        // the tunnel is running badly on this device
        log('intro', 'bailing out to the lite reveal and lowering this device\'s tier for next time');
        if (PF.perf && PF.perf.downgrade) { PF.perf.downgrade('intro-slow'); }   // remembered, so next time it is lighter
        liteReveal();
      }

      function play(force) {                                   // (re)start the intro; `force` picks a tier for this play only
        cancelAnimationFrame(raf);
        var tr = force || tier();
        if (osReduced || tr === 'lite') { liteReveal(); return; }
        if (PF.perf && PF.perf.cancelTest) { PF.perf.cancelTest(); }   // never run the speed test on top of the real intro
        var c = CFG[tr] || CFG.full;
        log('intro', 'tunnel intro starting', { tier: tr, forcedForThisPlay: !!force, cardsPerWall: c.n, engulfAtMs: c.engulf, mouseTilt: c.tilt });
        N = c.n; T_ENGULF = c.engulf; D_ENGULF = c.dur; TILT = c.tilt;
        if (!TILT) { tx = ty = rx = ry = 0; }
        build();
        root.className = 'ap-root ap-playing';
        if (view) { view.scrollTop = 0; }
        stage.style.cssText = ''; cam.style.display = '';
        Array.prototype.forEach.call(root.querySelectorAll('.ap-card, .ap-head'), function (el) { el.style.cssText = 'opacity:0'; });
        measure();
        t = 0; travel = 0; playing = true; ready = false; restart = false; checked = false; samples = []; waitLogged = false; engulfLogged = false;
        var mine = ++token;
        preload().then(function () { if (mine === token) { ready = true; } });
        last = performance.now(); raf = requestAnimationFrame(frame);
      }

      function skip(how) { if (playing && t < T_ENGULF) { log('intro', 'skipped by ' + how + ' at ' + Math.round(t) + ' ms, jumping to the engulf'); ready = true; t = T_ENGULF; } }   // jump to the engulf

      /* ----- wiring ----- */
      stage.addEventListener('click', function () { skip('click'); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && visible) { skip('Esc'); } });
      stage.addEventListener('pointermove', function (e) {
        if (!TILT) { return; }
        var r = stage.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 7; ty = -((e.clientY - r.top) / r.height - 0.5) * 5;
      });
      replay.addEventListener('click', function () { log('intro', 'replay requested' + (tier() === 'lite' ? ' (lite device: playing the medium version)' : '')); play(tier() === 'lite' ? 'medium' : undefined); });
      window.addEventListener('resize', function () { if (playing) { measure(); } });
      window.addEventListener('pf:perf', label);

      var seen = false;
      try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
      if (seen) { settle(); started = true; }                  // already seen this session: straight to the page
      label();
      log('intro', 'All Projects page is ready', { introSeenThisSession: seen, tier: tier(), osReducedMotion: osReduced });

      // start when the page actually becomes visible; restart if the person left in the middle of the intro
      function onVisible(v) {
        visible = v;
        if (v) {
          if (!started) { started = true; log('intro', 'page opened for the first time, tier ' + tier()); play(); }
          else if (restart) { log('intro', 'page re-opened after leaving mid-intro: restarting'); play(); }
        } else if (playing) { cancelAnimationFrame(raf); restart = true; log('intro', 'left the page mid-intro: paused, will restart on return'); }
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { onVisible(en[0].isIntersecting); }, { threshold: 0.2 }).observe(root);
      } else { onVisible(true); }
    }
  });
})();