'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { detectPlatform } = require('../src/services/platform');
const deepLinkService = require('../src/services/deepLinkService');
const { normaliseRoute } = require('../src/models/menuModel');

test('detectPlatform classifies Android', () => {
  const ua =
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';
  assert.equal(detectPlatform(ua), 'android');
});

test('detectPlatform classifies iOS (iPhone)', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  assert.equal(detectPlatform(ua), 'ios');
});

test('detectPlatform classifies iPad', () => {
  const ua =
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  assert.equal(detectPlatform(ua), 'ios');
});

test('detectPlatform falls back to desktop', () => {
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
  assert.equal(detectPlatform(ua), 'desktop');
});

test('normaliseRoute adds leading slash and trims trailing slash', () => {
  assert.equal(normaliseRoute('food-on-campus'), '/food-on-campus');
  assert.equal(normaliseRoute('/food-on-campus/'), '/food-on-campus');
  assert.equal(normaliseRoute('  /tuition-fee '), '/tuition-fee');
  assert.equal(normaliseRoute(''), null);
  assert.equal(normaliseRoute(null), null);
});

test('buildDeepLinkUrl builds a canonical URL with params', () => {
  const url = deepLinkService.buildDeepLinkUrl('/food-on-campus', { id: '123' });
  assert.equal(url, 'https://deeplink.atlasskilltech.app/food-on-campus?id=123');
});

test('buildDeepLinkUrl normalises a route without a leading slash', () => {
  const url = deepLinkService.buildDeepLinkUrl('announcements');
  assert.equal(url, 'https://deeplink.atlasskilltech.app/announcements');
});

test('buildDeepLinkUrl rejects an empty route', () => {
  assert.throws(() => deepLinkService.buildDeepLinkUrl(''));
});

test('buildAssetLinks has the correct relation and namespace', () => {
  const [statement] = deepLinkService.buildAssetLinks();
  assert.deepEqual(statement.relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(statement.target.namespace, 'android_app');
  assert.equal(statement.target.package_name, 'com.atlas.tech');
  assert.ok(Array.isArray(statement.target.sha256_cert_fingerprints));
});

test('buildAppleAppSiteAssociation defaults to wildcard paths', async () => {
  const aasa = await deepLinkService.buildAppleAppSiteAssociation();
  assert.ok(aasa.applinks);
  const detail = aasa.applinks.details[0];
  assert.match(detail.appID, /\.com\.atlas\.tech$/);
  assert.deepEqual(detail.paths, ['/*']);
});
