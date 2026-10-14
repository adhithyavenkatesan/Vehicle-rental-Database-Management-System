const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/branches
 * List all branches with fleet and staff aggregates
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const branches = all(`
      SELECT b.*,
             (SELECT COUNT(*) FROM vehicles v WHERE v.branch_id = b.id) as vehicle_count,
             (SELECT COUNT(*) FROM staff s WHERE s.branch_id = b.id) as staff_count,
             (SELECT COUNT(*) FROM bookings bk WHERE bk.branch_id = b.id AND bk.status = 'ACTIVE') as active_rentals_count
      FROM branches b
      ORDER BY b.id ASC
    `);

    res.json({ success: true, count: branches.length, branches });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/branches/:id
 * Retrieve branch details with assigned vehicles and staff
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const branch = get('SELECT * FROM branches WHERE id = ?', [req.params.id]);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    const vehicles = all('SELECT id, reg_number, make, model, status, daily_rate FROM vehicles WHERE branch_id = ?', [branch.id]);
    const staff = all('SELECT s.id, s.employee_code, s.department, s.designation, u.full_name, u.email, u.phone FROM staff s JOIN users u ON s.user_id = u.id WHERE s.branch_id = ?', [branch.id]);

    res.json({ success: true, branch: { ...branch, vehicles, staff } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/branches
 * Create a new operational branch (Admin & Staff)
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { name, code, address, city, phone, email, manager_name, operating_hours } = req.body;

    if (!name || !code || !address || !city) {
      return res.status(400).json({ success: false, message: 'Name, unique code, address, and city are required.' });
    }

    const existing = get('SELECT id FROM branches WHERE code = ?', [code.toUpperCase()]);
    if (existing) {
      return res.status(409).json({ success: false, message: `Branch code '${code}' already exists.` });
    }

    const result = run(
      `INSERT INTO branches (name, code, address, city, phone, email, manager_name, operating_hours, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, code.toUpperCase(), address, city, phone || null, email || null, manager_name || null, operating_hours || '08:00 AM - 10:00 PM']
    );

    logAudit(req.user.id, 'CREATE_BRANCH', 'BRANCH', result.lastInsertRowid, { name, code: code.toUpperCase() }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Branch created successfully.',
      branch_id: result.lastInsertRowid
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/branches/:id
 * Update branch details (Admin & Staff)
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const branch = get('SELECT * FROM branches WHERE id = ?', [req.params.id]);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    const { name, address, city, phone, email, manager_name, operating_hours, is_active } = req.body;

    run(
      `UPDATE branches
       SET name = COALESCE(?, name),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           manager_name = COALESCE(?, manager_name),
           operating_hours = COALESCE(?, operating_hours),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, address, city, phone, email, manager_name, operating_hours, is_active !== undefined ? Number(is_active) : null, branch.id]
    );

    logAudit(req.user.id, 'UPDATE_BRANCH', 'BRANCH', branch.id, { name }, req.ip);

    res.json({ success: true, message: 'Branch updated successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/branches/:id
 * Delete branch (Admin & Staff)
 */
router.delete('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const branchId = req.params.id;
    const branch = get('SELECT * FROM branches WHERE id = ?', [branchId]);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    // Check active rentals tied to this branch
    const activeBooking = get("SELECT id FROM bookings WHERE branch_id = ? AND status = 'ACTIVE' LIMIT 1", [branchId]);
    if (activeBooking) {
      return res.status(400).json({ success: false, message: 'Cannot delete branch with active ongoing rentals.' });
    }

    transaction(() => {
      // Safely unassign vehicles and staff from this branch
      run('UPDATE vehicles SET branch_id = NULL WHERE branch_id = ?', [branchId]);
      run('UPDATE staff SET branch_id = NULL WHERE branch_id = ?', [branchId]);
      run('DELETE FROM branches WHERE id = ?', [branchId]);
    });

    logAudit(req.user.id, 'DELETE_BRANCH', 'BRANCH', branchId, { name: branch.name, code: branch.code }, req.ip);

    res.json({ success: true, message: `Branch ${branch.name} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
