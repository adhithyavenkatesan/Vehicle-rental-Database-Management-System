import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  UserCheck,
  Plus,
  Shield,
  Briefcase,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';

export function StaffPage() {
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: 'Staff@123',
    employee_code: '',
    department: 'OPERATIONS',
    designation: 'Fleet Coordinator',
    hire_date: new Date().toISOString().split('T')[0]
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.getStaff();
      setStaffList(res.staff);
    } catch (err) {
      showToast('Failed to load staff list: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createStaff(form);
      showToast('Staff member onboarded successfully', 'success');
      setAddModalOpen(false);
      fetchStaff();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Fleet Operations Staff Management</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage staff credentials, dispatch personnel roles, and departmental access rights.
          </p>
        </div>

        <button
          onClick={() => {
            const rand = Math.floor(1000 + Math.random() * 9000);
            setForm({
              full_name: '',
              email: '',
              phone: '',
              password: 'Staff@123',
              employee_code: `EMP-${rand}`,
              department: 'OPERATIONS',
              designation: 'Operations Specialist',
              hire_date: new Date().toISOString().split('T')[0]
            });
            setAddModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Onboard Staff Member
        </button>
      </div>

      {/* Staff Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading staff members...
          </div>
        ) : staffList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            No staff records found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee Code</th>
                  <th>Staff Member</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Hire Date</th>
                  <th>Rentals Handled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.employee_code}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{s.phone || 'No phone'}</div>
                    </td>
                    <td>{s.designation}</td>
                    <td>
                      <span className="badge badge-info">{s.department}</span>
                    </td>
                    <td>{s.email}</td>
                    <td>{s.hire_date}</td>
                    <td><strong>{s.processed_rentals || 0}</strong> trips</td>
                    <td><StatusBadge status={s.account_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard Staff Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Onboard Operational Staff Member" maxWidth={600}>
        <form onSubmit={handleAddSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full Name *</label>
                <input required placeholder="Sunil Kumar" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email Address *</label>
                <input type="email" required placeholder="sunil@rentdrive.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Employee Code *</label>
                <input required value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Designation *</label>
                <input required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="OPERATIONS">OPERATIONS</option>
                  <option value="CUSTOMER_SERVICE">CUSTOMER SERVICE</option>
                  <option value="LOGISTICS">LOGISTICS</option>
                  <option value="WORKSHOP">WORKSHOP</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Hire Date</label>
                <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Phone Number</label>
                <input placeholder="+91 98111 22334" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Initial Password</label>
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setAddModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Staff Account
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
