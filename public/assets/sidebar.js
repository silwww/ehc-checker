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

  var nav = document.createElement('nav');
  nav.className = 'sidebar';
  nav.setAttribute('aria-label', 'Main');
  nav.innerHTML =
    '<div class="sidebar-brand-block">' +
      '<div class="app-brand">EHC Checker</div>' +
      '<div class="app-tagline">UK Export Health Certificate verification</div>' +
    '</div>' +
    '<div class="sidebar-nav">' + NAV.map(itemHTML).join('') + '</div>' +
    '<div class="sidebar-footer" id="sidebar-footer"></div>';
  document.body.insertBefore(nav, document.body.firstChild);

  // The rule-set pill moves into the sidebar footer where it exists
  // (index.html). Moving the node keeps its id, so the code that updates
  // its text after /api/... fetches keeps working untouched.
  var pill = document.getElementById('ruleSetPill');
  if (pill) document.getElementById('sidebar-footer').appendChild(pill);

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
