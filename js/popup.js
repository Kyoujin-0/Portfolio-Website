/* Popup overview: clicking a home card opens a short overview instead of redirecting.
   Content is built from PF.D (data.js). To change what a popup shows, edit its function in OV below. */
(function () {
  var PF = window.PF;
  var root = null, body, titleEl, badgeEl, goBtn, closeBtn, lastFocus = null;

  function nm(x) { return typeof x === 'string' ? x : (x && (x.name || x.title || x.label)) || ''; }
  function top(a, n) { return (a || []).slice(0, n); }
  function pair(k, v) { return v ? '<li><b>' + PF.esc(k) + '</b> ' + PF.esc(v) + '</li>' : ''; }

  var OV = {
    projects: function () {
      var P = PF.D.projects || [];
      if (!P.length) { return PF.empty('Projects coming soon.'); }
      return '<p class="ov-lead">' + P.length + (P.length === 1 ? ' project' : ' projects') + '. A few highlights:</p><ul class="ov-list">' +
        top(P, 3).map(function (p) {
          return '<li class="ov-proj"><span class="ov-thumb" style="--c:' + PF.esc(p.cover || '') + '">' +
            (p.image ? '<img src="' + PF.esc(p.image) + '" alt=""' + PF.IMGLOAD + '>' : '') + '</span>' +
            '<div class="ov-pbody"><b>' + PF.esc(p.title) + '</b>' +
            (p.subtitle ? '<small>' + PF.esc(p.subtitle) + '</small>' : '') +
            (p.desc ? '<p>' + PF.esc(p.desc) + '</p>' : '') +
            PF.chips(top(p.tags, 4), 'small') +
            (p.link ? '<a class="ov-link" href="' + PF.esc(p.link) + '" target="_blank" rel="noopener">View ↗</a>' : '') +
            '</div></li>';
        }).join('') + '</ul>';
    },
    about: function () {
      var A = PF.D.about || {};
      return (A.text ? '<p class="ov-clamp">' + PF.esc(A.text) + '</p>' : PF.empty('About coming soon.')) +
        '<ul class="ov-facts">' + pair('Age', A.age) + pair('From', A.birthPlace) + pair('Language', A.language) + '</ul>';
    },
    designs: function () {
      var all = (PF.D.designs2d || []).concat(PF.D.designs3d || []);
      var imgs = all.filter(function (d) { return d.image; });
      if (!all.length) { return PF.empty('Designs coming soon.'); }
      return '<p class="ov-lead">' + (PF.D.designs2d || []).length + ' 2D and ' + (PF.D.designs3d || []).length + ' 3D pieces.</p>' +
        (imgs.length ? '<div class="ov-grid">' + top(imgs, 4).map(function (d) {
          return '<figure class="ov-shot"><img src="' + PF.esc(d.image) + '" alt="' + PF.esc(d.title) + '" loading="lazy"' + PF.IMGLOAD + '></figure>';
        }).join('') + '</div>' : '');
    },
    certificates: function () {
      var C = PF.D.certificates || [];
      if (!C.length) { return PF.empty('Certificates coming soon.'); }
      return '<ul class="ov-list">' + top(C, 4).map(function (c) {
        return '<li class="ov-row"><b>' + PF.esc(c.title) + '</b>' + (c.issuer ? '<small>' + PF.esc(c.issuer) + '</small>' : '') + '</li>';
      }).join('') + '</ul>';
    },
    skills: function () {
      var S = PF.D.skills || {};
      var t = top(S.technical, 8).map(nm).filter(Boolean), p = top(S.personal, 6).map(nm).filter(Boolean);
      if (!t.length && !p.length) { return PF.empty('Skills coming soon.'); }
      return (t.length ? '<h3 class="ov-sub">Technical</h3>' + PF.chips(t) : '') +
        (p.length ? '<h3 class="ov-sub">Personal</h3>' + PF.chips(p) : '');
    },
    experience: function () {
      var E = PF.D.experience || [];
      if (!E.length) { return PF.empty('Experience coming soon.'); }
      return '<ul class="ov-list">' + top(E, 2).map(function (x) {
        return '<li class="ov-row"><b>' + PF.esc(x.role) + '</b><small>' + PF.esc([x.company, x.dates].filter(Boolean).join(' · ')) + '</small>' +
          (x.bullets && x.bullets.length ? '<ul class="ov-bul">' + top(x.bullets, 2).map(function (b) { return '<li>' + PF.esc(b) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
      }).join('') + '</ul>';
    }
  };

  function build() {
    if (root) { return; }
    root = document.createElement('div');
    root.className = 'ov';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<div class="ov-back"></div>' +
      '<div class="ov-panel" role="dialog" aria-modal="true" aria-labelledby="ov-title">' +
      '<div class="ov-head"><span class="badge"></span><h2 id="ov-title"></h2>' +
      '<button type="button" class="ov-x" aria-label="Close">×</button></div>' +
      '<div class="ov-body"></div>' +
      '<div class="ov-foot"><button type="button" class="btn dark ov-go">Open full page <span aria-hidden="true">→</span></button></div></div>';
    document.body.appendChild(root);
    body = root.querySelector('.ov-body');
    titleEl = root.querySelector('#ov-title');
    badgeEl = root.querySelector('.badge');
    goBtn = root.querySelector('.ov-go');
    closeBtn = root.querySelector('.ov-x');

    root.querySelector('.ov-back').addEventListener('click', PF.closeOverview);
    closeBtn.addEventListener('click', PF.closeOverview);
    goBtn.addEventListener('click', function () {
      var id = goBtn.getAttribute('data-id');
      PF.closeOverview(true);
      location.hash = '#' + id;
    });
    document.addEventListener('keydown', function (e) {
      if (!root.classList.contains('open')) { return; }
      if (e.key === 'Escape') { PF.closeOverview(); }
      else if (e.key === 'Tab') {                       // keep focus inside the popup
        var a = [closeBtn, goBtn], i = a.indexOf(document.activeElement);
        if (i < 0) { e.preventDefault(); closeBtn.focus(); }
        else if (e.shiftKey && i === 0) { e.preventDefault(); goBtn.focus(); }
        else if (!e.shiftKey && i === 1) { e.preventDefault(); closeBtn.focus(); }
      }
    });
  }

  PF.openOverview = function (id, card) {
    if (!OV[id]) { location.hash = '#' + id; return; }   // no overview for this id: fall back to the page
    build();
    var h = card && card.querySelector('.card-head h2'), b = card && card.querySelector('.card-head .badge');
    titleEl.textContent = h ? h.textContent : id;
    badgeEl.innerHTML = b ? b.innerHTML : '';
    body.innerHTML = OV[id]();
    body.scrollTop = 0;
    goBtn.setAttribute('data-id', id);
    lastFocus = document.activeElement;
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    closeBtn.focus();
  };

  PF.closeOverview = function (keepFocus) {
    if (!root || !root.classList.contains('open')) { return; }
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    if (keepFocus !== true && lastFocus && lastFocus.focus) { lastFocus.focus(); }
  };
})();