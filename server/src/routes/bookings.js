const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to calculate rental duration in days
 */
function calculateRentalDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime <= 0) return 0;
  // Ceiling of days (e.g., 26 hours counts as 2 days)
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Generate a unique booking reference
 */
function generateBookingRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `BK-${year}-${rand}`;
}

/**
 * GET /api/bookings
 * List bookings (Role filtered: Customers see only their own; Admin/Staff see all)
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { status, customer_id, vehicle_id, start_date, end_date } = req.query;

    let sql = `
      SELECT b.*,
             v.make, v.model, v.reg_number, v.color, v.image_url,
             vc.name as category_name,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.driving_license_no,
             pl.name as pickup_location_name,
             rl.name as return_location_name,
             r.id as rental_id, r.status as rental_status,
             p.id as payment_id, p.status as payment_status
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN vehicle_categories vc ON v.category_id = vc.id
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      JOIN locations pl ON b.pickup_location_id = pl.id
      JOIN locations rl ON b.return_location_id = rl.id
      LEFT JOIN rentals r ON r.booking_id = b.id
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // Customer can only view their own bookings
    if (req.user.role === 'CUSTOMER') {
      sql += ' AND b.customer_id = ?';
      params.push(req.user.customer_id);
    } else if (customer_id) {
      sql += ' AND b.customer_id = ?';
      params.push(customer_id);
    }

    if (vehicle_id) {
      sql += ' AND b.vehicle_id = ?';
      params.push(vehicle_id);
    }

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status.toUpperCase());
    }

    if (start_date) {
      sql += ' AND b.start_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND b.end_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY b.created_at DESC';

    const bookings = all(sql, params);
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bookings/:id
 * Retrieve single booking details
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const booking = get(
      `SELECT b.*,
              v.make, v.model, v.year, v.reg_number, v.color, v.vin, v.image_url, v.fuel_type, v.transmission,
              vc.name as category_name, vc.deposit_amount as category_deposit,
              u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
              c.driving_license_no, c.license_expiry,
              pl.name as pickup_location_name, pl.address as pickup_location_address,
              rl.name as return_location_name, rl.address as return_location_address,
              r.id as rental_id, r.rental_ref, r.status as rental_status, r.pickup_time, r.start_mileage,
              ret.id as return_id, ret.actual_return_time, ret.return_mileage, ret.total_additional_charges
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN vehicle_categories vc ON v.category_id = vc.id
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       JOIN locations pl ON b.pickup_location_id = pl.id
       JOIN locations rl ON b.return_location_id = rl.id
       LEFT JOIN rentals r ON r.booking_id = b.id
       LEFT JOIN returns ret ON ret.rental_id = r.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(booking.customer_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this booking.' });
    }

    // Associated payments
    const payments = all('SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC', [booking.id]);

    res.json({
      success: true,
      booking: {
        ...booking,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bookings
 * Create a new booking with double booking prevention
 */
