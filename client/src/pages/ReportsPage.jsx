import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Car,
  Wrench,
  Download
} from 'lucide-react';

export function ReportsPage() {
  const { showToast } = useToast();
  const [financials, setFinancials] = useState(null);
  const [fleetUtilization, setFleetUtilization] = useState([]);
  const [maintenanceSummary, setMaintenanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [fRes, uRes, mRes] = await Promise.all([
          api.getFinancialReports(),
          api.getFleetUtilization(),
          api.getMaintenanceSummary()
        ]);
        setFinancials(fRes);
        setFleetUtilization(uRes.utilization);
        setMaintenanceSummary(mRes);
      } catch (err) {
        showToast('Failed to generate reports: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        Generating analytical reports from database...
      </div>
    );
  }

  const totalRev = financials?.revenueByCategory?.reduce((acc, c) => acc + (Number(c.total_revenue) || 0), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Commercial Financial & Fleet Utilization Reports</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Audited financial breakdowns, category yield, revenue per vehicle unit, and maintenance ROI.
          </p>
        </div>

        <a href={api.downloadBackupUrl} className="btn btn-secondary btn-sm" download>
          <Download size={15} /> Export Audit Snapshot (JSON)
        </a>
      </div>

      {/* Revenue by Category & Payment Method */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Category Revenue */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--primary)" /> Revenue by Vehicle Category
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {financials?.revenueByCategory?.map((cat) => {
              const pct = totalRev > 0 ? Math.round((cat.total_revenue / totalRev) * 100) : 0;
              return (
                <div key={cat.category_name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600 }}>{cat.category_name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                      ₹{cat.total_revenue?.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary-gradient)', borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} color="var(--success)" /> Collections by Payment Gateway
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {financials?.revenueByMethod?.map((m) => (
              <div
                key={m.payment_method}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{m.payment_method}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{m.transaction_count} verified transactions</div>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>
                  ₹{m.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet Yield & Utilization Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Car size={18} color="var(--accent-purple)" /> Individual Vehicle Asset Yield & Utilization
        </h4>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Registration</th>
                <th>Total Completed Bookings</th>
                <th>Total Rented Days</th>
                <th>Cumulative Earned Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fleetUtilization.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.make} {u.model} ({u.year})</strong></td>
                  <td>{u.category_name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{u.reg_number}</td>
                  <td>{u.total_bookings} trips</td>
                  <td>{u.total_rental_days} days</td>
                  <td style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.95rem' }}>
                    ₹{u.total_earned?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td><span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
