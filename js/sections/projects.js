/* Projects: home card (rotating preview) + Projects page ("focus shift" showcase). The All Projects page lives in allprojects.js */
(function () {
  var PF = window.PF, esc = PF.esc, ic = PF.ic, chips = PF.chips, head = PF.head, empty = PF.empty;
  var TOP = 4;            // how many projects the showcase shows (the first 4 in data.js)
  var order = [];         // order[0] = focused project, the rest fill the side tiles
  var pending = null;     // project clicked on the home preview, applied when the page opens

  /* ---------- home preview (unchanged, except each window remembers its project number) ---------- */
  function win(p, clone, i) {
    var t = (p.tagline ? esc(p.tagline) : '') + (p.taglineAccent ? ' <em>' + esc(p.taglineAccent) + '</em>' : '');
    if (!t) { t = esc(p.title); }
    return '<article class="pv-win" data-i="' + i + '"' + (clone ? ' aria-hidden="true"' : '') + '>' +
      '<div class="pv-bar"><i></i><i></i><i></i><span>' + esc(p.title) + '</span></div>' +
      '<div class="pv-body' + (p.image ? ' has-shot' : '') + '">' +
      (p.image ? '<img class="pv-shot" src="' + esc(p.image) + '" alt="" onerror="this.parentNode.classList.remove(\'has-shot\');this.remove()">' : '') +
      '<p class="pv-title">' + t + '</p>' + chips(p.tags, 'small') + '</div></article>';
  }

  function windows(projects) {
    if (!projects.length) { return win({ title: 'Projects', tagline: 'Projects', taglineAccent: 'coming soon.', tags: [] }, false, -1); }
    var html = projects.map(function (p, i) { return win(p, false, i); }).join('');
    // extra copy of the first window at the end so the loop scrolls on without a jump
    return html + (projects.length > 1 ? win(projects[0], true, 0) : '');
  }

  /* ---------- Projects page: focus shift ---------- */
  function list() { return (PF.D.projects || []).slice(0, TOP); }

  // cover gradient from the project's `cover` colour (hex), falling back to the accent
  function bg(p) {
    var c = /^#[0-9a-f]{3,8}$/i.test(p.cover || '') ? p.cover : 'var(--accent)';
    return 'background:linear-gradient(135deg,' + c + ',color-mix(in srgb,' + c + ' 35%,#0f1a3a))';
  }
  function img(p) {
    return p.image ? '<img class="fs-img" src="' + esc(p.image) + '" alt="" onerror="this.remove()">' : '';
  }
  function vid(p) {   // video is loaded lazily (data-src) and only played on the focused project
    return p.video ? '<video class="fs-vid" data-src="' + esc(p.video) + '" muted loop playsinline preload="none"></video>' : '';
  }
  function tags(p) {
    var t = (p.tags || []).filter(Boolean);
    return t.length ? '<ul class="fs-tags">' + t.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
  }

  // One persistent element per project. It never gets rebuilt: only its position class changes,
  // so CSS can animate it travelling between the big slot and the side slots.
  function itemHtml(p, idx) {
    var k = order.indexOf(idx), isGit = /github\.com/i.test(p.link || '');
    var text = (p.details || p.desc || '').split(/\n+/).filter(function (t) { return t.trim(); });
    return '<div class="fs-item pos-' + k + (k === 0 ? ' is-main' : '') + '" data-i="' + idx + '"' +
      (k ? ' tabindex="0" role="button" aria-label="Show ' + esc(p.title) + '"' : '') + '><div class="fs-inner">' +
      '<div class="fs-face fs-front" style="' + bg(p) + '">' + img(p) + vid(p) + '<div class="fs-shade"></div>' +
      '<span class="fs-ttl">' + esc(p.title) + '</span>' +
      '<button class="fs-hint" type="button" data-act="flip"' + (k ? ' inert' : '') + '>Click for details</button>' +
      '<div class="fs-info"' + (k ? ' inert' : '') + '><div class="fs-meta"><h2>' + esc(p.title) + '</h2>' +
      (p.subtitle ? '<p class="fs-sub">' + esc(p.subtitle) + '</p>' : '') + tags(p) + '</div>' +
      (p.link ? '<a class="fs-btn" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + (isGit ? 'View on GitHub' : 'View live') + ' &rarr;</a>' : '') + '</div></div>' +
      '<div class="fs-face fs-back" inert><h2>' + esc(p.title) + '</h2>' +
      (p.subtitle ? '<p class="fs-sub">' + esc(p.subtitle) + '</p>' : '') +
      '<div class="fs-text">' + (text.length ? text.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') : '<p>Details coming soon.</p>') + '</div>' +
      tags(p) +
      '<div class="fs-actions">' +
      (p.link ? '<a class="fs-btn" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + (isGit ? 'View on GitHub' : 'View live') + ' &rarr;</a>' : '') +
      '<button class="fs-btn ghost" type="button" data-act="unflip">&larr; Back</button></div></div></div></div>';
  }

  PF.section({
    id: 'projects',
    card: { order: 0, html: function () {
      var projects = PF.D.projects || [];
      return '<section class="card hc c-projects" data-go="projects" tabindex="0" role="link" aria-label="Open projects">' +
        '<div class="pl">' + head('folder', 'Projects') + '<p class="sub">Funnels, workflows and apps built to solve real problems.</p><span class="more">View all &rarr;</span></div>' +
        '<div class="pv" id="pv"><div class="pv-track" id="pvTrack">' + windows(projects) + '</div></div></section>';
    } },
    page: { id: 'projects', order: 0, html: function () {
      var L = list();
      order = L.map(function (_, i) { return i; });
      return '<div id="view-projects" class="view"><div class="vhead"><h1>Projects</h1><p>A few of the apps and systems I\'ve built for school and for fun.</p>' +
        '<a class="fs-all" href="#allprojects">View all projects &rarr;</a></div>' +
        (L.length ? '<div class="fs' + (L.length < 2 ? ' solo' : '') + '" id="fs">' + L.map(itemHtml).join('') + '</div>' : empty('No projects yet.')) + '</div>';
    } },
    init: function () {
      /* ----- Projects page: focus shift + flip ----- */
      var fs = document.getElementById('fs');

      function layout() {          // give every item its slot class; CSS animates the move
        Array.prototype.forEach.call(fs.querySelectorAll('.fs-item'), function (el) {
          var k = order.indexOf(+el.getAttribute('data-i'));
          el.className = 'fs-item pos-' + k + (k === 0 ? ' is-main' : '');
          if (k) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Show ' + el.querySelector('.fs-ttl').textContent); }
          else { el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); }
          Array.prototype.forEach.call(el.querySelectorAll('.fs-info, .fs-hint'), function (x) {
            if (k) { x.setAttribute('inert', ''); } else { x.removeAttribute('inert'); }
          });
        });
      }

      /* video: plays muted + looping on the focused project only; paused when flipped, off-screen, tab hidden or reduced motion */
      var shown = false, vTimer;
      function eligible(v) {
        var it = v.closest('.fs-item');
        return it.classList.contains('is-main') && shown && !document.hidden && !PF.reduced &&
          !it.querySelector('.fs-inner').classList.contains('flipped');
      }
      function syncVideo(delay) {
        clearTimeout(vTimer);
        var go = [];
        Array.prototype.forEach.call(fs.querySelectorAll('.fs-vid'), function (v) { if (eligible(v)) { go.push(v); } else { v.pause(); } });
        if (!go.length) { return; }
        vTimer = setTimeout(function () {
          go.forEach(function (v) {
            if (!eligible(v)) { return; }
            if (!v.getAttribute('src')) { v.src = v.getAttribute('data-src'); }
            var pr = v.play(); if (pr && pr.catch) { pr.catch(function () {}); }
          });
        }, delay || 0);
      }
      Array.prototype.forEach.call(fs.querySelectorAll('.fs-vid'), function (v) {
        v.muted = true;
        v.addEventListener('playing', function () { v.classList.add('on'); });
        v.addEventListener('error', function () { v.remove(); });   // missing file: the screenshot stays
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { shown = en[0].isIntersecting; syncVideo(0); }, { threshold: 0.3 }).observe(fs);
      } else { shown = true; syncVideo(0); }
      document.addEventListener('visibilitychange', function () { syncVideo(0); });
      window.addEventListener('pf:perf', function () { syncVideo(0); });   // device turned out to be weak: stop the video

      function setFlip(on) {       // flip (or unflip) the focused project; with on=false unflips everything
        Array.prototype.forEach.call(fs.querySelectorAll('.fs-item'), function (el) {
          var flip = on && el.classList.contains('is-main');
          el.querySelector('.fs-inner').classList.toggle('flipped', flip);
          var f = el.querySelector('.fs-front'), b = el.querySelector('.fs-back');
          if (flip) { f.setAttribute('inert', ''); b.removeAttribute('inert'); }
          else { b.setAttribute('inert', ''); f.removeAttribute('inert'); }
        });
        syncVideo(on ? 0 : 450);
      }

      function show(idx, instant) {
        var pos = order.indexOf(idx);
        if (pos < 1) { return; }   // not in the showcase, or already focused
        setFlip(false);
        var old = order[0]; order[0] = idx; order[pos] = old;   // the old focus takes the clicked tile's slot
        if (instant || PF.reduced) {
          fs.classList.add('no-anim'); layout(); void fs.offsetHeight; fs.classList.remove('no-anim');
          syncVideo(0);
        } else { layout(); syncVideo(850); }   // start the video after the item has settled into the big slot
      }

      if (fs) {
        fs.addEventListener('click', function (e) {
          if (e.target.closest('a')) { return; }          // the GitHub link just opens
          var btn = e.target.closest('[data-act]'), it = e.target.closest('.fs-item');
          if (btn) { setFlip(btn.getAttribute('data-act') === 'flip'); }
          else if (it && !it.classList.contains('is-main')) { show(+it.getAttribute('data-i')); }
          else if (it && e.target.closest('.fs-front')) { setFlip(true); }   // click the focused card: show details
          else if (it && e.target.closest('.fs-back')) {                      // click anywhere on the details side: back to the front
            if (!String(window.getSelection()).trim()) { setFlip(false); }     // unless the person was selecting text
          }
        });
        fs.addEventListener('keydown', function (e) {
          var it = e.target.closest && e.target.closest('.fs-item');
          if ((e.key === 'Enter' || e.key === ' ') && it && e.target === it && !it.classList.contains('is-main')) {
            e.preventDefault(); show(+it.getAttribute('data-i'));
          }
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setFlip(false); } });
      }

      /* ----- home preview: click a window to open the page with that project focused ----- */
      var frame = document.getElementById('pv'), track = document.getElementById('pvTrack');
      if (!frame || !track) { return; }
      frame.addEventListener('click', function (e) {
        var w = e.target.closest('.pv-win');
        pending = w ? +w.getAttribute('data-i') : null;
      });
      window.addEventListener('hashchange', function () {
        if (fs && pending !== null && location.hash === '#projects') { show(pending, true); }
        pending = null;
      });

      /* ----- home preview: vertical auto-scroll, one window at a time, pauses on hover ----- */
      var wins = track.querySelectorAll('.pv-win'), count = (PF.D.projects || []).length;
      var cur = 0, timer;
      function step() {
        var w = wins[0];
        return w ? w.offsetHeight + (parseFloat(getComputedStyle(track).rowGap) || 0) : 0;
      }
      function move() { track.style.transform = 'translateY(' + (-cur * step()) + 'px)'; }
      function next() {
        cur += 1; move();
        if (cur >= count) {              // reached the copy of the first window: jump back silently
          setTimeout(function () {
            track.style.transition = 'none'; cur = 0; move();
            void track.offsetHeight;
            track.style.transition = '';
          }, 900);
        }
      }
      function start() {
        clearInterval(timer);
        if (!PF.reduced && count > 1) { timer = setInterval(next, 3200); }
      }
      frame.parentNode.addEventListener('mouseenter', function () { clearInterval(timer); });
      frame.parentNode.addEventListener('mouseleave', start);
      window.addEventListener('resize', function () { track.style.transition = 'none'; move(); void track.offsetHeight; track.style.transition = ''; });
      window.addEventListener('pf:perf', function () { if (PF.reduced) { clearInterval(timer); } });   // weak device: stop the auto-scroll
      start();
    }
  });
})();