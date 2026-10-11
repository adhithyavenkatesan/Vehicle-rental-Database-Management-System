const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/invoices
 * List invoices with role-based isolation
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    let sql = `
      SELECT inv.*,
             b.booking_ref, b.start_date, b.end_date,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.driving_license_no,
             v.make, v.model, v.reg_number
      FROM invoices inv
      JOIN bookings b ON inv.booking_id = b.id
      JOIN customers c ON inv.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'CUSTOMER') {
      sql += ' AND inv.customer_id = ?';
      params.push(req.user.customer_id);
    } else if (req.query.customer_id) {
      sql += ' AND inv.customer_id = ?';
      params.push(req.query.customer_id);
    }

    if (req.query.status) {
      sql += ' AND inv.payment_status = ?';
      params.push(req.query.status);
    }

    sql += ' ORDER BY inv.id DESC';

    const invoices = all(sql, params);
    res.json({ success: true, count: invoices.length, invoices });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/invoices/:id
 * Retrieve full invoice with itemized line charges and payments
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const invoice = get(`
      SELECT inv.*,
             b.booking_ref, b.start_date, b.end_date, b.total_days, b.daily_rate,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.driving_license_no, c.address as customer_address, c.city as customer_city,
             c.state as customer_state, c.postal_code as customer_pin,
             v.make, v.model, v.variant, v.year, v.reg_number, v.color, v.fuel_type
      FROM invoices inv
      JOIN bookings b ON inv.booking_id = b.id
      JOIN customers c ON inv.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE inv.id = ?
    `, [req.params.id]);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(invoice.customer_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this invoice.' });
    }

    // Line charges breakdown
    const charges = all('SELECT * FROM rental_charges WHERE invoice_id = ? ORDER BY id ASC', [invoice.id]);

    // Payment history
    const payments = all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC', [invoice.id]);

    res.json({
      success: true,
      invoice: {
        ...invoice,
        charges,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/invoices/ledger/:customer_id
 * Customer financial ledger statement with debits vs credits
 */
router.get('/ledger/:customer_id', authenticate, (req, res, next) => {
  try {
    const customerId = req.params.customer_id;

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(customerId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to customer ledger.' });
    }

    const customer = get(`
      SELECT c.*, u.full_name, u.email, u.phone
      FROM customers c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [customerId]);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Invoices (Debits)
    const invoices = all(`
      SELECT id, invoice_number, issue_date, total_amount, paid_amount, balance_due, payment_status, notes
      FROM invoices WHERE customer_id = ? ORDER BY issue_date ASC
    `, [customerId]);

    // Payments (Credits)
    const payments = all(`
      SELECT id, payment_ref, payment_date, amount, payment_method, status, transaction_ref
      FROM payments WHERE customer_id = ? AND status = 'PAID' ORDER BY payment_date ASC
    `, [customerId]);

    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const outstanding = Math.max(0, totalBilled - totalPaid);

    res.json({
      success: true,
      ledger: {
        customer,
        summary: {
          total_billed: Number(totalBilled.toFixed(2)),
          total_paid: Number(totalPaid.toFixed(2)),
          outstanding_balance: Number(outstanding.toFixed(2))
        },
        invoices,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/invoices/:id/pay
 * Record payment against an invoice
 */
router.post('/:id/pay', authenticate, (req, res, next) => {
  try {
    const invoice = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const { amount, payment_method, transaction_ref, notes } = req.body;
    const payAmt = Number(amount);

    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive payment amount is required.' });
    }

    const newPaid = Number((invoice.paid_amount + payAmt).toFixed(2));
    const newBalance = Math.max(0, Number((invoice.total_amount - newPaid).toFixed(2)));
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const result = transaction(() => {
      // 1. Insert payment record
      const payRef = `PAY-${Date.now().toString().slice(-6)}`;
      const pRes = run(
        `INSERT INTO payments (
          payment_ref, invoice_id, booking_id, rental_id, customer_id, amount,
          payment_method, status, transaction_ref, notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)`,
        [
          payRef, invoice.id, invoice.booking_id, invoice.rental_id, invoice.customer_id, payAmt,
          payment_method || 'UPI', transaction_ref || `TXN-${Date.now()}`, notes || 'Invoice balance settlement', req.user.id
        ]
      );

      // 2. Update invoice
      run(
        `UPDATE invoices
         SET paid_amount = ?, balance_due = ?, payment_status = ?
         WHERE id = ?`,
        [newPaid, newBalance, newStatus, invoice.id]
      );

      logAudit(
        req.user.id,
        'RECORD_PAYMENT',
        'INVOICE',
        invoice.id,
        { payment_ref: payRef, amount: payAmt, payment_method },
        req.ip
      );

      return pRes.lastInsertRowid;
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully.',
      payment_id: result,
      balance_due: newBalance,
      payment_status: newStatus
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
