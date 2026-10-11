const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'vehiclerental.db');

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Configure SQLite for high reliability and referential integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

/**
 * Run a multi-statement SQL script (e.g. schema creation)
 */
function execScript(sql) {
  return db.exec(sql);
}

function sanitizeParams(params) {
  const arr = Array.isArray(params) ? params : [params];
  return arr.map(val => (val === undefined ? null : val));
}

/**
 * Execute a query and return all matching rows
 * @param {string} sql
 * @param {Array|Object} params
 * @returns {Array<Object>}
 */
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...sanitizeParams(params));
}

/**
 * Execute a query and return the first matching row
 * @param {string} sql
 * @param {Array|Object} params
 * @returns {Object|undefined}
 */
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...sanitizeParams(params));
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement
 * @param {string} sql
 * @param {Array|Object} params
 * @returns {{ changes: number, lastInsertRowid: number|bigint }}
 */
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const info = stmt.run(...sanitizeParams(params));
  return {
    changes: info.changes,
    lastInsertRowid: Number(info.lastInsertRowid)
  };
}

/**
 * Execute a function inside an atomic database transaction
 * @param {Function} callback
 * @returns {*}
 */
function transaction(callback) {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = callback();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (rbErr) {
      // rollback error suppressed
    }
    throw error;
  }
}

/**
 * Audit log helper
 */
function logAudit(userId, action, entityType, entityId, details, ip = null) {
  try {
    run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, action, entityType, entityId || null, typeof details === 'object' ? JSON.stringify(details) : details, ip]
    );
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
}

module.exports = {
  db,
  DB_PATH,
  execScript,
  all,
  get,
  run,
  transaction,
  logAudit
};
