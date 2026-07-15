# ATLAS Deep Linking Backend

Node.js + Express + EJS + MySQL backend that powers **App Links (Android)** and
**Universal Links (iOS)** for the ATLAS Tech App.

When a user taps a link such as `https://deeplink.atlasskilltech.app/food-on-campus`
(shared via WhatsApp, email or SMS), the OS opens it **directly in the app**. If
the app isn't installed, the browser hits this backend and is redirected to the
Play Store / App Store instead.

Routes are **dynamic** — they come from the same menu configuration managed in
the ERP admin panel at `/erp/index.php/admin/menus`, so a new menu item becomes
a valid deep link with **no app update**.

---

## What this service does

| # | Responsibility | Route |
|---|---|---|
| 1 | Android verification file | `GET /.well-known/assetlinks.json` |
| 2 | iOS verification file | `GET /.well-known/apple-app-site-association` |
| 3 | Store fallback (app not installed) | `GET /*` (catch-all) |
| 4 | Menu API enriched with `deepLinkUrl` | `GET /erp/api/menus` |
| 5 | Share-link generator | `GET\|POST /erp/api/deeplink` |
| 6 | Health check | `GET /healthz` |

All of this runs as a single Node process **behind Nginx/Apache**, which
terminates TLS for the dedicated subdomain `deeplink.atlasskilltech.app`.

---

## Quick start

```bash
npm install
cp .env.example .env         # then fill in real values
npm run migrate              # adds is_deep_linkable column (idempotent)
npm start                    # or: npm run dev  (auto-reload)
npm test                     # unit + HTTP integration tests
```

The process listens on `PORT` (default `3000`). Point your reverse proxy at it
(see `deploy/`).

---

## Configuration

Everything sensitive lives in `.env` (never committed). See `.env.example` for
the full list. The important ones:

| Variable | Meaning |
|---|---|
| `DEEPLINK_HOST` | Public host used to build links (`deeplink.atlasskilltech.app`) |
| `DB_*` | Existing ERP MySQL connection |
| `DB_MENU_TABLE` / `DB_MENU_*_COLUMN` | Map to your real menu schema |
| `ANDROID_PACKAGE_NAME` | `com.atlas.tech` |
| `ANDROID_SHA256_FINGERPRINTS` | Release signing fingerprint(s), comma-separated |
| `IOS_TEAM_ID` / `IOS_BUNDLE_ID` | Builds the AASA `appID` (`TEAM_ID.com.atlas.tech`) |
| `IOS_AASA_USE_DYNAMIC_PATHS` | `false` = `/*` wildcard (recommended); `true` = enumerate menu routes |
| `PLAY_STORE_URL` / `APP_STORE_URL` | Store fallback targets |
| `IOS_APP_STORE_ID` | Numeric id for the iOS smart banner |

### Getting the Android fingerprint

```bash
keytool -list -v -keystore android/app/atlas.jks -alias atlas -storepass Atlas@2026
```

Copy the `SHA256:` value into `ANDROID_SHA256_FINGERPRINTS`.

### Getting the iOS Team ID

Apple Developer Portal → Membership → **Team ID**. Set `IOS_TEAM_ID`.

---

## Verification files

Both files are generated on the fly from configuration (and, for iOS dynamic
mode, from the menu table). They satisfy the platform requirements:

- served with `Content-Type: application/json`
- HTTP `200`, **no redirects** (the reverse proxy forwards `/.well-known/*`
  straight through)
- the iOS file has **no `.json` extension**