router.post('/', authenticate, (req, res, next) => {
  try {
    let {
      customer_id,
      vehicle_id,
      pickup_location_id,
      return_location_id,
      start_date,
      end_date,
      notes
    } = req.body;

    // If customer, customer_id is strictly forced to their own
    if (req.user.role === 'CUSTOMER') {
      customer_id = req.user.customer_id;
    } else if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }

    if (!vehicle_id || !pickup_location_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, pickup location, start date, and end date are required.'
      });
    }

    return_location_id = return_location_id || pickup_location_id;

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or return date format.' });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({ success: false, message: 'Return date and time must be after the pickup date and time.' });
    }

    const totalDays = calculateRentalDays(start_date, end_date);
    if (totalDays <= 0) {
      return res.status(400).json({ success: false, message: 'Rental duration must be at least 1 day.' });
    }

    // Inspect vehicle
    const vehicle = get(
      `SELECT v.*, vc.deposit_amount as category_deposit 
       FROM vehicles v 
       JOIN vehicle_categories vc ON v.category_id = vc.id 
       WHERE v.id = ?`,
      [vehicle_id]
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Selected vehicle does not exist.' });
    }

    if (vehicle.status === 'MAINTENANCE') {
      return res.status(400).json({
        success: false,
        message: 'This vehicle is currently undergoing maintenance and cannot be booked.'
      });
    }

    if (vehicle.status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'This vehicle is currently inactive and unavailable.'
      });
    }

    // DOUBLE BOOKING PREVENTION CHECK
    // Check if there are any overlapping active/confirmed bookings
    const overlappingBooking = get(
      `SELECT id, booking_ref, start_date, end_date, status 
       FROM bookings 
       WHERE vehicle_id = ? 
         AND status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
         AND (start_date < ? AND end_date > ?)
       LIMIT 1`,
      [vehicle_id, end_date, start_date]
    );

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message: `Vehicle is unavailable for the selected period. Overlaps with an existing reservation (${overlappingBooking.booking_ref} from ${overlappingBooking.start_date} to ${overlappingBooking.end_date}).`
      });
    }

    // Calculate financials
    const dailyRate = vehicle.daily_rate;
    const baseAmount = Number((dailyRate * totalDays).toFixed(2));
    const taxRate = 18.0; // 18% GST
    const taxAmount = Number(((baseAmount * taxRate) / 100).toFixed(2));
    const estimatedTotal = Number((baseAmount + taxAmount).toFixed(2));
    const depositAmount = vehicle.category_deposit || 5000.0;
    const bookingRef = generateBookingRef();
    const initialStatus = 'CONFIRMED';
    const branchId = vehicle.branch_id || null;

    const result = transaction(() => {
      const res = run(
        `INSERT INTO bookings (
          booking_ref, customer_id, vehicle_id, pickup_location_id, return_location_id, branch_id,
          start_date, end_date, total_days, daily_rate, base_amount, discount_amount, tax_amount,
          estimated_total, deposit_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [
          bookingRef,
          customer_id,
          vehicle_id,
          pickup_location_id,
          return_location_id,
          branchId,
          start_date,
          end_date,
          totalDays,
          dailyRate,
          baseAmount,
          taxAmount,
          estimatedTotal,
          depositAmount,
          initialStatus,
          notes || null
        ]
      );

      // Automatically generate rental agreement
      const agrRef = `AGR-${bookingRef.replace('BK-', '')}`;
      run(
        `INSERT INTO rental_agreements (
          agreement_number, booking_id, customer_id, vehicle_id, terms_and_conditions,
          damage_liability_limit, fuel_policy, km_policy, customer_signature, staff_signature, status
        ) VALUES (?, ?, ?, ?, 'Standard Self-Drive Commercial Rental Agreement & Regulations Terms', 10000.0, 'SAME_TO_SAME', 'UNLIMITED', 'Digitally Signed - Verified Customer', 'Amit Verma (Senior Fleet Supervisor)', 'SIGNED')`,
        [agrRef, res.lastInsertRowid, customer_id, vehicle_id]
      );

      // If booking starts today or soon and vehicle is currently AVAILABLE, we update to RESERVED
      if (vehicle.status === 'AVAILABLE') {
        run("UPDATE vehicles SET status = 'RESERVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [vehicle_id]);
      }

      return res.lastInsertRowid;
    });

    const newBooking = get('SELECT * FROM bookings WHERE id = ?', [result]);

    logAudit(
      req.user.id,
      'BOOKING_CREATED',
      'BOOKING',
      result,
      `Created booking ${bookingRef} for vehicle ${vehicle.reg_number} (${totalDays} days, $${estimatedTotal})`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Booking created and confirmed successfully',
      booking: newBooking
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Update booking status (e.g. CANCELLED, CONFIRMED)
 */
router.patch('/:id/status', authenticate, (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { status, cancellation_reason } = req.body;

    const booking = get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Role check: customer can only cancel their own pending/confirmed booking
    if (req.user.role === 'CUSTOMER') {
      if (Number(booking.customer_id) !== Number(req.user.customer_id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to modify this booking.' });
      }
      if (status !== 'CANCELLED') {
        return res.status(403).json({ success: false, message: 'Customers can only cancel bookings.' });
      }
    }

    if (booking.status === 'ACTIVE' && status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an active rental. Please process vehicle return instead.'
      });
    }

    transaction(() => {
      run(
        `UPDATE bookings SET
           status = ?,
           cancellation_reason = COALESCE(?, cancellation_reason),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status.toUpperCase(), cancellation_reason || null, bookingId]
      );

      // If cancelled and vehicle was RESERVED for this, restore vehicle status to AVAILABLE if no other active booking
      if (status.toUpperCase() === 'CANCELLED') {
        const otherActive = get(
          "SELECT id FROM bookings WHERE vehicle_id = ? AND id != ? AND status IN ('CONFIRMED', 'ACTIVE')",
          [booking.vehicle_id, bookingId]
        );
        if (!otherActive) {
          run("UPDATE vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [booking.vehicle_id]);
        }
      }
    });

    logAudit(req.user.id, 'BOOKING_STATUS_CHANGE', 'BOOKING', bookingId, `Booking status updated to ${status}`, req.ip);

    const updated = get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/bookings/:id
 * Edit/Update booking details (Admin & Staff)
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const booking = get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status === 'COMPLETED' || booking.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a booking that is currently ${booking.status}.`
      });
    }

    const {
      vehicle_id,
      start_date,
      end_date,
      pickup_location_id,
      return_location_id,
      daily_rate,
      notes,
      status
    } = req.body;

    const newVehicleId = vehicle_id || booking.vehicle_id;
    const newStartDate = start_date || booking.start_date;
    const newEndDate = end_date || booking.end_date;
    const newDailyRate = daily_rate !== undefined ? Number(daily_rate) : booking.daily_rate;
    const newPickupLoc = pickup_location_id || booking.pickup_location_id;
    const newReturnLoc = return_location_id || booking.return_location_id;
    const newStatus = status ? status.toUpperCase() : booking.status;

    // Validate dates
    const sObj = new Date(newStartDate);
    const eObj = new Date(newEndDate);
    if (isNaN(sObj.getTime()) || isNaN(eObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or return date format.' });
    }
    if (eObj <= sObj) {
      return res.status(400).json({ success: false, message: 'Return date must be after pickup date.' });
    }

    const totalDays = calculateRentalDays(newStartDate, newEndDate);
    const estimatedTotal = Number((totalDays * newDailyRate).toFixed(2));

    // Double booking check if vehicle or dates changed
    const conflict = get(
      `SELECT id, booking_ref FROM bookings
       WHERE vehicle_id = ?
         AND id != ?
         AND status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
         AND NOT (end_date <= ? OR start_date >= ?)
       LIMIT 1`,
      [newVehicleId, bookingId, newStartDate, newEndDate]
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Vehicle has a scheduling conflict with booking ${conflict.booking_ref}.`
      });
    }

    transaction(() => {
      run(
        `UPDATE bookings SET
           vehicle_id = ?,
           pickup_location_id = ?,
           return_location_id = ?,
           start_date = ?,
           end_date = ?,
           total_days = ?,
           daily_rate = ?,
           estimated_total = ?,
           notes = COALESCE(?, notes),
           status = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          newVehicleId,
          newPickupLoc,
          newReturnLoc,
          newStartDate,
          newEndDate,
          totalDays,
          newDailyRate,
          estimatedTotal,
          notes,
          newStatus,
          bookingId
        ]
      );

      // Handle vehicle statuses if vehicle changed
      if (Number(newVehicleId) !== Number(booking.vehicle_id)) {
        // Restore old vehicle to AVAILABLE if no other bookings
        const oldVehicleOther = get(
          "SELECT id FROM bookings WHERE vehicle_id = ? AND id != ? AND status IN ('CONFIRMED', 'ACTIVE')",
          [booking.vehicle_id, bookingId]
        );
        if (!oldVehicleOther) {
          run("UPDATE vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [booking.vehicle_id]);
        }

        // Mark new vehicle as RESERVED if confirmed
        if (newStatus === 'CONFIRMED') {
          run("UPDATE vehicles SET status = 'RESERVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newVehicleId]);
        }
      }
    });

    logAudit(req.user.id, 'BOOKING_UPDATED', 'BOOKING', bookingId, `Updated booking ${booking.booking_ref}`, req.ip);

    const updated = get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete booking reservation (Admin & Staff)
 */
router.delete('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const booking = get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active rental reservation. Process vehicle return first.'
      });
    }

    transaction(() => {
      run('DELETE FROM rental_agreements WHERE booking_id = ?', [bookingId]);
      run('DELETE FROM payments WHERE booking_id = ?', [bookingId]);
      run('DELETE FROM bookings WHERE id = ?', [bookingId]);

      // If vehicle was RESERVED, restore to AVAILABLE if no other active bookings
      const otherActive = get(
        "SELECT id FROM bookings WHERE vehicle_id = ? AND status IN ('CONFIRMED', 'ACTIVE')",
        [booking.vehicle_id]
      );
      if (!otherActive) {
        run("UPDATE vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [booking.vehicle_id]);
      }
    });

    logAudit(req.user.id, 'BOOKING_DELETED', 'BOOKING', bookingId, `Deleted booking ${booking.booking_ref}`, req.ip);

    res.json({
      success: true,
      message: `Booking ${booking.booking_ref} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
