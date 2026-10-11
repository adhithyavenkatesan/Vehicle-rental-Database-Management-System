import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  KeyRound,
  Search,
  RotateCcw,
  Gauge,
  Fuel,
  Clock,
  Car,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function RentalsPage({ onProcessReturn, preselectedBooking = null, onClearPreselectedBooking }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rentals, setRentals] = useState([]);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Pickup Modal
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupForm, setPickupForm] = useState({
    booking_id: '',
    start_mileage: '',
    fuel_level_pickup: 'FULL',
    notes: ''
  });

  const fetchRentals = async () => {
    try {
      setLoading(true);
      const res = await api.getRentals();
      setRentals(res.rentals);

      if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
        const bRes = await api.getBookings({ status: 'CONFIRMED' });
        setConfirmedBookings(bRes.bookings);
      }
    } catch (err) {
      showToast('Failed to load rentals: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [user]);

  // Handle incoming booking to dispatch from bookings page
  useEffect(() => {
    if (preselectedBooking) {
      setPickupForm({
        booking_id: preselectedBooking.id,
        start_mileage: '',
        fuel_level_pickup: 'FULL',
        notes: `Pickup dispatched for booking ${preselectedBooking.booking_ref}`
      });
      setPickupModalOpen(true);
      if (onClearPreselectedBooking) onClearPreselectedBooking();
    }
  }, [preselectedBooking]);

  const handlePickupSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.pickupRental(pickupForm);
      showToast('Vehicle handover confirmed! Rental is now active.', 'success');
      setPickupModalOpen(false);
      fetchRentals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isStaffOrAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Fleet Rental Operations & Handover</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Dispatch reserved vehicles, track odometer mileage, and initiate vehicle return checklists.
          </p>
        </div>

        {isStaffOrAdmin && (
          <button
            onClick={() => {
              setPickupForm({
                booking_id: confirmedBookings[0]?.id || '',
                start_mileage: '',
                fuel_level_pickup: 'FULL',
                notes: ''
              });
              setPickupModalOpen(true);
            }}
            className="btn btn-primary"
            disabled={confirmedBookings.length === 0}
          >
            <KeyRound size={16} /> Dispatch Handover ({confirmedBookings.length} Ready)
          </button>
        )}
      </div>

      {/* Rentals Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading rental records...
          </div>
        ) : rentals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <KeyRound size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <h3>No rental records found</h3>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rental Ref</th>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>Pickup Time</th>
                  <th>Expected Return</th>
                  <th>Start Odometer</th>
                  <th>Status</th>
                  {isStaffOrAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rentals.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.rental_ref}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.make} {r.model}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{r.reg_number}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{r.customer_phone || r.customer_email}</div>
                    </td>
                    <td>{new Date(r.pickup_time).toLocaleString()}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(r.expected_return_time).toLocaleString()}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.start_mileage?.toLocaleString()} km</td>
                    <td><StatusBadge status={r.status} /></td>
                    {isStaffOrAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {r.status === 'ACTIVE' && (
                          <button
                            onClick={() => onProcessReturn(r)}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--primary-gradient)', color: '#fff' }}
                          >
                            <RotateCcw size={14} /> Process Return
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch Handover Modal */}
      <Modal isOpen={pickupModalOpen} onClose={() => setPickupModalOpen(false)} title="Vehicle Handover & Rental Activation" maxWidth={580}>
        <form onSubmit={handlePickupSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Select Confirmed Booking *</label>
              <select
                required
                value={pickupForm.booking_id}
                onChange={(e) => setPickupForm({ ...pickupForm, booking_id: e.target.value })}
              >
                <option value="">Select a confirmed reservation...</option>
                {confirmedBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.booking_ref} - {b.customer_name} ({b.make} {b.model} [{b.reg_number}])
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Current Odometer Reading (km) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 18500"
                  value={pickupForm.start_mileage}
                  onChange={(e) => setPickupForm({ ...pickupForm, start_mileage: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Fuel / Battery Level at Pickup *</label>
                <select
                  value={pickupForm.fuel_level_pickup}
                  onChange={(e) => setPickupForm({ ...pickupForm, fuel_level_pickup: e.target.value })}
                >
                  <option value="FULL">FULL (100%)</option>
                  <option value="75%">75%</option>
                  <option value="50%">50%</option>
                  <option value="25%">25%</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Staff Notes / Vehicle Condition at Dispatch</label>
              <textarea
                rows={2}
                placeholder="Walkaround verified. Clean exterior, keys handed over with registration documentation."
                value={pickupForm.notes}
                onChange={(e) => setPickupForm({ ...pickupForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setPickupModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Activate Rental & Release Vehicle
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