**Android** (`/.well-known/assetlinks.json`):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.atlas.tech",
      "sha256_cert_fingerprints": ["AB:CD:EF:..."]
    }
  }
]
```

**iOS** (`/.well-known/apple-app-site-association`), default wildcard:

```json
{
  "applinks": {
    "apps": [],
    "details": [{ "appID": "TEAM_ID.com.atlas.tech", "paths": ["/*"] }]
  },
  "webcredentials": { "apps": ["TEAM_ID.com.atlas.tech"] }
}
```

Set `IOS_AASA_USE_DYNAMIC_PATHS=true` to list each deep-linkable menu route
explicitly instead of `/*`.

---

## Menu database integration

The service reads deep-linkable routes from the existing menu table
(`menu_master` by default). A route is deep-linkable when its `route` is
non-empty **and** `is_deep_linkable = 1` (or the column doesn't exist yet, so
existing installs keep working before the migration is run).

Run the migration to add the toggle used by the admin panel:

```bash
npm run migrate
```

It adds `is_deep_linkable TINYINT(1) NOT NULL DEFAULT 1` to the configured menu
table, and is safe to run repeatedly. Raw SQL is in
`migrations/001_add_is_deep_linkable.sql`.

> **Admin panel change (frontend, separate task):** add an `is_deep_linkable`
> checkbox per menu item in `/erp/index.php/admin/menus`. This backend already
> honours the column.

---

## API

### `GET /erp/api/menus`

Returns deep-linkable menu items enriched with a ready-to-share URL:

```json
{
  "status": 1,
  "count": 1,
  "data": [
    {
      "menuId": "34",
      "type": "item",
      "label": "Food on Campus",
      "route": "/food-on-campus",
      "deepLinkUrl": "https://deeplink.atlasskilltech.app/food-on-campus",
      "isDeepLinkable": true
    }
  ]
}
```

### `GET | POST /erp/api/deeplink`

Generate a canonical shareable link. Centralising this means only the backend
changes if the domain ever changes.

```bash
# POST (JSON body)
curl -X POST https://deeplink.atlasskilltech.app/erp/api/deeplink \
  -H 'Content-Type: application/json' \
  -d '{"route":"/food-on-campus","params":{"id":"123"}}'

# GET (query params)
curl 'https://deeplink.atlasskilltech.app/erp/api/deeplink?route=/food-on-campus'
```

```json
{ "status": 1, "url": "https://deeplink.atlasskilltech.app/food-on-campus?id=123" }
```

---

## Fallback behaviour

The catch-all handler inspects the `User-Agent`:

- **Android** → `302` to the Play Store
- **iOS** → `302` to the App Store
- **Desktop / unknown** → renders `src/views/landing.ejs`, a branded page with
  Apple/Google **smart-banner** meta tags so mobile browsers show an
  "Open in App" banner.

Note: an **installed** app intercepts the URL before it reaches this server, so
the fallback is only ever hit when the app is missing.

---

## Deployment

The Node app must sit behind a TLS-terminating reverse proxy on the dedicated
subdomain. Examples are in `deploy/`:

- `deploy/nginx.conf.example`
- `deploy/apache.conf.example`
- `deploy/atlas-deeplink.service.example` (systemd)

DNS: add an `A`/`CNAME` record for `deeplink` pointing at the same server as
`www.atlasskilltech.app`, and make sure the TLS certificate covers
`deeplink.atlasskilltech.app` (a wildcard `*.atlasskilltech.app` works).

---

## Testing the deep links

```bash
# Android (device/emulator with the app installed)
adb shell am start -a android.intent.action.VIEW \
  -d "https://deeplink.atlasskilltech.app/food-on-campus" com.atlas.tech

# iOS — open the link in Safari or Notes; it should open the app.

# Fallback — uninstall the app, tap the link, confirm it goes to the store.

# Verify Google indexed the assetlinks statement:
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://deeplink.atlasskilltech.app&relation=delegate_permission/common.handle_all_urls"
```

Local smoke test without a proxy:

```bash
npm start
curl -i http://127.0.0.1:3000/.well-known/assetlinks.json
curl -i http://127.0.0.1:3000/.well-known/apple-app-site-association
curl -A "Mozilla/5.0 (Linux; Android 13)" -i http://127.0.0.1:3000/food-on-campus
```

---

## Project layout

```
src/
  config/          env config + MySQL pool
  models/          menu data access (safe identifier handling)
  services/        platform detection + link/verification builders
  controllers/     well-known, api, fallback
  routes/          express routers
  views/           landing.ejs (desktop fallback)
  app.js           express wiring
  server.js        entrypoint + graceful shutdown
migrations/        SQL for is_deep_linkable
scripts/migrate.js idempotent migration runner
deploy/            nginx / apache / systemd examples
test/              node:test unit + HTTP integration tests
```
