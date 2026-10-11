const express = require('express');
const bcrypt = require('bcryptjs');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/customers
 * List customers (Admin & Staff) with filters & rental activity
 */
router.get('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { search } = req.query;

    let sql = `
      SELECT c.*, 
             u.email, u.full_name, u.phone, u.status as account_status,
             COUNT(DISTINCT b.id) as total_bookings,
             COUNT(DISTINCT r.id) as total_rentals,
             SUM(CASE WHEN r.status = 'ACTIVE' THEN 1 ELSE 0 END) as active_rentals
      FROM customers c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN bookings b ON b.customer_id = c.id
      LEFT JOIN rentals r ON r.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR c.driving_license_no LIKE ? OR u.phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY c.id ORDER BY u.full_name ASC';

    const customers = all(sql, params);
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id
 * Retrieve full customer profile with complete booking, rental and payment history
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const customerId = req.params.id;

    // Customer can only view their own record unless Admin/Staff
    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(customerId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only view your own customer profile.' });
    }

    const customer = get(
      `SELECT c.*, u.email, u.full_name, u.phone, u.status as account_status
       FROM customers c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [customerId]
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found.' });
    }

    // Booking history
    const bookings = all(
      `SELECT b.*, v.make, v.model, v.reg_number, v.image_url,
              pl.name as pickup_location, rl.name as return_location
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN locations pl ON b.pickup_location_id = pl.id
       JOIN locations rl ON b.return_location_id = rl.id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [customerId]
    );

    // Rental history
    const rentals = all(
      `SELECT r.*, v.make, v.model, v.reg_number,
              ret.actual_return_time, ret.return_mileage, ret.total_additional_charges
       FROM rentals r
       JOIN vehicles v ON r.vehicle_id = v.id
       LEFT JOIN returns ret ON ret.rental_id = r.id
       WHERE r.customer_id = ?
       ORDER BY r.pickup_time DESC`,
      [customerId]
    );

    // Payments history
    const payments = all(
      `SELECT p.*
       FROM payments p
       WHERE p.customer_id = ?
       ORDER BY p.payment_date DESC`,
      [customerId]
    );

    res.json({
      success: true,
      customer: {
        ...customer,
        bookings,
        rentals,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers
 * Staff / Admin creates a walk-in or phone customer
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      driving_license_no,
      license_expiry,
      address,
      city,
      state,
      postal_code,
      id_card_type,
      id_card_no
    } = req.body;

    if (!full_name || !email || !driving_license_no || !license_expiry) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, driving license number, and license expiry date are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const existingLicense = get('SELECT id FROM customers WHERE driving_license_no = ?', [driving_license_no.trim()]);
    if (existingLicense) {
      return res.status(409).json({ success: false, message: 'Driving license number already registered.' });
    }

    const customerRole = get('SELECT id FROM roles WHERE name = ?', ['CUSTOMER']);
    const pass = password || 'Customer@123';
    const passwordHash = bcrypt.hashSync(pass, 10);

    const result = transaction(() => {
      const uRes = run(
        'INSERT INTO users (role_id, email, password_hash, full_name, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
        [customerRole.id, cleanEmail, passwordHash, full_name.trim(), phone || null, 'ACTIVE']
      );

      const cRes = run(
        `INSERT INTO customers (
          user_id, driving_license_no, license_expiry, address, city, state, postal_code, id_card_type, id_card_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uRes.lastInsertRowid,
          driving_license_no.trim(),
          license_expiry,
          address || null,
          city || null,
          state || null,
          postal_code || null,
          id_card_type || 'DRIVERS_LICENSE',
          id_card_no || null
        ]
      );

      return cRes.lastInsertRowid;
    });

    const newCustomer = get(
      `SELECT c.*, u.email, u.full_name, u.phone
       FROM customers c JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result]
    );

    logAudit(req.user.id, 'CUSTOMER_CREATED_BY_STAFF', 'CUSTOMER', result, `Created customer record for ${newCustomer.full_name}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Customer record created successfully',
      customer: newCustomer
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/customers/:id
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const customerId = req.params.id;
    const customer = get('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const {
      full_name,
      phone,
      driving_license_no,
      license_expiry,
      address,
      city,
      state,
      postal_code,
      id_card_type,
      id_card_no
    } = req.body;

    transaction(() => {
      if (full_name || phone) {
        run('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
          full_name,
          phone,
          customer.user_id
        ]);
      }

      run(
        `UPDATE customers SET
           driving_license_no = COALESCE(?, driving_license_no),
           license_expiry = COALESCE(?, license_expiry),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           postal_code = COALESCE(?, postal_code),
           id_card_type = COALESCE(?, id_card_type),
           id_card_no = COALESCE(?, id_card_no)
         WHERE id = ?`,
        [
          driving_license_no,
          license_expiry,
          address,
          city,
          state,
          postal_code,
          id_card_type,
          id_card_no,
          customerId
        ]
      );
    });

    const updated = get(
      `SELECT c.*, u.email, u.full_name, u.phone
       FROM customers c JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [customerId]
    );

    logAudit(req.user.id, 'CUSTOMER_UPDATED', 'CUSTOMER', customerId, `Updated customer ${updated.full_name}`, req.ip);

    res.json({
      success: true,
      message: 'Customer record updated successfully',
      customer: updated
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
