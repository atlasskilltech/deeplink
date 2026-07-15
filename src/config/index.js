'use strict';

require('dotenv').config();

/**
 * Centralised, validated configuration for the deep-linking backend.
 * Everything sensitive (fingerprints, Team ID, DB credentials, store IDs) is
 * sourced from the environment so nothing secret is committed to the repo.
 */

function str(name, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function int(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : fallback;
}

function bool(name, fallback = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function list(name, fallback = []) {
  const v = process.env[name];
  if (!v) return fallback;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const scheme = str('DEEPLINK_SCHEME', 'https');
const host = str('DEEPLINK_HOST', 'deeplink.atlasskilltech.app');

const config = {
  env: str('NODE_ENV', 'development'),
  port: int('PORT', 3000),
  trustProxy: bool('TRUST_PROXY', true),

  deeplink: {
    scheme,
    host,
    baseUrl: `${scheme}://${host}`,
  },

  db: {
    host: str('DB_HOST', '127.0.0.1'),
    port: int('DB_PORT', 3306),
    user: str('DB_USER', 'root'),
    password: str('DB_PASSWORD', ''),
    database: str('DB_NAME', 'erp'),
    connectionLimit: int('DB_CONNECTION_LIMIT', 10),
    menu: {
      table: str('DB_MENU_TABLE', 'menu_master'),
      routeColumn: str('DB_MENU_ROUTE_COLUMN', 'route'),
      labelColumn: str('DB_MENU_LABEL_COLUMN', 'label'),
      idColumn: str('DB_MENU_ID_COLUMN', 'menu_id'),
      deepLinkColumn: str('DB_MENU_DEEPLINK_COLUMN', 'is_deep_linkable'),
    },
  },

  android: {
    packageName: str('ANDROID_PACKAGE_NAME', 'com.atlas.tech'),
    sha256Fingerprints: list('ANDROID_SHA256_FINGERPRINTS', [
      'YOUR_RELEASE_SHA256_FINGERPRINT_HERE',
    ]),
  },

  ios: {
    teamId: str('IOS_TEAM_ID', 'TEAM_ID'),
    bundleId: str('IOS_BUNDLE_ID', 'com.atlas.tech'),
    appStoreId: str('IOS_APP_STORE_ID', 'YOUR_APP_ID'),
    useDynamicPaths: bool('IOS_AASA_USE_DYNAMIC_PATHS', false),
    get appId() {
      return `${this.teamId}.${this.bundleId}`;
    },
  },

  store: {
    playStoreUrl: str(
      'PLAY_STORE_URL',
      'https://play.google.com/store/apps/details?id=com.atlas.tech'
    ),
    appStoreUrl: str('APP_STORE_URL', 'https://apps.apple.com/app/idYOUR_APP_ID'),
  },
};

module.exports = config;
