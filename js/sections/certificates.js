/* Certificates: home card + Certificates page */
(function () {
  var PF = window.PF, esc = PF.esc, head = PF.head, empty = PF.empty, ic = PF.ic;
  PF.section({
    id: 'certificates',
    card: { order: 3, html: function () {
      var certs = PF.D.certificates || [];
      var label = certs.length ? certs.length + (certs.length === 1 ? ' certificate' : ' certificates') : 'View certificates';
      return '<section class="card hc c-certs" data-go="certificates" tabindex="0" role="link" aria-label="Open certificates">' + head('award', 'Certificates') +
        '<p class="sub">Courses and training I\'ve completed.</p>' +
        '<div class="ring-wrap"><div class="ring">' + ic('award') + '</div><span class="pill">' + esc(label) + '</span></div></section>';
    } },
    page: { id: 'certificates', order: 2, html: function () {
      var certs = PF.D.certificates || [];
      return '<div id="view-certificates" class="view"><div class="vhead"><h1>Certificates</h1><p>Courses and training I\'ve completed.</p></div>' +
        '<section class="card">' + head('award', 'Certificates') + '<div class="gallery">' +
          (certs.map(function (c) { return PF.tile(c, 'Certificate'); }).join('') || empty('Coming soon.')) + '</div></section></div>';
    } }
  });
})();
