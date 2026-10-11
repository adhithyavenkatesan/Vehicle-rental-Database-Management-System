const express = require('express');
const bcrypt = require('bcryptjs');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/staff
 * Admin only: view all staff members
 */
router.get('/', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const staff = all(`
      SELECT s.*, u.email, u.full_name, u.phone, u.status as account_status,
             COUNT(r.id) as processed_rentals
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN rentals r ON r.staff_id = s.id
      GROUP BY s.id
      ORDER BY u.full_name ASC
    `);
    res.json({ success: true, count: staff.length, staff });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/staff
 * Admin only: create a staff account
 */
router.post('/', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const { full_name, email, phone, password, employee_code, department, designation, hire_date } = req.body;

    if (!full_name || !email || !employee_code || !designation || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, employee code, designation, and hire date are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const existingCode = get('SELECT id FROM staff WHERE employee_code = ?', [employee_code.trim().toUpperCase()]);
    if (existingCode) {
      return res.status(409).json({ success: false, message: 'Employee code already exists.' });
    }

    const staffRole = get('SELECT id FROM roles WHERE name = ?', ['STAFF']);
    const pass = password || 'Staff@123';
    const passwordHash = bcrypt.hashSync(pass, 10);

    const result = transaction(() => {
      const uRes = run(
        'INSERT INTO users (role_id, email, password_hash, full_name, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
        [staffRole.id, cleanEmail, passwordHash, full_name.trim(), phone || null, 'ACTIVE']
      );

      const sRes = run(
        `INSERT INTO staff (user_id, employee_code, department, designation, hire_date)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uRes.lastInsertRowid,
          employee_code.trim().toUpperCase(),
          department || 'OPERATIONS',
          designation.trim(),
          hire_date
        ]
      );

      return sRes.lastInsertRowid;
    });

    const newStaff = get(
      `SELECT s.*, u.email, u.full_name, u.phone
       FROM staff s JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [result]
    );

    logAudit(req.user.id, 'STAFF_CREATED', 'STAFF', result, `Created staff member ${newStaff.full_name} (${newStaff.employee_code})`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Staff member onboarded successfully',
      staff: newStaff
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/staff/:id
 */
router.put('/:id', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const staffId = req.params.id;
    const staff = get('SELECT * FROM staff WHERE id = ?', [staffId]);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const { full_name, phone, department, designation, account_status } = req.body;

    transaction(() => {
      if (full_name || phone || account_status) {
        run(
          `UPDATE users SET
             full_name = COALESCE(?, full_name),
             phone = COALESCE(?, phone),
             status = COALESCE(?, status),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [full_name, phone, account_status, staff.user_id]
        );
      }

      run(
        `UPDATE staff SET
           department = COALESCE(?, department),
           designation = COALESCE(?, designation)
         WHERE id = ?`,
        [department, designation, staffId]
      );
    });

    const updated = get(
      `SELECT s.*, u.email, u.full_name, u.phone, u.status as account_status
       FROM staff s JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [staffId]
    );

    logAudit(req.user.id, 'STAFF_UPDATED', 'STAFF', staffId, `Updated staff ${updated.full_name}`, req.ip);

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: updated
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
