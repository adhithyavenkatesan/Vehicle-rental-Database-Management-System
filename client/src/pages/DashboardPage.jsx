import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  Car,
  CheckCircle2,
  KeyRound,
  Wrench,
  Users,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Clock,
  CheckSquare,
  FileCheck
} from 'lucide-react';

export function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await api.getDashboardStats();
        if (res.success) {
          setData(res.stats);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
        <div
          style={{
            display: 'inline-block',
            width: 36,
            height: 36,
            border: '3px solid var(--border-medium)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>Loading live executive fleet & financial metrics...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Executive Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-paid">Relational Database Engine</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              15 Tables • Foreign Keys: ON • WAL Mode: ACTIVE
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
            Executive Fleet Management & Financial Hub
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem', marginBottom: 0 }}>
            Unified administrative visibility over fleet status, live utilization, revenue ledgers, and operational approvals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => onNavigate && onNavigate('bookings')} className="btn btn-primary btn-sm">
            <CalendarCheck size={16} /> New Booking
          </button>
          <button onClick={() => onNavigate && onNavigate('returns')} className="btn btn-secondary btn-sm">
            <KeyRound size={16} /> Process Return
          </button>
        </div>
      </div>

      {/* Maintenance Alerts Banner if any */}
      {data?.maintenanceAlerts?.length > 0 && (
        <div
          style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} color="var(--warning)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '0.95rem' }}>
                Maintenance Notice: {data.maintenanceAlerts.length} Vehicle(s) Currently Offline in Workshop
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {data.maintenanceAlerts[0].make} {data.maintenanceAlerts[0].model} ({data.maintenanceAlerts[0].reg_number}) - {data.maintenanceAlerts[0].description}
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate && onNavigate('maintenance')} className="btn btn-secondary btn-sm">
            Manage Service Jobs
          </button>
        </div>
      )}

      {/* 10 Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {/* 1. Total Vehicles */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Total Vehicles</span>
            <Car size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem' }}>{data?.totalVehicles ?? 0}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Commercial fleet units</div>
        </div>

        {/* 2. Available Vehicles */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Available Fleet</span>
            <CheckCircle2 size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--success)' }}>
            {data?.availableVehicles ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Ready for immediate rental</div>
        </div>

        {/* 3. Reserved Vehicles */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Reserved Vehicles</span>
            <CalendarCheck size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--accent-purple)' }}>
            {data?.reservedVehicles ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Upcoming booked trips</div>
        </div>

        {/* 4. Active Rentals */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Active Rentals</span>
            <KeyRound size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--info)' }}>
            {data?.rentedVehicles ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>On customer road trips</div>
        </div>

        {/* 5. Maintenance Vehicles */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Maintenance</span>
            <Wrench size={18} color="var(--danger)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--danger)' }}>
            {data?.maintenanceVehicles ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Locked from booking</div>
        </div>

        {/* 6. Today's Bookings */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Today's Bookings</span>
            <Clock size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--primary)' }}>
            {data?.todayBookings ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Reservations logged today</div>
        </div>

        {/* 7. Today's Revenue */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Today's Revenue</span>
            <DollarSign size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--success)' }}>
            ₹{data?.todayRevenue?.toLocaleString('en-IN') ?? '0'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Settled payments today</div>
        </div>

        {/* 8. Outstanding Payments */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Outstanding</span>
            <AlertTriangle size={18} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--warning)' }}>
            ₹{data?.outstandingPayments?.toLocaleString('en-IN') ?? '0'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Pending invoice balances</div>
        </div>

        {/* 9. Fleet Utilization */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Fleet Utilization</span>
            <TrendingUp size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--accent-purple)' }}>
            {data?.fleetUtilizationRate ?? 0}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Rented & reserved ratio</div>
        </div>

        {/* 10. Pending Approvals */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Pending Approvals</span>
            <CheckSquare size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--info)' }}>
            {data?.pendingApprovals ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Awaiting executive review</div>
        </div>
      </div>

      {/* Charts Section: Monthly Revenue Trend & Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Monthly Revenue Trend */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Revenue Trend (Last 6 Months)</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>Aggregated from reconciled transaction receipts</div>
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
              ₹{data?.totalRevenue?.toLocaleString('en-IN') ?? '0'} Total
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: 160, paddingTop: '1rem' }}>
            {data?.monthlyRevenue?.length > 0 ? (
              data.monthlyRevenue.map((m) => {
                const maxRev = Math.max(...data.monthlyRevenue.map((x) => x.revenue), 1);
                const heightPct = Math.max(Math.round((m.revenue / maxRev) * 100), 12);
                return (
                  <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                      ₹{Math.round(m.revenue / 1000)}k
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 42,
                        height: `${heightPct}%`,
                        background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                      }}
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6 }}>{m.month}</div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', width: '100%', color: 'var(--text-muted)' }}>No historical revenue transactions logged yet.</div>
            )}
          </div>
        </div>

        {/* Fleet Distribution by Vehicle Category */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Fleet Category Distribution</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{data?.totalVehicles ?? 0} Total Units</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {data?.categoryBreakdown?.map((cat) => {
              const total = data.totalVehicles > 0 ? data.totalVehicles : 1;
              const percent = Math.round((cat.vehicle_count / total) * 100);
              return (
                <div key={cat.code} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{cat.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {cat.vehicle_count} units ({percent}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary-gradient)', borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '0.35rem', color: 'var(--text-dim)' }}>
                    <span>{cat.available_count} Available</span>
                    <span>{cat.rented_count} On Trip</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tables Section: Recent Bookings & Recent Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Bookings */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Recent Booking Activity</h3>
            <button onClick={() => onNavigate && onNavigate('bookings')} className="btn btn-outline btn-sm">
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentBookings?.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{b.booking_ref}</td>
                    <td>{b.customer_name}</td>
                    <td>{b.make} {b.model}</td>
                    <td style={{ fontWeight: 700 }}>₹{b.estimated_total}</td>
                    <td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Verified Paid Receipts</h3>
            <button onClick={() => onNavigate && onNavigate('payments')} className="btn btn-outline btn-sm">
              Ledger <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Ref</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentPayments?.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.payment_ref}</td>
                    <td>{p.customer_name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{p.payment_method}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{p.amount?.toFixed(2)}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tables Row 2: Upcoming Returns & Pending Approvals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Upcoming Returns */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={18} color="var(--warning)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Upcoming Returns Due</h3>
            </div>
            <button onClick={() => onNavigate && onNavigate('returns')} className="btn btn-outline btn-sm">
              Returns Hub <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rental Ref</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Return Due</th>
                </tr>
              </thead>
              <tbody>
                {data?.upcomingReturns?.length > 0 ? (
                  data.upcomingReturns.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.rental_ref}</td>
                      <td>{r.customer_name}</td>
                      <td>{r.make} {r.model} ({r.reg_number})</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                        {new Date(r.expected_return_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No rentals due for return in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={18} color="var(--info)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Governance Approvals Queue</h3>
            </div>
            <button onClick={() => onNavigate && onNavigate('approvals')} className="btn btn-outline btn-sm">
              Approvals <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Type</th>
                  <th>Requested By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.pendingApprovalsList?.length > 0 ? (
                  data.pendingApprovalsList.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>REQ-APP-{a.id}</td>
                      <td><span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{a.approval_type}</span></td>
                      <td>{a.requester_name}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      All approval requests are up to date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
