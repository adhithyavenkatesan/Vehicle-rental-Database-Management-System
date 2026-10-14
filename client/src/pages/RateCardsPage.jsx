import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Tags, Plus, Calculator, X, CheckCircle, Percent, Edit, Trash2 } from 'lucide-react';

export function RateCardsPage() {
  const [rateCards, setRateCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState({
    category_id: '',
    code: '',
    name: '',
    daily_rate: 1500,
    hourly_rate: 150,
    weekly_rate: 9000,
    monthly_rate: 32000,
    weekend_multiplier: 1.15,
    extra_km_rate: 15,
    extra_hour_rate: 250,
    security_deposit: 5000
  });

  // Rate calculator tool
  const [calcCatId, setCalcCatId] = useState('');
  const [calcStart, setCalcStart] = useState('2026-10-10T10:00');
  const [calcEnd, setCalcEnd] = useState('2026-10-14T18:00');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const [rRes, cRes] = await Promise.all([
        api.getRates(),
        api.getCategories()
      ]);
      if (rRes.success) setRateCards(rRes.rateCards || []);
      if (cRes.success) {
        setCategories(cRes.categories || []);
        if (cRes.categories?.length > 0) setCalcCatId(cRes.categories[0].id);
      }
    } catch (err) {
      console.error('Error fetching rates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleRunCalculation = async (e) => {
    e.preventDefault();
    setCalcLoading(true);
    try {
      const res = await api.calculateRate({
        category_id: calcCatId,
        start_date: calcStart,
        end_date: calcEnd
      });
      if (res.success) setCalcResult(res.calculation);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleCreateRate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createRate(rateForm);
      if (res.success) {
        setCreateModalOpen(false);
        fetchRates();
      }
    } catch (err) {
      alert(err.message || 'Failed to create rate card');
    }
  };

  const handleOpenEditRate = (rc) => {
    setEditingRate(rc);
    setRateForm({
      category_id: rc.category_id || '',
      code: rc.code || '',
      name: rc.name || '',
      daily_rate: rc.daily_rate || 1500,
      hourly_rate: rc.hourly_rate || 150,
      weekly_rate: rc.weekly_rate || 9000,
      monthly_rate: rc.monthly_rate || 32000,
      weekend_multiplier: rc.weekend_multiplier || 1.15,
      extra_km_rate: rc.extra_km_rate || 15,
      extra_hour_rate: rc.extra_hour_rate || 250,
      security_deposit: rc.security_deposit || 5000
    });
    setEditModalOpen(true);
  };

  const handleUpdateRate = async (e) => {
    e.preventDefault();
    if (!editingRate) return;
    try {
      const res = await api.updateRate(editingRate.id, rateForm);
      if (res.success) {
        setEditModalOpen(false);
        setEditingRate(null);
        fetchRates();
      }
    } catch (err) {
      alert(err.message || 'Failed to update rate card');
    }
  };

  const handleConfirmDeleteRate = async () => {
    if (!rateToDelete) return;
    try {
      const res = await api.deleteRate(rateToDelete.id);
      if (res.success) {
        setDeleteModalOpen(false);
        setRateToDelete(null);
        fetchRates();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete rate card');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
            <Tags size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Dynamic Rate Cards & Pricing Engine
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Tiered pricing: Hourly, Daily, Weekly, Monthly, Weekend Multiplier, Extra KM & Overstay penalties
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            const rand = Math.floor(100 + Math.random() * 900);
            setRateForm({
              category_id: categories[0]?.id || '',
              code: `RC-TIER-${rand}`,
              name: 'Standard Dynamic Tier',
              daily_rate: 1500,
              hourly_rate: 150,
              weekly_rate: 9000,
              monthly_rate: 32000,
              weekend_multiplier: 1.15,
              extra_km_rate: 15,
              extra_hour_rate: 250,
              security_deposit: 5000
            });
            setCreateModalOpen(true);
          }}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={16} /> Add Rate Card
        </button>
      </div>

      {/* Real Backend Pricing Simulation Sandbox */}
      <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Calculator size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            Real-Time Backend Pricing & Availability Calculator
          </h3>
        </div>

        <form onSubmit={handleRunCalculation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Vehicle Category</label>
            <select className="form-control" value={calcCatId} onChange={(e) => setCalcCatId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Pickup Schedule</label>
            <input type="datetime-local" className="form-control" value={calcStart} onChange={(e) => setCalcStart(e.target.value)} required />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Return Schedule</label>
            <input type="datetime-local" className="form-control" value={calcEnd} onChange={(e) => setCalcEnd(e.target.value)} required />
          </div>

          <button type="submit" disabled={calcLoading} className="btn btn-primary" style={{ height: 38 }}>
            {calcLoading ? 'Calculating...' : 'Simulate Quote'}
          </button>
        </form>

        {calcResult && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              textAlign: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rental Duration</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem' }}>{calcResult.total_days} Day(s) ({calcResult.total_hours} hrs)</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Daily Base Rate</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem' }}>₹{calcResult.daily_rate}/day</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Weekend Premium</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--warning)', marginTop: '0.2rem' }}>
                {calcResult.weekend_days} days @ {calcResult.weekend_multiplier}x
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>GST Tax (18%)</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem' }}>₹{calcResult.tax_amount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>Estimated Total</div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                ₹{calcResult.estimated_total?.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rate Cards Master Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 700 }}>
          Configured Rate Cards in Database
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code & Name</th>
                <th>Category</th>
                <th>Hourly</th>
                <th>Daily Rate</th>
                <th>Weekly</th>
                <th>Monthly</th>
                <th>Weekend Mult.</th>
                <th>Extra KM</th>
                <th>Extra Hour</th>
                <th>Deposit</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rateCards.map((rc) => (
                <tr key={rc.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{rc.code}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{rc.name}</div>
                  </td>
                  <td>{rc.category_name}</td>
                  <td>₹{rc.hourly_rate}</td>
                  <td style={{ fontWeight: 800 }}>₹{rc.daily_rate}</td>
                  <td>₹{rc.weekly_rate?.toLocaleString('en-IN')}</td>
                  <td>₹{rc.monthly_rate?.toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{rc.weekend_multiplier}x</span>
                  </td>
                  <td>₹{rc.extra_km_rate}/km</td>
                  <td>₹{rc.extra_hour_rate}/hr</td>
                  <td style={{ fontWeight: 700 }}>₹{rc.security_deposit?.toLocaleString('en-IN')}</td>
                  <td>
                    <span className="status-badge status-active" style={{ fontSize: '0.7rem' }}>
                      ACTIVE
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleOpenEditRate(rc)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Rate Card"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setRateToDelete(rc);
                          setDeleteModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        title="Delete Rate Card"
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
      </div>

      {/* Create Rate Card Modal */}
      {createModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tags size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Create New Rate Card</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={rateForm.category_id}
                    onChange={(e) => setRateForm({ ...rateForm, category_id: e.target.value })}
                    required
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rate Card Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={rateForm.code}
                    onChange={(e) => setRateForm({ ...rateForm, code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Plan Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Daily (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.daily_rate}
                    onChange={(e) => setRateForm({ ...rateForm, daily_rate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hourly (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.hourly_rate}
                    onChange={(e) => setRateForm({ ...rateForm, hourly_rate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Weekend Mult.</label>
                  <input
                    type="number"
                    step="0.05"
                    className="form-control"
                    value={rateForm.weekend_multiplier}
                    onChange={(e) => setRateForm({ ...rateForm, weekend_multiplier: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Weekly Rate (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.weekly_rate}
                    onChange={(e) => setRateForm({ ...rateForm, weekly_rate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rate (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.monthly_rate}
                    onChange={(e) => setRateForm({ ...rateForm, monthly_rate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Security Deposit (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.security_deposit}
                    onChange={(e) => setRateForm({ ...rateForm, security_deposit: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Extra KM Fee (₹/km)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.extra_km_rate}
                    onChange={(e) => setRateForm({ ...rateForm, extra_km_rate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Rate Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rate Card Modal */}
      {editModalOpen && editingRate && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tags size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Edit Rate Card: {editingRate.name}</h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateRate}>
              <div className="form-group">
                <label className="form-label">Plan Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Daily (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.daily_rate}
                    onChange={(e) => setRateForm({ ...rateForm, daily_rate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hourly (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.hourly_rate}
                    onChange={(e) => setRateForm({ ...rateForm, hourly_rate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Weekend Mult.</label>
                  <input
                    type="number"
                    step="0.05"
                    className="form-control"
                    value={rateForm.weekend_multiplier}
                    onChange={(e) => setRateForm({ ...rateForm, weekend_multiplier: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Weekly Rate (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.weekly_rate}
                    onChange={(e) => setRateForm({ ...rateForm, weekly_rate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rate (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.monthly_rate}
                    onChange={(e) => setRateForm({ ...rateForm, monthly_rate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Security Deposit (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.security_deposit}
                    onChange={(e) => setRateForm({ ...rateForm, security_deposit: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Extra KM Fee (₹/km)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rateForm.extra_km_rate}
                    onChange={(e) => setRateForm({ ...rateForm, extra_km_rate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rate Card Confirmation Modal */}
      {deleteModalOpen && rateToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>Confirm Rate Card Deletion</h3>
              <button onClick={() => setDeleteModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to delete rate card <strong>{rateToDelete.name}</strong> ({rateToDelete.code})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDeleteRate} className="btn btn-danger" style={{ background: 'var(--danger)', color: '#fff' }}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
