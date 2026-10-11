const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/vehicles
 * List vehicles with rich filtering and real-time availability check
 */
router.get('/', (req, res, next) => {
  try {
    const {
      category_id,
      location_id,
      status,
      transmission,
      fuel_type,
      search,
      min_price,
      max_price,
      start_date,
      end_date
    } = req.query;

    let sql = `
      SELECT v.*, 
             c.name as category_name, c.code as category_code, c.deposit_amount as category_deposit,
             l.name as location_name, l.code as location_code, l.city as location_city
      FROM vehicles v
      JOIN vehicle_categories c ON v.category_id = c.id
      JOIN locations l ON v.location_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      sql += ' AND v.category_id = ?';
      params.push(category_id);
    }
    if (location_id) {
      sql += ' AND v.location_id = ?';
      params.push(location_id);
    }
    if (status) {
      sql += ' AND v.status = ?';
      params.push(status.toUpperCase());
    }
    if (transmission) {
      sql += ' AND v.transmission = ?';
      params.push(transmission.toUpperCase());
    }
    if (fuel_type) {
      sql += ' AND v.fuel_type = ?';
      params.push(fuel_type.toUpperCase());
    }
    if (min_price) {
      sql += ' AND v.daily_rate >= ?';
      params.push(Number(min_price));
    }
    if (max_price) {
      sql += ' AND v.daily_rate <= ?';
      params.push(Number(max_price));
    }
    if (search) {
      sql += ' AND (v.make LIKE ? OR v.model LIKE ? OR v.reg_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Date availability filter: exclude vehicles with overlapping active/confirmed bookings
    if (start_date && end_date) {
      sql += ` AND v.id NOT IN (
        SELECT vehicle_id FROM bookings
        WHERE status IN ('PENDING', 'CONFIRMED', 'ACTIVE')
        AND NOT (end_date <= ? OR start_date >= ?)
      )`;
      params.push(start_date, end_date);
      // Also must not be in maintenance or inactive
      sql += " AND v.status NOT IN ('MAINTENANCE', 'INACTIVE')";
    }

    sql += ' ORDER BY v.make ASC, v.model ASC';

    const vehicles = all(sql, params);
    res.json({ success: true, count: vehicles.length, vehicles });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vehicles/:id
 * Retrieve comprehensive vehicle details
 */
router.get('/:id', (req, res, next) => {
  try {
    const vehicle = get(
      `SELECT v.*, 
              c.name as category_name, c.code as category_code, c.deposit_amount as category_deposit, c.description as category_description,
              l.name as location_name, l.code as location_code, l.address as location_address, l.city as location_city
       FROM vehicles v
       JOIN vehicle_categories c ON v.category_id = c.id
       JOIN locations l ON v.location_id = l.id
       WHERE v.id = ?`,
      [req.params.id]
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Active rental if any
    const activeRental = get(
      `SELECT r.id, r.rental_ref, r.pickup_time, r.expected_return_time, r.status,
              u.full_name as customer_name, u.phone as customer_phone
       FROM rentals r
       JOIN customers c ON r.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE r.vehicle_id = ? AND r.status = 'ACTIVE'`,
      [vehicle.id]
    );

    // Upcoming bookings
    const upcomingBookings = all(
      `SELECT b.id, b.booking_ref, b.start_date, b.end_date, b.status,
              u.full_name as customer_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE b.vehicle_id = ? AND b.status IN ('CONFIRMED', 'PENDING')
       ORDER BY b.start_date ASC LIMIT 5`,
      [vehicle.id]
    );

    // Recent maintenance
    const maintenanceLogs = all(
      `SELECT id, maintenance_type, description, start_date, end_date, cost, status, service_provider
       FROM maintenance
       WHERE vehicle_id = ?
       ORDER BY start_date DESC LIMIT 5`,
      [vehicle.id]
    );

    res.json({
      success: true,
      vehicle: {
        ...vehicle,
        activeRental,
        upcomingBookings,
        maintenanceLogs
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/vehicles
 * Create new vehicle record (Admin & Staff)
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      category_id,
      location_id,
      reg_number,
      vin,
      make,
      model,
      year,
      color,
      fuel_type,
      transmission,
      seating_capacity,
      mileage,
      daily_rate,
      insurance_policy_no,
      insurance_expiry,
      image_url
    } = req.body;

    if (!category_id || !location_id || !reg_number || !make || !model || !year || !daily_rate) {
      return res.status(400).json({
        success: false,
        message: 'Category, location, registration number, make, model, year, and daily rate are required.'
      });
    }

    const existingReg = get('SELECT id FROM vehicles WHERE reg_number = ?', [reg_number.trim().toUpperCase()]);
    if (existingReg) {
      return res.status(409).json({ success: false, message: 'A vehicle with this registration number already exists.' });
    }

    const result = run(
      `INSERT INTO vehicles (
        category_id, location_id, reg_number, vin, make, model, year, color,
        fuel_type, transmission, seating_capacity, mileage, daily_rate, status,
        insurance_policy_no, insurance_expiry, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?)`,
      [
        category_id,
        location_id,
        reg_number.trim().toUpperCase(),
        vin ? vin.trim().toUpperCase() : null,
        make.trim(),
        model.trim(),
        Number(year),
        color || 'Standard',
        fuel_type || 'PETROL',
        transmission || 'AUTOMATIC',
        Number(seating_capacity) || 5,
        Number(mileage) || 0,
        Number(daily_rate),
        insurance_policy_no || null,
        insurance_expiry || null,
        image_url || null
      ]
    );

    const newVehicle = get('SELECT * FROM vehicles WHERE id = ?', [result.lastInsertRowid]);

    logAudit(req.user.id, 'VEHICLE_CREATED', 'VEHICLE', newVehicle.id, `Created vehicle ${newVehicle.reg_number}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      vehicle: newVehicle
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/vehicles/:id
 * Update vehicle information and manage status transitions
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const vehicleId = req.params.id;
    const existing = get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const {
      category_id,
      location_id,
      reg_number,
      vin,
      make,
      model,
      year,
      color,
      fuel_type,
      transmission,
      seating_capacity,
      mileage,
      daily_rate,
      status,
      insurance_policy_no,
      insurance_expiry,
      image_url
    } = req.body;

    // Check status transition validity
    if (status && status !== existing.status) {
      if (existing.status === 'RENTED' && status === 'AVAILABLE') {
        const activeRental = get("SELECT id FROM rentals WHERE vehicle_id = ? AND status = 'ACTIVE'", [vehicleId]);
        if (activeRental) {
          return res.status(400).json({
            success: false,
            message: 'Cannot manually mark vehicle as AVAILABLE while it has an active rental. Please process vehicle return first.'
          });
        }
      }

      if (existing.status === 'MAINTENANCE' && status === 'RENTED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot rent a vehicle that is currently under maintenance. Complete maintenance first.'
        });
      }
    }

    run(
      `UPDATE vehicles SET
        category_id = COALESCE(?, category_id),
        location_id = COALESCE(?, location_id),
        reg_number = COALESCE(?, reg_number),
        vin = COALESCE(?, vin),
        make = COALESCE(?, make),
        model = COALESCE(?, model),
        year = COALESCE(?, year),
        color = COALESCE(?, color),
        fuel_type = COALESCE(?, fuel_type),
        transmission = COALESCE(?, transmission),
        seating_capacity = COALESCE(?, seating_capacity),
        mileage = COALESCE(?, mileage),
        daily_rate = COALESCE(?, daily_rate),
        status = COALESCE(?, status),
        insurance_policy_no = COALESCE(?, insurance_policy_no),
        insurance_expiry = COALESCE(?, insurance_expiry),
        image_url = COALESCE(?, image_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        category_id,
        location_id,
        reg_number ? reg_number.trim().toUpperCase() : null,
        vin ? vin.trim().toUpperCase() : null,
        make,
        model,
        year ? Number(year) : null,
        color,
        fuel_type,
        transmission,
        seating_capacity ? Number(seating_capacity) : null,
        mileage ? Number(mileage) : null,
        daily_rate ? Number(daily_rate) : null,
        status,
        insurance_policy_no,
        insurance_expiry,
        image_url,
        vehicleId
      ]
    );

    const updated = get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);

    logAudit(req.user.id, 'VEHICLE_UPDATED', 'VEHICLE', vehicleId, `Updated vehicle ${updated.reg_number}`, req.ip);

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/vehicles/:id
 * Delete or deactivate vehicle (Admin only)
 */
router.delete('/:id', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const vehicleId = req.params.id;
    const vehicle = get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Check active bookings or active rentals
    const activeBooking = get(
      "SELECT id FROM bookings WHERE vehicle_id = ? AND status IN ('PENDING', 'CONFIRMED', 'ACTIVE')",
      [vehicleId]
    );
    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete or deactivate vehicle with active or upcoming bookings.'
      });
    }

    // Check historical dependencies
    const hasHistory = get('SELECT id FROM bookings WHERE vehicle_id = ? LIMIT 1', [vehicleId]);
    if (hasHistory) {
      // Soft deactivate to maintain referential integrity of past reports & receipts
      run("UPDATE vehicles SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [vehicleId]);
      logAudit(req.user.id, 'VEHICLE_DEACTIVATED', 'VEHICLE', vehicleId, `Deactivated vehicle ${vehicle.reg_number}`, req.ip);
      return res.json({
        success: true,
        message: 'Vehicle has past rental records; status was safely set to INACTIVE.'
      });
    }

    // If no history, hard delete safely
    run('DELETE FROM vehicles WHERE id = ?', [vehicleId]);
    logAudit(req.user.id, 'VEHICLE_DELETED', 'VEHICLE', vehicleId, `Deleted vehicle ${vehicle.reg_number}`, req.ip);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
