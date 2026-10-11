const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tickets
 * List support tickets with role isolation
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    let sql = `
      SELECT t.*,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             b.booking_ref,
             s_u.full_name as assigned_staff_name
      FROM support_tickets t
      JOIN customers c ON t.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN bookings b ON t.booking_id = b.id
      LEFT JOIN staff s ON t.assigned_staff_id = s.id
      LEFT JOIN users s_u ON s.user_id = s_u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'CUSTOMER') {
      sql += ' AND t.customer_id = ?';
      params.push(req.user.customer_id);
    }

    if (req.query.status) {
      sql += ' AND t.status = ?';
      params.push(req.query.status.toUpperCase());
    }

    sql += " ORDER BY CASE WHEN t.status = 'OPEN' THEN 0 ELSE 1 END, t.created_at DESC";

    const tickets = all(sql, params);
    res.json({ success: true, count: tickets.length, tickets });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tickets/:id
 * Retrieve a specific support ticket
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const ticket = get(`
      SELECT t.*,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             b.booking_ref
      FROM support_tickets t
      JOIN customers c ON t.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN bookings b ON t.booking_id = b.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    }

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(ticket.customer_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this ticket.' });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets
 * Create new support ticket (Customer / User)
 */
router.post('/', authenticate, (req, res, next) => {
  try {
    let { subject, category, priority, message, booking_id } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    const customerId = req.user.customer_id;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Active customer profile required to create tickets.' });
    }

    const ref = `TCK-${Date.now().toString().slice(-6)}`;

    const result = run(
      `INSERT INTO support_tickets (
        ticket_ref, customer_id, booking_id, subject, category, priority, status, message
      ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      [
        ref, customerId, booking_id || null, subject,
        category || 'GENERAL', priority || 'MEDIUM', message
      ]
    );

    // Notify staff
    run(
      `INSERT INTO notifications (user_id, title, message, type, link)
       SELECT u.id, 'New Support Ticket Raised', ?, 'INFO', '/tickets'
       FROM users u
       WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'STAFF'))`,
      [`Ticket ${ref}: ${subject} by ${req.user.full_name}`]
    );

    logAudit(req.user.id, 'CREATE_TICKET', 'TICKET', result.lastInsertRowid, { ref, subject }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully.',
      ticket_id: result.lastInsertRowid,
      ticket_ref: ref
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/reply
 * Respond to a support ticket and update status (Staff/Admin)
 */
router.post('/:id/reply', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { response, status } = req.body;

    if (!response) {
      return res.status(400).json({ success: false, message: 'Response message is required.' });
    }

    const ticket = get('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const newStatus = status || 'RESOLVED';
    const staffId = req.user.staff_id || null;

    run(
      `UPDATE support_tickets
       SET staff_response = ?, status = ?, assigned_staff_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [response, newStatus, staffId, ticket.id]
    );

    // Notify customer
    const custUser = get('SELECT user_id FROM customers WHERE id = ?', [ticket.customer_id]);
    if (custUser) {
      run(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES (?, ?, ?, 'SUCCESS', '/customer-portal')`,
        [
          custUser.user_id,
          `Update on Ticket ${ticket.ticket_ref}`,
          `RentDrive Support responded to your inquiry: "${response.slice(0, 100)}..."`
        ]
      );
    }

    res.json({ success: true, message: 'Reply submitted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
