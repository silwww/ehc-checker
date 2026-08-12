(function () {
  // ONE footer for the workbench pages.
  //
  // There were three hand-written copies and two pages with none at all
  // (proposals, rule set), plus a third copy of the same auth-status fetch
  // in each. The attribution and the logout route are not decoration — the
  // logout is the only way off a shared depot machine — so "some pages have
  // it" is not a cosmetic gap.
  //
  // Load AFTER logout.js: the button is wired here rather than left to
  // logout.js's DOMContentLoaded sweep, which can run before this injects.
  //
  // The AI disclaimer is opt-in via <body data-ai-disclaimer> because it
  // speaks about a report ("does not replace Official Veterinarian review
  // of the certificate"). On the proposals or rule-set page there is no
  // report, and a disclaimer that describes something absent teaches people
  // to stop reading disclaimers.
  'use strict';

  var DISCLAIMER =
    '<strong>AI-assisted verification.</strong> AI can make errors and miss ' +
    'findings. This report does not replace Official Veterinarian review of ' +
    'the certificate. The OV remains fully responsible for certification.';

  var ATTRIBUTION =
    'A collaborative tool for UK Export OVs · Built by Silvia Soescu MRCVS · ' +
    'Rule set by RR Cunningham MRCVS';

  function build() {
    var footer = document.createElement('footer');
    footer.className = 'app-footer';

    var inner = document.createElement('div');
    inner.className = 'container';

    if (document.body.hasAttribute('data-ai-disclaimer')) {
      var note = document.createElement('p');
      note.className = 'app-footer-disclaimer';
      note.innerHTML = DISCLAIMER;
      inner.appendChild(note);
    }

    inner.innerHTML +=
      '<div class="app-footer-meta">' +
        '<div class="app-footer-row-top">' +
          '<span class="app-footer-line">EHC Checker · v0.1</span>' +
          '<div class="auth-status" id="authStatus" hidden>' +
            '<button type="button" class="auth-logout-btn" id="authLogoutBtn">Log out</button>' +
          '</div>' +
        '</div>' +
        '<div class="app-footer-row-bottom">' +
          '<span class="app-footer-line">' + ATTRIBUTION + '</span>' +
        '</div>' +
      '</div>';

    footer.appendChild(inner);
    document.body.appendChild(footer);
    return footer;
  }

  var footer = build();

  // Deliberately unguarded, like sidebar.js. A `typeof` check here would
  // mean that when logout.js fails to load — a partial deploy, a blocked or
  // poisoned cached asset — this still injects a fully styled, fully visible
  // Log out button with no handler behind it. The OV clicks it, nothing
  // happens, and they walk away from a shared depot tablet believing they
  // signed out while the session cookie is still valid. That is the exact
  // failure the single-implementation logout exists to prevent, so this
  // throws instead.
  window.EHCWireLogout(footer.querySelector('#authLogoutBtn'));

  // Only shown when there is a session to end. A Log out button on a page
  // reached without auth would be a dead control.
  fetch('/api/auth/status')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.authEnabled && data.authenticated) {
        footer.querySelector('#authStatus').hidden = false;
      }
    })
    .catch(function () { /* endpoint unavailable (auth removed) — stay hidden */ });
})();
