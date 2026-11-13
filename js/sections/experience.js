/* Work Experience: home rows + Experience page */
(function () {
  var PF = window.PF, esc = PF.esc, head = PF.head, empty = PF.empty, ic = PF.ic;
  PF.section({
    id: 'experience',
    card: { order: 5, html: function () {
      var rows = (PF.D.experience || []).slice(0, 2).map(function (x) {
        return '<div class="xrow"><span class="xi">' + ic('briefcase') + '</span><div><b>' + esc(x.role) + '</b><small>' +
          esc(x.company) + (x.dates ? ' &middot; ' + esc(x.dates) : '') + '</small>' + (x.tags ? '<u>' + esc(x.tags) + '</u>' : '') + '</div></div>';
      }).join('');
      return '<section class="card hc c-experience" data-go="experience" tabindex="0" role="link" aria-label="Open experience">' + head('briefcase', 'Work Experience') +
        '<p class="sub">Where I\'ve worked so far.</p><div class="xrows">' + (rows || empty('Nothing here yet.')) + '</div></section>';
    } },
    page: { id: 'experience', order: 4, html: function () {
      var exp = PF.D.experience || [];
      return '<div id="view-experience" class="view"><div class="vhead"><h1>Work Experience</h1><p>Where I\'ve worked so far.</p></div>' +
        '<section class="card"><ul class="jobs">' + (exp.map(function (x) {
          return '<li><div class="row"><h3>' + esc(x.role) + ' <span>| ' + esc(x.company) + '</span></h3><em>' + esc(x.dates) + '</em></div>' +
            '<ul class="bullets">' + (x.bullets || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></li>';
        }).join('') || '<li>' + empty('Nothing here yet.') + '</li>') + '</ul></section></div>';
    } }
  });
})();
