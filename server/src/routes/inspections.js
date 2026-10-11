const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/inspections
 * List all inspection reports
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { vehicle_id, inspection_type } = req.query;

    let sql = `
      SELECT i.*,
             v.make, v.model, v.reg_number,
             s.employee_code, u.full_name as staff_name,
             r.rental_ref
      FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN staff s ON i.staff_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN rentals r ON i.rental_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND i.vehicle_id = ?';
      params.push(vehicle_id);
    }

    if (inspection_type) {
      sql += ' AND i.inspection_type = ?';
      params.push(inspection_type);
    }

    sql += ' ORDER BY i.created_at DESC';

    const inspections = all(sql, params);
    res.json({ success: true, count: inspections.length, inspections });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/inspections/rental/:rental_id
 * Get pickup and return inspections for a rental
 */
router.get('/rental/:rental_id', authenticate, (req, res, next) => {
  try {
    const inspections = all(
      `SELECT i.*, v.make, v.model, v.reg_number, u.full_name as staff_name
       FROM inspections i
       JOIN vehicles v ON i.vehicle_id = v.id
       LEFT JOIN staff s ON i.staff_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE i.rental_id = ?
       ORDER BY i.created_at ASC`,
      [req.params.rental_id]
    );

    res.json({ success: true, inspections });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/inspections
 * Record comprehensive digital inspection checklist (Staff / Admin)
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      rental_id,
      vehicle_id,
      inspection_type,
      odometer_reading,
      fuel_level,
      exterior_front,
      exterior_rear,
      exterior_left,
      exterior_right,
      roof_condition,
      interior_cabin,
      tyres_condition,
      lights_condition,
      mirrors_windows,
      has_damage,
      damage_details,
      estimated_damage_cost,
      notes
    } = req.body;

    if (!vehicle_id || !inspection_type || odometer_reading === undefined || !fuel_level) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, inspection type, odometer reading, and fuel level are required.'
      });
    }

    const staffId = req.user.staff_id || null;

    const result = transaction(() => {
      const insRes = run(
        `INSERT INTO inspections (
          rental_id, vehicle_id, staff_id, inspection_type, odometer_reading, fuel_level,
          exterior_front, exterior_rear, exterior_left, exterior_right, roof_condition,
          interior_cabin, tyres_condition, lights_condition, mirrors_windows,
          has_damage, damage_details, estimated_damage_cost, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rental_id || null, vehicle_id, staffId, inspection_type, Number(odometer_reading), fuel_level,
          exterior_front || 'PASS', exterior_rear || 'PASS', exterior_left || 'PASS', exterior_right || 'PASS',
          roof_condition || 'PASS', interior_cabin || 'PASS', tyres_condition || 'PASS',
          lights_condition || 'PASS', mirrors_windows || 'PASS',
          has_damage ? 1 : 0, damage_details || null, Number(estimated_damage_cost || 0), notes || null
        ]
      );

      // If damage found, update vehicle status to DAMAGED
      if (has_damage) {
        run("UPDATE vehicles SET status = 'DAMAGED' WHERE id = ?", [vehicle_id]);
      }

      logAudit(
        req.user.id,
        'RECORD_INSPECTION',
        'INSPECTION',
        insRes.lastInsertRowid,
        { vehicle_id, inspection_type, has_damage: !!has_damage },
        req.ip
      );

      return insRes.lastInsertRowid;
    });

    res.status(201).json({
      success: true,
      message: 'Inspection recorded successfully.',
      inspection_id: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
