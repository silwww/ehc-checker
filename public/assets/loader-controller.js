(function () {
  var REASSURE_ROTATE_MS = 8000;
  // Declared honestly rather than left to the OV to guess. A check runs
  // roughly 45s-2min depending on page count and photos; an elapsed counter
  // on its own gives no way to tell "slow" from "stuck".
  var EXPECTED_WAIT = 'most checks take 1–2 minutes';
  var FILES_SHOWN = 3;

  var state = {
    container: null,
    startTimestamp: null,
    reassureIndex: 0,
    reassureTimer: null,
    elapsedTimer: null,
    phaseEl: null,
    onCancel: null,
    cancelled: false
  };

  var svgMarkupCache = null;
  var svgMarkupPromise = null;

  function loadSvgMarkup() {
    if (svgMarkupCache !== null) return Promise.resolve(svgMarkupCache);
    if (svgMarkupPromise !== null) return svgMarkupPromise;
    svgMarkupPromise = fetch('/assets/shaggy-loader.svg', { cache: 'force-cache' })
      .then(function (r) {
        // Without this a 404 page's HTML body is injected straight into the
        // loader card as if it were the mascot.
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        svgMarkupCache = text;
        return text;
      })
      .catch(function (err) {
        // Do not keep the rejected promise: it would be handed to every
        // later check for the page's whole lifetime, with no retry.
        svgMarkupPromise = null;
        throw err;
      });
    return svgMarkupPromise;
  }

  function formatElapsed(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + 'm ' + seconds + 's';
  }

  function timerText(ms) {
    return formatElapsed(ms) + ' · ' + EXPECTED_WAIT;
  }

  // Naming the files answers the question the OV actually has during a long
  // wait ("did it take the photos too?"), and it is the only place the
  // upload's real contents are ever shown back.
  function filesText(files) {
    var list = (files || []).filter(Boolean);
    if (list.length === 0) return '';
    var count = list.length + (list.length === 1 ? ' file' : ' files');
    var shown = list.slice(0, FILES_SHOWN).join(', ');
    var hidden = list.length - FILES_SHOWN;
    return count + ' · ' + shown + (hidden > 0 ? ' +' + hidden + ' more' : '');
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function start(targetEl, opts) {
    stop();
    var options = opts || {};
    state.container = targetEl;
    state.startTimestamp = Date.now();
    state.reassureIndex = 0;
    state.onCancel = typeof options.onCancel === 'function' ? options.onCancel : null;
    state.cancelled = false;

    var content = window.EHCLoaderContent || { reassurances: [] };
    var reassurances = content.reassurances || [];

    targetEl.innerHTML = '';
    targetEl.className = 'shaggy-loader card-flat';

    var figure = el('div', 'shaggy-loader-figure');
    figure.setAttribute('aria-hidden', 'true');

    // PHASE and REASSURANCE are deliberately separate elements. They were one
    // element once, and writing the phase silently destroyed the rotation —
    // six of seven messages became unreachable and the card froze for the
    // rest of the check. Two concerns, two elements, no shared state.
    var phase = el('p', 'shaggy-loader-phase', 'Preparing…');
    phase.setAttribute('aria-live', 'polite');

    var files = el('p', 'shaggy-loader-files', filesText(options.files));
    var timer = el('p', 'shaggy-loader-timer', timerText(0));
    var reassure = el('p', 'shaggy-loader-reassure', reassurances[0] || '');

    targetEl.appendChild(figure);
    targetEl.appendChild(phase);
    if (files.textContent) targetEl.appendChild(files);
    targetEl.appendChild(timer);
    targetEl.appendChild(reassure);

    state.phaseEl = phase;

    // Only offered when the caller can actually abort the request. A Cancel
    // button that does nothing is worse than no button: the OV clicks it,
    // nothing happens, and the wait now looks broken as well as long.
    if (state.onCancel) {
      var cancel = el('button', 'btn btn-secondary btn-sm shaggy-loader-cancel', 'Cancel');
      cancel.setAttribute('type', 'button');
      cancel.addEventListener('click', function () {
        if (state.cancelled) return;
        state.cancelled = true;
        cancel.textContent = 'Cancelling…';
        cancel.setAttribute('disabled', 'disabled');
        setPhase('Cancelling…');
        state.onCancel();
      });
      targetEl.appendChild(cancel);
      }

    // Inline the SVG so host-stylesheet animations target its inner groups
    loadSvgMarkup().then(function (markup) {
      if (state.container === targetEl) {
        figure.innerHTML = markup;
      }
    }).catch(function () { /* swallow — figure simply stays empty */ });

    if (reassurances.length > 1) {
      state.reassureTimer = setInterval(function () {
        state.reassureIndex = (state.reassureIndex + 1) % reassurances.length;
        reassure.style.opacity = '0';
        setTimeout(function () {
          reassure.textContent = reassurances[state.reassureIndex];
          reassure.style.opacity = '1';
        }, 250);
      }, REASSURE_ROTATE_MS);
    }

    state.elapsedTimer = setInterval(function () {
      timer.textContent = timerText(Date.now() - state.startTimestamp);
    }, 1000);
  }

  function stop() {
    if (state.reassureTimer) { clearInterval(state.reassureTimer); state.reassureTimer = null; }
    if (state.elapsedTimer) { clearInterval(state.elapsedTimer); state.elapsedTimer = null; }
    if (state.container) {
      state.container.innerHTML = '';
      state.container.className = 'card-flat';
    }
    state.container = null;
    state.startTimestamp = null;
    state.phaseEl = null;
    state.onCancel = null;
    state.cancelled = false;
  }

  // Report real progress (uploading / analysing / retrying). Writes only to
  // the phase line — it must never touch the rotation, which is what makes
  // the card look alive during the minutes when there is no new phase.
  // No-op if the loader is not running.
  function setPhase(text) {
    if (!state.container || !state.phaseEl) return;
    state.phaseEl.textContent = text == null ? '' : String(text);
  }

  window.EHCShaggyLoader = {
    start: start,
    stop: stop,
    setPhase: setPhase
  };
})();
