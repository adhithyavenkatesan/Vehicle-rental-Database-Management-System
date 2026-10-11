import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  RotateCcw,
  Gauge,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Car,
  Clock,
  ShieldAlert
} from 'lucide-react';

export function ReturnsPage({ preselectedRental = null, onClearPreselectedRental }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [returns, setReturns] = useState([]);
  const [activeRentals, setActiveRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Return Process Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    rental_id: '',
    return_mileage: '',
    fuel_level_return: 'FULL',
    vehicle_condition: 'EXCELLENT',
    damage_fee_input: 0,
    notes: ''
  });

  const fetchReturnsData = async () => {
    try {
      setLoading(true);
      const [retRes, rentRes] = await Promise.all([
        api.getReturns(),
        api.getRentals({ status: 'ACTIVE' })
      ]);
      setReturns(retRes.returns);
      setActiveRentals(rentRes.rentals);
    } catch (err) {
      showToast('Failed to load return records: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnsData();
  }, []);

  // Handle preselected rental from Rentals page
  useEffect(() => {
    if (preselectedRental) {
      setReturnForm({
        rental_id: preselectedRental.id,
        return_mileage: (preselectedRental.start_mileage || 0) + 120,
        fuel_level_return: 'FULL',
        vehicle_condition: 'EXCELLENT',
        damage_fee_input: 0,
        notes: 'Returned in standard condition'
      });
      setModalOpen(true);
      if (onClearPreselectedRental) onClearPreselectedRental();
    }
  }, [preselectedRental]);

  const selectedActiveRental = activeRentals.find((r) => String(r.id) === String(returnForm.rental_id));

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.processReturn(returnForm);
      showToast(
        `Return processed! Vehicle status updated to ${res.summary?.vehicleNextStatus}. Charges: ₹${res.summary?.totalAdditionalCharges}`,
        'success'
      );
      setModalOpen(false);
      fetchReturnsData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Vehicle Return & Condition Inspection</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Check odometer, fuel penalties, late return fees, damage assessments, and release vehicles back to inventory.
          </p>
        </div>

        <button
          onClick={() => {
            const first = activeRentals[0];
            setReturnForm({
              rental_id: first?.id || '',
              return_mileage: first ? (first.start_mileage + 150) : '',
              fuel_level_return: 'FULL',
              vehicle_condition: 'EXCELLENT',
              damage_fee_input: 0,
              notes: ''
            });
            setModalOpen(true);
          }}
          disabled={activeRentals.length === 0}
          className="btn btn-primary"
        >
          <RotateCcw size={16} /> Process Vehicle Return ({activeRentals.length} Active Trips)
        </button>
      </div>

      {/* Processed Returns Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading return audit logs...
          </div>
        ) : returns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <RotateCcw size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <h3>No returned vehicles yet</h3>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rental Ref</th>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>Return Timestamp</th>
                  <th>Final Odometer</th>
                  <th>Condition</th>
                  <th>Fuel Level</th>
                  <th>Late Overdue</th>
                  <th>Fines / Charges</th>
                  <th>Inspected By</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret) => (
                  <tr key={ret.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{ret.rental_ref}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ret.make} {ret.model}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{ret.reg_number}</div>
                    </td>
                    <td>{ret.customer_name}</td>
                    <td>{new Date(ret.actual_return_time).toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{ret.return_mileage?.toLocaleString()} km</td>
                    <td>
                      <span
                        className={`badge ${
                          ret.vehicle_condition === 'EXCELLENT'
                            ? 'badge-available'
                            : ret.vehicle_condition === 'GOOD'
                            ? 'badge-active'
                            : ret.vehicle_condition === 'FAIR'
                            ? 'badge-pending'
                            : 'badge-maintenance'
                        }`}
                      >
                        {ret.vehicle_condition}
                      </span>
                    </td>
                    <td>{ret.fuel_level_return}</td>
                    <td>
                      {ret.late_hours > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{ret.late_hours} hr (₹{ret.late_fee})</span>
                      ) : (
                        <span style={{ color: 'var(--success)' }}>On Time</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: ret.total_additional_charges > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ₹{ret.total_additional_charges?.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{ret.staff_name || 'Fleet Lead'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return Inspection Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Process Vehicle Check-in & Return" maxWidth={620}>
        <form onSubmit={handleProcessSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Select Active Rental *</label>
              <select
                required
                value={returnForm.rental_id}
                onChange={(e) => {
                  const rId = e.target.value;
                  const r = activeRentals.find((x) => String(x.id) === String(rId));
                  setReturnForm({
                    ...returnForm,
                    rental_id: rId,
                    return_mileage: r ? r.start_mileage + 100 : ''
                  });
                }}
              >
                <option value="">Select trip...</option>
                {activeRentals.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rental_ref} - {r.customer_name} ({r.make} {r.model} [{r.reg_number}])
                  </option>
                ))}
              </select>
            </div>

            {selectedActiveRental && (
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem'
                }}
              >
                <div>Pickup Odometer: <strong>{selectedActiveRental.start_mileage} km</strong></div>
                <div>Expected Return: <strong>{new Date(selectedActiveRental.expected_return_time).toLocaleString()}</strong></div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Return Odometer (km) *</label>
                <input
                  type="number"
                  required
                  placeholder="Return mileage"
                  value={returnForm.return_mileage}
                  onChange={(e) => setReturnForm({ ...returnForm, return_mileage: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Fuel / Battery Level *</label>
                <select
                  value={returnForm.fuel_level_return}
                  onChange={(e) => setReturnForm({ ...returnForm, fuel_level_return: e.target.value })}
                >
                  <option value="FULL">FULL (100% - No penalty)</option>
                  <option value="75%">75% (Penalty: ₹500)</option>
                  <option value="50%">50% (Penalty: ₹1,000)</option>
                  <option value="25%">25% (Penalty: ₹1,500)</option>
                  <option value="EMPTY">EMPTY (Penalty: ₹2,000)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Vehicle Condition *</label>
                <select
                  value={returnForm.vehicle_condition}
                  onChange={(e) => setReturnForm({ ...returnForm, vehicle_condition: e.target.value })}
                >
                  <option value="EXCELLENT">EXCELLENT (Pristine)</option>
                  <option value="GOOD">GOOD (Normal wear)</option>
                  <option value="FAIR">FAIR (Needs interior detailing - ₹1,000)</option>
                  <option value="DAMAGED">DAMAGED (Auto-routes to Maintenance - ₹5,000+)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Specific Damage Charge (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={returnForm.damage_fee_input}
                  onChange={(e) => setReturnForm({ ...returnForm, damage_fee_input: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Inspection Notes</label>
              <textarea
                rows={2}
                placeholder="Walkaround verified. Clean exterior, tire tread certified, no scratch detected."
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Complete Return & Release Vehicle
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
