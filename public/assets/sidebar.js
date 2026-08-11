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
    { label: 'New check', href: '/', primary: true },
    { label: 'Reports', soon: true },
    { label: 'Certificate types', soon: true },
    { label: 'Rule proposals', href: '/proposals.html', badge: 'pending' },
    { label: 'Rule set', href: '/rule-set.html' },
    { label: 'Libraries', soon: true },
    { label: 'Logs', soon: true },
    { label: 'Admin', href: '/admin.html' }
  ];

  function isActive(href) {
    var path = location.pathname;
    if (href === '/') return path === '/' || /(^|\/)index\.html$/.test(path);
    return path.indexOf(href.replace(/^\//, '')) !== -1;
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

  document.getElementById('sidebar-logout').addEventListener('click', function () {
    fetch('/logout', { method: 'POST' }).then(function () {
      window.location.href = '/login';
    }).catch(function () {
      window.location.href = '/login';
    });
  });

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

  // Pending-count badge on Rule proposals. The badge is an ornament:
  // fetch failures (503 not-configured, network) skip it silently — the
  // proposals page itself reports those states loudly.
  fetch('/api/proposals')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (body) {
      if (!body || !Array.isArray(body.proposals)) return;
      var pending = body.proposals.filter(function (p) { return p.status === 'pending'; }).length;
      var badge = nav.querySelector('[data-badge="pending"]');
      if (badge && pending > 0) {
        badge.textContent = String(pending);
        badge.hidden = false;
      }
    })
    .catch(function () { /* ornament only */ });

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
