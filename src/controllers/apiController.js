'use strict';

const menuModel = require('../models/menuModel');
const deepLinkService = require('../services/deepLinkService');

/**
 * JSON API endpoints:
 *   GET  /erp/api/menus     — menu list enriched with deepLinkUrl / isDeepLinkable
 *   GET|POST /erp/api/deeplink — generate a shareable deep link for a route
 */

/**
 * Menu API integration (Section 7). Returns each deep-linkable route with the
 * pre-built `deepLinkUrl` so the app can share a screen without knowing the
 * domain. This is intentionally a thin, additive endpoint — the primary menu
 * config still lives in the ERP admin panel.
 */
async function menus(req, res, next) {
  try {
    const routes = await menuModel.getDeepLinkableRoutes();
    const items = routes.map((r) => ({
      menuId: r.id === null || r.id === undefined ? null : String(r.id),
      type: 'item',
      label: r.label,
      route: r.route,
      deepLinkUrl: deepLinkService.buildDeepLinkUrl(r.route),
      isDeepLinkable: true,
    }));
    res.status(200).json({ status: 1, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
}

/**
 * Deep-link generator (Section 6). Accepts a route + optional params and
 * returns a canonical shareable URL. Works with either a JSON body (POST) or
 * query-string params (GET) so it is easy to call from anywhere.
 *
 * Request (POST body or GET query):
 *   { "route": "/food-on-campus", "params": { "id": "123" } }
 * Response:
 *   { "status": 1, "url": "https://app.atlasskilltech.app/food-on-campus?id=123" }
 */
function generateDeepLink(req, res) {
  const source = req.method === 'GET' ? req.query : req.body || {};
  const route = source.route;

  if (!route || typeof route !== 'string') {
    return res.status(400).json({
      status: 0,
      error: 'A "route" string is required, e.g. "/food-on-campus".',
    });
  }

  // params may arrive as an object (JSON body) or a JSON string (query string).
  let params = source.params || {};
  if (typeof params === 'string') {
    try {
      params = JSON.parse(params);
    } catch {
      return res.status(400).json({
        status: 0,
        error: '"params" must be a JSON object.',
      });
    }
  }
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return res.status(400).json({
      status: 0,
      error: '"params" must be a JSON object of key/value pairs.',
    });
  }

  try {
    const url = deepLinkService.buildDeepLinkUrl(route, params);
    return res.status(200).json({ status: 1, url });
  } catch (err) {
    return res.status(400).json({ status: 0, error: err.message });
  }
}

module.exports = { menus, generateDeepLink };
