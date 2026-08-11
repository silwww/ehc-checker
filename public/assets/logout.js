(function () {
  // ONE implementation for every Log out button in the app.
  //
  // There were four copies. Three of them navigated to /login whether or not
  // the request succeeded, and the CSS that retires the in-page copies is
  // scoped to (min-width: 900px) — so on a depot tablet the broken copy was
  // the visible one, and audit.html has no sidebar at any width. Fixing one
  // copy and leaving three is how this bug survived a review round; a single
  // wiring function is the fix that stays fixed.
  //
  // Why it matters: the session is a signed cookie cleared by the logout
  // RESPONSE. If the request never lands the session stays valid, so showing
  // the login page is a lie — and on a shared machine the next person lands
  // inside the previous OV's session, the session whose typed name signs the
  // rule set delta.
  function wireLogout(btn) {
    if (!btn || btn.dataset.logoutWired) return;
    btn.dataset.logoutWired = '1';
    var original = btn.textContent;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = 'Logging out…';
      fetch('/logout', { method: 'POST' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          window.location.href = '/login';
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = 'Log out failed — you are still signed in. Retry.';
          btn.title = String((err && err.message) || err);
          setTimeout(function () {
            btn.textContent = original;
            btn.removeAttribute('title');
          }, 10000);
        });
    });
  }

  window.EHCWireLogout = wireLogout;

  function wireAll() {
    var nodes = document.querySelectorAll('#authLogoutBtn, [data-logout]');
    for (var i = 0; i < nodes.length; i++) wireLogout(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAll);
  } else {
    wireAll();
  }
})();
