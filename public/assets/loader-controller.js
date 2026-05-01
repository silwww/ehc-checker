(function () {
  var STAGE_2_THRESHOLD_MS = 60000;
  var TIP_ROTATE_MS = 8000;
  var REASSURE_ROTATE_MS = 8000;

  // SVG markup is fetched once and cached in-memory so subsequent loader
  // starts (e.g. retry after error, or audit tab spawned from main tab)
  // do not re-fetch.
  var svgMarkupCache = null;
  var svgMarkupPromise = null;

  function loadSvgMarkup() {
    if (svgMarkupCache) {
      return Promise.resolve(svgMarkupCache);
    }
    if (svgMarkupPromise) {
      return svgMarkupPromise;
    }
    svgMarkupPromise = fetch('/assets/shaggy-loader.svg')
      .then(function (res) { return res.text(); })
      .then(function (text) {
        svgMarkupCache = text;
        svgMarkupPromise = null;
        return text;
      })
      .catch(function (err) {
        svgMarkupPromise = null;
        throw err;
      });
    return svgMarkupPromise;
  }

  var state = {
    container: null,
    startTimestamp: null,
    tipIndex: 0,
    reassureIndex: 0,
    tipTimer: null,
    reassureTimer: null,
    stageTimer: null,
    elapsedTimer: null
  };

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
    state.tipIndex = 0;
    state.reassureIndex = 0;

    var content = window.EHCLoaderContent || { tips: [], reassurances: [] };
    var tips = content.tips || [];
    var reassurances = content.reassurances || [];

    targetEl.innerHTML = '';
    targetEl.className = 'shaggy-loader card-flat';
    targetEl.setAttribute('data-stage', '1');

    var figure = document.createElement('div');
    figure.className = 'shaggy-loader-figure';
    figure.setAttribute('aria-hidden', 'true');
    targetEl.appendChild(figure);

    // Inline the SVG markup so the host stylesheet's animations and
    // stage transitions reach the inner #mascot-eyes / #mascot-glass /
    // #mascot-stamp / #stamp-arm-rotator elements.
    loadSvgMarkup().then(function (svgText) {
      // Guard: if stop() ran before the fetch resolved, do not inject.
      if (state.container !== targetEl) return;
      figure.innerHTML = svgText;
    }).catch(function (err) {
      console.warn('[shaggy-loader] failed to load SVG:', err);
    });

    var stampMark = document.createElement('div');
    stampMark.className = 'shaggy-loader-stampmark';
    stampMark.textContent = 'SP';
    figure.appendChild(stampMark);

    var status = document.createElement('p');
    status.className = 'shaggy-loader-status';
    status.textContent = 'Checking certificate…';

    var tip = document.createElement('p');
    tip.className = 'shaggy-loader-tip';
    tip.textContent = tips[0] || '';

    var reassure = document.createElement('p');
    reassure.className = 'shaggy-loader-reassure';
    reassure.textContent = reassurances[0] || '';

    var timer = document.createElement('p');
    timer.className = 'shaggy-loader-timer';
    timer.textContent = 'Checking… 0m 0s';

    targetEl.appendChild(status);
    targetEl.appendChild(tip);
    targetEl.appendChild(reassure);
    targetEl.appendChild(timer);

    // Tip rotation every 8s — fixed sequential order, looping.
    if (tips.length > 1) {
      state.tipTimer = setInterval(function () {
        state.tipIndex = (state.tipIndex + 1) % tips.length;
        tip.style.opacity = '0';
        setTimeout(function () {
          tip.textContent = tips[state.tipIndex];
          tip.style.opacity = '1';
        }, 250);
      }, TIP_ROTATE_MS);
    }

    // Stage 2 transition at 60s.
    state.stageTimer = setTimeout(function () {
      targetEl.setAttribute('data-stage', '2');

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

      // Set the elapsed value immediately so the visible value is correct
      // at the moment Stage 2 fades in, then keep it ticking.
      var elapsedNow = Date.now() - state.startTimestamp;
      timer.textContent = formatElapsed(elapsedNow);
      state.elapsedTimer = setInterval(function () {
        var elapsed = Date.now() - state.startTimestamp;
        timer.textContent = formatElapsed(elapsed);
      }, 1000);
    }, STAGE_2_THRESHOLD_MS);
  }

  function stop() {
    if (state.tipTimer)      { clearInterval(state.tipTimer);     state.tipTimer = null; }
    if (state.reassureTimer) { clearInterval(state.reassureTimer); state.reassureTimer = null; }
    if (state.stageTimer)    { clearTimeout(state.stageTimer);     state.stageTimer = null; }
    if (state.elapsedTimer)  { clearInterval(state.elapsedTimer);  state.elapsedTimer = null; }
    if (state.container) {
      state.container.innerHTML = '';
      state.container.removeAttribute('data-stage');
      state.container.className = 'card-flat';
    }
    state.container = null;
    state.startTimestamp = null;
  }

  window.EHCShaggyLoader = { start: start, stop: stop };
})();
