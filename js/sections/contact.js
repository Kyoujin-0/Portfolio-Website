/* Contact page */
(function () {
  var PF = window.PF, esc = PF.esc, ic = PF.ic;
  PF.section({
    id: 'contact',
    page: { id: 'contact', order: 6, html: function () {
      var P = PF.D.profile || {}, SO = PF.D.social || {}, C = PF.D.contact || {};
      var rows = [];
      if (C.address) { rows.push('<li>' + ic('pin') + '<span>' + esc(C.address) + '</span></li>'); }
      if (C.phone) { rows.push('<li>' + ic('phone') + '<a href="tel:' + esc(String(C.phone).replace(/[^\d+]/g, '')) + '">' + esc(C.phone) + '</a></li>'); }
      if (C.email) { rows.push('<li>' + ic('mail') + '<a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a></li>'); }
      [['github', 'GitHub', SO.github], ['facebook', 'Facebook', SO.facebook], ['instagram', 'Instagram', SO.instagram]].forEach(function (s) {
        if (s[2]) { rows.push('<li>' + ic(s[0]) + '<a href="' + esc(s[2]) + '" target="_blank" rel="noopener">' + esc(s[2].replace(/^https?:\/\/(www\.)?/, '')) + '</a></li>'); }
      });
      return '<div id="view-contact" class="view"><div class="vhead"><h1>Contact</h1><p>Let\'s work together.</p></div>' +
        '<section class="card"><ul class="contact">' + rows.join('') + '</ul>' +
        (P.resume ? '<a class="btn dark dl" href="' + esc(P.resume) + '" download>Download Resume ' + ic('download') + '</a>' : '') + '</section></div>';
    } }
  });
})();
