/* ==========================================================================
   CryptoShare — Trust Capsule
   js/hill.js — Layer 1: Classical Cryptography Lab — Hill Cipher
   Vanilla JS. No external libraries. Self-contained UI wiring.
   ========================================================================== */

(function () {
  'use strict';

  var state = {
    size: 2,
    mode: 'encrypt',
    matrix: [],
    determinant: null,
    determinantMod: null,
    determinantInverse: null
  };

  var els = {};

  function cacheEls() {
    els.keyInput = document.getElementById('hillKeyInput');
    els.validityBadge = document.getElementById('hillValidityBadge');
    els.det = document.getElementById('hillDet');
    els.detMod = document.getElementById('hillDetMod');
    els.detInv = document.getElementById('hillDetInv');
    els.input = document.getElementById('hillInput');
    els.runBtn = document.getElementById('hillRunBtn');
    els.blocks = document.getElementById('hillBlocks');
    els.stepLog = document.getElementById('hillStepLog');
    els.resultOutput = document.getElementById('hillResultOutput');
    els.errorText = document.getElementById('hillErrorText');
    els.sizeButtons = document.querySelectorAll('[data-hill-size]');
    els.modeButtons = document.querySelectorAll('[data-hill-mode]');
  }

  /* ------------------------------------------------------------------
     Math helpers
  ------------------------------------------------------------------ */

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);

    while (b !== 0) {
      var temp = a % b;
      a = b;
      b = temp;
    }

    return a;
  }

  function modInverse(a, m) {
    a = mod(a, m);

    for (var x = 1; x < m; x++) {
      if (mod(a * x, m) === 1) {
        return x;
      }
    }

    return null;
  }

  function determinant(matrix) {
    var n = matrix.length;

    if (n === 1) {
      return matrix[0][0];
    }

    if (n === 2) {
      return (
        matrix[0][0] * matrix[1][1] -
        matrix[0][1] * matrix[1][0]
      );
    }

    if (n === 3) {
      return (
        matrix[0][0] * (
          matrix[1][1] * matrix[2][2] -
          matrix[1][2] * matrix[2][1]
        ) -
        matrix[0][1] * (
          matrix[1][0] * matrix[2][2] -
          matrix[1][2] * matrix[2][0]
        ) +
        matrix[0][2] * (
          matrix[1][0] * matrix[2][1] -
          matrix[1][1] * matrix[2][0]
        )
      );
    }

    return 0;
  }

  function minorMatrix(matrix, rowToRemove, colToRemove) {
    var result = [];

    for (var r = 0; r < matrix.length; r++) {
      if (r === rowToRemove) continue;

      var row = [];

      for (var c = 0; c < matrix.length; c++) {
        if (c === colToRemove) continue;
        row.push(matrix[r][c]);
      }

      result.push(row);
    }

    return result;
  }

  function inverseMatrixMod26(matrix) {
    var det = determinant(matrix);
    var detMod = mod(det, 26);
    var detInv = modInverse(detMod, 26);

    if (detInv === null) {
      return null;
    }

    var n = matrix.length;
    var cofactors = [];

    for (var r = 0; r < n; r++) {
      var row = [];

      for (var c = 0; c < n; c++) {
        var minor = minorMatrix(matrix, r, c);
        var minorDet = determinant(minor);
        var sign = ((r + c) % 2 === 0) ? 1 : -1;

        row.push(sign * minorDet);
      }

      cofactors.push(row);
    }

    /* Adjugate = transpose of cofactor matrix */
    var inverse = [];

    for (var r2 = 0; r2 < n; r2++) {
      var inverseRow = [];

      for (var c2 = 0; c2 < n; c2++) {
        inverseRow.push(
          mod(detInv * cofactors[c2][r2], 26)
        );
      }

      inverse.push(inverseRow);
    }

    return inverse;
  }

  /* ------------------------------------------------------------------
     Matrix UI
  ------------------------------------------------------------------ */

  function createDefaultMatrix(size) {
    var values;

    if (size === 2) {
      values = [
        [3, 3],
        [2, 5]
      ];
    } else {
      values = [
        [6, 24, 1],
        [13, 16, 10],
        [20, 17, 15]
      ];
    }

    state.matrix = values;
  }

  function renderKeyMatrix() {
    if (!els.keyInput) return;

    els.keyInput.innerHTML = '';

    for (var r = 0; r < state.size; r++) {
      for (var c = 0; c < state.size; c++) {
        var input = document.createElement('input');

        input.type = 'number';
        input.min = '0';
        input.max = '25';
        input.value = state.matrix[r][c];
        input.dataset.row = r;
        input.dataset.col = c;
        input.setAttribute(
          'aria-label',
          'Hill key row ' + (r + 1) + ' column ' + (c + 1)
        );

        input.addEventListener('input', function () {
          var row = Number(this.dataset.row);
          var col = Number(this.dataset.col);
          var value = parseInt(this.value, 10);

          if (isNaN(value)) {
            value = 0;
          }

          state.matrix[row][col] = mod(value, 26);
          this.value = state.matrix[row][col];

          validateKey();
        });

        els.keyInput.appendChild(input);
      }
    }

    validateKey();
  }

  function readMatrixFromInputs() {
    if (!els.keyInput) return;

    var inputs = els.keyInput.querySelectorAll('input');

    inputs.forEach(function (input) {
      var row = Number(input.dataset.row);
      var col = Number(input.dataset.col);
      var value = parseInt(input.value, 10);

      if (isNaN(value)) {
        value = 0;
      }

      state.matrix[row][col] = mod(value, 26);
    });
  }

  /* ------------------------------------------------------------------
     Validation
  ------------------------------------------------------------------ */

  function validateKey() {
    readMatrixFromInputs();

    var det = determinant(state.matrix);
    var detMod = mod(det, 26);
    var detInv = modInverse(detMod, 26);

    state.determinant = det;
    state.determinantMod = detMod;
    state.determinantInverse = detInv;

    if (els.det) {
      els.det.textContent = det;
    }

    if (els.detMod) {
      els.detMod.textContent = detMod;
    }

    if (els.detInv) {
      els.detInv.textContent =
        detInv === null ? 'None' : detInv;
    }

    if (els.validityBadge) {
      if (gcd(detMod, 26) === 1) {
        els.validityBadge.dataset.state = 'valid';
        els.validityBadge.textContent =
          'Valid key — invertible modulo 26';
      } else {
        els.validityBadge.dataset.state = 'invalid';
        els.validityBadge.textContent =
          'Invalid key — determinant has no modular inverse';
      }
    }

    return detInv !== null;
  }

  /* ------------------------------------------------------------------
     Text preparation
  ------------------------------------------------------------------ */

  function normalize(text) {
    if (!text) return '';

    return text
      .toUpperCase()
      .replace(/J/g, 'I')
      .replace(/[^A-Z]/g, '');
  }

  function prepareBlocks(text) {
    var clean = normalize(text);
    var blocks = [];
    var i;

    for (i = 0; i < clean.length; i += state.size) {
      var block = clean.slice(i, i + state.size);

      while (block.length < state.size) {
        block += 'X';
      }

      blocks.push(block);
    }

    return blocks;
  }

  function letterToNumber(letter) {
    return letter.charCodeAt(0) - 65;
  }

  function numberToLetter(number) {
    return String.fromCharCode(mod(number, 26) + 65);
  }

  function blockToVector(block) {
    var vector = [];

    for (var i = 0; i < block.length; i++) {
      vector.push(letterToNumber(block[i]));
    }

    return vector;
  }

  /* ------------------------------------------------------------------
     Matrix multiplication
  ------------------------------------------------------------------ */

  function multiplyMatrixVector(matrix, vector) {
    var result = [];

    for (var r = 0; r < matrix.length; r++) {
      var sum = 0;

      for (var c = 0; c < matrix.length; c++) {
        sum += matrix[r][c] * vector[c];
      }

      result.push(mod(sum, 26));
    }

    return result;
  }

  /* ------------------------------------------------------------------
     Rendering
  ------------------------------------------------------------------ */

  function renderBlocks(blocks) {
    if (!els.blocks) return;

    els.blocks.innerHTML = '';

    blocks.forEach(function (block, index) {
      var el = document.createElement('div');
      el.className = 'digraph-pair';

      var letters = document.createElement('span');
      letters.className = 'pair-letters';
      letters.textContent = block;

      var label = document.createElement('span');
      label.className = 'pair-index';
      label.textContent = 'Block ' + (index + 1);

      el.appendChild(letters);
      el.appendChild(label);

      els.blocks.appendChild(el);
    });
  }

  function renderSteps(steps) {
    if (!els.stepLog) return;

    els.stepLog.innerHTML = '';

    steps.forEach(function (step, index) {
      var li = document.createElement('li');

      var text = document.createElement('span');

      text.textContent =
        (index + 1) +
        '. ' +
        step.input +
        ' → [' +
        step.inputVector.join(', ') +
        '] → [' +
        step.outputVector.join(', ') +
        '] → ' +
        step.output;

      li.appendChild(text);
      els.stepLog.appendChild(li);
    });
  }

  function showError(message) {
    if (!els.errorText) return;

    els.errorText.textContent = message;
    els.errorText.hidden = false;
  }

  function clearError() {
    if (!els.errorText) return;

    els.errorText.textContent = '';
    els.errorText.hidden = true;
  }

  /* ------------------------------------------------------------------
     Run Hill Cipher
  ------------------------------------------------------------------ */

  function run() {
    clearError();

    readMatrixFromInputs();

    if (!validateKey()) {
      if (els.resultOutput) {
        els.resultOutput.textContent = '—';
      }

      renderBlocks([]);
      renderSteps([]);

      showError(
        'The key matrix is not invertible modulo 26. Choose a different key.'
      );

      return;
    }

    var rawInput = els.input ? els.input.value : '';
    var clean = normalize(rawInput);

    if (!clean) {
      if (els.resultOutput) {
        els.resultOutput.textContent = '—';
      }

      renderBlocks([]);
      renderSteps([]);

      showError(
        'Enter a message using letters A–Z before running Hill Cipher.'
      );

      return;
    }

    var blocks = prepareBlocks(rawInput);
    renderBlocks(blocks);

    var workingMatrix;

    if (state.mode === 'encrypt') {
      workingMatrix = state.matrix;
    } else {
      workingMatrix = inverseMatrixMod26(state.matrix);

      if (!workingMatrix) {
        showError(
          'The key matrix cannot be inverted modulo 26.'
        );
        return;
      }
    }

    var result = [];
    var steps = [];

    blocks.forEach(function (block) {
      var inputVector = blockToVector(block);
      var outputVector =
        multiplyMatrixVector(workingMatrix, inputVector);

      var output = '';

      outputVector.forEach(function (number) {
        output += numberToLetter(number);
        result.push(numberToLetter(number));
      });

      steps.push({
        input: block,
        inputVector: inputVector,
        outputVector: outputVector,
        output: output
      });
    });

    renderSteps(steps);

    if (els.resultOutput) {
      els.resultOutput.textContent = result.join('');
    }
  }

  /* ------------------------------------------------------------------
     Mode / size controls
  ------------------------------------------------------------------ */

  function setMode(mode) {
    state.mode = mode;

    els.modeButtons.forEach(function (button) {
      button.classList.toggle(
        'is-active',
        button.dataset.hillMode === mode
      );
    });
  }

  function setSize(size) {
    state.size = Number(size);

    createDefaultMatrix(state.size);
    renderKeyMatrix();

    els.sizeButtons.forEach(function (button) {
      button.classList.toggle(
        'is-active',
        Number(button.dataset.hillSize) === state.size
      );
    });
  }

  /* ------------------------------------------------------------------
     Events
  ------------------------------------------------------------------ */

  function bindEvents() {
    els.sizeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setSize(button.dataset.hillSize);
      });
    });

    els.modeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setMode(button.dataset.hillMode);
      });
    });

    if (els.runBtn) {
      els.runBtn.addEventListener('click', run);
    }
  }

  /* ------------------------------------------------------------------
     Init
  ------------------------------------------------------------------ */

  function init() {
    cacheEls();

    if (!els.keyInput) return;

    createDefaultMatrix(state.size);
    renderKeyMatrix();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CryptoShareHill = {
    run: run,
    validateKey: validateKey,
    refreshMatrix: renderKeyMatrix
  };

})();