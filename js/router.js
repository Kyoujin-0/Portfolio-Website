/* Router: sidebar links switch between pages (#projects, #about, ...). Home cards open a popup overview (js/popup.js) */
(function () {
  var PF = window.PF;
  PF.onReady(function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.side-nav a'));

    function show(id) {
      var active = null;
      PF.pageIds.forEach(function (v) {
        var el = document.getElementById('view-' + v);
        var on = v === id;
        el.classList.toggle('active', on);
        if (on) { active = el; }
      });
      links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-view') === id); });

      active.scrollTop = 0;
      window.scrollTo(0, 0);

      // Replay the card entrance animation
      if (!PF.reduced) {
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
      if (PF.pageIds.indexOf(id) < 0) { id = 'home'; }
      if (PF.closeOverview) { PF.closeOverview(true); }
      show(id);
    }
    window.addEventListener('hashchange', route);
    route();

    // Home cards open a popup overview. The click is caught in the capture phase so anything inside the card
    // (like the Projects scroller windows, which used to jump to the page) opens the popup instead.
    Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (c) {
      function open() { PF.openOverview(c.getAttribute('data-go'), c); }
      c.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); }, true);
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  });
})();