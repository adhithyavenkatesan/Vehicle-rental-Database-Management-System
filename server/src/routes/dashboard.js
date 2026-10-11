const express = require('express');
const { all, get } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Real live database statistics tailored by role
 */
router.get('/stats', authenticate, (req, res, next) => {
  try {
    const isCustomer = req.user.role === 'CUSTOMER';
    const customerId = req.user.customer_id;

    if (isCustomer) {
      // Customer personalized dashboard stats
      const myBookingsCount = get('SELECT COUNT(*) as count FROM bookings WHERE customer_id = ?', [customerId]).count;
      const myActiveRentals = get("SELECT COUNT(*) as count FROM rentals WHERE customer_id = ? AND status = 'ACTIVE'", [customerId]).count;
      const myCompletedTrips = get("SELECT COUNT(*) as count FROM bookings WHERE customer_id = ? AND status = 'COMPLETED'", [customerId]).count;
      const myTotalSpent = get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE customer_id = ? AND status = 'PAID'", [customerId]).total;

      const recentBookings = all(
        `SELECT b.*, v.make, v.model, v.reg_number, v.image_url,
                pl.name as pickup_location
         FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id
         JOIN locations pl ON b.pickup_location_id = pl.id
         WHERE b.customer_id = ?
         ORDER BY b.created_at DESC LIMIT 5`,
        [customerId]
      );

      const recentPayments = all(
        `SELECT p.*, b.booking_ref, v.make, v.model
         FROM payments p
         LEFT JOIN bookings b ON p.booking_id = b.id
         LEFT JOIN vehicles v ON b.vehicle_id = v.id
         WHERE p.customer_id = ?
         ORDER BY p.payment_date DESC LIMIT 5`,
        [customerId]
      );

      return res.json({
        success: true,
        stats: {
          myBookingsCount,
          myActiveRentals,
          myCompletedTrips,
          myTotalSpent: Number(myTotalSpent.toFixed(2)),
          recentBookings,
          recentPayments
        }
      });
    }

    // Operational & Executive Dashboard for Admin and Staff
    const totalVehicles = get('SELECT COUNT(*) as count FROM vehicles').count;
    const availableVehicles = get("SELECT COUNT(*) as count FROM vehicles WHERE status = 'AVAILABLE'").count;
    const rentedVehicles = get("SELECT COUNT(*) as count FROM vehicles WHERE status = 'RENTED'").count;
    const maintenanceVehicles = get("SELECT COUNT(*) as count FROM vehicles WHERE status = 'MAINTENANCE'").count;
    const reservedVehicles = get("SELECT COUNT(*) as count FROM vehicles WHERE status = 'RESERVED'").count;

    const totalCustomers = get('SELECT COUNT(*) as count FROM customers').count;
    const totalStaff = get('SELECT COUNT(*) as count FROM staff').count;

    const activeBookings = get("SELECT COUNT(*) as count FROM bookings WHERE status IN ('CONFIRMED', 'ACTIVE')").count;
    const pendingBookings = get("SELECT COUNT(*) as count FROM bookings WHERE status = 'PENDING'").count;
    const completedRentals = get("SELECT COUNT(*) as count FROM rentals WHERE status = 'CLOSED'").count;

    // Financial Metrics
    const totalRevenueRow = get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'PAID'");
    const totalRevenue = Number(totalRevenueRow.total.toFixed(2));

    const pendingRevenueRow = get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'PENDING'");
    const pendingRevenue = Number(pendingRevenueRow.total.toFixed(2));

    // Fleet utilization percentage
    const activeFleet = rentedVehicles + reservedVehicles;
    const fleetUtilizationRate = totalVehicles > 0 ? Number(((activeFleet / totalVehicles) * 100).toFixed(1)) : 0;

    // Category breakdown
    const categoryBreakdown = all(`
      SELECT c.name, c.code, COUNT(v.id) as vehicle_count,
             SUM(CASE WHEN v.status = 'RENTED' THEN 1 ELSE 0 END) as rented_count,
             SUM(CASE WHEN v.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_count
      FROM vehicle_categories c
      LEFT JOIN vehicles v ON v.category_id = c.id
      GROUP BY c.id
      ORDER BY vehicle_count DESC
    `);

    // Location distribution
    const locationDistribution = all(`
      SELECT l.name, l.city, COUNT(v.id) as vehicle_count,
             SUM(CASE WHEN v.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_count
      FROM locations l
      LEFT JOIN vehicles v ON v.location_id = l.id
      GROUP BY l.id
      ORDER BY vehicle_count DESC
    `);

    // Recent Bookings (Live)
    const recentBookings = all(`
      SELECT b.id, b.booking_ref, b.start_date, b.end_date, b.estimated_total, b.status, b.created_at,
             v.make, v.model, v.reg_number,
             u.full_name as customer_name,
             pl.name as pickup_location
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      JOIN locations pl ON b.pickup_location_id = pl.id
      ORDER BY b.created_at DESC LIMIT 6
    `);

    // Recent Payments (Live)
    const recentPayments = all(`
      SELECT p.id, p.payment_ref, p.amount, p.payment_method, p.status, p.payment_date,
             u.full_name as customer_name,
             b.booking_ref
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN bookings b ON p.booking_id = b.id
      ORDER BY p.payment_date DESC LIMIT 6
    `);

    // Maintenance Alerts
    const maintenanceAlerts = all(`
      SELECT m.id, m.maintenance_type, m.description, m.start_date, m.cost, m.service_provider, m.status,
             v.make, v.model, v.reg_number
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE m.status IN ('IN_PROGRESS', 'SCHEDULED')
      ORDER BY m.start_date ASC
    `);

    // Monthly revenue trend (last 6 months aggregated from payments)
    const monthlyRevenue = all(`
      SELECT strftime('%Y-%m', payment_date) as month,
             SUM(amount) as revenue,
             COUNT(id) as payment_count
      FROM payments
      WHERE status = 'PAID'
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month ASC LIMIT 6
    `);

    // Additional Operational & Executive Live Metrics
    const todayBookings = get("SELECT COUNT(*) as count FROM bookings WHERE date(created_at) = date('now')").count;
    const todayRevenueRow = get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'PAID' AND date(payment_date) = date('now')");
    const todayRevenue = Number(todayRevenueRow.total.toFixed(2));
    const outstandingRow = get("SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total FROM invoices WHERE payment_status != 'PAID'");
    const outstandingPayments = Number(outstandingRow.total.toFixed(2));
    const pendingApprovals = get("SELECT COUNT(*) as count FROM approvals WHERE status = 'PENDING'").count;
    const todayPickups = get("SELECT COUNT(*) as count FROM bookings WHERE date(start_date) <= date('now') AND status IN ('CONFIRMED', 'PENDING')").count;
    const todayReturns = get("SELECT COUNT(*) as count FROM rentals WHERE date(expected_return_time) <= date('now') AND status = 'ACTIVE'").count;
    const pendingInspections = get("SELECT COUNT(*) as count FROM rentals r LEFT JOIN inspections i ON r.id = i.rental_id WHERE r.status = 'ACTIVE' AND i.id IS NULL").count;

    // Upcoming Returns List (Live)
    const upcomingReturns = all(`
      SELECT r.id, r.rental_ref, r.expected_return_time, r.pickup_time,
             v.make, v.model, v.reg_number,
             u.full_name as customer_name, u.phone as customer_phone
      FROM rentals r
      JOIN vehicles v ON r.vehicle_id = v.id
      JOIN customers c ON r.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE r.status = 'ACTIVE'
      ORDER BY r.expected_return_time ASC
      LIMIT 6
    `);

    // Pending Approvals List (Live)
    const pendingApprovalsList = all(`
      SELECT a.*, u.full_name as requester_name
      FROM approvals a
      JOIN users u ON a.requested_by_user_id = u.id
      WHERE a.status = 'PENDING'
      ORDER BY a.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        totalVehicles,
        availableVehicles,
        rentedVehicles,
        maintenanceVehicles,
        reservedVehicles,
        totalCustomers,
        totalStaff,
        activeBookings,
        pendingBookings,
        completedRentals,
        totalRevenue,
        pendingRevenue,
        todayBookings,
        todayRevenue,
        outstandingPayments,
        pendingApprovals,
        todayPickups,
        todayReturns,
        pendingInspections,
        upcomingReturns,
        pendingApprovalsList,
        fleetUtilizationRate,
        categoryBreakdown,
        locationDistribution,
        recentBookings,
        recentPayments,
        maintenanceAlerts,
        monthlyRevenue
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
