import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Wrench,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  DollarSign,
  Edit,
  Trash2
} from 'lucide-react';

export function MaintenancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    maintenance_type: 'ROUTINE_SERVICE',
    description: '',
    start_date: '',
    end_date: '',
    cost: '',
    service_provider: '',
    notes: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    vehicle_id: '',
    maintenance_type: 'ROUTINE_SERVICE',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    cost: '180.00',
    service_provider: 'Metro Fleet Care',
    next_service_mileage: '',
    next_service_date: ''
  });

  const [completeForm, setCompleteForm] = useState({
    final_cost: '',
    next_service_mileage: '',
    next_service_date: '',
    notes: 'Inspection certified and vehicle returned to active service'
  });

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      const [mRes, vRes] = await Promise.all([api.getMaintenance(), api.getVehicles()]);
      setRecords(mRes.records);
      setVehicles(vRes.vehicles);
    } catch (err) {
      showToast('Failed to load maintenance: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createMaintenance(scheduleForm);
      showToast('Maintenance scheduled! Vehicle status updated to MAINTENANCE.', 'success');
      setScheduleModalOpen(false);
      fetchMaintenance();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenComplete = (rec) => {
    setActiveRecord(rec);
    setCompleteForm({
      final_cost: rec.cost || '180.00',
      next_service_mileage: (rec.vehicle_mileage || 20000) + 10000,
      next_service_date: '2027-04-15',
      notes: 'All checks passed. Vehicle certified roadworthy.'
    });
    setCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.completeMaintenance(activeRecord.id, completeForm);
      showToast('Maintenance completed! Vehicle status restored to AVAILABLE.', 'success');
      setCompleteModalOpen(false);
      fetchMaintenance();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditForm({
      maintenance_type: rec.maintenance_type || 'ROUTINE_SERVICE',
      description: rec.description || '',
      start_date: rec.start_date || '',
      end_date: rec.end_date || '',
      cost: rec.cost || '',
      service_provider: rec.service_provider || '',
      notes: rec.notes || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await api.updateMaintenance(editingRecord.id, editForm);
      showToast('Maintenance record updated successfully', 'success');
      setEditModalOpen(false);
      setEditingRecord(null);
      fetchMaintenance();
    } catch (err) {
      showToast(err.message || 'Failed to update record', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      const res = await api.deleteMaintenance(recordToDelete.id);
      showToast(res.message || 'Maintenance record deleted', 'success');
      setDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchMaintenance();
    } catch (err) {
      showToast(err.message || 'Failed to delete record', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Fleet Maintenance & Workshop Logs</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Schedule inspections, repair workflows, preventative services, and safety certifications.
          </p>
        </div>

        <button
          onClick={() => {
            setScheduleForm({
              vehicle_id: vehicles[0]?.id || '',
              maintenance_type: 'ROUTINE_SERVICE',
              description: 'Synthetic oil replacement and multipoint brake check',
              start_date: new Date().toISOString().split('T')[0],
              end_date: '',
              cost: '150.00',
              service_provider: 'Metro Fleet Specialists',
              next_service_mileage: '',
              next_service_date: ''
            });
            setScheduleModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Schedule Service Job
        </button>
      </div>

      {/* Maintenance Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading maintenance records...
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <Wrench size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <h3>No maintenance records found</h3>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Service Center</th>
                  <th>Start Date</th>
                  <th>Completion</th>
                  <th>Expense</th>
                  <th>Job Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.make} {m.model}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{m.reg_number}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{m.maintenance_type}</span>
                    </td>
                    <td style={{ maxWidth: 280, fontSize: '0.85rem' }}>{m.description}</td>
                    <td>{m.service_provider || 'In-House'}</td>
                    <td>{m.start_date}</td>
                    <td>{m.end_date || 'In Workshop'}</td>
                    <td style={{ fontWeight: 700 }}>₹{m.cost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {(m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED') && (
                          <button
                            onClick={() => handleOpenComplete(m)}
                            className="btn btn-success btn-sm"
                            title="Certify vehicle and restore to AVAILABLE"
                          >
                            <CheckCircle2 size={13} /> Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Maintenance Log"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setRecordToDelete(m);
                            setDeleteModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="Delete Maintenance Log"
                        >
                          <Trash2 size={13} />
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

      {/* Schedule Modal */}
      <Modal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule Vehicle Service & Lock Availability" maxWidth={600}>
        <form onSubmit={handleScheduleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Vehicle *</label>
              <select
                required
                value={scheduleForm.vehicle_id}
                onChange={(e) => setScheduleForm({ ...scheduleForm, vehicle_id: e.target.value })}
              >
                {vehicles
                  .filter((v) => v.status !== 'RENTED')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.reg_number}) - Current Status: [{v.status}]
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Maintenance Type *</label>
                <select
                  value={scheduleForm.maintenance_type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_type: e.target.value })}
                >
                  <option value="ROUTINE_SERVICE">ROUTINE SERVICE</option>
                  <option value="REPAIR">REPAIR</option>
                  <option value="INSPECTION">SAFETY INSPECTION</option>
                  <option value="TIRE_ROTATION">TIRE ROTATION</option>
                  <option value="BODY_WORK">BODY WORK</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Estimated Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={scheduleForm.cost}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, cost: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Service Description *</label>
              <textarea
                required
                rows={2}
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Service Provider Center</label>
                <input
                  value={scheduleForm.service_provider}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, service_provider: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Start Date *</label>
                <input
                  type="date"
                  required
                  value={scheduleForm.start_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setScheduleModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm & Take Vehicle Offline
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Complete Modal */}
      <Modal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Certify & Restore Vehicle to Fleet" maxWidth={540}>
        <form onSubmit={handleCompleteSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              Completing this service will immediately restore vehicle <strong>{activeRecord?.reg_number}</strong> to <strong>AVAILABLE</strong> status for customer reservations.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Final Invoiced Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={completeForm.final_cost}
                  onChange={(e) => setCompleteForm({ ...completeForm, final_cost: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Next Service Mileage (km)</label>
                <input
                  type="number"
                  value={completeForm.next_service_mileage}
                  onChange={(e) => setCompleteForm({ ...completeForm, next_service_mileage: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Certification Notes</label>
              <textarea
                rows={2}
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setCompleteModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-success">
                Certify & Release to Fleet
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Maintenance Modal */}
      {editingRecord && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Maintenance: ${editingRecord.make} ${editingRecord.model}`} maxWidth={600}>
          <form onSubmit={handleEditSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Maintenance Type *</label>
                  <select
                    value={editForm.maintenance_type}
                    onChange={(e) => setEditForm({ ...editForm, maintenance_type: e.target.value })}
                  >
                    <option value="ROUTINE_SERVICE">ROUTINE SERVICE</option>
                    <option value="REPAIR">REPAIR</option>
                    <option value="INSPECTION">SAFETY INSPECTION</option>
                    <option value="TIRE_ROTATION">TIRE ROTATION</option>
                    <option value="BODY_WORK">BODY WORK</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Service Provider</label>
                  <input
                    value={editForm.service_provider}
                    onChange={(e) => setEditForm({ ...editForm, service_provider: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>End Date</label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Workshop Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Maintenance Confirmation Modal */}
      {recordToDelete && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Maintenance Deletion" maxWidth={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to delete this maintenance record for vehicle <strong>{recordToDelete.make} {recordToDelete.model}</strong> ({recordToDelete.reg_number})?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              Note: If this was the only active maintenance for the vehicle, its fleet status will automatically restore to <strong>AVAILABLE</strong>.
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
