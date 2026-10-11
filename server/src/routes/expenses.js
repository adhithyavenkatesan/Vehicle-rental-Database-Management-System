const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/expenses
 * List fleet expenses with optional category and vehicle filters
 */
router.get('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { category, vehicle_id, branch_id } = req.query;

    let sql = `
      SELECT e.*,
             v.make, v.model, v.reg_number,
             b.name as branch_name,
             u.full_name as approved_by_name
      FROM expenses e
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN users u ON e.approved_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }

    if (vehicle_id) {
      sql += ' AND e.vehicle_id = ?';
      params.push(vehicle_id);
    }

    if (branch_id) {
      sql += ' AND e.branch_id = ?';
      params.push(branch_id);
    }

    sql += ' ORDER BY e.expense_date DESC, e.id DESC';

    const expenses = all(sql, params);
    res.json({ success: true, count: expenses.length, expenses });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/expenses/summary
 * Total expenses and category distribution
 */
router.get('/summary', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const total = get('SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as count FROM expenses');

    const byCategory = all(`
      SELECT category, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count
      FROM expenses
      GROUP BY category
      ORDER BY total_amount DESC
    `);

    res.json({
      success: true,
      summary: {
        total_expenses: total.total_expenses,
        total_count: total.count,
        categories: byCategory
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/expenses
 * Record a new fleet expense
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      vehicle_id,
      branch_id,
      category,
      description,
      amount,
      expense_date,
      vendor_name,
      invoice_ref,
      payment_method
    } = req.body;

    if (!category || !description || !amount || !expense_date) {
      return res.status(400).json({
        success: false,
        message: 'Category, description, amount, and expense date are required.'
      });
    }

    const approvedBy = req.user.role === 'ADMIN' ? req.user.id : null;

    const result = run(
      `INSERT INTO expenses (
        vehicle_id, branch_id, category, description, amount,
        expense_date, vendor_name, invoice_ref, payment_method, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id || null, branch_id || null, category, description, Number(amount),
        expense_date, vendor_name || null, invoice_ref || null, payment_method || 'BANK_TRANSFER', approvedBy
      ]
    );

    // If large expense (> ₹15,000) and entered by staff, add to approvals queue
    if (Number(amount) > 15000 && req.user.role !== 'ADMIN') {
      run(
        `INSERT INTO approvals (approval_type, entity_type, entity_id, requested_by_user_id, status, request_details)
         VALUES ('EXPENSE_OVER_LIMIT', 'EXPENSE', ?, ?, 'PENDING', ?)`,
        [
          result.lastInsertRowid, req.user.id,
          JSON.stringify({ category, amount: Number(amount), description, vendor: vendor_name })
        ]
      );
    }

    logAudit(req.user.id, 'CREATE_EXPENSE', 'EXPENSE', result.lastInsertRowid, { category, amount }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully.',
      expense_id: result.lastInsertRowid
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
