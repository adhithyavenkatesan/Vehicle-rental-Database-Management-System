const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/maintenance
 * List maintenance logs
 */
router.get('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { status, vehicle_id } = req.query;

    let sql = `
      SELECT m.*,
             v.make, v.model, v.year, v.reg_number, v.status as vehicle_current_status,
             v.mileage as vehicle_mileage,
             l.name as location_name
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.id
      JOIN locations l ON v.location_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND m.status = ?';
      params.push(status.toUpperCase());
    }

    if (vehicle_id) {
      sql += ' AND m.vehicle_id = ?';
      params.push(vehicle_id);
    }

    sql += ' ORDER BY m.start_date DESC';

    const records = all(sql, params);
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/maintenance
 * Schedule or initiate maintenance (takes vehicle offline)
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      vehicle_id,
      maintenance_type,
      description,
      start_date,
      end_date,
      cost,
      service_provider,
      next_service_mileage,
      next_service_date,
      status,
      notes
    } = req.body;

    if (!vehicle_id || !maintenance_type || !description || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, maintenance type, description, and start date are required.'
      });
    }

    const vehicle = get('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Check if vehicle has an active rental right now
    if (vehicle.status === 'RENTED') {
      return res.status(409).json({
        success: false,
        message: 'Cannot send vehicle to maintenance while actively rented out. Complete return first.'
      });
    }

    const initialStatus = (status || 'IN_PROGRESS').toUpperCase();

    const result = transaction(() => {
      const res = run(
        `INSERT INTO maintenance (
          vehicle_id, maintenance_type, description, start_date, end_date,
          cost, service_provider, next_service_mileage, next_service_date, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vehicle_id,
          maintenance_type.toUpperCase(),
          description.trim(),
          start_date,
          end_date || null,
          Number(cost) || 0,
          service_provider || null,
          next_service_mileage ? Number(next_service_mileage) : null,
          next_service_date || null,
          initialStatus,
          notes || null
        ]
      );

      // If IN_PROGRESS or SCHEDULED, mark vehicle status as MAINTENANCE to lock availability
      if (initialStatus === 'IN_PROGRESS' || initialStatus === 'SCHEDULED') {
        run("UPDATE vehicles SET status = 'MAINTENANCE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [vehicle_id]);
      }

      return res.lastInsertRowid;
    });

    const newRecord = get('SELECT * FROM maintenance WHERE id = ?', [result]);

    logAudit(
      req.user.id,
      'MAINTENANCE_CREATED',
      'MAINTENANCE',
      result,
      `Vehicle ${vehicle.reg_number} scheduled for ${maintenance_type} (${initialStatus})`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Maintenance logged successfully; vehicle set to MAINTENANCE status.',
      maintenance: newRecord
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/maintenance/:id/complete
 * Complete maintenance job and restore vehicle to AVAILABLE
 */
router.patch('/:id/complete', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const maintenanceId = req.params.id;
    const { final_cost, next_service_mileage, next_service_date, notes } = req.body;

    const record = get('SELECT * FROM maintenance WHERE id = ?', [maintenanceId]);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    if (record.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'This maintenance record is already completed.' });
    }

    transaction(() => {
      // 1. Mark maintenance as COMPLETED
      run(
        `UPDATE maintenance SET
           status = 'COMPLETED',
           end_date = COALESCE(end_date, CURRENT_DATE),
           cost = COALESCE(?, cost),
           next_service_mileage = COALESCE(?, next_service_mileage),
           next_service_date = COALESCE(?, next_service_date),
           notes = COALESCE(?, notes)
         WHERE id = ?`,
        [
          final_cost !== undefined ? Number(final_cost) : null,
          next_service_mileage ? Number(next_service_mileage) : null,
          next_service_date || null,
          notes,
          maintenanceId
        ]
      );

      // 2. Check if there are other in-progress maintenance records for this vehicle
      const otherMaintenance = get(
        "SELECT id FROM maintenance WHERE vehicle_id = ? AND id != ? AND status = 'IN_PROGRESS'",
        [record.vehicle_id, maintenanceId]
      );

      if (!otherMaintenance) {
        // Restore vehicle to AVAILABLE!
        run("UPDATE vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [record.vehicle_id]);
      }
    });

    const updated = get('SELECT * FROM maintenance WHERE id = ?', [maintenanceId]);
    const vehicle = get('SELECT id, reg_number, status FROM vehicles WHERE id = ?', [record.vehicle_id]);

    logAudit(
      req.user.id,
      'MAINTENANCE_COMPLETED',
      'MAINTENANCE',
      maintenanceId,
      `Completed maintenance for vehicle ${vehicle.reg_number}; status restored to ${vehicle.status}`,
      req.ip
    );

    res.json({
      success: true,
      message: 'Maintenance completed. Vehicle status restored to AVAILABLE.',
      maintenance: updated,
      vehicle
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/maintenance/:id
 * Update maintenance record (Admin & Staff)
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const maintenanceId = req.params.id;
    const record = get('SELECT * FROM maintenance WHERE id = ?', [maintenanceId]);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    const {
      maintenance_type,
      description,
      start_date,
      end_date,
      cost,
      service_provider,
      next_service_mileage,
      next_service_date,
      status,
      notes
    } = req.body;

    run(
      `UPDATE maintenance SET
         maintenance_type = COALESCE(?, maintenance_type),
         description = COALESCE(?, description),
         start_date = COALESCE(?, start_date),
         end_date = COALESCE(?, end_date),
         cost = COALESCE(?, cost),
         service_provider = COALESCE(?, service_provider),
         next_service_mileage = COALESCE(?, next_service_mileage),
         next_service_date = COALESCE(?, next_service_date),
         status = COALESCE(?, status),
         notes = COALESCE(?, notes)
       WHERE id = ?`,
      [
        maintenance_type ? maintenance_type.toUpperCase() : null,
        description,
        start_date,
        end_date,
        cost !== undefined ? Number(cost) : null,
        service_provider,
        next_service_mileage ? Number(next_service_mileage) : null,
        next_service_date,
        status ? status.toUpperCase() : null,
        notes,
        maintenanceId
      ]
    );

    logAudit(req.user.id, 'MAINTENANCE_UPDATED', 'MAINTENANCE', maintenanceId, `Updated maintenance log #${maintenanceId}`, req.ip);

    const updated = get('SELECT * FROM maintenance WHERE id = ?', [maintenanceId]);
    res.json({ success: true, message: 'Maintenance record updated successfully.', maintenance: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/maintenance/:id
 * Delete maintenance record (Admin & Staff)
 */
router.delete('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const maintenanceId = req.params.id;
    const record = get('SELECT * FROM maintenance WHERE id = ?', [maintenanceId]);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    transaction(() => {
      run('DELETE FROM maintenance WHERE id = ?', [maintenanceId]);

      // If this vehicle was in maintenance, check if any other active maintenance exists
      if (record.status === 'IN_PROGRESS' || record.status === 'SCHEDULED') {
        const other = get("SELECT id FROM maintenance WHERE vehicle_id = ? AND status = 'IN_PROGRESS' LIMIT 1", [record.vehicle_id]);
        if (!other) {
          run("UPDATE vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [record.vehicle_id]);
        }
      }
    });

    logAudit(req.user.id, 'MAINTENANCE_DELETED', 'MAINTENANCE', maintenanceId, `Deleted maintenance record #${maintenanceId}`, req.ip);

    res.json({ success: true, message: 'Maintenance record deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
