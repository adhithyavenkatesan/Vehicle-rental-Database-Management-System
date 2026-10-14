import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { VehicleImage } from '../components/VehicleImage';
import {
  Car,
  Search,
  Filter,
  Calendar,
  Fuel,
  Gauge,
  Users,
  Plus,
  Edit,
  Trash2,
  ShieldCheck,
  CheckCircle,
  MapPin,
  Clock
} from 'lucide-react';

export function VehiclesPage({ onBookVehicle }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // New/Edit Vehicle Form State
  const [formData, setFormData] = useState({
    category_id: '',
    location_id: '',
    reg_number: '',
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: 'Midnight Black',
    fuel_type: 'PETROL',
    transmission: 'AUTOMATIC',
    seating_capacity: 5,
    mileage: 15000,
    daily_rate: 65,
    status: 'AVAILABLE',
    insurance_policy_no: '',
    insurance_expiry: '',
    image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const res = await api.getVehicles(params);
      setVehicles(res.vehicles);
    } catch (err) {
      showToast('Failed to load fleet: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, locRes] = await Promise.all([api.getCategories(), api.getLocations()]);
        setCategories(catRes.categories);
        setLocations(locRes.locations);
      } catch (e) {
        console.error('Failed to load categories/locations:', e);
      }
    }
    loadMeta();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVehicles();
  };

  const handleOpenDetails = async (vehicle) => {
    try {
      const res = await api.getVehicle(vehicle.id);
      setSelectedVehicle(res.vehicle);
      setDetailsModalOpen(true);
    } catch (err) {
      showToast('Could not load vehicle details: ' + err.message, 'error');
    }
  };

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      category_id: categories[0]?.id || '',
      location_id: locations[0]?.id || '',
      reg_number: '',
      vin: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: 'Solid White',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      seating_capacity: 5,
      mileage: 1000,
      daily_rate: 65,
      status: 'AVAILABLE',
      insurance_policy_no: 'POL-AUTO-2026',
      insurance_expiry: '2027-12-31',
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
    });
    setVehicleFormOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVehicle(v);
    setFormData({
      category_id: v.category_id,
      location_id: v.location_id,
      reg_number: v.reg_number,
      vin: v.vin || '',
      make: v.make,
      model: v.model,
      year: v.year,
      color: v.color,
      fuel_type: v.fuel_type,
      transmission: v.transmission,
      seating_capacity: v.seating_capacity,
      mileage: v.mileage,
      daily_rate: v.daily_rate,
      status: v.status,
      insurance_policy_no: v.insurance_policy_no || '',
      insurance_expiry: v.insurance_expiry || '',
      image_url: v.image_url || ''
    });
    setVehicleFormOpen(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await api.updateVehicle(editingVehicle.id, formData);
        showToast('Vehicle updated successfully', 'success');
      } else {
        await api.createVehicle(formData);
        showToast('Vehicle added to fleet', 'success');
      }
      setVehicleFormOpen(false);
      fetchVehicles();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      const res = await api.deleteVehicle(vehicleToDelete.id);
      showToast(res.message || 'Vehicle record processed successfully', 'success');
      setDeleteModalOpen(false);
      setVehicleToDelete(null);
      if (detailsModalOpen && selectedVehicle?.id === vehicleToDelete.id) {
        setDetailsModalOpen(false);
      }
      fetchVehicles();
    } catch (err) {
      showToast(err.message || 'Failed to delete vehicle', 'error');
    }
  };

  const isStaffOrAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search & Filter Bar */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center' }}>
          <div style={{ flex: '2 1 240px', minWidth: 200, position: 'relative' }}>
            <input
              placeholder="Search by make, model, or license plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="RENTED">Rented</option>
              <option value="RESERVED">Reserved</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          {/* Date Range Availability Check */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '2 1 280px' }}>
            <input
              type="date"
              title="Pickup Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            <span style={{ color: 'var(--text-dim)' }}>to</span>
            <input
              type="date"
              title="Return Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <button type="submit" className="btn btn-secondary">
            <Filter size={16} /> Filter
          </button>

          {isStaffOrAdmin && (
            <button type="button" onClick={handleOpenAdd} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
              <Plus size={16} /> Add Vehicle
            </button>
          )}
        </form>
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Loading vehicle catalog...
        </div>
      ) : vehicles.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Car size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No vehicles match your criteria</h3>
          <p style={{ marginTop: '0.5rem' }}>Try clearing filters or changing dates to see available fleet options.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {vehicles.map((v) => (
            <div key={v.id} className="glass-card glass-card-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Image & Status Tag */}
              <div style={{ position: 'relative', height: 180, width: '100%', background: 'var(--bg-tertiary)' }}>
                <VehicleImage
                  src={v.image_url}
                  make={v.make}
                  model={v.model}
                  alt={`${v.make} ${v.model}`}
                  regNumber={v.reg_number}
                />
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <StatusBadge status={v.status} />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(6px)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {v.reg_number}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {v.category_name}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.1rem' }}>
                      {v.make} {v.model}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                      ₹{v.daily_rate}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>per day</div>
                  </div>
                </div>

                {/* Specs Pills */}
                <div style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Fuel size={14} /> {v.fuel_type}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Gauge size={14} /> {v.transmission}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={14} /> {v.seating_capacity} Seats
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} /> {v.location_city}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => handleOpenDetails(v)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                    Specs
                  </button>

                  {/* Booking Action */}
                  <button
                    onClick={() => onBookVehicle(v)}
                    disabled={v.status !== 'AVAILABLE'}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.5, opacity: v.status !== 'AVAILABLE' ? 0.6 : 1 }}
                  >
                    {v.status === 'AVAILABLE' ? 'Book Now' : v.status}
                  </button>

                  {isStaffOrAdmin && (
                    <>
                      <button onClick={() => handleOpenEdit(v)} className="btn btn-secondary btn-sm" title="Edit Vehicle Specs">
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setVehicleToDelete(v);
                          setDeleteModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        title="Delete or Deactivate Vehicle"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vehicle Full Specs Modal */}
      {selectedVehicle && (
        <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title={`${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.year})`} maxWidth={700}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <VehicleImage
              src={selectedVehicle.image_url}
              make={selectedVehicle.make}
              model={selectedVehicle.model}
              alt={selectedVehicle.model}
              style={{ height: 240, borderRadius: 'var(--radius-md)' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Number Plate</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{selectedVehicle.reg_number}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Chassis / VIN</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{selectedVehicle.vin || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Odometer (Distance)</div>
                <div style={{ fontWeight: 700 }}>{selectedVehicle.mileage?.toLocaleString()} km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Rate / Day</div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>₹{selectedVehicle.daily_rate}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Refundable Deposit</div>
                <div style={{ fontWeight: 700 }}>₹{selectedVehicle.category_deposit}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Status</div>
                <div><StatusBadge status={selectedVehicle.status} /></div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>Insurance Policy (General Insurance)</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Policy #: <strong>{selectedVehicle.insurance_policy_no || 'POL-DEFAULT-ACTIVE'}</strong> | Valid Till: {selectedVehicle.insurance_expiry || '2027-12-31'}
              </div>
            </div>

            {selectedVehicle.activeRental && (
              <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: 'var(--info)', fontSize: '0.9rem' }}>Currently Active Rental</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Rented by: <strong>{selectedVehicle.activeRental.customer_name}</strong> ({selectedVehicle.activeRental.customer_phone})
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Expected Return: {new Date(selectedVehicle.activeRental.expected_return_time).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Vehicle Modal */}
      <Modal isOpen={vehicleFormOpen} onClose={() => setVehicleFormOpen(false)} title={editingVehicle ? 'Edit Vehicle Information' : 'Add New Commercial Vehicle'} maxWidth={640}>
        <form onSubmit={handleSaveVehicle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Category *</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Location / Hub *</label>
                <select value={formData.location_id} onChange={(e) => setFormData({ ...formData, location_id: e.target.value })} required>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.city})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Make (e.g. Maruti, Tata, Hyundai) *</label>
                <input required value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Model (e.g. Swift, Nexon, Creta) *</label>
                <input required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Year *</label>
                <input type="number" required value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Daily Rate (₹) *</label>
                <input type="number" step="1" required value={formData.daily_rate} onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="RENTED">RENTED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Registration Number *</label>
                <input required placeholder="NY-RD-1234" value={formData.reg_number} onChange={(e) => setFormData({ ...formData, reg_number: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>VIN Number</label>
                <input placeholder="1HGCR2F83HA..." value={formData.vin} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Fuel Type</label>
                <select value={formData.fuel_type} onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}>
                  <option value="PETROL">PETROL</option>
                  <option value="DIESEL">DIESEL</option>
                  <option value="ELECTRIC">ELECTRIC</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Transmission</label>
                <select value={formData.transmission} onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}>
                  <option value="AUTOMATIC">AUTOMATIC</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Seats</label>
                <input type="number" min="1" max="10" value={formData.seating_capacity} onChange={(e) => setFormData({ ...formData, seating_capacity: parseInt(e.target.value) || 2 })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Mileage (km)</label>
                <input type="number" value={formData.mileage} onChange={(e) => setFormData({ ...formData, mileage: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Image URL</label>
              <input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setVehicleFormOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingVehicle ? 'Update Vehicle' : 'Save New Vehicle'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {vehicleToDelete && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Vehicle Deletion" maxWidth={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to delete vehicle <strong>{vehicleToDelete.make} {vehicleToDelete.model}</strong> ({vehicleToDelete.reg_number})?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              Note: If this vehicle has past rental or billing records, its status will safely transition to <strong>INACTIVE</strong> to preserve relational database integrity.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDelete} className="btn btn-danger" style={{ background: 'var(--danger)', color: '#fff' }}>
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
