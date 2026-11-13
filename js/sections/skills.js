/* Skills: home numbered list + Skills page (tech stack by category + skill cards) */
(function () {
  var PF = window.PF, esc = PF.esc, head = PF.head, ic = PF.ic;
  var ICONS = ['monitor', 'code', 'pen', 'tool', 'cpu'];

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function num(i) { return (i < 9 ? '0' : '') + (i + 1); }

  /* Tech stack = the Tools strip entries grouped by their "category".
     Frontend / Backend / DevOps come first, any other category you type follows. */
  function stackItem(t) {
    var abbr = t.abbr || String(t.name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2);
    var style = t.color ? ' style="background:' + t.color + ';color:' + (t.textColor || '#fff') + '"' : '';
    var img = t.icon ? '<img src="' + esc(t.icon) + '" alt=""' + (t.iconDark ? ' data-light="' + esc(t.icon) + '" data-dark="' + esc(t.iconDark) + '"' : '') + ' onload="this.parentNode.classList.add(\'has\')" onerror="this.remove()">' : '';
    return '<li><span class="ts-ic"' + style + '><b>' + esc(abbr) + '</b>' + img + '</span><span>' + esc(t.name) + '</span></li>';
  }

  function stackHtml() {
    var groups = {}, order = ['Frontend', 'Backend', 'DevOps'];
    (PF.D.tools || []).forEach(function (t) {
      var c = (t.category || '').trim();
      if (!c) { return; }
      var key = order.filter(function (o) { return o.toLowerCase() === c.toLowerCase(); })[0] || c;
      if (!groups[key]) { groups[key] = []; if (order.indexOf(key) < 0) { order.push(key); } }
      groups[key].push(t);
    });
    var rows = order.filter(function (c) { return groups[c]; }).map(function (c, i) {
      return '<div class="ts-row"><div class="ts-label"><em>' + num(i) + '</em><h3>' + esc(c) + '</h3></div>' +
        '<ul class="ts-items">' + groups[c].map(stackItem).join('') + '</ul></div>';
    }).join('');
    if (!rows) { return ''; }
    return '<section class="ts"><div class="ts-head"><h2>Tech stack</h2><p>The tools I build with.</p></div>' + rows + '</section>';
  }

  PF.section({
    id: 'skills',
    card: { order: 4, html: function () {
      var SK = PF.D.skills || {};
      var items = (SK.technical || []).concat(SK.personal || []).slice(0, 5);
      var list = items.map(function (s, i) {
        return '<li><span class="ni">' + ic(ICONS[i % ICONS.length]) + '</span>' + esc(s) + '<em>0' + (i + 1) + '</em></li>';
      }).join('');
      return '<section class="card hc c-skills" data-go="skills" tabindex="0" role="link" aria-label="Open skills">' + head('cpu', 'Skills') +
        '<p class="sub">What I can build and fix.</p><ul class="numlist">' + list + '</ul></section>';
    } },
    page: { id: 'skills', order: 3, html: function () {
      var SK = PF.D.skills || {};
      var tech = (SK.technical || []).map(function (s, i) {
        return '<li><span class="ni">' + ic(ICONS[i % ICONS.length]) + '</span><span class="nm">' + esc(s) + '</span><em>' + num(i) + '</em></li>';
      }).join('');
      var pers = (SK.personal || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
      return '<div id="view-skills" class="view"><div class="vhead"><h1>Skills</h1><p>What I can build and fix.</p></div>' +
        stackHtml() +
        '<div class="two">' +
        '<section class="card">' + head('code', 'Technical') + '<p class="sub">What I can build and fix.</p><ul class="sk-rows">' + tech + '</ul></section>' +
        '<section class="card">' + head('user', 'Personal') + '<p class="sub">How I work with people.</p><ul class="sk-dots">' + pers + '</ul></section>' +
        '</div></div>';
    } }
  });
})();