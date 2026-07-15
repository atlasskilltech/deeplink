'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
const app = require('../src/app');

let server;
let base;

function request(pathname, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      base + pathname,
      {
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: chunks })
        );
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  if (server) server.close();
});

test('GET /.well-known/assetlinks.json returns JSON 200', async () => {
  const res = await request('/.well-known/assetlinks.json');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const json = JSON.parse(res.body);
  assert.equal(json[0].target.namespace, 'android_app');
});

test('GET /.well-known/apple-app-site-association returns JSON 200 (no extension)', async () => {
  const res = await request('/.well-known/apple-app-site-association');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const json = JSON.parse(res.body);
  assert.ok(json.applinks.details[0].appID);
});

test('GET /erp/api/deeplink builds a URL', async () => {
  const res = await request('/erp/api/deeplink?route=/food-on-campus');
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.status, 1);
  assert.equal(json.url, 'https://deeplink.atlasskilltech.app/food-on-campus');
});

test('POST /erp/api/deeplink with params', async () => {
  const res = await request('/erp/api/deeplink', {
    method: 'POST',
    body: { route: '/food-on-campus', params: { id: '123' } },
  });
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.url, 'https://deeplink.atlasskilltech.app/food-on-campus?id=123');
});

test('POST /erp/api/deeplink without route -> 400', async () => {
  const res = await request('/erp/api/deeplink', { method: 'POST', body: {} });
  assert.equal(res.status, 400);
  const json = JSON.parse(res.body);
  assert.equal(json.status, 0);
});

test('fallback: Android UA redirects to Play Store', async () => {
  const res = await request('/food-on-campus', {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    },
  });
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /play\.google\.com/);
});

test('fallback: iOS UA redirects to App Store', async () => {
  const res = await request('/food-on-campus', {
    headers: {
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    },
  });
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /apps\.apple\.com/);
});

test('fallback: desktop UA renders landing page with smart banners', async () => {
  const res = await request('/food-on-campus', {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.body, /apple-itunes-app/);
  assert.match(res.body, /google-play-app/);
  assert.match(res.body, /food-on-campus/);
});

test('GET /healthz responds', async () => {
  const res = await request('/healthz');
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.status, 'ok');
});
