'use strict';

const config = require('../config');
const { detectPlatform } = require('../services/platform');
const deepLinkService = require('../services/deepLinkService');

/**
 * Catch-all fallback (Section 5). Reached only when the link is opened in a
 * browser because the app is NOT installed (an installed app intercepts the
 * URL before it ever hits the server).
 *
 *   - Android  -> 302 redirect to the Play Store
 *   - iOS      -> 302 redirect to the App Store
 *   - Desktop  -> render a landing page with a smart banner + QR-less CTA
 */
function handleFallback(req, res) {
  const platform = detectPlatform(req.get('user-agent'));
  const path = req.path || '/';
  const deepLinkUrl = config.deeplink.baseUrl + req.originalUrl;

  if (platform === 'android') {
    return res.redirect(302, config.store.playStoreUrl);
  }
  if (platform === 'ios') {
    return res.redirect(302, config.store.appStoreUrl);
  }

  // Desktop / unknown — render a friendly landing page.
  return res.status(200).render('landing', {
    title: 'ATLAS Tech App',
    path,
    deepLinkUrl,
    androidPackage: config.android.packageName,
    iosAppStoreId: config.ios.appStoreId,
    playStoreUrl: config.store.playStoreUrl,
    appStoreUrl: config.store.appStoreUrl,
  });
}

module.exports = { handleFallback };
