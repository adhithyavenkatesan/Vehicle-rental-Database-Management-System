const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/agreements
 * List rental agreements with RBAC filtering
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    let sql = `
      SELECT ra.*,
             b.booking_ref, b.start_date, b.end_date, b.estimated_total,
             v.make, v.model, v.reg_number, v.color, v.fuel_type,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.driving_license_no
      FROM rental_agreements ra
      JOIN bookings b ON ra.booking_id = b.id
      JOIN vehicles v ON ra.vehicle_id = v.id
      JOIN customers c ON ra.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'CUSTOMER') {
      sql += ' AND ra.customer_id = ?';
      params.push(req.user.customer_id);
    }

    sql += ' ORDER BY ra.id DESC';

    const agreements = all(sql, params);
    res.json({ success: true, count: agreements.length, agreements });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/agreements/:id
 * Retrieve a specific digital rental agreement
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const agreement = get(`
      SELECT ra.*,
             b.booking_ref, b.start_date, b.end_date, b.total_days, b.daily_rate,
             b.base_amount, b.tax_amount, b.estimated_total, b.deposit_amount,
             v.make, v.model, v.variant, v.year, v.reg_number, v.color, v.fuel_type, v.transmission,
             v.insurance_policy_no, v.puc_number, v.image_url,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.driving_license_no, c.license_expiry, c.address as customer_address,
             c.city as customer_city, c.state as customer_state, c.id_card_type, c.id_card_no
      FROM rental_agreements ra
      JOIN bookings b ON ra.booking_id = b.id
      JOIN vehicles v ON ra.vehicle_id = v.id
      JOIN customers c ON ra.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE ra.id = ?
    `, [req.params.id]);

    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Rental agreement not found.' });
    }

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(agreement.customer_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this agreement.' });
    }

    res.json({ success: true, agreement });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/agreements/booking/:booking_id
 * Retrieve or locate agreement by booking ID
 */
router.get('/booking/:booking_id', authenticate, (req, res, next) => {
  try {
    const agreement = get(`
      SELECT ra.*,
             b.booking_ref, b.start_date, b.end_date, b.total_days, b.daily_rate,
             b.base_amount, b.tax_amount, b.estimated_total, b.deposit_amount,
             v.make, v.model, v.variant, v.year, v.reg_number, v.color, v.fuel_type, v.transmission,
             u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
             c.driving_license_no, c.address as customer_address
      FROM rental_agreements ra
      JOIN bookings b ON ra.booking_id = b.id
      JOIN vehicles v ON ra.vehicle_id = v.id
      JOIN customers c ON ra.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE ra.booking_id = ?
    `, [req.params.booking_id]);

    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not yet generated for this booking.' });
    }

    if (req.user.role === 'CUSTOMER' && Number(req.user.customer_id) !== Number(agreement.customer_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to access this agreement.' });
    }

    res.json({ success: true, agreement });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/agreements/generate/:booking_id
 * Generate a digital rental agreement for a confirmed booking
 */
router.post('/generate/:booking_id', authenticate, (req, res, next) => {
  try {
    const booking = get('SELECT * FROM bookings WHERE id = ?', [req.params.booking_id]);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const existing = get('SELECT id FROM rental_agreements WHERE booking_id = ?', [booking.id]);
    if (existing) {
      return res.json({ success: true, message: 'Agreement already exists.', agreement_id: existing.id });
    }

    const agrNumber = `AGR-${booking.booking_ref.replace('BK-', '')}`;
    const defaultTerms = `
1. RENTER RESPONSIBILITY: The renter agrees to operate the vehicle in strict accordance with the Motor Vehicles Act (1988), Indian traffic regulations, and safety mandates.
2. SPEED LIMIT: Maximum permissible highway speed is governed by local state laws (100 km/h on expressways). Exceeding 120 km/h triggers automated telemetry penalties.
3. FUEL POLICY: Same-to-Same. Vehicle is dispatched with recorded fuel levels and must be returned at the equivalent level.
4. DAMAGE LIABILITY: Renter maximum damage liability is capped at ₹10,000 for standard accidental damage provided all safety terms were adhered to and an immediate FIR / incident log was raised.
5. LATE RETURN: A 1-hour grace period applies. Subsequent delays are billed at the vehicle's published hourly penalty rate plus standard rental charge.
    `.trim();

    const result = run(
      `INSERT INTO rental_agreements (
        agreement_number, booking_id, customer_id, vehicle_id, terms_and_conditions,
        damage_liability_limit, fuel_policy, km_policy, customer_signature, staff_signature, status
      ) VALUES (?, ?, ?, ?, ?, 10000.0, 'SAME_TO_SAME', 'UNLIMITED', ?, ?, 'SIGNED')`,
      [
        agrNumber, booking.id, booking.customer_id, booking.vehicle_id, defaultTerms,
        'Digitally Verified Customer Consent', req.user.full_name
      ]
    );

    logAudit(req.user.id, 'GENERATE_AGREEMENT', 'AGREEMENT', result.lastInsertRowid, { booking_ref: booking.booking_ref }, req.ip);

    res.status(201).json({
      success: true,
      message: 'Digital rental agreement generated successfully.',
      agreement_id: result.lastInsertRowid
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
