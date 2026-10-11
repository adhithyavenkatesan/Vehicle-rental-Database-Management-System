const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function generatePaymentRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `PAY-${year}-${rand}`;
}

/**
 * GET /api/payments
 * List payments with filters
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { status, booking_id, customer_id, payment_method } = req.query;

    let sql = `
      SELECT p.*,
             b.booking_ref,
             r.rental_ref,
             v.make, v.model, v.reg_number,
             u.full_name as customer_name, u.email as customer_email
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN vehicles v ON (b.vehicle_id = v.id OR r.vehicle_id = v.id)
      JOIN customers c ON p.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'CUSTOMER') {
      sql += ' AND p.customer_id = ?';
      params.push(req.user.customer_id);
    } else if (customer_id) {
      sql += ' AND p.customer_id = ?';
      params.push(customer_id);
    }

    if (booking_id) {
      sql += ' AND p.booking_id = ?';
      params.push(booking_id);
    }

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status.toUpperCase());
    }

    if (payment_method) {
      sql += ' AND p.payment_method = ?';
      params.push(payment_method.toUpperCase());
    }

    sql += ' ORDER BY p.payment_date DESC';

    const payments = all(sql, params);
    res.json({ success: true, count: payments.length, payments });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payments/:id
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const payment = get(
      `SELECT p.*,
              b.booking_ref, b.estimated_total, b.start_date, b.end_date,
              r.rental_ref,
              v.make, v.model, v.reg_number,
              u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
              c.driving_license_no
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN rentals r ON p.rental_id = r.id
       LEFT JOIN vehicles v ON (b.vehicle_id = v.id OR r.vehicle_id = v.id)
       JOIN customers c ON p.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(payment.customer_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this receipt.' });
    }

    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments
 * Record a payment / safe mock payment gateway flow
 */
router.post('/', authenticate, (req, res, next) => {
  try {
    let { booking_id, rental_id, customer_id, amount, payment_method, notes } = req.body;

    if (req.user.role === 'CUSTOMER') {
      customer_id = req.user.customer_id;
    }

    if (!customer_id || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Customer and valid positive amount are required.' });
    }

    const payRef = generatePaymentRef();
    const txnRef = `TXN-SIM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const method = (payment_method || 'CARD').toUpperCase();

    const result = run(
      `INSERT INTO payments (
        payment_ref, booking_id, rental_id, customer_id, amount,
        payment_date, payment_method, status, transaction_ref, notes
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'PAID', ?, ?)`,
      [
        payRef,
        booking_id || null,
        rental_id || null,
        customer_id,
        Number(amount),
        method,
        txnRef,
        notes || 'Payment processed via simulator'
      ]
    );

    const payment = get('SELECT * FROM payments WHERE id = ?', [result.lastInsertRowid]);

    logAudit(
      req.user.id,
      'PAYMENT_RECORDED',
      'PAYMENT',
      payment.id,
      `Recorded payment ${payRef} of $${amount} via ${method}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      payment
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
