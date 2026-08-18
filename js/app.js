/* ==========================================================================
   CryptoShare — Trust Capsule
   js/app.js — Application Shell & Navigation
   Vanilla JS. No external libraries.
   ========================================================================== */

(function () {
  'use strict';

  var els = {
    views: [],
    navLinks: [],
    menuToggle: null,
    sidebar: null,
    sidebarScrim: null,
    topbarTitle: null,
    layerBadge: null,
    labStatus: null,
    comparisonTableBody: null
  };

  var VIEW_META = {
    dashboard: {
      title: 'Dashboard',
      layer: 'none'
    },
    'classical-lab': {
      title: 'Classical Cryptography Lab',
      layer: 'classical'
    },
    playfair: {
      title: 'Playfair Cipher',
      layer: 'classical'
    },
    hill: {
      title: 'Hill Cipher',
      layer: 'classical'
    },
    'capsule-create': {
      title: 'Trust Capsule Creator',
      layer: 'modern'
    },
    'capsule-verify': {
      title: 'Trust Capsule Verifier',
      layer: 'modern'
    },
    'security-analysis': {
      title: 'Security Analysis',
      layer: 'reference'
    },
    'crypto-journey': {
      title: 'Cryptographic Journey',
      layer: 'reference'
    },
    about: {
      title: 'About / Methodology',
      layer: 'reference'
    }
  };

  /* ------------------------------------------------------------------
     Cache DOM elements
  ------------------------------------------------------------------ */

  function cacheElements() {
    els.views = document.querySelectorAll('[data-view-section]');
    els.navLinks = document.querySelectorAll('[data-view]');
    els.menuToggle = document.getElementById('menuToggle');
    els.sidebar = document.getElementById('sidebar');
    els.sidebarScrim = document.getElementById('sidebarScrim');
    els.topbarTitle = document.getElementById('topbarTitle');
    els.layerBadge = document.getElementById('layerBadge');
    els.labStatus = document.getElementById('labStatus');
    els.comparisonTableBody =
      document.getElementById('comparisonTableBody');
  }

  /* ------------------------------------------------------------------
     Navigation
  ------------------------------------------------------------------ */

  function showView(viewName) {
    if (!VIEW_META[viewName]) {
      viewName = 'dashboard';
    }

    els.views.forEach(function (view) {
      view.classList.toggle(
        'is-active',
        view.dataset.viewSection === viewName
      );
    });

    els.navLinks.forEach(function (link) {
      var target = link.dataset.view;

      if (target === viewName) {
        link.classList.add('is-active');
      } else if (link.classList.contains('nav-link')) {
        link.classList.remove('is-active');
      }
    });

    updateTopbar(viewName);
    updateHash(viewName);
    closeMobileSidebar();

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    /* Refresh Playfair matrix when entering its view */
    if (
      viewName === 'playfair' &&
      window.CryptoSharePlayfair &&
      typeof window.CryptoSharePlayfair.refreshMatrix === 'function'
    ) {
      window.CryptoSharePlayfair.refreshMatrix();
    }

    /* Refresh Hill module when entering its view */
    if (
      viewName === 'hill' &&
      window.CryptoShareHill &&
      typeof window.CryptoShareHill.refresh === 'function'
    ) {
      window.CryptoShareHill.refresh();
    }
  }

  function updateTopbar(viewName) {
    var meta = VIEW_META[viewName];

    if (els.topbarTitle) {
      els.topbarTitle.textContent = meta.title;
    }

    if (els.layerBadge) {
      els.layerBadge.dataset.layer = meta.layer;

      if (meta.layer === 'classical') {
        els.layerBadge.textContent = 'LAYER 1';
      } else if (meta.layer === 'modern') {
        els.layerBadge.textContent = 'LAYER 2';
      } else if (meta.layer === 'reference') {
        els.layerBadge.textContent = 'REFERENCE';
      } else {
        els.layerBadge.textContent = '—';
      }
    }

    document.title = 'CryptoShare — ' + meta.title;
  }

  function updateHash(viewName) {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(
        null,
        '',
        '#' + viewName
      );
    }
  }

  function getInitialView() {
    var hash = window.location.hash.replace('#', '');

    if (VIEW_META[hash]) {
      return hash;
    }

    return 'dashboard';
  }

  /* ------------------------------------------------------------------
     Mobile sidebar
  ------------------------------------------------------------------ */

  function openMobileSidebar() {
    if (!els.sidebar) return;

    els.sidebar.classList.add('is-open');

    if (els.sidebarScrim) {
      els.sidebarScrim.hidden = false;
    }

    if (els.menuToggle) {
      els.menuToggle.setAttribute('aria-expanded', 'true');
    }
  }

  function closeMobileSidebar() {
    if (!els.sidebar) return;

    els.sidebar.classList.remove('is-open');

    if (els.sidebarScrim) {
      els.sidebarScrim.hidden = true;
    }

    if (els.menuToggle) {
      els.menuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleMobileSidebar() {
    if (!els.sidebar) return;

    if (els.sidebar.classList.contains('is-open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  }

  /* ------------------------------------------------------------------
     Navigation events
  ------------------------------------------------------------------ */

  function bindNavigation() {
    els.navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        var target = link.dataset.view;

        if (target) {
          showView(target);
        }
      });
    });

    if (els.menuToggle) {
      els.menuToggle.addEventListener(
        'click',
        toggleMobileSidebar
      );
    }

    if (els.sidebarScrim) {
      els.sidebarScrim.addEventListener(
        'click',
        closeMobileSidebar
      );
    }

    window.addEventListener('hashchange', function () {
      var viewName = getInitialView();
      showView(viewName);
    });
  }

  /* ------------------------------------------------------------------
     Security comparison table
  ------------------------------------------------------------------ */

  var COMPARISON_DATA = [
    {
      algorithm: 'Playfair',
      purpose: 'Educational encryption',
      type: 'Classical digraph cipher',
      strength: 'Low',
      use: 'Cryptography learning',
      limitations: 'Breakable with modern cryptanalysis',
      suitability: 'Educational only'
    },
    {
      algorithm: 'Hill Cipher',
      purpose: 'Educational matrix encryption',
      type: 'Classical polygraphic cipher',
      strength: 'Low',
      use: 'Modular linear algebra learning',
      limitations: 'Vulnerable to known-plaintext attacks',
      suitability: 'Educational only'
    },
    {
      algorithm: 'AES-GCM',
      purpose: 'Confidentiality + authentication',
      type: 'Authenticated symmetric encryption',
      strength: 'High',
      use: 'Modern secure communication',
      limitations: 'Requires secure key management and unique IVs',
      suitability: 'Modern use'
    },
    {
      algorithm: 'ECDH',
      purpose: 'Key establishment',
      type: 'Elliptic-curve key agreement',
      strength: 'High',
      use: 'Shared secret/session establishment',
      limitations: 'Requires authenticated public keys',
      suitability: 'Modern use'
    },
    {
      algorithm: 'SHA-256',
      purpose: 'Integrity hashing',
      type: 'Cryptographic hash',
      strength: 'High',
      use: 'Integrity verification',
      limitations: 'Hashing alone does not provide confidentiality',
      suitability: 'Modern use'
    },
    {
      algorithm: 'ECDSA',
      purpose: 'Digital signatures',
      type: 'Elliptic-curve signature',
      strength: 'High',
      use: 'Authentication and integrity',
      limitations: 'Requires correct key management',
      suitability: 'Modern use'
    }
  ];

  function renderComparisonTable() {
    if (!els.comparisonTableBody) return;

    els.comparisonTableBody.innerHTML = '';

    COMPARISON_DATA.forEach(function (item) {
      var row = document.createElement('tr');

      var values = [
        item.algorithm,
        item.purpose,
        item.type,
        item.strength,
        item.use,
        item.limitations,
        item.suitability
      ];

      values.forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });

      els.comparisonTableBody.appendChild(row);
    });
  }

  /* ------------------------------------------------------------------
     Lab status
  ------------------------------------------------------------------ */

  function setLabStatus(text, state) {
    if (!els.labStatus) return;

    var dot = els.labStatus.querySelector('.status-dot');

    if (dot) {
      dot.className = 'status-dot';

      if (state === 'active') {
        dot.classList.add('status-dot--active');
      } else if (state === 'success') {
        dot.classList.add('status-dot--success');
      } else if (state === 'error') {
        dot.classList.add('status-dot--error');
      } else {
        dot.classList.add('status-dot--idle');
      }
    }

    var textNode = els.labStatus.querySelector(
      '.lab-status-text'
    );

    if (!textNode) {
      textNode = document.createElement('span');
      textNode.className = 'lab-status-text';

      els.labStatus.appendChild(textNode);
    }

    textNode.textContent = text;
  }

  /* ------------------------------------------------------------------
     Keyboard support
  ------------------------------------------------------------------ */

  function bindKeyboard() {
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMobileSidebar();
      }
    });
  }

  /* ------------------------------------------------------------------
     Initialization
  ------------------------------------------------------------------ */

  function init() {
    cacheElements();
    bindNavigation();
    bindKeyboard();
    renderComparisonTable();

    var initialView = getInitialView();
    showView(initialView);

    setLabStatus('Lab session idle', 'idle');
  }

  /* ------------------------------------------------------------------
     Public API
  ------------------------------------------------------------------ */

  window.CryptoShareApp = {
    showView: showView,
    setLabStatus: setLabStatus,
    openSidebar: openMobileSidebar,
    closeSidebar: closeMobileSidebar
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();