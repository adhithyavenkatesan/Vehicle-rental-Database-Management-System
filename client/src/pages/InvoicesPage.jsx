import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Receipt,
  Search,
  Printer,
  Download,
  CreditCard,
  User,
  Car,
  Calendar,
  X,
  CheckCircle,
  FileText,
  DollarSign
} from 'lucide-react';

export function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected invoice modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Customer Ledger view
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);

  // Pay modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payTxnRef, setPayTxnRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.getInvoices();
      if (res.success) {
        setInvoices(res.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleViewInvoice = async (id) => {
    try {
      const res = await api.getInvoice(id);
      if (res.success) {
        setSelectedInvoice(res.invoice);
        setInvoiceModalOpen(true);
      }
    } catch (err) {
      console.error('Error loading invoice details:', err);
    }
  };

  const handleOpenLedger = async (customerId) => {
    try {
      const res = await api.getCustomerLedger(customerId);
      if (res.success) {
        setLedgerData(res.ledger);
        setLedgerModalOpen(true);
      }
    } catch (err) {
      console.error('Error loading customer ledger:', err);
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPayLoading(true);
    setPaySuccess(false);

    try {
      const res = await api.payInvoice(selectedInvoice.id, {
        amount: Number(payAmount),
        payment_method: payMethod,
        transaction_ref: payTxnRef || `UPI-${Date.now().toString().slice(-6)}`
      });

      if (res.success) {
        setPaySuccess(true);
        setTimeout(() => {
          setPayModalOpen(false);
          setPaySuccess(false);
          setPayAmount('');
          setPayTxnRef('');
          handleViewInvoice(selectedInvoice.id);
          fetchInvoices();
        }, 1200);
      }
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setPayLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.reg_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls */}
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
              <Receipt size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {user?.role === 'CUSTOMER' ? 'My Billing & Invoices' : 'Invoices & Commercial Settlement Ledger'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Itemized GST tax invoices, line charges, FasTag toll reconciliations & customer statements
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.65rem',
                gap: '0.4rem',
                width: 250
              }}
            >
              <Search size={15} color="var(--text-dim)" />
              <input
                type="text"
                placeholder="Search invoice or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: 'var(--text-main)' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ width: 140, padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
            Loading invoices from database...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            No invoices found matching your criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Date Issued</th>
                  <th>Billed Amount</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{inv.invoice_number}</span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Ref: {inv.booking_ref}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{inv.driving_license_no}</div>
                    </td>
                    <td>
                      <div>{inv.make} {inv.model}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{inv.reg_number}</div>
                    </td>
                    <td>{inv.issue_date}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>₹{inv.total_amount?.toLocaleString('en-IN')}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>₹{inv.paid_amount?.toLocaleString('en-IN')}</span>
                    </td>
                    <td>
                      <span style={{ color: inv.balance_due > 0 ? 'var(--danger)' : 'var(--text-dim)', fontWeight: 700 }}>
                        ₹{inv.balance_due?.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${inv.payment_status?.toLowerCase().replace('_', '-')}`}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleViewInvoice(inv.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          View Bill
                        </button>
                        {user?.role !== 'CUSTOMER' && (
                          <button
                            onClick={() => handleOpenLedger(inv.customer_id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                            title="Customer Statement Ledger"
                          >
                            Ledger
                          </button>
                        )}
                        {inv.balance_due > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPayAmount(inv.balance_due);
                              setPayModalOpen(true);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Printable Modal */}
      {invoiceModalOpen && selectedInvoice && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: 820,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Tax Invoice ({selectedInvoice.invoice_number})
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => window.print()} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Printer size={14} />
                  <span>Print Invoice</span>
                </button>
                <button onClick={() => setInvoiceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, fontSize: '0.88rem' }}>
              {/* Header Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--primary)' }}>
                    RentDrive India Private Limited
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    GSTIN: 07AAACR9988D1Z2 | PAN: AABCR1122D<br />
                    Level 5, Aerocity Worldmark 1, New Delhi 110037
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>TAX INVOICE</div>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.invoice_number}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Issue Date: {selectedInvoice.issue_date}<br />
                    Due Date: {selectedInvoice.due_date}
                  </div>
                </div>
              </div>

              {/* Bill To & Vehicle Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Billed To (Customer):
                  </div>
                  <div style={{ fontWeight: 700 }}>{selectedInvoice.customer_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedInvoice.customer_address || 'New Delhi, India'}<br />
                    DL: {selectedInvoice.driving_license_no}<br />
                    Phone: {selectedInvoice.customer_phone}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Rental & Vehicle Details:
                  </div>
                  <div style={{ fontWeight: 700 }}>{selectedInvoice.make} {selectedInvoice.model} ({selectedInvoice.reg_number})</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Booking Ref: {selectedInvoice.booking_ref}<br />
                    Period: {selectedInvoice.start_date?.split(' ')[0]} to {selectedInvoice.end_date?.split(' ')[0]} ({selectedInvoice.total_days} days)
                  </div>
                </div>
              </div>

              {/* Itemized Line Charges Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.65rem', textAlign: 'left' }}>Item / Service Description</th>
                      <th style={{ padding: '0.65rem', textAlign: 'center' }}>Qty / Days</th>
                      <th style={{ padding: '0.65rem', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ padding: '0.65rem', textAlign: 'right' }}>GST %</th>
                      <th style={{ padding: '0.65rem', textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.charges?.length > 0 ? (
                      selectedInvoice.charges.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.65rem' }}>{c.description}</td>
                          <td style={{ padding: '0.65rem', textAlign: 'center' }}>{c.quantity}</td>
                          <td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{c.unit_rate?.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.65rem', textAlign: 'right' }}>{c.tax_rate}%</td>
                          <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 600 }}>₹{c.amount?.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.65rem' }}>Base Self-Drive Rental ({selectedInvoice.total_days} Days)</td>
                          <td style={{ padding: '0.65rem', textAlign: 'center' }}>{selectedInvoice.total_days}</td>
                          <td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{selectedInvoice.daily_rate}</td>
                          <td style={{ padding: '0.65rem', textAlign: 'right' }}>18%</td>
                          <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 600 }}>₹{selectedInvoice.base_amount?.toLocaleString('en-IN')}</td>
                        </tr>
                        {selectedInvoice.extra_km_amount > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.65rem' }}>Extra Mileage Charges</td>
                            <td style={{ padding: '0.65rem', textAlign: 'center' }}>1</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{selectedInvoice.extra_km_amount}</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right' }}>18%</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 600 }}>₹{selectedInvoice.extra_km_amount?.toLocaleString('en-IN')}</td>
                          </tr>
                        )}
                        {selectedInvoice.toll_parking_amount > 0 && (
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.65rem' }}>FasTag Toll Reconciliations</td>
                            <td style={{ padding: '0.65rem', textAlign: 'center' }}>1</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{selectedInvoice.toll_parking_amount}</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right' }}>0%</td>
                            <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 600 }}>₹{selectedInvoice.toll_parking_amount?.toLocaleString('en-IN')}</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Taxable Base:</span>
                    <span>₹{selectedInvoice.base_amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>GST (18%):</span>
                    <span>₹{selectedInvoice.tax_amount?.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                      <span>Discount Applied:</span>
                      <span>-₹{selectedInvoice.discount_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '2px solid var(--border-subtle)', paddingTop: '0.4rem', color: 'var(--primary)' }}>
                    <span>Grand Total:</span>
                    <span>₹{selectedInvoice.total_amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 600 }}>
                    <span>Paid Amount:</span>
                    <span>₹{selectedInvoice.paid_amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: selectedInvoice.balance_due > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
                    <span>Balance Due:</span>
                    <span>₹{selectedInvoice.balance_due?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
              <span className={`status-badge status-${selectedInvoice.payment_status?.toLowerCase().replace('_', '-')}`}>
                Status: {selectedInvoice.payment_status}
              </span>
              <button onClick={() => setInvoiceModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Financial Ledger Statement Modal */}
      {ledgerModalOpen && ledgerData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Customer Financial Ledger: {ledgerData.customer?.full_name}
                </h3>
              </div>
              <button onClick={() => setLedgerModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Debited / Billed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>₹{ledgerData.summary?.total_billed?.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Total Credited / Paid</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>₹{ledgerData.summary?.total_paid?.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ padding: '1rem', background: ledgerData.summary?.outstanding_balance > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: ledgerData.summary?.outstanding_balance > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>Outstanding Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: ledgerData.summary?.outstanding_balance > 0 ? 'var(--danger)' : 'var(--text-main)', marginTop: '0.2rem' }}>
                  ₹{ledgerData.summary?.outstanding_balance?.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '0.9rem' }}>Debits (Invoices Issued):</h4>
            <table className="data-table" style={{ marginBottom: '1.5rem' }}>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.invoices?.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                    <td>{inv.issue_date}</td>
                    <td style={{ fontWeight: 700 }}>₹{inv.total_amount?.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`status-badge status-${inv.payment_status?.toLowerCase().replace('_', '-')}`}>
                        {inv.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Payments List */}
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '0.9rem' }}>Credits (Payments Received):</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Ref</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Txn ID</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.payments?.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.payment_ref}</td>
                    <td>{p.payment_date?.split(' ')[0]}</td>
                    <td>{p.payment_method}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{p.transaction_ref}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{p.amount?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Invoice Modal */}
      {payModalOpen && selectedInvoice && (
        <div className="modal-overlay" style={{ zIndex: 1150 }}>
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Record Invoice Payment</h3>
              </div>
              <button onClick={() => setPayModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {paySuccess && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} />
                <span>Payment recorded successfully. Balance updated.</span>
              </div>
            )}

            <form onSubmit={handleProcessPayment}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div>Invoice: <strong>{selectedInvoice.invoice_number}</strong></div>
                <div>Outstanding Balance: <strong style={{ color: 'var(--danger)' }}>₹{selectedInvoice.balance_due?.toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  max={selectedInvoice.balance_due}
                  min={1}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="UPI">UPI / Instant QR Transfer</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="NET_BANKING">Net Banking / NEFT</option>
                  <option value="CASH">Cash Settlement at Hub</option>
                  <option value="DEPOSIT_ADJUST">Security Deposit Adjustment</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Reference Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. UPI/RD/9812739188 or Card Auth Code"
                  value={payTxnRef}
                  onChange={(e) => setPayTxnRef(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setPayModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={payLoading} className="btn btn-primary">
                  {payLoading ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
