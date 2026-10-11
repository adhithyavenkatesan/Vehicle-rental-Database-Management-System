const express = require('express');
const { all } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/search?q=query
 * Unified enterprise global search
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, query: q, results: { bookings: [], vehicles: [], customers: [], invoices: [] } });
    }

    const pattern = `%${q}%`;

    // 1. Search Vehicles
    const vehicles = all(`
      SELECT id, reg_number, make, model, variant, year, status, daily_rate
      FROM vehicles
      WHERE reg_number LIKE ? OR make LIKE ? OR model LIKE ? OR vin LIKE ?
      LIMIT 10
    `, [pattern, pattern, pattern, pattern]);

    // 2. Search Bookings
    let bookings = [];
    if (req.user.role === 'CUSTOMER') {
      bookings = all(`
        SELECT b.id, b.booking_ref, b.start_date, b.end_date, b.status, b.estimated_total,
               v.make, v.model, v.reg_number
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.customer_id = ? AND (b.booking_ref LIKE ? OR v.make LIKE ? OR v.model LIKE ?)
        LIMIT 10
      `, [req.user.customer_id, pattern, pattern, pattern]);
    } else {
      bookings = all(`
        SELECT b.id, b.booking_ref, b.start_date, b.end_date, b.status, b.estimated_total,
               v.make, v.model, v.reg_number,
               u.full_name as customer_name
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        JOIN customers c ON b.customer_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE b.booking_ref LIKE ? OR v.reg_number LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?
        LIMIT 10
      `, [pattern, pattern, pattern, pattern]);
    }

    // 3. Search Customers (Staff / Admin only)
    let customers = [];
    if (req.user.role !== 'CUSTOMER') {
      customers = all(`
        SELECT c.id, c.driving_license_no, c.city, u.full_name, u.email, u.phone
        FROM customers c
        JOIN users u ON c.user_id = u.id
        WHERE u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR c.driving_license_no LIKE ?
        LIMIT 10
      `, [pattern, pattern, pattern, pattern]);
    }

    // 4. Search Invoices
    let invoices = [];
    if (req.user.role === 'CUSTOMER') {
      invoices = all(`
        SELECT id, invoice_number, issue_date, total_amount, payment_status
        FROM invoices
        WHERE customer_id = ? AND invoice_number LIKE ?
        LIMIT 10
      `, [req.user.customer_id, pattern]);
    } else {
      invoices = all(`
        SELECT inv.id, inv.invoice_number, inv.issue_date, inv.total_amount, inv.payment_status,
               u.full_name as customer_name
        FROM invoices inv
        JOIN customers c ON inv.customer_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE inv.invoice_number LIKE ? OR u.full_name LIKE ?
        LIMIT 10
      `, [pattern, pattern]);
    }

    res.json({
      success: true,
      query: q,
      results: {
        vehicles,
        bookings,
        customers,
        invoices
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
