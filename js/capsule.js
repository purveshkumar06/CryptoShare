/* ==========================================================================
   CryptoShare — Trust Capsule
   js/capsule.js — Layer 2: Trust Capsule Workflow
   Vanilla JS. Uses CryptoShareCrypto + Web Crypto API.
   ========================================================================== */

(function () {
  'use strict';

  var state = {
    sender: {
      ecdh: null,
      ecdsa: null
    },

    receiver: {
      label: '',
      ecdh: null,
      ecdsa: null
    },

    lastCapsule: null
  };

  var els = {};

  /* ------------------------------------------------------------------
     Element cache
  ------------------------------------------------------------------ */

  function cacheEls() {
    els.genSenderKeysBtn = document.getElementById('genSenderKeysBtn');
    els.genReceiverKeysBtn = document.getElementById('genReceiverKeysBtn');

    els.senderKeyStatus = document.getElementById('senderKeyStatus');
    els.receiverKeyStatus = document.getElementById('receiverKeyStatus');

    els.receiverName = document.getElementById('capsuleReceiverName');
    els.messageInput = document.getElementById('capsuleMessageInput');
    els.expiry = document.getElementById('capsuleExpiry');

    els.buildBtn = document.getElementById('buildCapsuleBtn');
    els.createPipeline = document.getElementById('createPipelineTrace');

    els.outputPanel = document.getElementById('capsuleOutputPanel');
    els.jsonOutput = document.getElementById('capsuleJsonOutput');
    els.copyBtn = document.getElementById('copyCapsuleBtn');
    els.downloadBtn = document.getElementById('downloadCapsuleBtn');

    els.importInput = document.getElementById('capsuleImportInput');
    els.fileInput = document.getElementById('capsuleFileInput');
    els.verifyBtn = document.getElementById('verifyCapsuleBtn');

    els.tamperBtn = document.getElementById('tamperCapsuleBtn');
    els.statusBadge = document.getElementById('capsuleStatusBadge');

    els.verifyPipeline = document.getElementById('verifyPipelineTrace');

    els.decryptedPanel = document.getElementById('capsuleDecryptedPanel');
    els.decryptedOutput = document.getElementById('capsuleDecryptedOutput');
    els.metaList = document.getElementById('capsuleMetaList');
  }

  /* ------------------------------------------------------------------
     Helpers
  ------------------------------------------------------------------ */

  function setStatus(element, message, stateName) {
    if (!element) return;

    element.textContent = message;

    if (stateName) {
      element.dataset.state = stateName;
    }
  }

  function setPipelineStage(container, stage, status) {
    if (!container) return;

    var item = container.querySelector('[data-stage="' + stage + '"]');

    if (!item) return;

    item.classList.remove('is-active', 'is-done', 'is-error');

    if (status === 'active') {
      item.classList.add('is-active');
    } else if (status === 'done') {
      item.classList.add('is-done');
    } else if (status === 'error') {
      item.classList.add('is-error');
    }
  }

  function resetPipeline(container) {
    if (!container) return;

    var items = container.querySelectorAll('li');

    items.forEach(function (item) {
      item.classList.remove('is-active', 'is-done', 'is-error');
    });
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function makeId() {
    var bytes = CryptoShareCrypto.randomBytes(16);

    return CryptoShareCrypto.bytesToBase64(bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  function getExpiryTimestamp() {
    var minutes = Number(els.expiry ? els.expiry.value : 10);

    if (!Number.isFinite(minutes) || minutes < 1) {
      minutes = 10;
    }

    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  function getCapsuleSigningData(capsule) {
    var copy = JSON.parse(JSON.stringify(capsule));

    delete copy.signature;

    return CryptoShareCrypto.canonicalize(copy);
  }

  /* ------------------------------------------------------------------
     Generate Sender Keys
  ------------------------------------------------------------------ */

  async function generateSenderKeys() {
    try {
      setStatus(
        els.senderKeyStatus,
        'Generating sender keys…',
        'working'
      );

      state.sender.ecdh =
        await CryptoShareCrypto.generateECDHKeyPair();

      state.sender.ecdsa =
        await CryptoShareCrypto.generateECDSAKeyPair();

      setStatus(
        els.senderKeyStatus,
        'Sender ECDH + ECDSA keys ready',
        'ready'
      );

    } catch (error) {
      console.error(error);

      setStatus(
        els.senderKeyStatus,
        'Unable to generate sender keys',
        'error'
      );
    }
  }

  /* ------------------------------------------------------------------
     Generate Receiver Keys
  ------------------------------------------------------------------ */

  async function generateReceiverKeys() {
    try {
      var label = els.receiverName
        ? els.receiverName.value.trim()
        : '';

      state.receiver.label = label || 'Receiver-B';

      setStatus(
        els.receiverKeyStatus,
        'Generating receiver keys…',
        'working'
      );

      state.receiver.ecdh =
        await CryptoShareCrypto.generateECDHKeyPair();

      state.receiver.ecdsa =
        await CryptoShareCrypto.generateECDSAKeyPair();

      setStatus(
        els.receiverKeyStatus,
        'Receiver ECDH + ECDSA keys ready',
        'ready'
      );

    } catch (error) {
      console.error(error);

      setStatus(
        els.receiverKeyStatus,
        'Unable to generate receiver keys',
        'error'
      );
    }
  }

  /* ------------------------------------------------------------------
     Ensure keys exist
  ------------------------------------------------------------------ */

  async function ensureKeys() {
    if (!state.sender.ecdh || !state.sender.ecdsa) {
      await generateSenderKeys();
    }

    if (!state.receiver.ecdh || !state.receiver.ecdsa) {
      await generateReceiverKeys();
    }

    return !!(
      state.sender.ecdh &&
      state.sender.ecdsa &&
      state.receiver.ecdh &&
      state.receiver.ecdsa
    );
  }

  /* ------------------------------------------------------------------
     Create Trust Capsule
  ------------------------------------------------------------------ */

  async function buildCapsule() {
    resetPipeline(els.createPipeline);

    if (els.outputPanel) {
      els.outputPanel.hidden = true;
    }

    var message = els.messageInput
      ? els.messageInput.value
      : '';

    if (!message.trim()) {
      alert('Enter a message before generating the Trust Capsule.');
      return;
    }

    try {
      var keysReady = await ensureKeys();

      if (!keysReady) {
        throw new Error('Cryptographic keys could not be generated.');
      }

      /* --------------------------------------------------------------
         Stage 1 — Session material
      -------------------------------------------------------------- */

      setPipelineStage(
        els.createPipeline,
        'session-key',
        'active'
      );

      await sleep(250);

      var senderECDHPublic =
        await CryptoShareCrypto.exportPublicKey(
          state.sender.ecdh.publicKey
        );

      var receiverECDHPublic =
        await CryptoShareCrypto.exportPublicKey(
          state.receiver.ecdh.publicKey
        );

      setPipelineStage(
        els.createPipeline,
        'session-key',
        'done'
      );

      /* --------------------------------------------------------------
         Stage 2 — ECDH
      -------------------------------------------------------------- */

      setPipelineStage(
        els.createPipeline,
        'ecdh',
        'active'
      );

      var sessionKey =
        await CryptoShareCrypto.deriveECDHKey(
          state.sender.ecdh.privateKey,
          state.receiver.ecdh.publicKey
        );

      setPipelineStage(
        els.createPipeline,
        'ecdh',
        'done'
      );

      /* --------------------------------------------------------------
         Stage 3 — AES-GCM encryption
      -------------------------------------------------------------- */

      setPipelineStage(
        els.createPipeline,
        'encrypt',
        'active'
      );

      var encrypted =
        await CryptoShareCrypto.aesGcmEncrypt(
          sessionKey,
          message
        );

      setPipelineStage(
        els.createPipeline,
        'encrypt',
        'done'
      );

      /* --------------------------------------------------------------
         Stage 4 — SHA-256 integrity
      -------------------------------------------------------------- */

      setPipelineStage(
        els.createPipeline,
        'hash',
        'active'
      );

      var capsule = {
        format: 'CryptoShare-Trust-Capsule',
        version: '1.0',

        capsuleId: makeId(),

        createdAt: new Date().toISOString(),

        expiresAt: getExpiryTimestamp(),

        sender: {
          label: 'Sender-A',

          ecdhPublicKey: senderECDHPublic,

          ecdsaPublicKey:
            await CryptoShareCrypto.exportPublicKey(
              state.sender.ecdsa.publicKey
            )
        },

        receiver: {
          label: state.receiver.label,

          ecdhPublicKey: receiverECDHPublic
        },

        encryption: {
          algorithm: 'AES-GCM',
          keyDerivation: 'ECDH P-256',
          iv: encrypted.iv,
          ciphertext: encrypted.ciphertext
        },

        integrity: {
          algorithm: 'SHA-256',
          hash: ''
        },

        signature: ''
      };

      var integrityData = {
        capsuleId: capsule.capsuleId,
        createdAt: capsule.createdAt,
        expiresAt: capsule.expiresAt,
        sender: capsule.sender,
        receiver: capsule.receiver,
        encryption: capsule.encryption
      };

      var integrityText =
        CryptoShareCrypto.canonicalize(integrityData);

      var integrityResult =
        await CryptoShareCrypto.sha256(integrityText);

      capsule.integrity.hash = integrityResult.base64;

      setPipelineStage(
        els.createPipeline,
        'hash',
        'done'
      );

      /* --------------------------------------------------------------
         Stage 5 — ECDSA signature
      -------------------------------------------------------------- */

      setPipelineStage(
        els.createPipeline,
        'sign',
        'active'
      );

      var signingData =
        getCapsuleSigningData(capsule);

      capsule.signature =
        await CryptoShareCrypto.signData(
          state.sender.ecdsa.privateKey,
          signingData
        );

      setPipelineStage(
        els.createPipeline,
        'sign',
        'done'
      );

      /* --------------------------------------------------------------
         Stage 6 — Assemble
      -------------------------------------------------------------- */

      setPipelineStage(
        els.createPipeline,
        'assemble',
        'active'
      );

      await sleep(250);

      state.lastCapsule = capsule;

      if (els.jsonOutput) {
        els.jsonOutput.textContent =
          JSON.stringify(capsule, null, 2);
      }

      if (els.outputPanel) {
        els.outputPanel.hidden = false;
      }

      setPipelineStage(
        els.createPipeline,
        'assemble',
        'done'
      );

    } catch (error) {
      console.error('Capsule creation error:', error);

      alert(
        'Unable to generate the Trust Capsule.\n\n' +
        error.message
      );
    }
  }

  /* ------------------------------------------------------------------
     Copy capsule
  ------------------------------------------------------------------ */

  async function copyCapsule() {
    if (!state.lastCapsule) return;

    var json =
      JSON.stringify(state.lastCapsule, null, 2);

    try {
      await navigator.clipboard.writeText(json);

      if (els.copyBtn) {
        var original = els.copyBtn.textContent;

        els.copyBtn.textContent = 'Copied ✓';

        setTimeout(function () {
          els.copyBtn.textContent = original;
        }, 1500);
      }

    } catch (error) {
      console.error(error);
      alert('Unable to copy the capsule JSON.');
    }
  }

  /* ------------------------------------------------------------------
     Download capsule
  ------------------------------------------------------------------ */

  function downloadCapsule() {
    if (!state.lastCapsule) return;

    var json =
      JSON.stringify(state.lastCapsule, null, 2);

    var blob = new Blob(
      [json],
      {
        type: 'application/json'
      }
    );

    var url = URL.createObjectURL(blob);

    var link = document.createElement('a');

    link.href = url;
    link.download =
      'cryptoshare-trust-capsule.json';

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }

  /* ------------------------------------------------------------------
     Import file
  ------------------------------------------------------------------ */

  function handleFileImport(event) {
    var file =
      event.target.files &&
      event.target.files[0];

    if (!file) return;

    var reader = new FileReader();

    reader.onload = function () {
      if (els.importInput) {
        els.importInput.value =
          reader.result;
      }
    };

    reader.onerror = function () {
      alert('Unable to read the capsule file.');
    };

    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------
     Parse capsule
  ------------------------------------------------------------------ */

  function parseCapsule() {
    if (!els.importInput) {
      throw new Error('Capsule input field not found.');
    }

    var raw =
      els.importInput.value.trim();

    if (!raw) {
      throw new Error('Paste a Trust Capsule JSON first.');
    }

    var capsule;

    try {
      capsule = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        'The capsule is not valid JSON.'
      );
    }

    if (!capsule ||
        capsule.format !== 'CryptoShare-Trust-Capsule') {
      throw new Error(
        'Invalid CryptoShare Trust Capsule.'
      );
    }

    return capsule;
  }

  /* ------------------------------------------------------------------
     Verify structure
  ------------------------------------------------------------------ */

  function validateStructure(capsule) {
    var required = [
      'format',
      'version',
      'capsuleId',
      'createdAt',
      'expiresAt',
      'sender',
      'receiver',
      'encryption',
      'integrity',
      'signature'
    ];

    for (var i = 0; i < required.length; i++) {
      if (!(required[i] in capsule)) {
        throw new Error(
          'Missing capsule field: ' +
          required[i]
        );
      }
    }

    if (!capsule.sender.ecdhPublicKey) {
      throw new Error(
        'Sender ECDH public key is missing.'
      );
    }

    if (!capsule.sender.ecdsaPublicKey) {
      throw new Error(
        'Sender ECDSA public key is missing.'
      );
    }

    if (!capsule.encryption.iv ||
        !capsule.encryption.ciphertext) {
      throw new Error(
        'Encrypted content is incomplete.'
      );
    }

    if (!capsule.integrity.hash) {
      throw new Error(
        'Integrity hash is missing.'
      );
    }

    if (!capsule.signature) {
      throw new Error(
        'Digital signature is missing.'
      );
    }

    return true;
  }

  /* ------------------------------------------------------------------
     Verify signature
  ------------------------------------------------------------------ */

  async function verifyCapsuleSignature(capsule) {
    var publicKey =
      await CryptoShareCrypto.importECDSAPublicKey(
        capsule.sender.ecdsaPublicKey
      );

    var signingData =
      getCapsuleSigningData(capsule);

    return CryptoShareCrypto.verifySignature(
      publicKey,
      capsule.signature,
      signingData
    );
  }

  /* ------------------------------------------------------------------
     Verify integrity
  ------------------------------------------------------------------ */

  async function verifyCapsuleIntegrity(capsule) {
    var integrityData = {
      capsuleId: capsule.capsuleId,
      createdAt: capsule.createdAt,
      expiresAt: capsule.expiresAt,
      sender: capsule.sender,
      receiver: capsule.receiver,
      encryption: capsule.encryption
    };

    var integrityText =
      CryptoShareCrypto.canonicalize(
        integrityData
      );

    var result =
      await CryptoShareCrypto.sha256(
        integrityText
      );

    return result.base64 ===
      capsule.integrity.hash;
  }

  /* ------------------------------------------------------------------
     Expiration
  ------------------------------------------------------------------ */

  function verifyExpiration(capsule) {
    var expiry =
      new Date(capsule.expiresAt).getTime();

    if (!Number.isFinite(expiry)) {
      throw new Error(
        'Invalid expiration timestamp.'
      );
    }

    return Date.now() <= expiry;
  }

  /* ------------------------------------------------------------------
     Decrypt capsule
  ------------------------------------------------------------------ */

  async function decryptCapsule(capsule) {
    if (!state.receiver.ecdh) {
      throw new Error(
        'Receiver keys are not available in this session. ' +
        'Generate Receiver Keys first.'
      );
    }

    var senderPublicKey =
      await CryptoShareCrypto.importECDHPublicKey(
        capsule.sender.ecdhPublicKey
      );

    var sessionKey =
      await CryptoShareCrypto.deriveECDHKey(
        state.receiver.ecdh.privateKey,
        senderPublicKey
      );

    return CryptoShareCrypto.aesGcmDecrypt(
      sessionKey,
      capsule.encryption.ciphertext,
      capsule.encryption.iv
    );
  }

  /* ------------------------------------------------------------------
     Render metadata
  ------------------------------------------------------------------ */

  function renderMetadata(capsule) {
    if (!els.metaList) return;

    els.metaList.innerHTML = '';

    var items = [
      ['Capsule ID', capsule.capsuleId],
      ['Sender', capsule.sender.label],
      ['Receiver', capsule.receiver.label],
      ['Created', capsule.createdAt],
      ['Expires', capsule.expiresAt],
      ['Encryption', capsule.encryption.algorithm],
      ['Key Exchange', capsule.encryption.keyDerivation],
      ['Integrity', capsule.integrity.algorithm]
    ];

    items.forEach(function (item) {
      var wrapper = document.createElement('div');

      var dt = document.createElement('dt');
      dt.textContent = item[0];

      var dd = document.createElement('dd');
      dd.textContent = item[1];

      wrapper.appendChild(dt);
      wrapper.appendChild(dd);

      els.metaList.appendChild(wrapper);
    });
  }

  /* ------------------------------------------------------------------
     Status badge
  ------------------------------------------------------------------ */

  function setVerificationStatus(text, status) {
    if (!els.statusBadge) return;

    els.statusBadge.textContent = text;
    els.statusBadge.dataset.status = status;
  }

  /* ------------------------------------------------------------------
     Verify complete capsule
  ------------------------------------------------------------------ */

  async function verifyCapsule() {
    resetPipeline(els.verifyPipeline);

    if (els.decryptedPanel) {
      els.decryptedPanel.hidden = true;
    }

    try {
      /* --------------------------------------------------------------
         Parse
      -------------------------------------------------------------- */

      setPipelineStage(
        els.verifyPipeline,
        'parse',
        'active'
      );

      await sleep(200);

      var capsule = parseCapsule();

      validateStructure(capsule);

      setPipelineStage(
        els.verifyPipeline,
        'parse',
        'done'
      );

      /* --------------------------------------------------------------
         Signature
      -------------------------------------------------------------- */

      setPipelineStage(
        els.verifyPipeline,
        'signature',
        'active'
      );

      var signatureValid =
        await verifyCapsuleSignature(capsule);

      if (!signatureValid) {
        setPipelineStage(
          els.verifyPipeline,
          'signature',
          'error'
        );

        throw new Error(
          'ECDSA signature verification failed. ' +
          'The capsule may have been modified.'
        );
      }

      setPipelineStage(
        els.verifyPipeline,
        'signature',
        'done'
      );

      /* --------------------------------------------------------------
         Integrity
      -------------------------------------------------------------- */

      setPipelineStage(
        els.verifyPipeline,
        'integrity',
        'active'
      );

      var integrityValid =
        await verifyCapsuleIntegrity(capsule);

      if (!integrityValid) {
        setPipelineStage(
          els.verifyPipeline,
          'integrity',
          'error'
        );

        throw new Error(
          'SHA-256 integrity verification failed.'
        );
      }

      setPipelineStage(
        els.verifyPipeline,
        'integrity',
        'done'
      );

      /* --------------------------------------------------------------
         Expiration
      -------------------------------------------------------------- */

      setPipelineStage(
        els.verifyPipeline,
        'expiry',
        'active'
      );

      var notExpired =
        verifyExpiration(capsule);

      if (!notExpired) {
        setPipelineStage(
          els.verifyPipeline,
          'expiry',
          'error'
        );

        throw new Error(
          'This Trust Capsule has expired.'
        );
      }

      setPipelineStage(
        els.verifyPipeline,
        'expiry',
        'done'
      );

      /* --------------------------------------------------------------
         ECDH
      -------------------------------------------------------------- */

      setPipelineStage(
        els.verifyPipeline,
        'session-key',
        'active'
      );

      if (!state.receiver.ecdh) {
        throw new Error(
          'Receiver ECDH keys are not available. ' +
          'Generate Receiver Keys before decrypting.'
        );
      }

      setPipelineStage(
        els.verifyPipeline,
        'session-key',
        'done'
      );

      /* --------------------------------------------------------------
         AES-GCM decrypt
      -------------------------------------------------------------- */

      setPipelineStage(
        els.verifyPipeline,
        'decrypt',
        'active'
      );

      var plaintext =
        await decryptCapsule(capsule);

      setPipelineStage(
        els.verifyPipeline,
        'decrypt',
        'done'
      );

      /* --------------------------------------------------------------
         Display result
      -------------------------------------------------------------- */

      if (els.decryptedOutput) {
        els.decryptedOutput.textContent =
          plaintext;
      }

      renderMetadata(capsule);

      if (els.decryptedPanel) {
        els.decryptedPanel.hidden = false;
      }

      setVerificationStatus(
        'CAPSULE VERIFIED',
        'success'
      );

    } catch (error) {
      console.error(
        'Capsule verification error:',
        error
      );

      setVerificationStatus(
        'VERIFICATION FAILED',
        'error'
      );

      alert(
        'Trust Capsule verification failed.\n\n' +
        error.message
      );
    }
  }

  /* ------------------------------------------------------------------
     Tamper simulation
  ------------------------------------------------------------------ */

  function simulateTamper() {
    if (!els.importInput) return;

    var raw =
      els.importInput.value.trim();

    if (!raw) {
      alert(
        'Paste or load a Trust Capsule first.'
      );
      return;
    }

    try {
      var capsule =
        JSON.parse(raw);

      if (
        capsule.encryption &&
        capsule.encryption.ciphertext
      ) {
        var ciphertext =
          capsule.encryption.ciphertext;

        if (ciphertext.length > 5) {
          var index =
            Math.floor(ciphertext.length / 2);

          var current =
            ciphertext.charAt(index);

          var replacement =
            current === 'A' ? 'B' : 'A';

          capsule.encryption.ciphertext =
            ciphertext.substring(0, index) +
            replacement +
            ciphertext.substring(index + 1);
        }
      }

      els.importInput.value =
        JSON.stringify(capsule, null, 2);

      setVerificationStatus(
        'CAPSULE TAMPERED',
        'warning'
      );

    } catch (error) {
      alert(
        'Unable to simulate tampering because the input is not valid JSON.'
      );
    }
  }

  /* ------------------------------------------------------------------
     Event wiring
  ------------------------------------------------------------------ */

  function bindEvents() {
    if (els.genSenderKeysBtn) {
      els.genSenderKeysBtn.addEventListener(
        'click',
        generateSenderKeys
      );
    }

    if (els.genReceiverKeysBtn) {
      els.genReceiverKeysBtn.addEventListener(
        'click',
        generateReceiverKeys
      );
    }

    if (els.buildBtn) {
      els.buildBtn.addEventListener(
        'click',
        buildCapsule
      );
    }

    if (els.copyBtn) {
      els.copyBtn.addEventListener(
        'click',
        copyCapsule
      );
    }

    if (els.downloadBtn) {
      els.downloadBtn.addEventListener(
        'click',
        downloadCapsule
      );
    }

    if (els.fileInput) {
      els.fileInput.addEventListener(
        'change',
        handleFileImport
      );
    }

    if (els.verifyBtn) {
      els.verifyBtn.addEventListener(
        'click',
        verifyCapsule
      );
    }

    if (els.tamperBtn) {
      els.tamperBtn.addEventListener(
        'click',
        simulateTamper
      );
    }
  }

  /* ------------------------------------------------------------------
     Init
  ------------------------------------------------------------------ */

  function init() {
    cacheEls();

    if (!window.CryptoShareCrypto) {
      console.error(
        'CryptoShareCrypto is not loaded. ' +
        'Make sure crypto.js loads before capsule.js.'
      );

      return;
    }

    bindEvents();

    setVerificationStatus(
      'AWAITING CAPSULE',
      'idle'
    );
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

  window.CryptoShareCapsule = {
    generateSenderKeys: generateSenderKeys,
    generateReceiverKeys: generateReceiverKeys,
    buildCapsule: buildCapsule,
    verifyCapsule: verifyCapsule,
    simulateTamper: simulateTamper
  };

})();