const express = require('express');
const fs = require('fs');
const { db, DB_PATH, all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/database/overview
 * Returns database engine stats, tables, indexes, row counts, and relational metadata
 */
router.get('/overview', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const stats = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : { size: 0 };
    const foreignKeys = get('PRAGMA foreign_keys');
    const journalMode = get('PRAGMA journal_mode');

    // Get list of all user tables
    const tablesRaw = all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC");

    const tables = tablesRaw.map(t => {
      const rowCount = get(`SELECT COUNT(*) as count FROM "${t.name}"`).count;
      const columns = all(`PRAGMA table_info("${t.name}")`);
      const foreignKeysList = all(`PRAGMA foreign_key_list("${t.name}")`);
      const indexes = all(`PRAGMA index_list("${t.name}")`);

      return {
        name: t.name,
        rowCount,
        columns: columns.map(c => ({
          cid: c.cid,
          name: c.name,
          type: c.type,
          notnull: !!c.notnull,
          dflt_value: c.dflt_value,
          pk: !!c.pk
        })),
        foreignKeys: foreignKeysList.map(fk => ({
          table: fk.table,
          from: fk.from,
          to: fk.to,
          on_update: fk.on_update,
          on_delete: fk.on_delete
        })),
        indexes: indexes.map(idx => ({
          name: idx.name,
          unique: !!idx.unique
        }))
      };
    });

    res.json({
      success: true,
      database: {
        engine: 'SQLite3 (Node Native DatabaseSync)',
        path: DB_PATH,
        fileSizeBytes: stats.size,
        journalMode: journalMode.journal_mode,
        foreignKeysEnabled: Object.values(foreignKeys)[0] === 1,
        totalTables: tables.length,
        tables
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/database/tables/:table
 * Paginated data browser for any database table
 */
router.get('/tables/:table', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const tableName = req.params.table;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    // Validate table exists in sqlite_master
    const tableExists = get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
    if (!tableExists) {
      return res.status(404).json({ success: false, message: `Table '${tableName}' does not exist.` });
    }

    const totalRows = get(`SELECT COUNT(*) as count FROM "${tableName}"`).count;
    const columns = all(`PRAGMA table_info("${tableName}")`);
    const rows = all(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`, [limit, offset]);

    res.json({
      success: true,
      table: tableName,
      columns,
      totalRows,
      page,
      limit,
      totalPages: Math.ceil(totalRows / limit),
      rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/database/query
 * Execute SQL query console for Admin
 */
router.post('/query', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, message: 'SQL query string is required.' });
    }

    const trimmed = sql.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA') || trimmed.toUpperCase().startsWith('EXPLAIN');

    if (isSelect) {
      const results = all(trimmed);
      return res.json({
        success: true,
        type: 'QUERY',
        count: results.length,
        results
      });
    }

    // DML / DDL statement
    const info = run(trimmed);
    logAudit(req.user.id, 'DATABASE_SQL_EXECUTE', 'DATABASE', null, `Admin executed SQL: ${trimmed.substring(0, 120)}`, req.ip);

    res.json({
      success: true,
      type: 'EXECUTE',
      changes: info.changes,
      lastInsertRowid: info.lastInsertRowid
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: `SQL Error: ${err.message}`
    });
  }
});

/**
 * GET /api/database/backup
 * Download full database contents as JSON
 */
router.get('/backup', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const tablesRaw = all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC");
    const dump = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };

    for (const t of tablesRaw) {
      dump.tables[t.name] = all(`SELECT * FROM "${t.name}"`);
    }

    logAudit(req.user.id, 'DATABASE_BACKUP_EXPORT', 'DATABASE', null, 'Exported database JSON snapshot', req.ip);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=vehiclerental_db_dump_${Date.now()}.json`);
    res.send(JSON.stringify(dump, null, 2));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/database/tables/:table/row
 * Insert a new record into a table (Admin only)
 */
router.post('/tables/:table/row', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const tableName = req.params.table;
    const data = req.body;

    const tableExists = get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
    if (!tableExists) {
      return res.status(404).json({ success: false, message: `Table '${tableName}' does not exist.` });
    }

    const columns = Object.keys(data).filter(k => k !== 'id');
    if (columns.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid columns provided.' });
    }

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(k => data[k]);
    const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

    const result = run(sql, values);
    logAudit(req.user.id, 'DBMS_INSERT_ROW', tableName, result.lastInsertRowid, data, req.ip);

    res.status(201).json({
      success: true,
      message: `Record inserted into ${tableName}.`,
      id: result.lastInsertRowid
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/database/tables/:table/row/:id
 * Update an existing record in a table (Admin only)
 */
router.put('/tables/:table/row/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const tableName = req.params.table;
    const rowId = req.params.id;
    const data = req.body;

    const tableExists = get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
    if (!tableExists) {
      return res.status(404).json({ success: false, message: `Table '${tableName}' does not exist.` });
    }

    const columns = Object.keys(data).filter(k => k !== 'id');
    if (columns.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid columns provided to update.' });
    }

    const setClauses = columns.map(c => `"${c}" = ?`).join(', ');
    const values = [...columns.map(k => data[k]), rowId];
    const sql = `UPDATE "${tableName}" SET ${setClauses} WHERE id = ?`;

    const result = run(sql, values);
    logAudit(req.user.id, 'DBMS_UPDATE_ROW', tableName, rowId, data, req.ip);

    res.json({
      success: true,
      message: `Record ${rowId} updated in ${tableName}.`,
      changes: result.changes
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/database/tables/:table/row/:id
 * Delete a record from a table (Admin only)
 */
router.delete('/tables/:table/row/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const tableName = req.params.table;
    const rowId = req.params.id;

    const tableExists = get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
    if (!tableExists) {
      return res.status(404).json({ success: false, message: `Table '${tableName}' does not exist.` });
    }

    const result = run(`DELETE FROM "${tableName}" WHERE id = ?`, [rowId]);
    logAudit(req.user.id, 'DBMS_DELETE_ROW', tableName, rowId, null, req.ip);

    res.json({
      success: true,
      message: `Record ${rowId} deleted from ${tableName}.`,
      changes: result.changes
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

