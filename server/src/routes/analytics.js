const express = require('express');
const { all, get } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/analytics/profitability
 * Real database-calculated per-vehicle profitability and performance ranking
 */
router.get('/profitability', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const vehicles = all(`
      SELECT v.id, v.reg_number, v.make, v.model, v.variant, v.year, v.status, v.mileage,
             v.daily_rate, v.purchase_price, v.current_value,
             vc.name as category_name
      FROM vehicles v
      JOIN vehicle_categories vc ON v.category_id = vc.id
      ORDER BY v.id ASC
    `);

    const profitabilityData = vehicles.map(veh => {
      // 1. Total Revenue from Bookings
      const revenueRow = get(`
        SELECT COALESCE(SUM(b.estimated_total), 0) as total_rev,
               COUNT(b.id) as booking_count,
               COALESCE(SUM(b.total_days), 0) as total_days_rented
        FROM bookings b
        WHERE b.vehicle_id = ? AND b.status IN ('COMPLETED', 'ACTIVE', 'CONFIRMED')
      `, [veh.id]);

      // 2. Additional Charges & Return Fees
      const returnChargesRow = get(`
        SELECT COALESCE(SUM(ret.total_additional_charges), 0) as additional_rev
        FROM returns ret
        WHERE ret.vehicle_id = ?
      `, [veh.id]);

      const grossRevenue = Number((revenueRow.total_rev + returnChargesRow.additional_rev).toFixed(2));

      // 3. Fuel Costs
      const fuelRow = get(`
        SELECT COALESCE(SUM(total_amount), 0) as fuel_cost,
               COALESCE(SUM(litres), 0) as total_litres
        FROM fuel_logs
        WHERE vehicle_id = ?
      `, [veh.id]);

      // 4. Maintenance Costs
      const maintRow = get(`
        SELECT COALESCE(SUM(cost), 0) as maint_cost,
               COUNT(id) as service_count
        FROM maintenance
        WHERE vehicle_id = ?
      `, [veh.id]);

      // 5. Other Fleet Expenses (Insurance, Permits, Detailing, etc.)
      const otherExpRow = get(`
        SELECT COALESCE(SUM(amount), 0) as other_cost
        FROM expenses
        WHERE vehicle_id = ? AND category NOT IN ('FUEL', 'MAINTENANCE')
      `, [veh.id]);

      const fuelCost = fuelRow.fuel_cost;
      const maintenanceCost = maintRow.maint_cost;
      const otherExpenses = otherExpRow.other_cost;
      const totalExpense = Number((fuelCost + maintenanceCost + otherExpenses).toFixed(2));
      const netProfit = Number((grossRevenue - totalExpense).toFixed(2));
      const profitMargin = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(1)) : 0;

      const totalKm = Math.max(1, veh.mileage);
      const revenuePerKm = Number((grossRevenue / totalKm).toFixed(2));
      const costPerKm = Number((totalExpense / totalKm).toFixed(2));

      return {
        vehicle_id: veh.id,
        reg_number: veh.reg_number,
        name: `${veh.make} ${veh.model}`,
        category: veh.category_name,
        status: veh.status,
        mileage: veh.mileage,
        total_rentals: revenueRow.booking_count,
        rental_days: revenueRow.total_days_rented,
        gross_revenue: grossRevenue,
        fuel_cost: fuelCost,
        maintenance_cost: maintenanceCost,
        other_expenses: otherExpenses,
        total_expenses: totalExpense,
        net_profit: netProfit,
        profit_margin_pct: profitMargin,
        revenue_per_km: revenuePerKm,
        cost_per_km: costPerKm
      };
    });

    // Sort by net profit descending
    const sorted = [...profitabilityData].sort((a, b) => b.net_profit - a.net_profit);
    const topPerformers = sorted.slice(0, 5);
    const lowPerformers = [...sorted].reverse().slice(0, 5);

    const totals = {
      fleet_revenue: Number(profitabilityData.reduce((acc, v) => acc + v.gross_revenue, 0).toFixed(2)),
      fleet_expenses: Number(profitabilityData.reduce((acc, v) => acc + v.total_expenses, 0).toFixed(2)),
      fleet_net_profit: Number(profitabilityData.reduce((acc, v) => acc + v.net_profit, 0).toFixed(2))
    };

    res.json({
      success: true,
      summary: totals,
      top_performers: topPerformers,
      low_performers: lowPerformers,
      vehicles: sorted
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/utilization
 * Fleet utilization statistics based on live database status
 */
router.get('/utilization', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const totalVehiclesRow = get('SELECT COUNT(*) as count FROM vehicles');
    const totalVehicles = totalVehiclesRow.count || 1;

    const statusCounts = all(`
      SELECT status, COUNT(*) as count
      FROM vehicles
      GROUP BY status
    `);

    const statusMap = {};
    for (const sc of statusCounts) {
      statusMap[sc.status] = sc.count;
    }

    const rentedCount = statusMap['RENTED'] || 0;
    const reservedCount = statusMap['RESERVED'] || 0;
    const availableCount = statusMap['AVAILABLE'] || 0;
    const maintenanceCount = statusMap['MAINTENANCE'] || 0;
    const damagedCount = statusMap['DAMAGED'] || 0;

    const utilizationRate = Number((((rentedCount + reservedCount) / totalVehicles) * 100).toFixed(1));

    // Category breakdown
    const categoryUtilization = all(`
      SELECT vc.name as category_name,
             COUNT(v.id) as total,
             SUM(CASE WHEN v.status IN ('RENTED', 'RESERVED') THEN 1 ELSE 0 END) as in_use,
             SUM(CASE WHEN v.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
             SUM(CASE WHEN v.status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance
      FROM vehicle_categories vc
      LEFT JOIN vehicles v ON vc.id = v.category_id
      GROUP BY vc.id
    `);

    res.json({
      success: true,
      fleet_summary: {
        total_vehicles: totalVehicles,
        rented: rentedCount,
        reserved: reservedCount,
        available: availableCount,
        maintenance: maintenanceCount,
        damaged: damagedCount,
        utilization_rate_pct: utilizationRate
      },
      category_utilization: categoryUtilization
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
