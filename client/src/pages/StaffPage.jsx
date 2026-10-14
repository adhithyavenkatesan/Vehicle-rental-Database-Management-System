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
  Calendar,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export function StaffPage() {
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Edit and Delete states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    department: 'OPERATIONS',
    designation: '',
    account_status: 'ACTIVE'
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setEditForm({
      full_name: staff.full_name || '',
      phone: staff.phone || '',
      department: staff.department || 'OPERATIONS',
      designation: staff.designation || '',
      account_status: staff.account_status || 'ACTIVE'
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.updateStaff(editingStaff.id, editForm);
      showToast('Staff member updated successfully', 'success');
      setEditModalOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      showToast(err.message || 'Failed to update staff member', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    setActionLoading(true);
    try {
      await api.deleteStaff(staffToDelete.id);
      showToast('Staff member removed successfully', 'success');
      setDeleteModalOpen(false);
      setStaffToDelete(null);
      fetchStaff();
    } catch (err) {
      showToast(err.message || 'Failed to delete staff member', 'error');
    } finally {
      setActionLoading(false);
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
                  <th>Actions</th>
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
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => openEditModal(s)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Staff Member"
                          style={{ padding: '0.3rem 0.5rem' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setStaffToDelete(s);
                            setDeleteModalOpen(true);
                          }}
                          className="btn btn-danger btn-sm"
                          title="Delete Staff Member"
                          style={{ padding: '0.3rem 0.5rem' }}
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

      {/* Edit Staff Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Update Staff Member Details" maxWidth={560}>
        {editingStaff && (
          <form onSubmit={handleEditSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full Name *</label>
                  <input
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Phone Number</label>
                  <input
                    placeholder="+91 98111 22334"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  >
                    <option value="OPERATIONS">OPERATIONS</option>
                    <option value="CUSTOMER_SERVICE">CUSTOMER SERVICE</option>
                    <option value="LOGISTICS">LOGISTICS</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Designation *</label>
                  <input
                    required
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Account Status</label>
                <select
                  value={editForm.account_status}
                  onChange={(e) => setEditForm({ ...editForm, account_status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Saving...' : 'Update Staff Member'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Staff Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Remove Staff Member" maxWidth={440}>
        {staffToDelete && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                <AlertTriangle size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Confirm Deletion</h4>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Are you sure you want to delete staff account for <strong>{staffToDelete.full_name} ({staffToDelete.employee_code})</strong>? Their assigned rentals and logs will be safely dissociated.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setStaffToDelete(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteStaff}
                className="btn btn-danger"
              >
                {actionLoading ? 'Removing...' : 'Delete Staff Member'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

