const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET all locations with active fleet counts
router.get('/', (req, res, next) => {
  try {
    const locations = all(`
      SELECT l.*, 
             COUNT(v.id) as total_vehicles,
             SUM(CASE WHEN v.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_vehicles
      FROM locations l
      LEFT JOIN vehicles v ON v.location_id = l.id
      GROUP BY l.id
      ORDER BY l.name ASC
    `);
    res.json({ success: true, locations });
  } catch (err) {
    next(err);
  }
});

// POST location (Admin & Staff)
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { name, code, address, city, phone, email } = req.body;
    if (!name || !code || !address || !city) {
      return res.status(400).json({ success: false, message: 'Name, code, address, and city are required.' });
    }

    const result = run(
      `INSERT INTO locations (name, code, address, city, phone, email, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name.trim(), code.trim().toUpperCase(), address.trim(), city.trim(), phone || null, email || null]
    );

    const location = get('SELECT * FROM locations WHERE id = ?', [result.lastInsertRowid]);
    logAudit(req.user.id, 'LOCATION_CREATED', 'LOCATION', location.id, `Created location ${location.name}`, req.ip);

    res.status(201).json({ success: true, location });
  } catch (err) {
    next(err);
  }
});

// PUT location (Admin & Staff)
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { name, code, address, city, phone, email, is_active } = req.body;
    run(
      `UPDATE locations SET
         name = COALESCE(?, name),
         code = COALESCE(?, code),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name,
        code ? code.trim().toUpperCase() : null,
        address,
        city,
        phone,
        email,
        is_active !== undefined ? Number(is_active) : null,
        req.params.id
      ]
    );

    const updated = get('SELECT * FROM locations WHERE id = ?', [req.params.id]);
    res.json({ success: true, location: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE location (Admin & Staff)
router.delete('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const locId = req.params.id;
    const loc = get('SELECT * FROM locations WHERE id = ?', [locId]);
    if (!loc) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const hasVehicles = get('SELECT id FROM vehicles WHERE location_id = ? LIMIT 1', [locId]);
    if (hasVehicles) {
      return res.status(400).json({ success: false, message: 'Cannot delete location with vehicles currently stationed there.' });
    }

    run('DELETE FROM locations WHERE id = ?', [locId]);
    logAudit(req.user.id, 'LOCATION_DELETED', 'LOCATION', locId, { name: loc.name }, req.ip);

    res.json({ success: true, message: `Location ${loc.name} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
