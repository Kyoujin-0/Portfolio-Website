/* Dark mode: darkness spreads from the bottom-left, cards fill one by one toward the top-right */
(function () {
  var PF = window.PF, root = PF.root, busy = false;
  // Optional dark-mode logos: <img data-light=".." data-dark=".."> swaps with the theme.
  // Inside a card it follows that card's fill (so it changes as the darkness reaches it).
  function swapIcons() {
    var pageDark = root.classList.contains('theme-dark');
    Array.prototype.forEach.call(document.querySelectorAll('img[data-dark]'), function (img) {
      var card = img.closest('.card');
      var dark = card ? card.classList.contains('dark') : pageDark;
      var want = img.getAttribute(dark ? 'data-dark' : 'data-light');
      if (want && img.getAttribute('src') !== want) { img.setAttribute('src', want); }
    });
  }
  new MutationObserver(swapIcons).observe(root, { attributes: true, attributeFilter: ['class'], subtree: true });

  PF.onReady(function () {
    swapIcons();
    var btn = document.getElementById('themeToggle');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));

    // Restore instantly (no animation) if dark was saved
    if (root.classList.contains('theme-dark')) {
      cards.forEach(function (c) { c.classList.add('dark'); });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { root.classList.remove('no-anim'); });
      });
    }

    function save(dark) {
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    }

    function toggle() {
      if (busy) return;
      var goDark = !root.classList.contains('theme-dark');
      save(goDark);
      root.classList.toggle('theme-dark', goDark);

      if (PF.reduced) {
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

    btn.addEventListener('click', toggle);
  });
})();