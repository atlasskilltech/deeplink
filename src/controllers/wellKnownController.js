'use strict';

const deepLinkService = require('../services/deepLinkService');

/**
 * Serves the two platform verification files. Both MUST be:
 *   - HTTPS (handled by the reverse proxy / load balancer)
 *   - served with Content-Type: application/json
 *   - reachable with HTTP 200 and NO redirects
 */

// Android: /.well-known/assetlinks.json
function assetLinks(req, res) {
  const body = deepLinkService.buildAssetLinks();
  res
    .status(200)
    .type('application/json')
    // The store crawler benefits from a short cache; keep it modest so
    // fingerprint rotations propagate quickly.
    .set('Cache-Control', 'public, max-age=300')
    .json(body);
}

// iOS: /.well-known/apple-app-site-association  (NOTE: no .json extension)
async function appleAppSiteAssociation(req, res, next) {
  try {
    const body = await deepLinkService.buildAppleAppSiteAssociation();
    res
      .status(200)
      .type('application/json')
      .set('Cache-Control', 'public, max-age=300')
      .json(body);
  } catch (err) {
    next(err);
  }
}

module.exports = { assetLinks, appleAppSiteAssociation };
