'use strict';

const db = require('../config/db');
const config = require('../config');

/**
 * Menu data access. Reads deep-linkable routes from the existing ERP menu
 * table (`menu_master` by default). Table / column names are configurable, so
 * identifiers are validated against a strict allow-list pattern before being
 * interpolated into SQL — they can never be supplied by an end user.
 */

const IDENTIFIER_RE = /^[A-Za-z0-9_]+$/;

function safeIdentifier(name, label) {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(
      `Unsafe SQL identifier for ${label}: "${name}". ` +
        'Only letters, digits and underscores are allowed.'
    );
  }
  return `\`${name}\``;
}

const menu = config.db.menu;
const T = () => safeIdentifier(menu.table, 'menu table');
const COL = {
  id: () => safeIdentifier(menu.idColumn, 'id column'),
  route: () => safeIdentifier(menu.routeColumn, 'route column'),
  label: () => safeIdentifier(menu.labelColumn, 'label column'),
  deeplink: () => safeIdentifier(menu.deepLinkColumn, 'deep-link column'),
};

/**
 * Normalise a raw route value into a leading-slash path, e.g.
 *   "food-on-campus"   -> "/food-on-campus"
 *   "/food-on-campus/" -> "/food-on-campus"
 */
function normaliseRoute(route) {
  if (route === null || route === undefined) return null;
  let r = String(route).trim();
  if (!r) return null;
  if (!r.startsWith('/')) r = `/${r}`;
  if (r.length > 1) r = r.replace(/\/+$/, '');
  return r;
}

/**
 * Fetch all deep-linkable routes from the menu table.
 * A route is deep-linkable when it is non-null AND (the is_deep_linkable
 * column is truthy OR the column does not exist in this deployment yet).
 *
 * @returns {Promise<Array<{id: any, label: string|null, route: string}>>}
 */
async function getDeepLinkableRoutes() {
  const sql =
    `SELECT ${COL.id()} AS id, ${COL.label()} AS label, ${COL.route()} AS route ` +
    `FROM ${T()} ` +
    `WHERE ${COL.route()} IS NOT NULL AND ${COL.route()} <> '' ` +
    `AND (${COL.deeplink()} = 1 OR ${COL.deeplink()} IS NULL) ` +
    `ORDER BY ${COL.id()} ASC`;

  const rows = await db.query(sql);
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const route = normaliseRoute(row.route);
    if (!route || seen.has(route)) continue;
    seen.add(route);
    out.push({ id: row.id, label: row.label ?? null, route });
  }
  return out;
}

/**
 * Check whether a specific path is a registered deep-linkable route.
 * Returns the matching route row, or null.
 */
async function findRoute(path) {
  const target = normaliseRoute(path);
  if (!target) return null;
  const sql =
    `SELECT ${COL.id()} AS id, ${COL.label()} AS label, ${COL.route()} AS route ` +
    `FROM ${T()} ` +
    `WHERE ${COL.route()} = ? OR ${COL.route()} = ? ` +
    `LIMIT 1`;
  // Match both with and without the leading slash to tolerate mixed data.
  const rows = await db.query(sql, [target, target.replace(/^\//, '')]);
  if (!rows.length) return null;
  return { id: rows[0].id, label: rows[0].label ?? null, route: normaliseRoute(rows[0].route) };
}

module.exports = {
  getDeepLinkableRoutes,
  findRoute,
  normaliseRoute,
  safeIdentifier,
};
