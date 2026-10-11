const express = require('express');
const { all } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/reports/financials
 */
router.get('/financials', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const revenueByMethod = all(`
      SELECT payment_method, 
             COUNT(id) as transaction_count,
             SUM(amount) as total_amount
      FROM payments
      WHERE status = 'PAID'
      GROUP BY payment_method
    `);

    const revenueByCategory = all(`
      SELECT vc.name as category_name,
             COUNT(DISTINCT b.id) as booking_count,
             SUM(p.amount) as total_revenue
      FROM vehicle_categories vc
      JOIN vehicles v ON v.category_id = vc.id
      JOIN bookings b ON b.vehicle_id = v.id
      JOIN payments p ON p.booking_id = b.id
      WHERE p.status = 'PAID'
      GROUP BY vc.id
      ORDER BY total_revenue DESC
    `);

    const revenueByMonth = all(`
      SELECT strftime('%Y-%m', payment_date) as month,
             COUNT(id) as total_payments,
             SUM(amount) as revenue
      FROM payments
      WHERE status = 'PAID'
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      revenueByMethod,
      revenueByCategory,
      revenueByMonth
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/fleet-utilization
 */
router.get('/fleet-utilization', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const utilization = all(`
      SELECT v.id, v.reg_number, v.make, v.model, v.year, v.status, v.mileage,
             vc.name as category_name,
             COUNT(DISTINCT b.id) as total_bookings,
             COALESCE(SUM(b.total_days), 0) as total_rental_days,
             COALESCE(SUM(p.amount), 0) as total_earned
      FROM vehicles v
      JOIN vehicle_categories vc ON v.category_id = vc.id
      LEFT JOIN bookings b ON b.vehicle_id = v.id AND b.status IN ('ACTIVE', 'COMPLETED')
      LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'PAID'
      GROUP BY v.id
      ORDER BY total_earned DESC
    `);

    res.json({ success: true, utilization });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/maintenance-summary
 */
router.get('/maintenance-summary', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const summaryByType = all(`
      SELECT maintenance_type,
             COUNT(id) as total_jobs,
             SUM(cost) as total_expense,
             AVG(cost) as average_cost
      FROM maintenance
      GROUP BY maintenance_type
    `);

    const costsByVehicle = all(`
      SELECT v.reg_number, v.make, v.model,
             COUNT(m.id) as service_count,
             SUM(m.cost) as total_maintenance_spent
      FROM vehicles v
      JOIN maintenance m ON m.vehicle_id = v.id
      GROUP BY v.id
      ORDER BY total_maintenance_spent DESC
    `);

    res.json({
      success: true,
      summaryByType,
      costsByVehicle
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
