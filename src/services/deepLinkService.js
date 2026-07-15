'use strict';

const config = require('../config');
const menuModel = require('../models/menuModel');

/**
 * Business logic for building shareable deep links and the platform
 * verification files (assetlinks.json / apple-app-site-association).
 */

/**
 * Build a fully-qualified deep-link URL for a route, with optional query
 * params. e.g. buildDeepLinkUrl('/food-on-campus', { id: '123' })
 *        -> "https://app.atlasskilltech.app/food-on-campus?id=123"
 */
function buildDeepLinkUrl(route, params = {}) {
  const path = menuModel.normaliseRoute(route);
  if (!path) throw new Error('A non-empty route is required');

  const url = new URL(config.deeplink.baseUrl);
  url.pathname = path;

  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Android Digital Asset Links statement list.
 * https://developers.google.com/digital-asset-links
 */
function buildAssetLinks() {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.android.packageName,
        sha256_cert_fingerprints: config.android.sha256Fingerprints,
      },
    },
  ];
}

/**
 * Apple App Site Association (AASA).
 * By default we use a single "/*" wildcard which is recommended for a
 * dedicated app subdomain. When IOS_AASA_USE_DYNAMIC_PATHS is enabled we
 * enumerate the deep-linkable routes from the menu table instead.
 *
 * @param {Array<{route: string}>} [routes] pre-fetched routes (optional)
 */
async function buildAppleAppSiteAssociation(routes) {
  let paths = ['/*'];

  if (config.ios.useDynamicPaths) {
    const list = routes || (await safeGetRoutes());
    if (list.length) {
      paths = [];
      for (const r of list) {
        paths.push(r.route); // e.g. "/food-on-campus"
        paths.push(`${r.route}/*`); // e.g. "/food-on-campus/*"
      }
    }
  }

  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: config.ios.appId,
          paths,
        },
      ],
    },
    // webcredentials is harmless and enables Shared Web Credentials / autofill.
    webcredentials: {
      apps: [config.ios.appId],
    },
  };
}

/**
 * Fetch routes but never throw — used where a DB outage should degrade
 * gracefully to the wildcard behaviour instead of erroring the response.
 */
async function safeGetRoutes() {
  try {
    return await menuModel.getDeepLinkableRoutes();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[deeplink] failed to load routes from DB:', err.message);
    return [];
  }
}

module.exports = {
  buildDeepLinkUrl,
  buildAssetLinks,
  buildAppleAppSiteAssociation,
  safeGetRoutes,
};
