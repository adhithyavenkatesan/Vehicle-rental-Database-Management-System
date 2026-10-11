const express = require('express');
const { all } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/audit
 * Admin only: audit trail logs
 */
router.get('/', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const { action, entity_type, limit = 50 } = req.query;

    let sql = `
      SELECT a.*, u.email as user_email, u.full_name as user_full_name, r.name as user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      sql += ' AND a.action = ?';
      params.push(action);
    }

    if (entity_type) {
      sql += ' AND a.entity_type = ?';
      params.push(entity_type.toUpperCase());
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(Math.min(200, Math.max(1, Number(limit))));

    const logs = all(sql, params);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
