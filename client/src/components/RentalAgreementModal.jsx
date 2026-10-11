import React from 'react';
import { Printer, Download, X, ShieldCheck, Car, Calendar, User, FileText, CheckCircle } from 'lucide-react';

export function RentalAgreementModal({ isOpen, onClose, agreement }) {
  if (!isOpen || !agreement) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 850,
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
        {/* Header Bar */}
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
            <FileText size={20} color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Digital Rental Agreement ({agreement.agreement_number})
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Booking Reference: {agreement.booking_ref}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Printer size={15} />
              <span>Print Agreement</span>
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Agreement Body */}
        <div className="printable-agreement" style={{ padding: '2rem', overflowY: 'auto', flex: 1, fontSize: '0.88rem', lineHeight: 1.6 }}>
          {/* Company Branding */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--primary)' }}>
                RentDrive India Private Limited
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Self-Drive Commercial Vehicle Fleet Management Services<br />
                Level 5, Aerocity Worldmark 1, New Delhi 110037, India<br />
                GSTIN: 07AAACR9988D1Z2 | 24x7 Roadside Hotline: +91 1800 200 4400
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Agreement Number</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{agreement.agreement_number}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Date: {agreement.signed_at || agreement.created_at || 'Current'}
              </div>
              <span className="status-badge status-active" style={{ display: 'inline-block', marginTop: '0.35rem' }}>
                EXECUTED & BINDING
              </span>
            </div>
          </div>

          {/* Parties: Customer & Vehicle Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Renter Details */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '0.92rem' }}>
                <User size={16} color="var(--primary)" />
                <span>Renter (Customer) Particulars</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0', width: '40%' }}>Full Name:</td>
                    <td style={{ fontWeight: 600 }}>{agreement.customer_name}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Driving License:</td>
                    <td style={{ fontWeight: 600 }}>{agreement.driving_license_no}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Contact Phone:</td>
                    <td>{agreement.customer_phone}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Email Address:</td>
                    <td>{agreement.customer_email}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Billing Address:</td>
                    <td>{agreement.customer_address || 'New Delhi, India'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Vehicle Particulars */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '0.92rem' }}>
                <Car size={16} color="var(--primary)" />
                <span>Assigned Fleet Vehicle</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0', width: '40%' }}>Vehicle Model:</td>
                    <td style={{ fontWeight: 600 }}>{agreement.make} {agreement.model} {agreement.variant || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Registration No:</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{agreement.reg_number}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Fuel & Gearbox:</td>
                    <td>{agreement.fuel_type} / {agreement.transmission || 'AUTOMATIC'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Commercial Policy:</td>
                    <td>{agreement.insurance_policy_no || 'ICICI-LOMB-778811'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>PUC Clearance:</td>
                    <td>{agreement.puc_number || 'PUC-DL-2026-991'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rental Commercials & Financials */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '0.92rem' }}>
              <Calendar size={16} color="var(--primary)" />
              <span>Rental Period & Commercial Terms</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', textAlign: 'center' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Pickup Schedule</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{agreement.start_date}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Expected Return</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{agreement.end_date}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Daily Rate</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem' }}>₹{agreement.daily_rate?.toLocaleString('en-IN')}/day</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Security Deposit</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>₹{agreement.deposit_amount?.toLocaleString('en-IN') || '₹5,000'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Estimated Total</div>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', marginTop: '0.2rem' }}>
                  ₹{agreement.estimated_total?.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Terms & Conditions */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '0.92rem' }}>Contractual Obligations & Policies:</h4>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                whiteSpace: 'pre-line',
                lineHeight: 1.5
              }}
            >
              {agreement.terms_and_conditions}
            </div>
          </div>

          {/* Signatures & Execution Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Authorized Customer Consent:</div>
              <div
                style={{
                  height: 60,
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-tertiary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--success)'
                }}
              >
                <CheckCircle size={16} style={{ marginRight: 6 }} />
                {agreement.customer_signature || 'Digitally Signed via OTP'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                Customer: {agreement.customer_name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Fleet Manager / Counter Staff:</div>
              <div
                style={{
                  height: 60,
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-tertiary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--primary)'
                }}
              >
                <ShieldCheck size={16} style={{ marginRight: 6 }} />
                {agreement.staff_signature || 'Amit Verma (Senior Fleet Supervisor)'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                RentDrive Authorized Depot Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-tertiary)' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={15} />
            <span>Download PDF / Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
