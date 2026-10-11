const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function generatePaymentRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `PAY-${year}-${rand}`;
}

/**
 * GET /api/returns
 * List all processed returns
 */
router.get('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const returns = all(`
      SELECT ret.*,
             r.rental_ref, r.pickup_time, r.start_mileage,
             b.booking_ref, b.estimated_total,
             v.make, v.model, v.reg_number,
             u.full_name as customer_name,
             su.full_name as staff_name
      FROM returns ret
      JOIN rentals r ON ret.rental_id = r.id
      JOIN bookings b ON r.booking_id = b.id
      JOIN vehicles v ON ret.vehicle_id = v.id
      JOIN customers c ON r.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN staff s ON ret.staff_id = s.id
      LEFT JOIN users su ON s.user_id = su.id
      ORDER BY ret.actual_return_time DESC
    `);
    res.json({ success: true, count: returns.length, returns });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/returns/process
 * Complete a rental return with mileage, condition, late fees, and auto-settlement
 */
router.post('/process', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      rental_id,
      return_mileage,
      fuel_level_return,
      vehicle_condition,
      damage_fee_input,
      notes
    } = req.body;

    if (!rental_id || return_mileage === undefined) {
      return res.status(400).json({ success: false, message: 'Rental ID and return mileage are required.' });
    }

    const rental = get(
      `SELECT r.*, b.estimated_total, b.booking_ref, v.reg_number, v.daily_rate
       FROM rentals r
       JOIN bookings b ON r.booking_id = b.id
       JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.id = ?`,
      [rental_id]
    );

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental record not found.' });
    }

    if (rental.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `This rental is already ${rental.status.toLowerCase()}. Cannot process return again.`
      });
    }

    const retMileage = Number(return_mileage);
    if (isNaN(retMileage) || retMileage < rental.start_mileage) {
      return res.status(400).json({
        success: false,
        message: `Return mileage (${retMileage}) cannot be less than initial pickup mileage (${rental.start_mileage}).`
      });
    }

    const condition = (vehicle_condition || 'EXCELLENT').toUpperCase();
    const fuelLevel = (fuel_level_return || 'FULL').toUpperCase();

    // 1. Late fee calculation
    const now = new Date();
    const expectedReturn = new Date(rental.expected_return_time);
    let lateHours = 0;
    let lateFee = 0.0;
    const lateFeeSetting = get("SELECT value FROM system_settings WHERE key = 'LATE_FEE_PER_HOUR'");
    const hourlyLateRate = lateFeeSetting ? Number(lateFeeSetting.value) : 350.0;

    if (now > expectedReturn) {
      const diffHours = (now.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60);
      lateHours = Math.max(1, Math.ceil(diffHours));
      lateFee = Number((lateHours * hourlyLateRate).toFixed(2));
    }

    // 2. Fuel Penalty calculation (in ₹)
    let fuelFee = 0.0;
    if (fuelLevel === '75%') fuelFee = 500.0;
    else if (fuelLevel === '50%') fuelFee = 1000.0;
    else if (fuelLevel === '25%') fuelFee = 1500.0;
    else if (fuelLevel === 'EMPTY') fuelFee = 2000.0;

    // 3. Damage / Detailing Fee calculation (in ₹)
    let damageFee = 0.0;
    if (damage_fee_input !== undefined && damage_fee_input !== null && !isNaN(Number(damage_fee_input))) {
      damageFee = Number(damage_fee_input);
    } else {
      if (condition === 'DAMAGED') damageFee = 5000.0;
      else if (condition === 'FAIR') damageFee = 1000.0;
    }

    const totalAdditionalCharges = Number((lateFee + fuelFee + damageFee).toFixed(2));
    const staffId = req.user.staff_id || null;

    const returnResult = transaction(() => {
      // 1. Insert Returns record
      const retRes = run(
        `INSERT INTO returns (
          rental_id, vehicle_id, staff_id, actual_return_time, return_mileage,
          fuel_level_return, vehicle_condition, late_hours, late_fee, damage_fee,
          fuel_fee, total_additional_charges, notes
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rental.id,
          rental.vehicle_id,
          staffId,
          retMileage,
          fuelLevel,
          condition,
          lateHours,
          lateFee,
          damageFee,
          fuelFee,
          totalAdditionalCharges,
          notes || null
        ]
      );
      const returnId = retRes.lastInsertRowid;

      // 2. If fines exist, insert fine breakdown
      if (lateFee > 0) {
        run(
          'INSERT INTO fines_charges (return_id, charge_type, amount, reason, is_paid) VALUES (?, ?, ?, ?, 1)',
          [returnId, 'LATE_RETURN', lateFee, `Overdue by ${lateHours} hours past return schedule`]
        );
      }
      if (fuelFee > 0) {
        run(
          'INSERT INTO fines_charges (return_id, charge_type, amount, reason, is_paid) VALUES (?, ?, ?, ?, 1)',
          [returnId, 'FUEL_PENALTY', fuelFee, `Returned with ${fuelLevel} tank level`]
        );
      }
      if (damageFee > 0) {
        run(
          'INSERT INTO fines_charges (return_id, charge_type, amount, reason, is_paid) VALUES (?, ?, ?, ?, 1)',
          [returnId, condition === 'DAMAGED' ? 'DAMAGE' : 'CLEANING', damageFee, `Vehicle condition flagged as ${condition}`]
        );
      }

      // 3. Close Rental
      run("UPDATE rentals SET status = 'CLOSED' WHERE id = ?", [rental.id]);

      // 4. Complete Booking
      run("UPDATE bookings SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [rental.booking_id]);

      // 5. Update Vehicle status & mileage
      // If vehicle is damaged, switch status to MAINTENANCE; otherwise restore to AVAILABLE!
      const newVehicleStatus = condition === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE';
      run(
        'UPDATE vehicles SET status = ?, mileage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newVehicleStatus, retMileage, rental.vehicle_id]
      );

      // If damaged, auto-schedule maintenance
      if (condition === 'DAMAGED') {
        run(
          `INSERT INTO maintenance (
            vehicle_id, maintenance_type, description, start_date, cost,
            service_provider, status, notes
          ) VALUES (?, 'REPAIR', ?, CURRENT_DATE, ?, 'In-house Assessment', 'IN_PROGRESS', ?)`,
          [
            rental.vehicle_id,
            `Damage reported upon return from rental ${rental.rental_ref}: ${notes || 'Body/mechanical inspection needed'}`,
            damageFee,
            'Vehicle automatically taken offline for safety repair'
          ]
        );
      }

      // 6. Record payment for additional charges if any
      if (totalAdditionalCharges > 0) {
        const payRef = generatePaymentRef();
        run(
          `INSERT INTO payments (
            payment_ref, booking_id, rental_id, customer_id, amount,
            payment_date, payment_method, status, transaction_ref, notes
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'CARD', 'PAID', ?, ?)`,
          [
            payRef,
            rental.booking_id,
            rental.id,
            rental.customer_id,
            totalAdditionalCharges,
            `AUTO-SETTLE-${returnId}`,
            `Settlement for return charges (Late: $${lateFee}, Fuel: $${fuelFee}, Damage/Clean: $${damageFee})`
          ]
        );
      }

      return returnId;
    });

    const returnRecord = get('SELECT * FROM returns WHERE id = ?', [returnResult]);

    logAudit(
      req.user.id,
      'RENTAL_RETURN_PROCESSED',
      'RETURN',
      returnResult,
      `Processed return for rental ${rental.rental_ref} (Vehicle: ${rental.reg_number}, Mileage: ${retMileage}, Additional: $${totalAdditionalCharges})`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Vehicle return successfully processed and closed.',
      return: returnRecord,
      summary: {
        lateHours,
        lateFee,
        fuelFee,
        damageFee,
        totalAdditionalCharges,
        vehicleNextStatus: condition === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE'
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
