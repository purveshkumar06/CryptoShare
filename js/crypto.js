/* ==========================================================================
   CryptoShare — Trust Capsule
   js/crypto.js — Layer 2: Cryptographic Utilities
   Vanilla JS. Uses the browser's native Web Crypto API.
   ========================================================================== */

(function () {
  'use strict';

  var CryptoShareCrypto = {};

  /* ------------------------------------------------------------------
     Text / Base64 utilities
  ------------------------------------------------------------------ */

  function textToBytes(text) {
    return new TextEncoder().encode(text);
  }

  function bytesToText(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function bytesToBase64(bytes) {
    var binary = '';
    var chunkSize = 0x8000;

    for (var i = 0; i < bytes.length; i += chunkSize) {
      var chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    return btoa(binary);
  }

  function base64ToBytes(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  function arrayBufferToBase64(buffer) {
    return bytesToBase64(new Uint8Array(buffer));
  }

  function base64ToArrayBuffer(base64) {
    return base64ToBytes(base64).buffer;
  }

  /* ------------------------------------------------------------------
     Random values
  ------------------------------------------------------------------ */

  function randomBytes(length) {
    var bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  /* ------------------------------------------------------------------
     SHA-256
  ------------------------------------------------------------------ */

  async function sha256(data) {
    var bytes;

    if (typeof data === 'string') {
      bytes = textToBytes(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      bytes = new Uint8Array(data);
    }

    var hash = await crypto.subtle.digest('SHA-256', bytes);

    return {
      bytes: new Uint8Array(hash),
      base64: arrayBufferToBase64(hash)
    };
  }

  /* ------------------------------------------------------------------
     AES-GCM
  ------------------------------------------------------------------ */

  async function generateAESKey() {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async function aesGcmEncrypt(key, plaintext) {
    var iv = randomBytes(12);
    var plaintextBytes = textToBytes(plaintext);

    var ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      plaintextBytes
    );

    return {
      iv: bytesToBase64(iv),
      ciphertext: arrayBufferToBase64(ciphertext)
    };
  }

  async function aesGcmDecrypt(key, ciphertextBase64, ivBase64) {
    var ciphertext = base64ToBytes(ciphertextBase64);
    var iv = base64ToBytes(ivBase64);

    var plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    return bytesToText(new Uint8Array(plaintext));
  }

  /* ------------------------------------------------------------------
     ECDH
  ------------------------------------------------------------------ */

  async function generateECDHKeyPair() {
    return crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );
  }

  async function deriveECDHKey(privateKey, publicKey) {
    return crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async function deriveECDHBits(privateKey, publicKey) {
    return crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      256
    );
  }

  /* ------------------------------------------------------------------
     ECDSA
  ------------------------------------------------------------------ */

  async function generateECDSAKeyPair() {
    return crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );
  }

  async function signData(privateKey, data) {
    var bytes;

    if (typeof data === 'string') {
      bytes = textToBytes(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      bytes = new Uint8Array(data);
    }

    var signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: {
          name: 'SHA-256'
        }
      },
      privateKey,
      bytes
    );

    return arrayBufferToBase64(signature);
  }

  async function verifySignature(publicKey, signatureBase64, data) {
    var bytes;

    if (typeof data === 'string') {
      bytes = textToBytes(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      bytes = new Uint8Array(data);
    }

    return crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: {
          name: 'SHA-256'
        }
      },
      publicKey,
      base64ToArrayBuffer(signatureBase64),
      bytes
    );
  }

  /* ------------------------------------------------------------------
     Key export / import
  ------------------------------------------------------------------ */

  async function exportPublicKey(key) {
    var jwk = await crypto.subtle.exportKey('jwk', key);
    return jwk;
  }

  async function exportPrivateKey(key) {
    var jwk = await crypto.subtle.exportKey('jwk', key);
    return jwk;
  }

  async function exportAESKey(key) {
    var raw = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(raw);
  }

  async function importAESKey(base64) {
    return crypto.subtle.importKey(
      'raw',
      base64ToArrayBuffer(base64),
      {
        name: 'AES-GCM'
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async function importECDHPublicKey(jwk) {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      []
    );
  }

  async function importECDHPrivateKey(jwk) {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );
  }

  async function importECDSAPublicKey(jwk) {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['verify']
    );
  }

  async function importECDSAPrivateKey(jwk) {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign']
    );
  }

  /* ------------------------------------------------------------------
     Canonical JSON
     ------------------------------------------------------------------ */

  function canonicalize(value) {
    if (value === null) {
      return 'null';
    }

    if (typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return '[' +
        value.map(function (item) {
          return canonicalize(item);
        }).join(',') +
        ']';
    }

    return '{' +
      Object.keys(value)
        .sort()
        .map(function (key) {
          return JSON.stringify(key) + ':' + canonicalize(value[key]);
        })
        .join(',') +
      '}';
  }

  /* ------------------------------------------------------------------
     Public API
  ------------------------------------------------------------------ */

  CryptoShareCrypto.textToBytes = textToBytes;
  CryptoShareCrypto.bytesToText = bytesToText;

  CryptoShareCrypto.bytesToBase64 = bytesToBase64;
  CryptoShareCrypto.base64ToBytes = base64ToBytes;

  CryptoShareCrypto.arrayBufferToBase64 = arrayBufferToBase64;
  CryptoShareCrypto.base64ToArrayBuffer = base64ToArrayBuffer;

  CryptoShareCrypto.randomBytes = randomBytes;

  CryptoShareCrypto.sha256 = sha256;

  CryptoShareCrypto.generateAESKey = generateAESKey;
  CryptoShareCrypto.aesGcmEncrypt = aesGcmEncrypt;
  CryptoShareCrypto.aesGcmDecrypt = aesGcmDecrypt;

  CryptoShareCrypto.generateECDHKeyPair = generateECDHKeyPair;
  CryptoShareCrypto.deriveECDHKey = deriveECDHKey;
  CryptoShareCrypto.deriveECDHBits = deriveECDHBits;

  CryptoShareCrypto.generateECDSAKeyPair = generateECDSAKeyPair;
  CryptoShareCrypto.signData = signData;
  CryptoShareCrypto.verifySignature = verifySignature;

  CryptoShareCrypto.exportPublicKey = exportPublicKey;
  CryptoShareCrypto.exportPrivateKey = exportPrivateKey;
  CryptoShareCrypto.exportAESKey = exportAESKey;

  CryptoShareCrypto.importAESKey = importAESKey;
  CryptoShareCrypto.importECDHPublicKey = importECDHPublicKey;
  CryptoShareCrypto.importECDHPrivateKey = importECDHPrivateKey;
  CryptoShareCrypto.importECDSAPublicKey = importECDSAPublicKey;
  CryptoShareCrypto.importECDSAPrivateKey = importECDSAPrivateKey;

  CryptoShareCrypto.canonicalize = canonicalize;

  window.CryptoShareCrypto = CryptoShareCrypto;

})();