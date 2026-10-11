import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FileSpreadsheet, Plus, DollarSign, X, CheckCircle, Filter } from 'lucide-react';

export function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    branch_id: '',
    category: 'MAINTENANCE',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    invoice_ref: '',
    payment_method: 'BANK_TRANSFER'
  });

  const fetchExpensesData = async () => {
    try {
      setLoading(true);
      const [expRes, sumRes, vehRes, brRes] = await Promise.all([
        api.getExpenses(),
        api.getExpenseSummary(),
        api.getVehicles(),
        api.getBranches()
      ]);

      if (expRes.success) setExpenses(expRes.expenses || []);
      if (sumRes.success) setSummary(sumRes.summary);
      if (vehRes.success) setVehicles(vehRes.vehicles || []);
      if (brRes.success) setBranches(brRes.branches || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesData();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createExpense({
        ...formData,
        vehicle_id: formData.vehicle_id || null,
        branch_id: formData.branch_id || null
      });

      if (res.success) {
        setModalOpen(false);
        setFormData({
          vehicle_id: '',
          branch_id: '',
          category: 'MAINTENANCE',
          description: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          vendor_name: '',
          invoice_ref: '',
          payment_method: 'BANK_TRANSFER'
        });
        fetchExpensesData();
      }
    } catch (err) {
      alert(err.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(
    (e) => categoryFilter === 'ALL' || e.category === categoryFilter
  );

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
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Fleet Expense Management
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Track vehicle-level operating costs, insurance renewals, RTO permits, depot upkeep and repairs
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-control"
              style={{ width: 160, padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Categories</option>
              <option value="FUEL">Fuel</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INSURANCE">Insurance</option>
              <option value="PERMIT">Permits</option>
              <option value="CLEANING">Cleaning & Detailing</option>
              <option value="TOLL_PARKING">Tolls & Parking</option>
              <option value="REPAIRS">Repairs</option>
              <option value="STAFF_DRIVER">Driver Stipends</option>
            </select>

            <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={16} />
              <span>Record Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Distribution Pills */}
      {summary && summary.categories && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {summary.categories.slice(0, 4).map((c, i) => (
            <div key={i} className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                {c.category?.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--danger)' }}>
                ₹{c.total_amount?.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {c.count} vouchers recorded
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expenses Master Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 700 }}>
          Fleet Expenditure Ledger
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Vehicle / Branch</th>
                <th>Vendor</th>
                <th>Invoice Ref</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.expense_date}</td>
                  <td>
                    <span className="status-badge status-pending" style={{ fontSize: '0.7rem' }}>
                      {exp.category}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{exp.description}</div>
                  </td>
                  <td>
                    {exp.reg_number ? (
                      <div>
                        <strong>{exp.make} {exp.model}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{exp.reg_number}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{exp.branch_name || 'Central Fleet'}</span>
                    )}
                  </td>
                  <td>{exp.vendor_name || 'Authorized Vendor'}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{exp.invoice_ref || '—'}</span>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--danger)' }}>
                    ₹{exp.amount?.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="status-badge status-active" style={{ fontSize: '0.68rem' }}>
                      APPROVED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Record Fleet Operating Expense</h3>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Expense Category</label>
                  <select className="form-control" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="FUEL">Fuel</option>
                    <option value="INSURANCE">Insurance Renewal</option>
                    <option value="PERMIT">RTO Permit</option>
                    <option value="CLEANING">Cleaning & Detailing</option>
                    <option value="TOLL_PARKING">Airport Toll & Parking</option>
                    <option value="REPAIRS">Emergency Repairs</option>
                    <option value="STAFF_DRIVER">Driver Stipend</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Date</label>
                  <input type="date" className="form-control" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Service Rendered</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 3M ceramic coating and interior steam clean"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="₹0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor / Service Station</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 3M Car Care Aerocity"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Linked Vehicle (Optional)</label>
                  <select className="form-control" value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}>
                    <option value="">General Fleet / Depot Wide</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} ({v.reg_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Hub (Optional)</label>
                  <select className="form-control" value={formData.branch_id} onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}>
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Recording...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
