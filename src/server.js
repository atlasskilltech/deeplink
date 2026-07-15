'use strict';

const app = require('./app');
const config = require('./config');
const db = require('./config/db');

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[deeplink] ATLAS deep-linking backend listening on port ${config.port} ` +
      `(${config.env}) — public host ${config.deeplink.baseUrl}`
  );
});

// --- Graceful shutdown ------------------------------------------------------
async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[deeplink] received ${signal}, shutting down...`);
  server.close(async () => {
    try {
      await db.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
  // Force-exit if connections don't drain in time.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
