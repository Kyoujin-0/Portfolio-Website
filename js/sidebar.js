/* Sidebar + page title: fills in your name, photo and social icons from data.js */
(function () {
  var PF = window.PF, esc = PF.esc;
  PF.onReady(function () {
    var P = PF.D.profile || {}, SO = PF.D.social || {}, C = PF.D.contact || {};
    function q(sel) { return document.querySelector(sel); }
    document.title = (P.name || 'Portfolio') + ' | Portfolio';
    if (q('.name')) { q('.name').textContent = P.name || ''; }
    if (q('.handle')) { q('.handle').textContent = P.handle || ''; }
    if (q('.avatar')) {
      q('.avatar').innerHTML = '<img src="' + esc(P.photo || 'photo.jpg') + '" alt="" onerror="this.remove()"><span>' + esc(PF.initials()) + '</span>';
    }
    if (q('.copy')) { q('.copy').innerHTML = '&copy; <span id="year">' + new Date().getFullYear() + '</span> ' + esc(P.name || ''); }
    [['GitHub', SO.github], ['Facebook', SO.facebook], ['Email', C.email ? 'mailto:' + C.email : '']].forEach(function (s) {
      var a = q('.socials a[aria-label="' + s[0] + '"]');
      if (!a) { return; }
      if (s[1]) { a.href = s[1]; } else { a.style.display = 'none'; }
    });
  });
})();
