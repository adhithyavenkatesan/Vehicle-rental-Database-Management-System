import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { AddCustomerModal } from '../components/AddCustomerModal';
import {
  CreditCard,
  Search,
  DollarSign,
  Plus,
  Receipt,
  CheckCircle,
  FileCheck,
  UserPlus
} from 'lucide-react';

export function PaymentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    customer_id: '',
    amount: '',
    payment_method: 'CARD',
    notes: 'In-office or online transaction settlement'
  });

  const handleCustomerCreated = (newCustomer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setPayForm((prev) => ({ ...prev, customer_id: String(newCustomer.id) }));
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments();
      setPayments(res.payments);

      if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
        const cRes = await api.getCustomers();
        setCustomers(cRes.customers);
      }
    } catch (err) {
      showToast('Failed to load payments: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await api.createPayment(payForm);
      showToast('Payment transaction recorded successfully', 'success');
      setPayModalOpen(false);
      fetchPayments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isStaffOrAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const totalPaidSum = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Financial Ledger & Invoices</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Track processed credit card payments, digital transfers, deposits, and settlement receipts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Reconciled</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
              ₹{totalPaidSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={() => {
              setPayForm({
                customer_id: user?.customer_id || customers[0]?.id || '',
                amount: '3500.00',
                payment_method: 'UPI',
                notes: 'Pre-authorized rental transaction'
              });
              setPayModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Process Payment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Loading financial ledger...
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <CreditCard size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <h3>No payment records found</h3>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Ref</th>
                  <th>Customer</th>
                  <th>Booking / Trip Ref</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Date & Time</th>
                  <th>Transaction Code</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.payment_ref}</td>
                    <td>{p.customer_name}</td>
                    <td>
                      {p.booking_ref ? (
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{p.booking_ref}</span>
                      ) : p.rental_ref ? (
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--info)' }}>{p.rental_ref}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>Direct Settle</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{p.payment_method}</span>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success)' }}>
                      ₹{p.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>{new Date(p.payment_date).toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {p.transaction_ref || 'N/A'}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Record Payment Transaction" maxWidth={540}>
        <form onSubmit={handleRecordPayment}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isStaffOrAdmin ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>Customer *</label>
                  <button
                    type="button"
                    onClick={() => setAddCustomerModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.55rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: 'var(--primary)',
                      borderColor: 'rgba(59, 130, 246, 0.4)'
                    }}
                    title="Quickly register a new customer"
                  >
                    <UserPlus size={13} /> + New Customer
                  </button>
                </div>
                <select
                  required
                  value={payForm.customer_id}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setAddCustomerModalOpen(true);
                      return;
                    }
                    setPayForm({ ...payForm, customer_id: e.target.value });
                  }}
                >
                  <option value="">Select customer...</option>
                  <option value="__NEW__" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    ➕ + Register New Customer...
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.driving_license_no})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                Paying account: <strong>{user?.full_name}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Payment Method *</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm / BHIM)</option>
                  <option value="CARD">Credit / Debit Card (RuPay / Visa / Mastercard)</option>
                  <option value="NET_BANKING">Net Banking (SBI / HDFC / ICICI / Axis)</option>
                  <option value="CASH">Cash at Hub Counter</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Transaction Notes / Receipt Memo</label>
              <textarea
                rows={2}
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setPayModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm & Issue Receipt
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <AddCustomerModal
        isOpen={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
        zIndex={250}
      />
    </div>
  );
}
