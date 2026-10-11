import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Tags, Plus, Calculator, X, CheckCircle, Percent } from 'lucide-react';

export function RateCardsPage() {
  const [rateCards, setRateCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '1.25rem' }}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
