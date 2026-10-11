import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { VehicleImage } from '../components/VehicleImage';
import { RentalAgreementModal } from '../components/RentalAgreementModal';
import { AddCustomerModal } from '../components/AddCustomerModal';
import {
  CalendarCheck,
  Search,
  Plus,
  KeyRound,
  XCircle,
  Clock,
  Car,
  MapPin,
  DollarSign,
  AlertCircle,
  FileText,
  UserPlus
} from 'lucide-react';

export function BookingsPage({ initialBookingVehicle = null, onClearInitialVehicle, onDispatchPickup }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create Booking Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);

  const handleCustomerCreated = (newCustomer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setFormData((prev) => ({ ...prev, customer_id: String(newCustomer.id) }));
  };

  const handleOpenAgreement = async (bookingId) => {
    try {
      const res = await api.getAgreementByBooking(bookingId);
      if (res.success && res.agreement) {
        setSelectedAgreement(res.agreement);
        setAgreementModalOpen(true);
      } else {
        const genRes = await api.generateAgreement(bookingId);
        if (genRes.success) {
          const newAgr = await api.getAgreement(genRes.agreement_id);
          setSelectedAgreement(newAgr.agreement);
          setAgreementModalOpen(true);
        }
      }
    } catch (err) {
      showToast('Could not load rental agreement: ' + err.message, 'error');
    }
  };

  // New Booking Form
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    pickup_location_id: '',
    return_location_id: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  const [bookingDays, setBookingDays] = useState(1);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.getBookings(params);
      setBookings(res.bookings);
    } catch (err) {
      showToast('Failed to load bookings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  // Load auxiliary data
  useEffect(() => {
    async function loadMeta() {
      try {
        const [vRes, lRes] = await Promise.all([api.getVehicles(), api.getLocations()]);
        setVehicles(vRes.vehicles);
        setLocations(lRes.locations);

        if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
          const cRes = await api.getCustomers();
          setCustomers(cRes.customers);
        }
      } catch (e) {
        console.error('Meta load error:', e);
      }
    }
    loadMeta();
  }, [user]);

  // Handle incoming vehicle pre-selection from Vehicles page
  useEffect(() => {
    if (initialBookingVehicle) {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 3);

      const toISO = (d) => d.toISOString().slice(0, 16);

      setFormData({
        customer_id: user?.customer_id || '',
        vehicle_id: initialBookingVehicle.id,
        pickup_location_id: initialBookingVehicle.location_id || locations[0]?.id || '',
        return_location_id: initialBookingVehicle.location_id || locations[0]?.id || '',
        start_date: toISO(now),
        end_date: toISO(tomorrow),
        notes: ''
      });
      setCreateModalOpen(true);
      if (onClearInitialVehicle) onClearInitialVehicle();
    }
  }, [initialBookingVehicle, locations, user]);

  // Recalculate duration & price
  useEffect(() => {
    if (formData.start_date && formData.end_date && formData.vehicle_id) {
      const s = new Date(formData.start_date);
      const e = new Date(formData.end_date);
      if (e > s) {
        const days = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
        setBookingDays(days);
        const v = vehicles.find((x) => String(x.id) === String(formData.vehicle_id));
        if (v) {
          setEstimatedCost(Number((days * v.daily_rate).toFixed(2)));
        }
      }
    }
  }, [formData.start_date, formData.end_date, formData.vehicle_id, vehicles]);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking(formData);
      showToast('Booking successfully created and confirmed!', 'success');
      setCreateModalOpen(false);
      fetchBookings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCancelBooking = async (b) => {
    const reason = prompt('Please enter cancellation reason:', 'Customer requested cancellation');
    if (reason === null) return;
    try {
      await api.updateBookingStatus(b.id, { status: 'CANCELLED', cancellation_reason: reason });
      showToast('Booking has been cancelled.', 'info');
      fetchBookings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDetails = async (b) => {
    try {
      const res = await api.getBooking(b.id);
      setSelectedBooking(res.booking);
      setDetailsModalOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isStaffOrAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { label: 'All Bookings', value: '' },
            { label: 'Confirmed', value: 'CONFIRMED' },
            { label: 'Active Rentals', value: 'ACTIVE' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Cancelled', value: 'CANCELLED' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className="btn btn-sm"
              style={{
                background: statusFilter === tab.value ? 'var(--primary)' : 'var(--bg-tertiary)',
                color: statusFilter === tab.value ? '#fff' : 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 3);
            const toISO = (d) => d.toISOString().slice(0, 16);

            setFormData({
              customer_id: user?.customer_id || '',
              vehicle_id: vehicles.find((v) => v.status === 'AVAILABLE')?.id || '',
              pickup_location_id: locations[0]?.id || '',
              return_location_id: locations[0]?.id || '',
              start_date: toISO(now),
              end_date: toISO(future),
              notes: ''
            });
            setCreateModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> New Reservation
        </button>
      </div>

      {/* Bookings Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading reservation records...
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <CalendarCheck size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <h3>No booking records found</h3>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>Pickup Depot</th>
                  <th>Rental Period</th>
                  <th>Duration</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{b.booking_ref}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <VehicleImage
                          src={b.image_url}
                          make={b.make}
                          model={b.model}
                          alt={b.model}
                          style={{ width: 48, height: 32, borderRadius: 4, flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{b.make} {b.model}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{b.reg_number}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{b.customer_phone || b.customer_email}</div>
                    </td>
                    <td>{b.pickup_location_name}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{new Date(b.start_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>to {new Date(b.end_date).toLocaleDateString()}</div>
                    </td>
                    <td><strong>{b.total_days}</strong> days</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{b.estimated_total}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button onClick={() => handleOpenDetails(b)} className="btn btn-secondary btn-sm">
                          Details
                        </button>

                        {/* Agreement Button */}
                        <button
                          onClick={() => handleOpenAgreement(b.id)}
                          className="btn btn-secondary btn-sm"
                          title="View Digital Rental Agreement"
                        >
                          <FileText size={13} />
                        </button>

                        {/* Dispatch Button for Staff if Confirmed */}
                        {isStaffOrAdmin && (b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                          <button
                            onClick={() => onDispatchPickup(b)}
                            className="btn btn-primary btn-sm"
                            title="Dispatch vehicle to customer"
                          >
                            <KeyRound size={13} /> Pickup
                          </button>
                        )}

                        {/* Cancel Button */}
                        {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                          <button
                            onClick={() => handleCancelBooking(b)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)' }}
                            title="Cancel Reservation"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Booking Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Vehicle Reservation" maxWidth={640}>
        <form onSubmit={handleCreateBooking}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Customer selector (Admin/Staff) or auto-filled for customer */}
            {isStaffOrAdmin ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>Customer *</label>
                  <button
                    type="button"
                    onClick={() => setAddCustomerModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.55rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: 'var(--primary)',
                      borderColor: 'rgba(59, 130, 246, 0.4)'
                    }}
                    title="Quickly register a new customer"
                  >
                    <UserPlus size={13} /> + New Customer
                  </button>
                </div>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setAddCustomerModalOpen(true);
                      return;
                    }
                    setFormData({ ...formData, customer_id: e.target.value });
                  }}
                >
                  <option value="">Select Customer...</option>
                  <option value="__NEW__" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    ➕ + Register New Customer...
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.driving_license_no}) - {c.phone}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                Reserving as: <strong>{user?.full_name}</strong> ({user?.email})
              </div>
            )}

            {/* Vehicle Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Vehicle *</label>
              <select
                required
                value={formData.vehicle_id}
                onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
              >
                <option value="">Select Vehicle...</option>
                {vehicles
                  .filter((v) => v.status === 'AVAILABLE' || String(v.id) === String(formData.vehicle_id))
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.reg_number}) - ₹{v.daily_rate}/day [{v.category_name}]
                    </option>
                  ))}
              </select>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pickup Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Return Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Pickup & Return Depot */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pickup Hub</label>
                <select
                  value={formData.pickup_location_id}
                  onChange={(e) => setFormData({ ...formData, pickup_location_id: e.target.value })}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.city})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Drop-off Hub</label>
                <select
                  value={formData.return_location_id}
                  onChange={(e) => setFormData({ ...formData, return_location_id: e.target.value })}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.city})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Real-time Calculation Summary Card */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.75rem',
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Duration</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{bookingDays} Day(s)</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Estimated Fare</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>₹{estimatedCost}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Security Deposit</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹5,000</div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Notes / Special Requests</label>
              <textarea
                rows={2}
                placeholder="Child seat, GPS, fastag or airport arrival flight number..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm & Lock Booking
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title={`Booking ${selectedBooking.booking_ref}`} maxWidth={650}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <VehicleImage
              src={selectedBooking.image_url}
              make={selectedBooking.make}
              model={selectedBooking.model}
              alt={selectedBooking.model}
              style={{ height: 200, borderRadius: 'var(--radius-md)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedBooking.make} {selectedBooking.model} ({selectedBooking.year})</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Plate: {selectedBooking.reg_number}</div>
              </div>
              <StatusBadge status={selectedBooking.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Customer</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.customer_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedBooking.customer_email}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>License: {selectedBooking.driving_license_no}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Pickup / Return Location</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.pickup_location_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Drop: {selectedBooking.return_location_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Pickup Time</div>
                <div style={{ fontWeight: 600 }}>{new Date(selectedBooking.start_date).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Scheduled Return</div>
                <div style={{ fontWeight: 600 }}>{new Date(selectedBooking.end_date).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Total Fare ({selectedBooking.total_days} days @ ₹{selectedBooking.daily_rate}/day)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>₹{selectedBooking.estimated_total}</div>
              </div>
              <div>
                <span className="badge badge-paid">Deposit: ₹{selectedBooking.deposit_amount}</span>
              </div>
            </div>

            {selectedBooking.rental_ref && (
              <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: 'var(--info)' }}>Associated Active Rental</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Rental Ref: <strong>{selectedBooking.rental_ref}</strong> • Initial Odometer: {selectedBooking.start_mileage} km
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Digital Rental Agreement Modal */}
      <RentalAgreementModal
        isOpen={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        agreement={selectedAgreement}
      />

      {/* Quick Add Customer Modal */}
      <AddCustomerModal
        isOpen={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
        zIndex={250}
      />
    </div>
  );
}
