(function () {
  var REASSURE_ROTATE_MS = 8000;

  var state = {
    container: null,
    startTimestamp: null,
    reassureIndex: 0,
    reassureTimer: null,
    elapsedTimer: null
  };

  var svgMarkupCache = null;
  var svgMarkupPromise = null;

  function loadSvgMarkup() {
    if (svgMarkupCache !== null) return Promise.resolve(svgMarkupCache);
    if (svgMarkupPromise !== null) return svgMarkupPromise;
    svgMarkupPromise = fetch('/assets/shaggy-loader.svg', { cache: 'force-cache' })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        svgMarkupCache = text;
        return text;
      });
    return svgMarkupPromise;
  }

  function formatElapsed(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return 'Checking… ' + minutes + 'm ' + seconds + 's';
  }

  function start(targetEl) {
    stop();
    state.container = targetEl;
    state.startTimestamp = Date.now();
    state.reassureIndex = 0;

    var content = window.EHCLoaderContent || { reassurances: [] };
    var reassurances = content.reassurances || [];

    targetEl.innerHTML = '';
    targetEl.className = 'shaggy-loader card-flat';

    var figure = document.createElement('div');
    figure.className = 'shaggy-loader-figure';
    figure.setAttribute('aria-hidden', 'true');

    var status = document.createElement('p');
    status.className = 'shaggy-loader-status';
    status.textContent = 'Checking certificate…';

    var reassure = document.createElement('p');
    reassure.className = 'shaggy-loader-reassure';
    reassure.textContent = reassurances[0] || '';

    var timer = document.createElement('p');
    timer.className = 'shaggy-loader-timer';
    timer.textContent = formatElapsed(0);

    targetEl.appendChild(figure);
    targetEl.appendChild(status);
    targetEl.appendChild(reassure);
    targetEl.appendChild(timer);

    // Inline the SVG so host-stylesheet animations target its inner groups
    loadSvgMarkup().then(function (markup) {
      if (state.container === targetEl) {
        figure.innerHTML = markup;
      }
    }).catch(function () { /* swallow — figure simply stays empty */ });

    // Reassurance rotation every 8s
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

    // Elapsed timer ticks every 1s
    state.elapsedTimer = setInterval(function () {
      var elapsed = Date.now() - state.startTimestamp;
      timer.textContent = formatElapsed(elapsed);
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
  }

  window.EHCShaggyLoader = { start: start, stop: stop };
})();
