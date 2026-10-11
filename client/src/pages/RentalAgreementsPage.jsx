import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FileText, Printer, Search, CheckCircle, ShieldCheck } from 'lucide-react';
import { RentalAgreementModal } from '../components/RentalAgreementModal';

export function RentalAgreementsPage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const res = await api.getAgreements();
      if (res.success) setAgreements(res.agreements || []);
    } catch (err) {
      console.error('Error fetching agreements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const handleOpenAgreement = async (id) => {
    try {
      const res = await api.getAgreement(id);
      if (res.success) {
        setSelectedAgreement(res.agreement);
        setModalOpen(true);
      }
    } catch (err) {
      console.error('Error opening agreement:', err);
    }
  };

  const filteredAgreements = agreements.filter((a) => {
    return (
      a.agreement_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.reg_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Digital Rental Agreements
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Legally binding e-contracts, terms, fuel & damage liability mandates, and digital OTP audit logs
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.35rem 0.65rem',
              gap: '0.4rem',
              width: 260
            }}
          >
            <Search size={15} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search agreement or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: 'var(--text-main)' }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
            Loading rental agreements...
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            No rental agreements found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agreement No</th>
                  <th>Booking Ref</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Signed Date</th>
                  <th>Damage Liability</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{a.agreement_number}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{a.booking_ref}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{a.driving_license_no}</div>
                    </td>
                    <td>
                      <div>{a.make} {a.model}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{a.reg_number}</div>
                    </td>
                    <td>{a.signed_at || a.created_at?.split(' ')[0]}</td>
                    <td>₹{a.damage_liability_limit?.toLocaleString('en-IN') || '10,000'}</td>
                    <td>
                      <span className="status-badge status-active" style={{ fontSize: '0.68rem' }}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenAgreement(a.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Printer size={13} />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RentalAgreementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        agreement={selectedAgreement}
      />
    </div>
  );
}
