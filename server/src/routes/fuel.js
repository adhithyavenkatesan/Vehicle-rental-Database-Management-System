const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/fuel
 * List all fuel logs with vehicle registration and staff logger
 */
router.get('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { vehicle_id } = req.query;

    let sql = `
      SELECT fl.*,
             v.make, v.model, v.reg_number, v.fuel_type,
             s.employee_code, u.full_name as staff_name
      FROM fuel_logs fl
      JOIN vehicles v ON fl.vehicle_id = v.id
      LEFT JOIN staff s ON fl.logged_by_staff_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND fl.vehicle_id = ?';
      params.push(vehicle_id);
    }

    sql += ' ORDER BY fl.fill_date DESC, fl.id DESC';

    const logs = all(sql, params);
    res.json({ success: true, count: logs.length, fuel_logs: logs });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fuel/stats
 * Aggregate fuel analytics
 */
router.get('/stats', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const totals = get(`
      SELECT COUNT(*) as total_entries,
             COALESCE(SUM(litres), 0) as total_litres,
             COALESCE(SUM(total_amount), 0) as total_cost,
             COALESCE(AVG(rate_per_litre), 0) as avg_rate_per_litre
      FROM fuel_logs
    `);

    const vehicleStats = all(`
      SELECT v.id as vehicle_id, v.reg_number, v.make, v.model,
             COUNT(fl.id) as log_count,
             COALESCE(SUM(fl.litres), 0) as litres_consumed,
             COALESCE(SUM(fl.total_amount), 0) as total_fuel_cost
      FROM vehicles v
      LEFT JOIN fuel_logs fl ON v.id = fl.vehicle_id
      GROUP BY v.id
      ORDER BY total_fuel_cost DESC
    `);

    res.json({
      success: true,
      stats: {
        summary: totals,
        by_vehicle: vehicleStats
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/fuel
 * Log a new vehicle refueling event (Staff/Admin)
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      vehicle_id,
      fill_date,
      odometer_reading,
      litres,
      rate_per_litre,
      fuel_station,
      payment_method,
      notes
    } = req.body;

    if (!vehicle_id || !fill_date || !odometer_reading || !litres || !rate_per_litre) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, date, odometer reading, litres, and rate per litre are required.'
      });
    }

    const totalAmount = Number((Number(litres) * Number(rate_per_litre)).toFixed(2));
    const staffId = req.user.staff_id || null;

    const result = run(
      `INSERT INTO fuel_logs (
        vehicle_id, logged_by_staff_id, fill_date, odometer_reading, litres,
        rate_per_litre, total_amount, fuel_station, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id, staffId, fill_date, Number(odometer_reading), Number(litres),
        Number(rate_per_litre), totalAmount, fuel_station || 'Commercial Depot',
        payment_method || 'CARD', notes || null
      ]
    );

    // Also link expense
    run(
      `INSERT INTO expenses (vehicle_id, category, description, amount, expense_date, vendor_name, approved_by)
       VALUES (?, 'FUEL', ?, ?, ?, ?, ?)`,
      [vehicle_id, `Vehicle refueling: ${litres}L @ ₹${rate_per_litre}/L`, totalAmount, fill_date, fuel_station || 'Fuel Station', req.user.id]
    );

    logAudit(req.user.id, 'LOG_FUEL', 'FUEL_LOG', result.lastInsertRowid, { vehicle_id, litres, totalAmount }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Fuel log saved successfully.',
      fuel_log_id: result.lastInsertRowid,
      total_amount: totalAmount
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
