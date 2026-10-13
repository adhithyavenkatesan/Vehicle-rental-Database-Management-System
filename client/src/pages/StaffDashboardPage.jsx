import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { VehicleImage } from '../components/VehicleImage';
import { AddCustomerModal } from '../components/AddCustomerModal';
import {
  Car,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  ClipboardCheck,
  CreditCard,
  Wrench,
  ArrowRight,
  Clock,
  User,
  ShieldCheck,
  Fuel,
  UserPlus
} from 'lucide-react';

export function StaffDashboardPage({ onNavigate, onDispatchPickup, onProcessReturn }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState('monthly'); // 'monthly' | 'yearly' | 'daily'

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setData(res.stats);
      }
    } catch (err) {
      console.error('Failed to load staff operations dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
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
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>Loading live fleet operations & dispatch queue...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Operations Desk Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)'
              }}
            >
              Operations Desk Active
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Logged in as: <strong>{user?.full_name}</strong> ({user?.designation || 'Fleet Desk Staff'})
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
            Fleet Handover, Dispatches & Check-Ins
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.35rem', marginBottom: 0 }}>
            Process customer vehicle handovers, odometer verifications, return inspections, and auto-settle fuel/late fees.
          </p>
        </div>

        {/* Quick Operational Dispatch Shortcuts */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate && onNavigate('rentals')}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <KeyRound size={16} /> Handover Dispatch
          </button>
          <button
            onClick={() => onNavigate && onNavigate('returns')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={16} /> Process Return
          </button>
          <button
            onClick={() => onNavigate && onNavigate('bookings')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <CalendarCheck size={16} /> Walk-in Booking
          </button>
          <button
            onClick={() => setAddCustomerModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserPlus size={16} /> Onboard Customer
          </button>
        </div>
      </div>

      {/* Primary Operations KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Today's Pickups */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Today's Pickups</span>
            <KeyRound size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--primary)' }}>
            {data?.todayPickups ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Awaiting vehicle dispatch</div>
        </div>

        {/* Today's Returns */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Today's Returns</span>
            <RotateCcw size={18} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--warning)' }}>
            {data?.todayReturns ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Due for check-in & audit</div>
        </div>

        {/* Active Rentals */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Active On-Road</span>
            <Car size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--info)' }}>
            {data?.rentedVehicles ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Live customer trips</div>
        </div>

        {/* Available Fleet */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Available Fleet</span>
            <CheckCircle2 size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--success)' }}>
            {data?.availableVehicles ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Ready for immediate rental</div>
        </div>

        {/* Pending Bookings */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Pending Bookings</span>
            <CalendarCheck size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--accent-purple)' }}>
            {data?.pendingBookings ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Requires verification</div>
        </div>

        {/* Maintenance Locked */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>In Maintenance</span>
            <Wrench size={18} color="var(--danger)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--danger)' }}>
            {data?.maintenanceVehicles ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Locked from booking</div>
        </div>

        {/* Fleet Revenue Metric (Monthly / Yearly / Daily) */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
              {revenuePeriod === 'yearly'
                ? 'Yearly Revenue'
                : revenuePeriod === 'daily'
                ? "Today's Revenue"
                : 'Monthly Revenue'}
            </span>
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '5px',
                padding: '2px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {[
                { key: 'monthly', label: 'Mo' },
                { key: 'yearly', label: 'Yr' },
                { key: 'daily', label: 'Day' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRevenuePeriod(key)}
                  style={{
                    border: 'none',
                    background: revenuePeriod === key ? 'var(--primary)' : 'transparent',
                    color: revenuePeriod === key ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={`View ${key} revenue`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--success)', letterSpacing: '-0.02em' }}>
            ₹{
              revenuePeriod === 'yearly'
                ? (data?.yearRevenue?.toLocaleString('en-IN') ?? '0')
                : revenuePeriod === 'daily'
                ? (data?.todayRevenue?.toLocaleString('en-IN') ?? '0')
                : (data?.monthRevenue?.toLocaleString('en-IN') ?? '0')
            }
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            {revenuePeriod === 'yearly'
              ? `Reconciled for ${data?.yearLabel || 'current year'}`
              : revenuePeriod === 'daily'
              ? 'Settled payments today'
              : `Reconciled for ${data?.monthLabel || 'current month'}`}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.4rem',
              paddingTop: '0.35rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>Mo: <strong style={{ color: 'var(--text-main)' }}>₹{(data?.monthRevenue || 0).toLocaleString('en-IN')}</strong></span>
            <span>•</span>
            <span>Yr: <strong style={{ color: 'var(--text-main)' }}>₹{(data?.yearRevenue || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Operations Split: Handover Queue & Check-In Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Dispatches / Handover Queue */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Confirmed Bookings for Dispatch</h3>
            </div>
            <button onClick={() => onNavigate && onNavigate('rentals')} className="btn btn-outline btn-sm">
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Pickup</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentBookings?.length > 0 ? (
                  data.recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{b.booking_ref}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.customer_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{b.pickup_location}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{b.make} {b.model}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{b.reg_number}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {new Date(b.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            if (onDispatchPickup) {
                              onDispatchPickup(b);
                            } else if (onNavigate) {
                              onNavigate('rentals');
                            }
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Handover
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active bookings queued for dispatch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expected Returns / Check-In Queue */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={18} color="var(--warning)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Upcoming Returns Due</h3>
            </div>
            <button onClick={() => onNavigate && onNavigate('returns')} className="btn btn-outline btn-sm">
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rental Ref</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Due Return</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.upcomingReturns?.length > 0 ? (
                  data.upcomingReturns.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.rental_ref}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.customer_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{r.customer_phone || 'Customer'}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{r.make} {r.model}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{r.reg_number}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                        {new Date(r.expected_return_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            if (onProcessReturn) {
                              onProcessReturn(r);
                            } else if (onNavigate) {
                              onNavigate('returns');
                            }
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Check-In
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No vehicles currently scheduled for return in this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Workshop Maintenance & Safety Alerts */}
      {data?.maintenanceAlerts?.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={18} color="var(--danger)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Workshop Service Tickets ({data.maintenanceAlerts.length})
              </h3>
            </div>
            <button onClick={() => onNavigate && onNavigate('maintenance')} className="btn btn-outline btn-sm">
              Workshop Desk <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {data.maintenanceAlerts.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {m.make} {m.model} ({m.reg_number})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {m.description || m.maintenance_type}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                    Service Vendor: {m.service_provider || 'Authorized Workshop'}
                  </div>
                </div>
                <span className={`status-badge status-${m.status?.toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Quick Add Customer Modal */}
      <AddCustomerModal
        isOpen={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        onCustomerCreated={() => {
          fetchStaffData();
        }}
      />
    </div>
  );
}
