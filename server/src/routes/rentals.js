const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function generateRentalRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `RN-${year}-${rand}`;
}

/**
 * GET /api/rentals
 * List rentals with vehicle, customer, and return info
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { status, vehicle_id, customer_id } = req.query;

    let sql = `
      SELECT r.*,
             b.booking_ref, b.start_date, b.end_date, b.estimated_total,
             v.make, v.model, v.reg_number, v.color, v.image_url,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.driving_license_no,
             su.full_name as staff_name,
             ret.id as return_id, ret.actual_return_time, ret.return_mileage, ret.total_additional_charges
      FROM rentals r
      JOIN bookings b ON r.booking_id = b.id
      JOIN vehicles v ON r.vehicle_id = v.id
      JOIN customers c ON r.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN staff s ON r.staff_id = s.id
      LEFT JOIN users su ON s.user_id = su.id
      LEFT JOIN returns ret ON ret.rental_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'CUSTOMER') {
      sql += ' AND r.customer_id = ?';
      params.push(req.user.customer_id);
    } else if (customer_id) {
      sql += ' AND r.customer_id = ?';
      params.push(customer_id);
    }

    if (vehicle_id) {
      sql += ' AND r.vehicle_id = ?';
      params.push(vehicle_id);
    }

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status.toUpperCase());
    }

    sql += ' ORDER BY r.created_at DESC';

    const rentals = all(sql, params);
    res.json({ success: true, count: rentals.length, rentals });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/rentals/:id
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const rental = get(
      `SELECT r.*,
              b.booking_ref, b.start_date, b.end_date, b.total_days, b.daily_rate, b.estimated_total, b.deposit_amount,
              v.make, v.model, v.year, v.reg_number, v.vin, v.image_url, v.fuel_type, v.transmission,
              u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
              c.driving_license_no, c.license_expiry,
              su.full_name as staff_name,
              ret.id as return_id, ret.actual_return_time, ret.return_mileage, ret.fuel_level_return,
              ret.vehicle_condition, ret.late_hours, ret.late_fee, ret.damage_fee, ret.fuel_fee,
              ret.total_additional_charges, ret.notes as return_notes
       FROM rentals r
       JOIN bookings b ON r.booking_id = b.id
       JOIN vehicles v ON r.vehicle_id = v.id
       JOIN customers c ON r.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN staff s ON r.staff_id = s.id
       LEFT JOIN users su ON s.user_id = su.id
       LEFT JOIN returns ret ON ret.rental_id = r.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental record not found.' });
    }

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(rental.customer_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this rental record.' });
    }

    const payments = all('SELECT * FROM payments WHERE rental_id = ? OR booking_id = ? ORDER BY payment_date DESC', [
      rental.id,
      rental.booking_id
    ]);

    res.json({
      success: true,
      rental: {
        ...rental,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rentals/pickup
 * Handover vehicle to customer & activate rental
 */
router.post('/pickup', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { booking_id, start_mileage, fuel_level_pickup, notes } = req.body;

    if (!booking_id) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    const booking = get('SELECT * FROM bookings WHERE id = ?', [booking_id]);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'This booking is already an active rental.' });
    }
    if (booking.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'This booking is already completed.' });
    }
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot dispatch vehicle for a cancelled booking.' });
    }

    const vehicle = get('SELECT * FROM vehicles WHERE id = ?', [booking.vehicle_id]);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Assigned vehicle not found.' });
    }

    if (vehicle.status === 'RENTED') {
      return res.status(409).json({ success: false, message: 'Vehicle is currently recorded as already rented out.' });
    }

    if (vehicle.status === 'MAINTENANCE') {
      return res.status(400).json({ success: false, message: 'Vehicle is undergoing maintenance and cannot be picked up.' });
    }

    const startMileage = Number(start_mileage) || vehicle.mileage || 0;
    const fuelLevel = fuel_level_pickup || 'FULL';
    const rentalRef = generateRentalRef();
    const staffId = req.user.staff_id || null;

    const result = transaction(() => {
      // 1. Create Rental record
      const rRes = run(
        `INSERT INTO rentals (
          rental_ref, booking_id, customer_id, vehicle_id, staff_id,
          pickup_time, expected_return_time, start_mileage, fuel_level_pickup, status, notes
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, 'ACTIVE', ?)`,
        [rentalRef, booking.id, booking.customer_id, vehicle.id, staffId, booking.end_date, startMileage, fuelLevel, notes || null]
      );

      // 2. Update Booking status to ACTIVE
      run("UPDATE bookings SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [booking.id]);

      // 3. Update Vehicle status to RENTED
      run("UPDATE vehicles SET status = 'RENTED', mileage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [startMileage, vehicle.id]);

      return rRes.lastInsertRowid;
    });

    const newRental = get('SELECT * FROM rentals WHERE id = ?', [result]);

    logAudit(
      req.user.id,
      'RENTAL_PICKUP',
      'RENTAL',
      result,
      `Vehicle ${vehicle.reg_number} picked up by customer for booking ${booking.booking_ref}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Vehicle handover confirmed. Rental is now active.',
      rental: newRental
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
