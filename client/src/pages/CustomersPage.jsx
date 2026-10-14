import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { StatusBadge } from '../components/StatusBadge';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  CheckCircle,
  FileText,
  Edit,
  Trash2
} from 'lucide-react';

export function CustomersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: 'Customer@123',
    driving_license_no: '',
    license_expiry: '',
    address: '',
    city: 'Metropolis',
    state: 'NY',
    postal_code: '10001'
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    driving_license_no: '',
    license_expiry: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    id_card_type: 'PASSPORT',
    id_card_no: ''
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers(search ? { search } : {});
      setCustomers(res.customers);
    } catch (err) {
      showToast('Failed to load customers: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleOpenDetails = async (c) => {
    try {
      const res = await api.getCustomer(c.id);
      setSelectedCustomer(res.customer);
      setDetailsModalOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createCustomer(form);
      showToast('Customer onboarded successfully', 'success');
      setAddModalOpen(false);
      fetchCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setEditForm({
      full_name: c.full_name || '',
      phone: c.phone || '',
      driving_license_no: c.driving_license_no || '',
      license_expiry: c.license_expiry || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      postal_code: c.postal_code || '',
      id_card_type: c.id_card_type || 'PASSPORT',
      id_card_no: c.id_card_no || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      await api.updateCustomer(editingCustomer.id, editForm);
      showToast('Customer record updated successfully', 'success');
      setEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to update customer', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      const res = await api.deleteCustomer(customerToDelete.id);
      showToast(res.message || 'Customer deleted successfully', 'success');
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      if (detailsModalOpen && selectedCustomer?.id === customerToDelete.id) {
        setDetailsModalOpen(false);
      }
      fetchCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to delete customer', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              placeholder="Search by name, email, phone, or license..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <button
          onClick={() => setAddModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Onboard Customer
        </button>
      </div>

      {/* Customers Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading customer accounts...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <Users size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <h3>No customer records found</h3>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Driving License</th>
                  <th>Contact Email</th>
                  <th>Phone Number</th>
                  <th>City / State</th>
                  <th>Total Rentals</th>
                  <th>Current Active</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{c.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID: #{c.id}</div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{c.driving_license_no}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Exp: {c.license_expiry}</div>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone || 'N/A'}</td>
                    <td>{c.city ? `${c.city}, ${c.state}` : 'N/A'}</td>
                    <td><strong>{c.total_rentals || 0}</strong> trips</td>
                    <td>
                      {c.active_rentals > 0 ? (
                        <span className="badge badge-rented">{c.active_rentals} Active Trip</span>
                      ) : (
                        <span className="badge badge-inactive">None</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button onClick={() => handleOpenDetails(c)} className="btn btn-secondary btn-sm" title="View Full Dossier">
                          Dossier
                        </button>
                        <button onClick={() => handleOpenEdit(c)} className="btn btn-secondary btn-sm" title="Edit Customer Details">
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setCustomerToDelete(c);
                            setDeleteModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="Delete Customer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title={`Customer Dossier: ${selectedCustomer.full_name}`} maxWidth={720}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Email</div>
                <div style={{ fontWeight: 600 }}>{selectedCustomer.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Phone</div>
                <div style={{ fontWeight: 600 }}>{selectedCustomer.phone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>License Number</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{selectedCustomer.driving_license_no}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Address</div>
                <div>{selectedCustomer.address || 'Standard Address'}, {selectedCustomer.city}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID Card / Passport</div>
                <div style={{ fontWeight: 600 }}>{selectedCustomer.id_card_type}: {selectedCustomer.id_card_no || 'Verified'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Account Status</div>
                <div><StatusBadge status={selectedCustomer.account_status} /></div>
              </div>
            </div>

            {/* Rental History Table */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Rental & Trip History ({selectedCustomer.rentals?.length || 0})</h4>
              <div className="table-responsive" style={{ maxHeight: 220 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Vehicle</th>
                      <th>Pickup Date</th>
                      <th>Return Odometer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.rentals?.length > 0 ? (
                      selectedCustomer.rentals.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.rental_ref}</td>
                          <td>{r.make} {r.model}</td>
                          <td>{new Date(r.pickup_time).toLocaleDateString()}</td>
                          <td>{r.return_mileage ? `${r.return_mileage.toLocaleString()} km` : 'In Transit'}</td>
                          <td><StatusBadge status={r.status} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                          No past rentals recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Onboard Customer Modal */}
      <AddCustomerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCustomerCreated={() => fetchCustomers()}
      />

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Customer: ${editingCustomer.full_name}`} maxWidth={600}>
          <form onSubmit={handleEditSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full Name *</label>
                  <input required value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Phone Number</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Driving License Number *</label>
                  <input required value={editForm.driving_license_no} onChange={(e) => setEditForm({ ...editForm, driving_license_no: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>License Expiry Date *</label>
                  <input type="date" required value={editForm.license_expiry} onChange={(e) => setEditForm({ ...editForm, license_expiry: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Street Address</label>
                <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>City</label>
                  <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>State</label>
                  <input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Postal Code</label>
                  <input value={editForm.postal_code} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>ID Card Type</label>
                  <select value={editForm.id_card_type} onChange={(e) => setEditForm({ ...editForm, id_card_type: e.target.value })}>
                    <option value="PASSPORT">PASSPORT</option>
                    <option value="NATIONAL_ID">NATIONAL ID / AADHAAR</option>
                    <option value="VOTER_ID">VOTER ID</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>ID Card Number</label>
                  <input value={editForm.id_card_no} onChange={(e) => setEditForm({ ...editForm, id_card_no: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Customer
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Customer Account Deletion" maxWidth={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete customer <strong>{customerToDelete.full_name}</strong> ({customerToDelete.email})?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              Note: This action permanently removes the user login credentials and linked historical records. Active ongoing rentals must be completed before deletion.
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
