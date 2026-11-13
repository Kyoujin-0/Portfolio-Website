/* Hero: headline, tagline and the two buttons at the top of Home */
(function () {
  var PF = window.PF, esc = PF.esc, ic = PF.ic;
  PF.section({
    id: 'hero',
    top: { order: 0, html: function () {
      var P = PF.D.profile || {};
      return '<header class="hero"><div><h1>' + esc(P.headlineLead) + ' <span>' + esc(P.headlineAccent) + '</span></h1>' +
        '<p class="lead">' + esc(P.tagline) + '</p></div>' +
        '<div class="hero-cta"><a class="btn dark" href="#contact">Get in touch ' + ic('mail') + '</a>' +
        (P.resume ? '<a class="btn ghost" href="' + esc(P.resume) + '" download>Resume ' + ic('download') + '</a>' : '') + '</div></header>';
    } }
  });
})();
