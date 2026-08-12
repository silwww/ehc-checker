// Sidebar navigation shell. Include with <script src="/assets/sidebar.js" defer>
// on pages that belong to the workbench (index.html, admin.html). Pages
// without the script (audit.html document view, login) are untouched.
//
// The menu is the product map: live sections link, coming sections are
// greyed with a "Soon" tag — an honest roadmap, deliberately visible.
// Entries flip from soon:true to a real href as their sections ship
// (Rule proposals is next, per the admin-rule-pipeline spec).
(function () {
  'use strict';

  var NAV = [
    // ?new is not decoration: index.html restores the last report on load,
    // so a plain '/' returns the OV to the report they just left instead of
    // an empty upload form.
    { label: 'New check', href: '/?new=1', primary: true },
    { label: 'Reports', soon: true },
    { label: 'Certificate types', soon: true },
    { label: 'Rule proposals', href: '/proposals.html', badge: 'pending' },
    { label: 'Rule set', href: '/rule-set.html' },
    { label: 'Libraries', soon: true },
    { label: 'Logs', soon: true },
    { label: 'Admin', href: '/admin.html' }
  ];

  function isActive(href) {
    // Compare paths only — a nav entry may carry a query string (see ?new).
    var target = href.split('?')[0];
    var path = location.pathname;
    if (target === '/') return path === '/' || /(^|\/)index\.html$/.test(path);
    return path.indexOf(target.replace(/^\//, '')) !== -1;
  }

  function itemHTML(item) {
    if (item.soon) {
      return '<span class="sidebar-item is-soon" aria-disabled="true">' +
        item.label + '<span class="tag-soon">Soon</span></span>';
    }
    var current = isActive(item.href) ? ' aria-current="page"' : '';
    var badge = item.badge ? '<span class="sidebar-badge" data-badge="' + item.badge + '" hidden></span>' : '';
    var cls = 'sidebar-item' + (item.primary ? ' sidebar-item-primary' : '');
    return '<a class="' + cls + '" href="' + item.href + '"' + current + '>' +
      item.label + badge + '</a>';
  }

  document.body.classList.add('has-sidebar');

  var primary = NAV.filter(function (i) { return i.primary; });
  var rest = NAV.filter(function (i) { return !i.primary; });

  var nav = document.createElement('nav');
  nav.className = 'sidebar';
  nav.setAttribute('aria-label', 'Main');
  nav.innerHTML =
    '<div class="sidebar-brand-block">' +
      '<div class="app-brand">EHC Checker</div>' +
      '<div class="app-tagline">UK Export Health Certificate verification</div>' +
    '</div>' +
    '<div class="sidebar-primary-slot">' + primary.map(itemHTML).join('') + '</div>' +
    '<div class="sidebar-nav">' + rest.map(itemHTML).join('') + '</div>' +
    '<div class="sidebar-footer" id="sidebar-footer">' +
      '<button type="button" class="btn btn-secondary btn-sm sidebar-logout" id="sidebar-logout">Log out</button>' +
    '</div>';
  document.body.insertBefore(nav, document.body.firstChild);

  // One shared implementation for every Log out button (assets/logout.js) —
  // this button used to have its own copy, which is how three other copies
  // stayed broken after this one was fixed.
  window.EHCWireLogout(document.getElementById('sidebar-logout'));

  // Rule set version as a quiet tag on the Rule set menu item — the
  // natural place to look for it. /api/version is the public metadata
  // endpoint the header pill already used.
  fetch('/api/version')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (v) {
      if (!v || !v.version) return;
      var item = null;
      nav.querySelectorAll('a.sidebar-item').forEach(function (a) {
        if (a.getAttribute('href') === '/rule-set.html') item = a;
      });
      if (item) {
        var tag = document.createElement('span');
        tag.className = 'sidebar-version';
        tag.textContent = 'v' + v.version;
        item.appendChild(tag);
      }
    })
    .catch(function () { /* quiet — the Rule set page states the version loudly */ });

  // Pending-count badge on Rule proposals. NOT an ornament: it is the only
  // proposal-queue signal in the app's chrome, and it appears on the page the
  // OV lives on. A badge that shows only when pending > 0 teaches everyone
  // that no badge means zero — so hiding it on failure asserts "zero" without
  // having checked. Failure gets its own visible state instead, because the
  // state that most needs surfacing (unreachable store) is exactly the one
  // where the proposals page could once also read "Nothing waiting".
  function showBadge(text, title, isWarning) {
    var badge = nav.querySelector('[data-badge="pending"]');
    if (!badge) return;
    badge.textContent = text;
    badge.title = title;
    badge.classList.toggle('sidebar-badge-warning', Boolean(isWarning));
    badge.hidden = false;
  }
  fetch('/api/proposals')
    .then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (b) {
        throw new Error((b && b.error) || ('HTTP ' + r.status));
      });
      return r.json();
    })
    .then(function (body) {
      if (!body || !Array.isArray(body.proposals)) throw new Error('unexpected response shape');
      var pending = body.proposals.filter(function (p) { return p.status === 'pending'; }).length;
      if (pending > 0) showBadge(String(pending), pending + ' proposal(s) awaiting review', false);
    })
    .catch(function (err) {
      showBadge('!', 'The pending count could not be read: ' + err.message, true);
    });

  // NAVIGATION GUARD DURING A CHECK
  //
  // A check is 45-130s of waiting and one paid model call, and the report
  // lives only in this page's memory — there is no history to go back to.
  // One stray click on the menu used to destroy both silently. index.html
  // raises window.EHCCheckInProgress for the whole call, which is longer
  // than the loader is on screen (the skeleton replaces it at 45s).
  //
  // Deliberately not confirm(): the app moved off native prompts, and a
  // blocking dialog during a live SSE stream is exactly the wrong place for
  // one. This is an in-sidebar choice instead.
  function checkRunning() { return Boolean(window.EHCCheckInProgress); }

  function showLeaveGuard(href) {
    if (nav.querySelector('.sidebar-guard')) return;

    var box = document.createElement('div');
    box.className = 'sidebar-guard';
    box.setAttribute('role', 'alertdialog');

    var text = document.createElement('p');
    text.className = 'sidebar-guard-text';
    text.textContent = 'A check is running. Leaving now loses the report — the check still costs.';

    var leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'btn btn-secondary btn-sm';
    leave.textContent = 'Leave anyway';
    leave.addEventListener('click', function () {
      // Lower the flag BEFORE navigating, or beforeunload below fires and the
      // OV gets the browser's native "Leave site?" dialog immediately after
      // answering this one — two prompts for one decision, in an app that
      // deliberately moved off native prompts.
      window.EHCCheckInProgress = false;
      location.href = href;
    });

    var stay = document.createElement('button');
    stay.type = 'button';
    stay.className = 'btn btn-primary btn-sm';
    stay.textContent = 'Stay';
    stay.addEventListener('click', function () { box.parentNode.removeChild(box); });

    var row = document.createElement('div');
    row.className = 'sidebar-guard-actions';
    row.appendChild(stay);
    row.appendChild(leave);

    box.appendChild(text);
    box.appendChild(row);
    nav.insertBefore(box, nav.querySelector('.sidebar-primary-slot'));
    stay.focus();
  }

  nav.addEventListener('click', function (ev) {
    if (!checkRunning()) return;
    var link = ev.target && ev.target.closest ? ev.target.closest('a.sidebar-item') : null;
    if (!link) return;
    ev.preventDefault();
    showLeaveGuard(link.href);
  });

  // The click guard cannot see a reload, a closed tab or the back button.
  // beforeunload covers those, and is the only mechanism browsers offer.
  window.addEventListener('beforeunload', function (ev) {
    if (!checkRunning()) return;
    ev.preventDefault();
    ev.returnValue = '';
  });

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'sidebar-toggle';
  toggle.setAttribute('aria-label', 'Toggle menu');
  toggle.textContent = '☰';
  toggle.addEventListener('click', function () {
    document.body.classList.toggle('sidebar-open');
  });
  document.body.insertBefore(toggle, nav);
})();
