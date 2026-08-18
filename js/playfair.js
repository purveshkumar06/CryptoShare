/* ==========================================================================
   CryptoShare — Trust Capsule
   js/playfair.js — Layer 1: Classical Cryptography Lab — Playfair Cipher
   Vanilla JavaScript. No external libraries.
   ========================================================================== */

(function () {
  'use strict';

  var ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

  var state = {
    matrix: [],
    position: {},
    mode: 'encrypt',
    steps: []
  };

  var els = {};

  /* ------------------------------------------------------------------
     DOM
  ------------------------------------------------------------------ */

  function cacheElements() {
    els.keyword = document.getElementById('pfKeyword');
    els.matrix = document.getElementById('pfMatrix');
    els.input = document.getElementById('pfInput');
    els.runBtn = document.getElementById('pfRunBtn');
    els.digraphs = document.getElementById('pfDigraphs');
    els.stepLog = document.getElementById('pfStepLog');
    els.resultPanel = document.getElementById('pfResultPanel');
    els.resultOutput = document.getElementById('pfResultOutput');
    els.modeButtons = document.querySelectorAll('[data-pf-mode]');
  }

  /* ------------------------------------------------------------------
     Normalization
  ------------------------------------------------------------------ */

  function normalize(text) {
    if (!text) return '';

    return String(text)
      .toUpperCase()
      .replace(/J/g, 'I')
      .replace(/[^A-Z]/g, '');
  }

  /* ------------------------------------------------------------------
     Matrix generation
  ------------------------------------------------------------------ */

  function buildMatrix(keyword) {
    var seen = {};
    var letters = [];

    function addLetter(letter) {
      if (!seen[letter]) {
        seen[letter] = true;
        letters.push(letter);
      }
    }

    var cleanKeyword = normalize(keyword);

    for (var i = 0; i < cleanKeyword.length; i++) {
      addLetter(cleanKeyword[i]);
    }

    for (var j = 0; j < ALPHABET.length; j++) {
      addLetter(ALPHABET[j]);
    }

    var matrix = [];
    var position = {};

    for (var row = 0; row < 5; row++) {
      var currentRow = [];

      for (var col = 0; col < 5; col++) {
        var letter = letters[row * 5 + col];

        currentRow.push(letter);

        position[letter] = {
          row: row,
          col: col
        };
      }

      matrix.push(currentRow);
    }

    state.matrix = matrix;
    state.position = position;

    return matrix;
  }

  function renderMatrix() {
    if (!els.matrix) return;

    els.matrix.innerHTML = '';

    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 5; col++) {
        var cell = document.createElement('div');

        cell.className = 'matrix-cell';
        cell.textContent = state.matrix[row][col];
        cell.dataset.row = row;
        cell.dataset.col = col;

        els.matrix.appendChild(cell);
      }
    }
  }

  /* ------------------------------------------------------------------
     Matrix helpers
  ------------------------------------------------------------------ */

  function getPosition(letter) {
    return state.position[letter];
  }

  function getLetter(row, col) {
    row = ((row % 5) + 5) % 5;
    col = ((col % 5) + 5) % 5;

    return state.matrix[row][col];
  }

  function highlightCells(coords) {
    if (!els.matrix) return;

    var cells = els.matrix.querySelectorAll('.matrix-cell');

    cells.forEach(function (cell) {
      cell.classList.remove('is-highlighted');
    });

    coords.forEach(function (coord) {
      var selector =
        '.matrix-cell[data-row="' +
        coord.row +
        '"][data-col="' +
        coord.col +
        '"]';

      var cell = els.matrix.querySelector(selector);

      if (cell) {
        cell.classList.add('is-highlighted');
      }
    });
  }

  function clearHighlights() {
    if (!els.matrix) return;

    els.matrix
      .querySelectorAll('.matrix-cell')
      .forEach(function (cell) {
        cell.classList.remove('is-highlighted');
      });
  }

  /* ------------------------------------------------------------------
     Digraph preparation
  ------------------------------------------------------------------ */

  function prepareDigraphs(text) {
    var clean = normalize(text);
    var pairs = [];
    var index = 0;

    while (index < clean.length) {
      var first = clean[index];
      var second = clean[index + 1];

      if (second === undefined) {
        pairs.push([first, 'X']);
        index++;
      } else if (first === second) {
        pairs.push([first, 'X']);
        index++;
      } else {
        pairs.push([first, second]);
        index += 2;
      }
    }

    return pairs;
  }

  function renderDigraphs(pairs) {
    if (!els.digraphs) return;

    els.digraphs.innerHTML = '';

    pairs.forEach(function (pair, index) {
      var item = document.createElement('div');

      item.className = 'digraph-pair';

      var letters = document.createElement('span');
      letters.className = 'pair-letters';
      letters.textContent = pair[0] + pair[1];

      var number = document.createElement('span');
      number.className = 'pair-index';
      number.textContent = 'Pair ' + (index + 1);

      item.appendChild(letters);
      item.appendChild(number);

      els.digraphs.appendChild(item);
    });
  }

  /* ------------------------------------------------------------------
     Playfair rules
  ------------------------------------------------------------------ */

  function applyPair(first, second, mode) {
    var firstPosition = getPosition(first);
    var secondPosition = getPosition(second);

    if (!firstPosition || !secondPosition) {
      throw new Error('Invalid Playfair character.');
    }

    var outputFirst;
    var outputSecond;
    var rule;
    var coords;

    /* Same row */
    if (firstPosition.row === secondPosition.row) {
      rule = 'Same Row';

      var horizontalShift = mode === 'encrypt' ? 1 : -1;

      outputFirst = getLetter(
        firstPosition.row,
        firstPosition.col + horizontalShift
      );

      outputSecond = getLetter(
        secondPosition.row,
        secondPosition.col + horizontalShift
      );

      coords = [
        {
          row: firstPosition.row,
          col: firstPosition.col
        },
        {
          row: secondPosition.row,
          col: secondPosition.col
        },
        {
          row: firstPosition.row,
          col: firstPosition.col + horizontalShift
        },
        {
          row: secondPosition.row,
          col: secondPosition.col + horizontalShift
        }
      ];
    }

    /* Same column */
    else if (firstPosition.col === secondPosition.col) {
      rule = 'Same Column';

      var verticalShift = mode === 'encrypt' ? 1 : -1;

      outputFirst = getLetter(
        firstPosition.row + verticalShift,
        firstPosition.col
      );

      outputSecond = getLetter(
        secondPosition.row + verticalShift,
        secondPosition.col
      );

      coords = [
        {
          row: firstPosition.row,
          col: firstPosition.col
        },
        {
          row: secondPosition.row,
          col: secondPosition.col
        },
        {
          row: firstPosition.row + verticalShift,
          col: firstPosition.col
        },
        {
          row: secondPosition.row + verticalShift,
          col: secondPosition.col
        }
      ];
    }

    /* Rectangle */
    else {
      rule = 'Rectangle';

      outputFirst = getLetter(
        firstPosition.row,
        secondPosition.col
      );

      outputSecond = getLetter(
        secondPosition.row,
        firstPosition.col
      );

      coords = [
        {
          row: firstPosition.row,
          col: firstPosition.col
        },
        {
          row: secondPosition.row,
          col: secondPosition.col
        },
        {
          row: firstPosition.row,
          col: secondPosition.col
        },
        {
          row: secondPosition.row,
          col: firstPosition.col
        }
      ];
    }

    return {
      rule: rule,
      pair: outputFirst + outputSecond,
      coords: coords
    };
  }

  /* ------------------------------------------------------------------
     Step log
  ------------------------------------------------------------------ */

  function renderStepLog(steps) {
    if (!els.stepLog) return;

    els.stepLog.innerHTML = '';

    steps.forEach(function (step, index) {
      var item = document.createElement('li');

      var text = document.createElement('span');

      text.textContent =
        (index + 1) +
        '. ' +
        step.inputPair +
        ' → ' +
        step.rule +
        ' → ' +
        step.outputPair;

      item.appendChild(text);

      els.stepLog.appendChild(item);
    });
  }

  function animateSteps(steps) {
    clearHighlights();

    var delay = 0;
    var STEP_DURATION = 260;

    steps.forEach(function (step) {
      setTimeout(function () {
        highlightCells(step.coords);
      }, delay);

      delay += STEP_DURATION;
    });

    setTimeout(function () {
      clearHighlights();
    }, delay + 400);
  }

  /* ------------------------------------------------------------------
     Errors
  ------------------------------------------------------------------ */

  function showError(message) {
    if (!els.resultPanel) return;

    var existing =
      els.resultPanel.querySelector('.notice--error');

    if (existing) {
      existing.remove();
    }

    var notice = document.createElement('div');

    notice.className = 'notice notice--error';
    notice.textContent = message;

    els.resultPanel.insertBefore(
      notice,
      els.resultOutput
    );
  }

  function clearError() {
    if (!els.resultPanel) return;

    var existing =
      els.resultPanel.querySelector('.notice--error');

    if (existing) {
      existing.remove();
    }
  }

  /* ------------------------------------------------------------------
     Run Playfair
  ------------------------------------------------------------------ */

  function run() {
    clearError();

    var keyword = els.keyword
      ? els.keyword.value
      : '';

    buildMatrix(keyword);
    renderMatrix();

    var rawInput = els.input
      ? els.input.value
      : '';

    var cleanInput = normalize(rawInput);

    if (!cleanInput) {
      if (els.resultOutput) {
        els.resultOutput.textContent = '—';
      }

      renderDigraphs([]);
      renderStepLog([]);

      showError(
        'Enter a message using letters A–Z before running Playfair.'
      );

      return;
    }

    var pairs = prepareDigraphs(rawInput);

    renderDigraphs(pairs);

    var steps = [];
    var result = [];

    pairs.forEach(function (pair) {
      var applied = applyPair(
        pair[0],
        pair[1],
        state.mode
      );

      steps.push({
        inputPair: pair[0] + pair[1],
        rule: applied.rule,
        outputPair: applied.pair,
        coords: applied.coords
      });

      result.push(applied.pair);
    });

    state.steps = steps;

    renderStepLog(steps);
    animateSteps(steps);

    if (els.resultOutput) {
      els.resultOutput.textContent = result.join(' ');
    }
  }

  /* ------------------------------------------------------------------
     Mode
  ------------------------------------------------------------------ */

  function setMode(mode) {
    state.mode = mode;

    els.modeButtons.forEach(function (button) {
      button.classList.toggle(
        'is-active',
        button.dataset.pfMode === mode
      );
    });
  }

  /* ------------------------------------------------------------------
     Matrix refresh
  ------------------------------------------------------------------ */

  function refreshMatrix() {
    var keyword = els.keyword
      ? els.keyword.value
      : '';

    buildMatrix(keyword);
    renderMatrix();
  }

  /* ------------------------------------------------------------------
     Events
  ------------------------------------------------------------------ */

  function bindEvents() {
    if (els.keyword) {
      els.keyword.addEventListener(
        'input',
        refreshMatrix
      );
    }

    els.modeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setMode(button.dataset.pfMode);
      });
    });

    if (els.runBtn) {
      els.runBtn.addEventListener(
        'click',
        run
      );
    }
  }

  /* ------------------------------------------------------------------
     Init
  ------------------------------------------------------------------ */

  function init() {
    cacheElements();

    if (!els.matrix) {
      return;
    }

    bindEvents();
    refreshMatrix();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }

  /* ------------------------------------------------------------------
     Public API
  ------------------------------------------------------------------ */

  window.CryptoSharePlayfair = {
    refreshMatrix: refreshMatrix,
    run: run
  };

})();