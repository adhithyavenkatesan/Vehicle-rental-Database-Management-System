import React, { useState } from 'react';
import { api } from '../api';
import { X, ClipboardCheck, AlertTriangle, CheckCircle, Car } from 'lucide-react';

export function InspectionModal({ isOpen, onClose, rental, vehicle, onSuccess }) {
  if (!isOpen || (!rental && !vehicle)) return null;

  const targetVehicleId = rental?.vehicle_id || vehicle?.id;
  const targetRentalId = rental?.id || null;

  const [formData, setFormData] = useState({
    inspection_type: rental ? 'RETURN_CHECKIN' : 'PERIODIC',
    odometer_reading: rental?.return_mileage || vehicle?.mileage || 15000,
    fuel_level: 'FULL',
    exterior_front: 'PASS',
    exterior_rear: 'PASS',
    exterior_left: 'PASS',
    exterior_right: 'PASS',
    roof_condition: 'PASS',
    interior_cabin: 'PASS',
    tyres_condition: 'PASS',
    lights_condition: 'PASS',
    mirrors_windows: 'PASS',
    has_damage: false,
    damage_details: '',
    estimated_damage_cost: 0,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.createInspection({
        rental_id: targetRentalId,
        vehicle_id: targetVehicleId,
        ...formData
      });

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to record inspection checklist.');
    } finally {
      setLoading(false);
    }
  };

  const checklistItems = [
    { key: 'exterior_front', label: 'Front Bumper, Grille & Hood' },
    { key: 'exterior_rear', label: 'Rear Bumper, Boot & Tailgate' },
    { key: 'exterior_left', label: 'Left Side Doors & Quarter Panels' },
    { key: 'exterior_right', label: 'Right Side Doors & Fenders' },
    { key: 'roof_condition', label: 'Roof Panel & Sunroof Glass' },
    { key: 'interior_cabin', label: 'Dashboard, Seats & Carpet Upholstery' },
    { key: 'tyres_condition', label: 'Tyre Treads, Pressure & Spare Wheel' },
    { key: 'lights_condition', label: 'Headlamps, Indicators & Brake Lights' },
    { key: 'mirrors_windows', label: 'Rear-view Mirrors & Window Glass' }
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 720,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ClipboardCheck size={20} color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Digital Vehicle Inspection Checklist
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {rental ? `Check-in Audit for Rental ${rental.rental_ref}` : `Vehicle Fleet Audit (ID: ${targetVehicleId})`}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Inspection Type, Odometer, Fuel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Inspection Type</label>
              <select
                className="form-control"
                value={formData.inspection_type}
                onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
              >
                <option value="RETURN_CHECKIN">Return Check-in</option>
                <option value="PICKUP_DISPATCH">Pre-Trip Dispatch</option>
                <option value="PERIODIC">Periodic Audit</option>
                <option value="MAINTENANCE">Post-Maintenance</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Odometer Reading (km)</label>
              <input
                type="number"
                className="form-control"
                value={formData.odometer_reading}
                onChange={(e) => setFormData({ ...formData, odometer_reading: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fuel Level</label>
              <select
                className="form-control"
                value={formData.fuel_level}
                onChange={(e) => setFormData({ ...formData, fuel_level: e.target.value })}
              >
                <option value="FULL">Full Tank (100%)</option>
                <option value="75%">75% Tank</option>
                <option value="50%">50% Half Tank</option>
                <option value="25%">25% Quarter Tank</option>
                <option value="EMPTY">Reserve / Empty</option>
              </select>
            </div>
          </div>

          {/* 9-Point Quality Inspection Grid */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Component Checklist & Condition:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
              {checklistItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{item.label}</span>
                  <select
                    value={formData[item.key]}
                    onChange={(e) => {
                      const val = e.target.value;
                      const hasDam = val !== 'PASS' || formData.has_damage;
                      setFormData({ ...formData, [item.key]: val, has_damage: hasDam });
                    }}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: formData[item.key] === 'PASS' ? 'var(--success)' : 'var(--danger)'
                    }}
                  >
                    <option value="PASS">PASS (No Defect)</option>
                    <option value="MINOR_SCRATCH">Minor Scratch</option>
                    <option value="DENT">Dent Found</option>
                    <option value="DAMAGED">Damaged / Broken</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Damage Reporting & Cost Estimation */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: formData.has_damage ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-tertiary)',
              border: `1px solid ${formData.has_damage ? 'var(--danger)' : 'var(--border-subtle)'}`,
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                id="has_damage_cb"
                checked={formData.has_damage}
                onChange={(e) => setFormData({ ...formData, has_damage: e.target.checked })}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="has_damage_cb" style={{ fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', color: formData.has_damage ? 'var(--danger)' : 'var(--text-main)' }}>
                Flag Defect or Physical Damage (Will automatically update fleet status)
              </label>
            </div>

            {formData.has_damage && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Damage Description & Location</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Scratched left rear quarter panel, minor paint peel"
                    value={formData.damage_details}
                    onChange={(e) => setFormData({ ...formData, damage_details: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Estimated Repair Cost (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="₹0"
                    value={formData.estimated_damage_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_damage_cost: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Auditor Observations / General Notes</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="e.g. Vehicle interior pristine, toolkit and emergency triangle verified present"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle size={16} />
              <span>{loading ? 'Recording...' : 'Complete & Record Inspection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
