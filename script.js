(function () {
  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busy = false;

  document.getElementById('year').textContent = new Date().getFullYear();

  // Seamless loop for the tools strip: duplicate the items
  var marquee = document.getElementById('marquee');
  if (marquee) { marquee.innerHTML += marquee.innerHTML; }

  // Build placeholder galleries (replaced by real images when the files exist)
  Array.prototype.forEach.call(document.querySelectorAll('[data-gallery]'), function (g) {
    var base = g.getAttribute('data-gallery');
    var count = parseInt(g.getAttribute('data-count'), 10) || 4;
    var label = g.getAttribute('data-label') || 'Item';
    for (var i = 1; i <= count; i++) {
      var fig = document.createElement('figure');
      fig.className = 'tile';
      fig.innerHTML = '<b>' + label + ' ' + i + '</b>' +
        '<img src="' + base + i + '.jpg" alt="' + label + ' ' + i + '" loading="lazy" ' +
        'onload="this.parentNode.classList.add(\'has-img\')" onerror="this.remove()">';
      g.appendChild(fig);
    }
  });

  /* ---------- Dark mode ---------- */
  if (root.classList.contains('theme-dark')) {
    cards.forEach(function (c) { c.classList.add('dark'); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove('no-anim'); });
    });
  }

  function save(dark) {
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  }

  function toggleTheme() {
    if (busy) return;
    var goDark = !root.classList.contains('theme-dark');
    save(goDark);

    // Page-level darkness starts spreading from the bottom-left corner
    root.classList.toggle('theme-dark', goDark);

    if (reduced) {
      cards.forEach(function (c) { c.classList.toggle('dark', goDark); });
      return;
    }

    busy = true;
    var vh = window.innerHeight;
    var info = cards.map(function (c) {
      var r = c.getBoundingClientRect();
      return {
        el: c,
        visible: r.width > 0 && r.bottom > 0 && r.top < vh,
        // small score = more bottom-left, large score = more top-right
        score: (r.left + r.width / 2) - (r.top + r.height / 2)
      };
    });

    // Cards that aren't on screen (other pages) switch right away
    info.filter(function (i) { return !i.visible; })
        .forEach(function (i) { i.el.classList.toggle('dark', goDark); });

    // Visible cards fill one by one, bottom-left to top-right
    var visible = info.filter(function (i) { return i.visible; })
                      .sort(function (a, b) { return a.score - b.score; });
    visible.forEach(function (i, n) {
      setTimeout(function () { i.el.classList.toggle('dark', goDark); }, 250 + n * 230);
    });

    setTimeout(function () { busy = false; }, 250 + visible.length * 230 + 1000);
  }

  btn.addEventListener('click', toggleTheme);

  /* ---------- Views (Home, Projects, ...) ---------- */
  var viewIds = ['home', 'projects', 'designs', 'certificates', 'skills', 'experience', 'about', 'contact'];
  var links = Array.prototype.slice.call(document.querySelectorAll('.side-nav a'));

  function show(id) {
    var active = null;
    viewIds.forEach(function (v) {
      var el = document.getElementById('view-' + v);
      var on = v === id;
      el.classList.toggle('active', on);
      if (on) active = el;
    });
    links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-view') === id); });

    active.scrollTop = 0;
    window.scrollTo(0, 0);

    // Replay the card entrance animation
    if (!reduced) {
      Array.prototype.forEach.call(active.querySelectorAll('.card'), function (c, i) {
        c.classList.remove('in');
        void c.offsetWidth;
        c.style.animationDelay = (i * 70) + 'ms';
        c.classList.add('in');
      });
    }
  }

  function route() {
    var id = (location.hash || '#home').slice(1);
    if (viewIds.indexOf(id) < 0) { id = 'home'; }
    show(id);
  }
  window.addEventListener('hashchange', route);
  route();

  // Home cards open their page
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (c) {
    function go() { location.hash = '#' + c.getAttribute('data-go'); }
    c.addEventListener('click', go);
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter') { go(); } });
  });

  /* ---------- Projects preview carousel ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('#preview .slide'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('#dots button'));
  var cur = 0, timer;

  function goTo(n) {
    cur = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) { s.classList.toggle('on', i === cur); });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === cur); });
  }
  function start() { clearInterval(timer); if (!reduced) { timer = setInterval(function () { goTo(cur + 1); }, 3500); } }

  dots.forEach(function (d, i) {
    d.addEventListener('click', function (e) { e.stopPropagation(); goTo(i); start(); });
  });
  start();
})();
