/* Tools strip: the scrolling "Tools I work with" bar on Home */
(function () {
  var PF = window.PF, esc = PF.esc;
  PF.section({
    id: 'tools',
    top: { order: 1, html: function () {
      var items = (PF.D.tools || []).map(function (t) {
        var src = t.icon || ('icons/' + PF.slug(t.name) + '.svg');
        return '<li><span class="ico" style="--c:' + esc(t.color || '#888') + ';--t:' + esc(t.textColor || '#fff') + '"><b>' +
          esc(t.abbr || (t.name || '').slice(0, 2)) + '</b><img src="' + esc(src) + '" alt=""' + (t.iconDark ? ' data-light="' + esc(src) + '" data-dark="' + esc(t.iconDark) + '"' : '') + PF.IMGLOAD + '></span>' + esc(t.name) + '</li>';
      }).join('');
      return '<section class="card tools" aria-label="Tools"><div class="tools-label"><small>Daily drivers</small><b>Tools I work with</b></div>' +
        '<div class="marquee"><ul id="marquee">' + items + '</ul></div></section>';
    } },
    init: function () {
      // Seamless loop: duplicate the items
      var m = document.getElementById('marquee');
      if (m) { m.innerHTML += m.innerHTML; }
    }
  });
})();