/* About: home stack card + About page (bio, facts, education) */
(function () {
  var PF = window.PF, esc = PF.esc, head = PF.head, empty = PF.empty;
  PF.section({
    id: 'about',
    card: { order: 1, html: function () {
      var P = PF.D.profile || {};
      return '<section class="card hc c-about" data-go="about" tabindex="0" role="link" aria-label="Open about">' + head('user', 'About') +
        '<p class="sub">Who I am and how I work.</p>' +
        '<div class="stack"><div></div><div></div><div class="front"><img src="' + esc(P.photo || 'photo.jpg') + '" alt="" onerror="this.remove()"><span>' + esc(PF.initials()) + '</span></div></div></section>';
    } },
    page: { id: 'about', order: 5, html: function () {
      var A = PF.D.about || {};
      var facts = [['Age', A.age], ['Birth Place', A.birthPlace], ['Birth Date', A.birthDate], ['Civil Status', A.civilStatus], ['Language', A.language]]
        .filter(function (f) { return f[1]; })
        .map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('');
      return '<div id="view-about" class="view"><div class="vhead"><h1>About</h1><p>Who I am and how I work.</p></div><div class="two">' +
        '<section class="card">' + head('user', 'About Me') + '<p class="body">' + esc(A.text) + '</p><dl class="facts">' + facts + '</dl></section>' +
        '<section class="card">' + head('book', 'Education') + '<ul class="edu">' + ((PF.D.education || []).map(function (e) {
          return '<li><b>' + esc(e.level) + '</b><span>' + esc(e.school) + (e.detail ? '<small>' + esc(e.detail) + '</small>' : '') + '</span><em>' + esc(e.years) + '</em></li>';
        }).join('') || '<li>' + empty('Nothing here yet.') + '</li>') + '</ul></section></div></div>';
    } }
  });
})();
