'use strict';

const mysql = require('mysql2/promise');
const config = require('./index');

/**
 * A single shared MySQL connection pool. The pool is created lazily on first
 * use so the process can still boot (and serve wildcard verification files)
 * even when the database is temporarily unreachable.
 */

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

/**
 * Run a parameterised query. Returns the rows array.
 */
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

/**
 * Lightweight health check used by /healthz.
 */
async function ping() {
  await getPool().query('SELECT 1');
  return true;
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, ping, close };
