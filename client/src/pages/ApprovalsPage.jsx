import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  X
} from 'lucide-react';

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.getApprovals();
      if (res.success) setApprovals(res.approvals || []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleReview = async (decision) => {
    if (!selectedApproval) return;
    setReviewLoading(true);

    try {
      const res = await api.reviewApproval(selectedApproval.id, {
        decision,
        notes: decisionNotes
      });

      if (res.success) {
        setSelectedApproval(null);
        setDecisionNotes('');
        fetchApprovals();
      }
    } catch (err) {
      alert(err.message || `Failed to ${decision.toLowerCase()} request.`);
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingList = approvals.filter((a) => a.status === 'PENDING');
  const historyList = approvals.filter((a) => a.status !== 'PENDING');

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
            <CheckSquare size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Governance & Admin Decision Approvals Queue
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Manage rental extension requests, cancellation refunds, damage liability waivers, and maintenance authorizations
            </span>
          </div>
        </div>
      </div>

      {/* Pending Items Queue */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <Clock size={16} color="var(--warning)" />
            <span>Pending Authorization Requests ({pendingList.length})</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
            Loading approval tasks...
          </div>
        ) : pendingList.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            All operational requests have been reviewed. Zero pending items.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request Type</th>
                  <th>Requester</th>
                  <th>Target Entity</th>
                  <th>Details & Impact</th>
                  <th>Submitted At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span className="status-badge status-pending" style={{ fontSize: '0.72rem' }}>
                        {app.approval_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.requester_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{app.requester_email}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {app.entity_type} #{app.entity_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', maxWidth: 320 }}>
                        {app.approval_type === 'RENTAL_EXTENSION' && (
                          <div>
                            <strong>{app.request_details?.booking_ref}:</strong> Extend by{' '}
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                              {app.request_details?.additional_days} day(s)
                            </span>{' '}
                            (₹{app.request_details?.additional_amount})
                          </div>
                        )}
                        {app.approval_type === 'CANCELLATION_REFUND' && (
                          <div>
                            Refund: <strong>₹{app.request_details?.net_refund}</strong> (Fee: ₹{app.request_details?.cancellation_fee})
                          </div>
                        )}
                        {app.approval_type === 'BOOKING_APPROVAL' && (
                          <div>
                            Approve reservation {app.request_details?.booking_ref} ({app.request_details?.total_amount})
                          </div>
                        )}
                        {app.approval_type === 'MAINTENANCE_JOB' && (
                          <div>
                            {app.request_details?.vehicle_reg}: {app.request_details?.job} (₹{app.request_details?.quote_amount})
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{app.created_at?.split(' ')[0]}</td>
                    <td>
                      <button
                        onClick={() => setSelectedApproval(app)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Approvals */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 700 }}>
          Historical Review Ledger ({historyList.length})
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request Type</th>
                <th>Requester</th>
                <th>Reviewed By</th>
                <th>Status</th>
                <th>Decision Notes</th>
                <th>Reviewed Date</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((app) => (
                <tr key={app.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{app.approval_type.replace(/_/g, ' ')}</span>
                  </td>
                  <td>{app.requester_name}</td>
                  <td>{app.reviewer_name || 'Admin'}</td>
                  <td>
                    <span className={`status-badge status-${app.status?.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.decision_notes || '—'}</td>
                  <td>{app.reviewed_at || 'Completed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedApproval && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Review Request: {selectedApproval.approval_type.replace(/_/g, ' ')}
                </h3>
              </div>
              <button onClick={() => setSelectedApproval(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div>Requester: <strong>{selectedApproval.requester_name}</strong> ({selectedApproval.requester_email})</div>
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Details:</strong>
                <pre style={{ margin: '0.4rem 0 0 0', fontSize: '0.78rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 4, overflowX: 'auto' }}>
                  {JSON.stringify(selectedApproval.request_details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Decision Notes / Feedback</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Optional notes explaining approval terms or rationale..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => handleReview('REJECTED')}
                disabled={reviewLoading}
                className="btn btn-secondary"
                style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <XCircle size={15} />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={() => handleReview('APPROVED')}
                disabled={reviewLoading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <CheckCircle size={15} />
                <span>{reviewLoading ? 'Processing...' : 'Authorize & Approve'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
