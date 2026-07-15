'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const db = require('./config/db');
const wellKnownRoutes = require('./routes/wellKnown');
const apiRoutes = require('./routes/api');
const { handleFallback } = require('./controllers/fallbackController');

const app = express();

// Behind Nginx/Apache which terminates TLS for deeplink.atlasskilltech.app.
if (config.trustProxy) app.set('trust proxy', true);

// Views (EJS) for the desktop fallback landing page.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Global middleware -----------------------------------------------------
app.use(
  helmet({
    // The landing page uses a small inline <style> block; allow it explicitly
    // rather than pulling in an external stylesheet.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
      },
    },
    // Universal Links / App Links crawlers fetch over the open web; keep the
    // referrer policy strict but don't break cross-navigation to the stores.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

// --- Health check ----------------------------------------------------------
app.get('/healthz', async (req, res) => {
  let dbOk = false;
  try {
    dbOk = await db.ping();
  } catch {
    dbOk = false;
  }
  res.status(200).json({
    status: 'ok',
    db: dbOk ? 'up' : 'down',
    host: config.deeplink.host,
    time: new Date().toISOString(),
  });
});

// --- Verification files (must never redirect) ------------------------------
app.use('/.well-known', wellKnownRoutes);

// --- JSON API --------------------------------------------------------------
// Mounted to mirror the ERP path convention from the requirements.
app.use('/erp/api', apiRoutes);

// --- Catch-all fallback ----------------------------------------------------
// Any remaining GET is a deep-link opened in a browser (app not installed).
app.get('*', handleFallback);

// Non-GET requests to unknown paths.
app.use((req, res) => {
  res.status(404).json({ status: 0, error: 'Not found' });
});

// --- Error handler ---------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('[deeplink] error:', err);
  if (res.headersSent) return;
  res.status(500).json({ status: 0, error: 'Internal server error' });
});

module.exports = app;
