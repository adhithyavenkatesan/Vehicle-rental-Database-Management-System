import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Building2, Plus, Phone, Mail, MapPin, Clock, UserCheck, X, Edit, Trash2 } from 'lucide-react';

export function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    manager_name: '',
    operating_hours: '08:00 AM - 10:00 PM'
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    manager_name: '',
    operating_hours: '08:00 AM - 10:00 PM'
  });

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.getBranches();
      if (res.success) setBranches(res.branches || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createBranch(formData);
      if (res.success) {
        setModalOpen(false);
        setFormData({
          name: '',
          code: '',
          address: '',
          city: '',
          phone: '',
          email: '',
          manager_name: '',
          operating_hours: '08:00 AM - 10:00 PM'
        });
        fetchBranches();
      }
    } catch (err) {
      alert(err.message || 'Failed to create branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (b) => {
    setEditingBranch(b);
    setEditFormData({
      name: b.name || '',
      code: b.code || '',
      address: b.address || '',
      city: b.city || '',
      phone: b.phone || '',
      email: b.email || '',
      manager_name: b.manager_name || '',
      operating_hours: b.operating_hours || '08:00 AM - 10:00 PM'
    });
    setEditModalOpen(true);
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if (!editingBranch) return;
    setSubmitting(true);
    try {
      const res = await api.updateBranch(editingBranch.id, editFormData);
      if (res.success) {
        setEditModalOpen(false);
        setEditingBranch(null);
        fetchBranches();
      }
    } catch (err) {
      alert(err.message || 'Failed to update branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    setSubmitting(true);
    try {
      const res = await api.deleteBranch(branchToDelete.id);
      if (res.success) {
        setDeleteModalOpen(false);
        setBranchToDelete(null);
        fetchBranches();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete branch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Multi-Branch Fleet Operations
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Airport hubs, central depots, depot managers and local fleet allocations
              </span>
            </div>
          </div>

          <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={16} />
            <span>Add New Branch</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          Loading branch infrastructure...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {branches.map((b) => (
            <div key={b.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>
                    {b.code}
                  </span>
                  <span className="status-badge status-active" style={{ fontSize: '0.7rem' }}>
                    OPERATIONAL
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{b.name}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} color="var(--primary)" />
                    <span>{b.address}, {b.city}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} color="var(--text-dim)" />
                    <span>Hours: {b.operating_hours}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={14} color="var(--text-dim)" />
                    <span>Manager: {b.manager_name || 'Assigned Lead'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} color="var(--text-dim)" />
                    <span>{b.phone}</span>
                  </div>
                </div>
              </div>

              {/* Aggregates Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fleet Assigned</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem' }}>{b.vehicle_count || 0} Cars</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Desk Staff</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem' }}>{b.staff_count || 0} Staff</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Edit size={13} /> Edit
                </button>
                <button
                  onClick={() => {
                    setBranchToDelete(b);
                    setDeleteModalOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add Operational Branch</h3>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Hyderabad Airport RGI Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="BR-HYD-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Physical Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Street / Depot Location"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Hyderabad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Manager Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Depot Manager Name"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone Contact</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 ..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Operating Hours</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="08:00 AM - 10:00 PM"
                    value={formData.operating_hours}
                    onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editModalOpen && editingBranch && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Edit Branch: {editingBranch.name}</h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Manager Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.manager_name}
                    onChange={(e) => setEditFormData({ ...editFormData, manager_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone Contact</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Operating Hours</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.operating_hours}
                    onChange={(e) => setEditFormData({ ...editFormData, operating_hours: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Branch Confirmation Modal */}
      {deleteModalOpen && branchToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>Confirm Branch Deletion</h3>
              <button onClick={() => setDeleteModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to delete branch <strong>{branchToDelete.name}</strong> ({branchToDelete.code})?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              Note: Any vehicles and staff currently stationed at this depot will be unassigned to preserve system consistency.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDelete} disabled={submitting} className="btn btn-danger" style={{ background: 'var(--danger)', color: '#fff' }}>
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
