import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Fuel, Plus, DollarSign, Gauge, TrendingUp, X } from 'lucide-react';

export function FuelPage() {
  const [fuelLogs, setFuelLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    fill_date: new Date().toISOString().split('T')[0],
    odometer_reading: '',
    litres: '',
    rate_per_litre: '96.72',
    fuel_station: 'Indian Oil Depot',
    payment_method: 'CARD',
    notes: ''
  });

  const fetchFuelData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes, vehRes] = await Promise.all([
        api.getFuelLogs(),
        api.getFuelStats(),
        api.getVehicles()
      ]);
      if (logsRes.success) setFuelLogs(logsRes.fuel_logs || []);
      if (statsRes.success) setStats(statsRes.stats);
      if (vehRes.success) {
        setVehicles(vehRes.vehicles || []);
        if (vehRes.vehicles?.length > 0) {
          setFormData((prev) => ({ ...prev, vehicle_id: vehRes.vehicles[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching fuel data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelData();
  }, []);

  const handleCreateFuelLog = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createFuelLog(formData);
      if (res.success) {
        setModalOpen(false);
        fetchFuelData();
      }
    } catch (err) {
      alert(err.message || 'Failed to record fuel log.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = stats?.summary || { total_entries: 0, total_litres: 0, total_cost: 0, avg_rate_per_litre: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
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
              <Fuel size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Fleet Fuel Management & Efficiency Tracking
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Fuel logs, commercial pumps, litres dispensed, rate/L and automated per-KM cost tracking
              </span>
            </div>
          </div>

          <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={16} />
            <span>Log Refueling Event</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Fuel Expense</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>
            ₹{summary.total_cost?.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Litres Dispensed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
            {summary.total_litres?.toLocaleString('en-IN')} L
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Average Rate / Litre</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
            ₹{summary.avg_rate_per_litre?.toFixed(2)}/L
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Refueling Logs Recorded</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
            {summary.total_entries}
          </div>
        </div>
      </div>

      {/* Fuel Logs Master Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 700 }}>
          Refueling Audit Trail
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fill Date</th>
                <th>Vehicle</th>
                <th>Odometer</th>
                <th>Litres</th>
                <th>Rate / Litre</th>
                <th>Total Cost</th>
                <th>Fuel Station</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.map((fl) => (
                <tr key={fl.id}>
                  <td>{fl.fill_date}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{fl.make} {fl.model}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{fl.reg_number} • {fl.fuel_type}</div>
                  </td>
                  <td>{fl.odometer_reading?.toLocaleString('en-IN')} km</td>
                  <td style={{ fontWeight: 700 }}>{fl.litres} L</td>
                  <td>₹{fl.rate_per_litre}/L</td>
                  <td style={{ fontWeight: 800, color: 'var(--danger)' }}>₹{fl.total_amount?.toLocaleString('en-IN')}</td>
                  <td>{fl.fuel_station}</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fl.staff_name || 'Fleet Supervisor'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fuel Log Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Fuel size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Record Vehicle Refueling</h3>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFuelLog}>
              <div className="form-group">
                <label className="form-label">Vehicle</label>
                <select className="form-control" value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.reg_number})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" value={formData.fill_date} onChange={(e) => setFormData({ ...formData, fill_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Odometer Reading (km)</label>
                  <input type="number" className="form-control" placeholder="Current km" value={formData.odometer_reading} onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Litres Filled</label>
                  <input type="number" step="0.1" className="form-control" placeholder="e.g. 40" value={formData.litres} onChange={(e) => setFormData({ ...formData, litres: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate / Litre (₹)</label>
                  <input type="number" step="0.01" className="form-control" value={formData.rate_per_litre} onChange={(e) => setFormData({ ...formData, rate_per_litre: e.target.value })} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Fuel Station / Commercial Pump</label>
                <input type="text" className="form-control" placeholder="e.g. Indian Oil Terminal 3 Airport" value={formData.fuel_station} onChange={(e) => setFormData({ ...formData, fuel_station: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Recording...' : 'Save Fuel Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
