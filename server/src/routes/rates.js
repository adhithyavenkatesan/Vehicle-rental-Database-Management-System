const express = require('express');
const { all, get, run, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/rates
 * List all rate cards with category and branch info
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const rateCards = all(`
      SELECT rc.*,
             vc.name as category_name, vc.code as category_code,
             b.name as branch_name
      FROM rate_cards rc
      JOIN vehicle_categories vc ON rc.category_id = vc.id
      LEFT JOIN branches b ON rc.branch_id = b.id
      ORDER BY rc.id ASC
    `);

    res.json({ success: true, count: rateCards.length, rateCards });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/rates/:id
 * Retrieve a specific rate card
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const rateCard = get(`
      SELECT rc.*, vc.name as category_name, b.name as branch_name
      FROM rate_cards rc
      JOIN vehicle_categories vc ON rc.category_id = vc.id
      LEFT JOIN branches b ON rc.branch_id = b.id
      WHERE rc.id = ?
    `, [req.params.id]);

    if (!rateCard) {
      return res.status(404).json({ success: false, message: 'Rate card not found.' });
    }

    res.json({ success: true, rateCard });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rates/calculate
 * Calculate real backend rate breakdown based on database rate cards
 */
router.post('/calculate', authenticate, (req, res, next) => {
  try {
    const { category_id, branch_id, start_date, end_date } = req.body;

    if (!category_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'category_id, start_date, and end_date are required.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
    const totalDays = Math.max(1, Math.ceil(diffHours / 24));

    // Find best matching rate card (branch-specific or default)
    let rateCard = get(
      'SELECT * FROM rate_cards WHERE category_id = ? AND branch_id = ? AND is_active = 1 LIMIT 1',
      [category_id, branch_id || null]
    );

    if (!rateCard) {
      rateCard = get(
        'SELECT * FROM rate_cards WHERE category_id = ? AND branch_id IS NULL AND is_active = 1 LIMIT 1',
        [category_id]
      );
    }

    // Fallback to vehicle category defaults if no rate card
    let dailyRate = 2000.0;
    let hourlyRate = 180.0;
    let deposit = 5000.0;
    let weekendMultiplier = 1.15;
    let extraKmRate = 15.0;
    let extraHourRate = 250.0;
    let lateFeeHourRate = 350.0;

    if (rateCard) {
      dailyRate = rateCard.daily_rate;
      hourlyRate = rateCard.hourly_rate;
      deposit = rateCard.security_deposit;
      weekendMultiplier = rateCard.weekend_multiplier;
      extraKmRate = rateCard.extra_km_rate;
      extraHourRate = rateCard.extra_hour_rate;
      lateFeeHourRate = rateCard.late_return_hourly_rate;
    } else {
      const cat = get('SELECT daily_rate, hourly_rate, deposit_amount FROM vehicle_categories WHERE id = ?', [category_id]);
      if (cat) {
        dailyRate = cat.daily_rate;
        hourlyRate = cat.hourly_rate;
        deposit = cat.deposit_amount;
      }
    }

    // Check if dates include weekends (Saturday/Sunday)
    let weekendDays = 0;
    let cur = new Date(start);
    while (cur < end) {
      const day = cur.getDay();
      if (day === 0 || day === 6) {
        weekendDays++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const regularDays = Math.max(0, totalDays - weekendDays);
    const baseDailyTotal = (regularDays * dailyRate) + (weekendDays * dailyRate * weekendMultiplier);
    const taxRate = 18.0; // 18% GST
    const taxAmount = Number(((baseDailyTotal * taxRate) / 100).toFixed(2));
    const estimatedTotal = Number((baseDailyTotal + taxAmount).toFixed(2));

    res.json({
      success: true,
      calculation: {
        total_days: totalDays,
        total_hours: diffHours,
        regular_days: regularDays,
        weekend_days: weekendDays,
        daily_rate: dailyRate,
        hourly_rate: hourlyRate,
        weekend_multiplier: weekendMultiplier,
        base_amount: Number(baseDailyTotal.toFixed(2)),
        tax_rate: taxRate,
        tax_amount: taxAmount,
        estimated_total: estimatedTotal,
        security_deposit: deposit,
        extra_km_rate: extraKmRate,
        extra_hour_rate: extraHourRate,
        late_return_hourly_rate: lateFeeHourRate
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rates
 * Create new rate card (Admin & Staff)
 */
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const {
      category_id, branch_id, code, name, hourly_rate, daily_rate,
      weekly_rate, monthly_rate, weekend_multiplier, extra_km_rate,
      extra_hour_rate, late_return_hourly_rate, cancellation_fee_fixed,
      cancellation_fee_percent, security_deposit
    } = req.body;

    if (!category_id || !code || !name || !daily_rate) {
      return res.status(400).json({ success: false, message: 'Category, code, name, and daily rate are required.' });
    }

    const result = run(
      `INSERT INTO rate_cards (
        category_id, branch_id, code, name, hourly_rate, daily_rate,
        weekly_rate, monthly_rate, weekend_multiplier, extra_km_rate,
        extra_hour_rate, late_return_hourly_rate, cancellation_fee_fixed,
        cancellation_fee_percent, security_deposit, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        category_id, branch_id || null, code.toUpperCase(), name,
        Number(hourly_rate || daily_rate / 10), Number(daily_rate),
        Number(weekly_rate || daily_rate * 6), Number(monthly_rate || daily_rate * 24),
        Number(weekend_multiplier || 1.15), Number(extra_km_rate || 15.0),
        Number(extra_hour_rate || 250.0), Number(late_return_hourly_rate || 350.0),
        Number(cancellation_fee_fixed || 500.0), Number(cancellation_fee_percent || 10.0),
        Number(security_deposit || 5000.0)
      ]
    );

    logAudit(req.user.id, 'CREATE_RATE_CARD', 'RATE_CARD', result.lastInsertRowid, { code }, req.ip);

    res.status(201).json({ success: true, message: 'Rate card created successfully.', id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/rates/:id
 * Update rate card (Admin & Staff)
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const rc = get('SELECT id FROM rate_cards WHERE id = ?', [req.params.id]);
    if (!rc) {
      return res.status(404).json({ success: false, message: 'Rate card not found.' });
    }

    const {
      name, hourly_rate, daily_rate, weekly_rate, monthly_rate,
      weekend_multiplier, extra_km_rate, extra_hour_rate, late_return_hourly_rate,
      cancellation_fee_fixed, cancellation_fee_percent, security_deposit, is_active
    } = req.body;

    run(
      `UPDATE rate_cards
       SET name = COALESCE(?, name),
           hourly_rate = COALESCE(?, hourly_rate),
           daily_rate = COALESCE(?, daily_rate),
           weekly_rate = COALESCE(?, weekly_rate),
           monthly_rate = COALESCE(?, monthly_rate),
           weekend_multiplier = COALESCE(?, weekend_multiplier),
           extra_km_rate = COALESCE(?, extra_km_rate),
           extra_hour_rate = COALESCE(?, extra_hour_rate),
           late_return_hourly_rate = COALESCE(?, late_return_hourly_rate),
           cancellation_fee_fixed = COALESCE(?, cancellation_fee_fixed),
           cancellation_fee_percent = COALESCE(?, cancellation_fee_percent),
           security_deposit = COALESCE(?, security_deposit),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name, hourly_rate, daily_rate, weekly_rate, monthly_rate,
        weekend_multiplier, extra_km_rate, extra_hour_rate, late_return_hourly_rate,
        cancellation_fee_fixed, cancellation_fee_percent, security_deposit, is_active,
        rc.id
      ]
    );

    logAudit(req.user.id, 'UPDATE_RATE_CARD', 'RATE_CARD', rc.id, { id: rc.id }, req.ip);

    res.json({ success: true, message: 'Rate card updated successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/rates/:id
 * Delete rate card (Admin & Staff)
 */
router.delete('/:id', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const rcId = req.params.id;
    const rc = get('SELECT * FROM rate_cards WHERE id = ?', [rcId]);
    if (!rc) {
      return res.status(404).json({ success: false, message: 'Rate card not found.' });
    }

    run('DELETE FROM rate_cards WHERE id = ?', [rcId]);
    logAudit(req.user.id, 'DELETE_RATE_CARD', 'RATE_CARD', rcId, { code: rc.code }, req.ip);

    res.json({ success: true, message: `Rate card ${rc.name} (${rc.code}) deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
