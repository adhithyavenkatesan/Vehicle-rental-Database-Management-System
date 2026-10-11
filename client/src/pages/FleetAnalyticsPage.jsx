import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  TrendingUp,
  PieChart,
  DollarSign,
  Fuel,
  Wrench,
  Car,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export function FleetAnalyticsPage() {
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [utilizationData, setUtilizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PROFITABILITY'); // 'PROFITABILITY' or 'UTILIZATION'

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [profRes, utilRes] = await Promise.all([
        api.getProfitabilityAnalytics(),
        api.getUtilizationAnalytics()
      ]);

      if (profRes.success) setProfitabilityData(profRes);
      if (utilRes.success) setUtilizationData(utilRes);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="card loading-container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
        <p style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Calculating per-vehicle profitability & fleet utilization...</p>
      </div>
    );
  }

  const summary = profitabilityData?.summary || { fleet_revenue: 0, fleet_expenses: 0, fleet_net_profit: 0 };
  const fleetSummary = utilizationData?.fleet_summary || { total_vehicles: 0, rented: 0, available: 0, maintenance: 0, utilization_rate_pct: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Fleet Profitability & Utilization Analytics
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Database calculations of vehicle revenue, fuel, maintenance cost, and capital utilization %
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 3, borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setActiveTab('PROFITABILITY')}
              className={`btn btn-sm ${activeTab === 'PROFITABILITY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Per-Vehicle Profitability
            </button>
            <button
              onClick={() => setActiveTab('UTILIZATION')}
              className={`btn btn-sm ${activeTab === 'UTILIZATION' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Fleet Utilization
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'PROFITABILITY' ? (
        <>
          {/* Executive KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Fleet Revenue</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem' }}>₹{summary.fleet_revenue?.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Fuel size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Fleet Operating Cost</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.2rem' }}>₹{summary.fleet_expenses?.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Net Contribution</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>₹{summary.fleet_net_profit?.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PieChart size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Average Fleet Margin</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.2rem' }}>
                  {summary.fleet_revenue > 0 ? ((summary.fleet_net_profit / summary.fleet_revenue) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Top vs Low Performers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {/* Top Performers */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Top Performing Vehicles (Net Margin)</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {profitabilityData.top_performers?.map((v, i) => (
                  <div
                    key={v.vehicle_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        #{i + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{v.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{v.reg_number} • {v.category}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--success)' }}>+₹{v.net_profit?.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{v.profit_margin_pct}% margin</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Performers */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Low Performing / High Maintenance</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {profitabilityData.low_performers?.map((v, i) => (
                  <div
                    key={v.vehicle_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        #{i + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{v.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{v.reg_number} • {v.category}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: v.net_profit >= 0 ? 'var(--text-main)' : 'var(--danger)' }}>
                        ₹{v.net_profit?.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Expenses: ₹{v.total_expenses?.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Vehicle Profitability Ledger Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 700 }}>
              Complete Vehicle-Wise Financial Contribution Table
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Gross Revenue</th>
                    <th>Fuel Cost</th>
                    <th>Maintenance</th>
                    <th>Other Costs</th>
                    <th>Net Profit</th>
                    <th>Margin %</th>
                    <th>Rev/km</th>
                    <th>Cost/km</th>
                  </tr>
                </thead>
                <tbody>
                  {profitabilityData.vehicles?.map((v) => (
                    <tr key={v.vehicle_id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{v.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{v.reg_number}</div>
                      </td>
                      <td>{v.category}</td>
                      <td>
                        <span className={`status-badge status-${v.status?.toLowerCase()}`}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{v.gross_revenue?.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>₹{v.fuel_cost?.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>₹{v.maintenance_cost?.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>₹{v.other_expenses?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: v.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        ₹{v.net_profit?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: v.profit_margin_pct >= 20 ? 'var(--success)' : 'var(--warning)' }}>
                        {v.profit_margin_pct}%
                      </td>
                      <td>₹{v.revenue_per_km}</td>
                      <td>₹{v.cost_per_km}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Fleet Utilization Tab */
        <>
          {/* Utilization Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Fleet Units</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.35rem' }}>{fleetSummary.total_vehicles}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Fleet Utilization Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.35rem' }}>
                {fleetSummary.utilization_rate_pct}%
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 700 }}>On-Road Rented</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.35rem' }}>{fleetSummary.rented}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', textTransform: 'uppercase', fontWeight: 700 }}>Reserved</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.35rem' }}>{fleetSummary.reserved}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 700 }}>In Maintenance</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.35rem' }}>{fleetSummary.maintenance}</div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 700 }}>
              Fleet Category Utilization & Depot Distribution
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Total Inventory</th>
                    <th>Active On-Road</th>
                    <th>Available in Depot</th>
                    <th>Under Workshop Service</th>
                    <th>Category Utilization %</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizationData.category_utilization?.map((cat, idx) => {
                    const rate = cat.total > 0 ? Number(((cat.in_use / cat.total) * 100).toFixed(1)) : 0;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{cat.category_name}</td>
                        <td style={{ fontWeight: 600 }}>{cat.total}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{cat.in_use}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{cat.available}</td>
                        <td style={{ color: cat.maintenance > 0 ? 'var(--danger)' : 'var(--text-dim)', fontWeight: 600 }}>{cat.maintenance}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: 'var(--primary-gradient)' }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
