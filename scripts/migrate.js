'use strict';

/**
 * Idempotent migration runner. Applies the `is_deep_linkable` column to the
 * configured menu table only if it does not already exist, so it is safe to
 * run repeatedly against the existing ERP database.
 *
 *   node scripts/migrate.js
 */

const config = require('../src/config');
const db = require('../src/config/db');
const { safeIdentifier } = require('../src/models/menuModel');

async function columnExists(table, column) {
  const rows = await db.query(
    `SELECT COUNT(*) AS n
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [config.db.database, table, column]
  );
  return rows[0] && rows[0].n > 0;
}

async function main() {
  const table = config.db.menu.table;
  const column = config.db.menu.deepLinkColumn;

  // Validate identifiers before interpolating into DDL (cannot be parameterised).
  const tIdent = safeIdentifier(table, 'menu table');
  const cIdent = safeIdentifier(column, 'deep-link column');

  console.log(`[migrate] target: ${config.db.database}.${table}.${column}`);

  if (await columnExists(table, column)) {
    console.log('[migrate] column already exists — nothing to do.');
  } else {
    await db.query(
      `ALTER TABLE ${tIdent} ADD COLUMN ${cIdent} TINYINT(1) NOT NULL DEFAULT 1 ` +
        `COMMENT 'If 1, this route can be opened via an app deep link'`
    );
    console.log('[migrate] column added successfully.');
  }

  await db.close();
}

main().catch(async (err) => {
  console.error('[migrate] failed:', err.message);
  try {
    await db.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
