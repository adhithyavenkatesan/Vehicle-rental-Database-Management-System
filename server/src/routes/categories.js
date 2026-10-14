const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET all categories with vehicle counts
router.get('/', (req, res, next) => {
  try {
    const categories = all(`
      SELECT c.*, 
             COUNT(v.id) as total_vehicles,
             SUM(CASE WHEN v.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_vehicles
      FROM vehicle_categories c
      LEFT JOIN vehicles v ON v.category_id = c.id
      GROUP BY c.id
      ORDER BY c.daily_rate ASC
    `);
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

// POST category (Admin & Staff)
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { name, code, description, daily_rate, hourly_rate, deposit_amount, icon } = req.body;
    if (!name || !code || !daily_rate) {
      return res.status(400).json({ success: false, message: 'Name, code, and daily rate are required.' });
    }

    const result = run(
      `INSERT INTO vehicle_categories (name, code, description, daily_rate, hourly_rate, deposit_amount, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), code.trim().toUpperCase(), description, Number(daily_rate), Number(hourly_rate) || 0, Number(deposit_amount) || 200, icon || 'Car']
    );

    const category = get('SELECT * FROM vehicle_categories WHERE id = ?', [result.lastInsertRowid]);
    logAudit(req.user.id, 'CATEGORY_CREATED', 'CATEGORY', category.id, `Created category ${category.name}`, req.ip);

    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
});

// PUT category (Admin & Staff)
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { name, code, description, daily_rate, hourly_rate, deposit_amount, icon } = req.body;
    run(
      `UPDATE vehicle_categories SET
         name = COALESCE(?, name),
         code = COALESCE(?, code),
         description = COALESCE(?, description),
         daily_rate = COALESCE(?, daily_rate),
         hourly_rate = COALESCE(?, hourly_rate),
         deposit_amount = COALESCE(?, deposit_amount),
         icon = COALESCE(?, icon)
       WHERE id = ?`,
      [
        name,
        code ? code.trim().toUpperCase() : null,
        description,
        daily_rate ? Number(daily_rate) : null,
        hourly_rate ? Number(hourly_rate) : null,
        deposit_amount ? Number(deposit_amount) : null,
        icon,
        req.params.id
      ]
    );

    const updated = get('SELECT * FROM vehicle_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, category: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE category (Admin & Staff)
router.delete('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const catId = req.params.id;
    const cat = get('SELECT * FROM vehicle_categories WHERE id = ?', [catId]);
    if (!cat) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const hasVehicles = get('SELECT id FROM vehicles WHERE category_id = ? LIMIT 1', [catId]);
    if (hasVehicles) {
      return res.status(400).json({ success: false, message: 'Cannot delete category that currently has vehicles assigned.' });
    }

    run('DELETE FROM vehicle_categories WHERE id = ?', [catId]);
    logAudit(req.user.id, 'CATEGORY_DELETED', 'CATEGORY', catId, { name: cat.name }, req.ip);

    res.json({ success: true, message: `Category ${cat.name} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
