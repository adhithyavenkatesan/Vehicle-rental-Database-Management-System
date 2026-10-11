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
  FileText
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
                      <button onClick={() => handleOpenDetails(c)} className="btn btn-secondary btn-sm">
                        Full Dossier
                      </button>
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
    </div>
  );
}
