/**
 * CleanVault - Service Worker Registration
 *
 * Registers the CleanVault service worker so the application can launch and
 * operate with no internet connection after at least one successful visit.
 *
 * Design rules:
 *   - REGISTRATION IS NON-FATAL. If service workers are unsupported, blocked,
 *     or the registration fails for any reason, CleanVault must continue to
 *     work exactly as it does online. No user-visible error is ever shown.
 *   - No telemetry, no analytics, no tracking. The only request involved is
 *     the browser fetching /sw.js itself, which contains no user data.
 *   - CleanVault is published from the repository root on GitHub Pages
 *     (https://cleanvault.github.io/), so the service worker lives at the
 *     origin root and the registration path is '/sw.js' with scope '/'.
 */

(function () {
  'use strict';

  // Feature detection: unsupported browsers simply skip this block.
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Never attempt registration from file:// - it would always fail.
  if (window.location.protocol === 'file:') {
    return;
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(function (registration) {
        if (window.console && console.info) {
          console.info('[CleanVault] Offline support registered (scope: /).');
        }
      })
      .catch(function (error) {
        // Silent by design: offline support is an enhancement, not a
        // requirement. A failure here must never affect the application.
        if (window.console && console.warn) {
          console.warn('[CleanVault] Offline support unavailable; the app still works normally online.', error);
        }
      });
  });
})();