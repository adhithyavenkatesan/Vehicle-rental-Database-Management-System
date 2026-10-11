import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { HelpCircle, MessageSquare, Send, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export function SupportTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getTickets();
      if (res.success) setTickets(res.tickets || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage) return;
    setReplyLoading(true);

    try {
      const res = await api.replyTicket(selectedTicket.id, {
        response: replyMessage,
        status: newStatus
      });

      if (res.success) {
        setSelectedTicket(null);
        setReplyMessage('');
        fetchTickets();
      }
    } catch (err) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setReplyLoading(false);
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
            <HelpCircle size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Customer CRM & Roadside Support Desk
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Resolve customer questions, FasTag inquiries, booking extensions, and on-road breakdown dispatches
            </span>
          </div>
        </div>
      </div>

      {/* Tickets Master Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 700 }}>
          Support Tickets Queue ({tickets.length})
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
            Loading customer tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            No support tickets on record.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket Ref</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Subject & Summary</th>
                  <th>Status</th>
                  <th>Staff Responder</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((tck) => (
                  <tr key={tck.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{tck.ticket_ref}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tck.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{tck.customer_phone}</div>
                    </td>
                    <td>{tck.category}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: tck.priority === 'HIGH' || tck.priority === 'URGENT' ? 'var(--danger)' : 'var(--warning)'
                        }}
                      >
                        {tck.priority}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tck.subject}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tck.message}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${tck.status?.toLowerCase().replace('_', '-')}`}>
                        {tck.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tck.assigned_staff_name || 'Unassigned'}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedTicket(tck)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                      >
                        {user?.role === 'CUSTOMER' ? 'View' : 'Respond'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Details & Reply Modal */}
      {selectedTicket && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Ticket {selectedTicket.ticket_ref}
                </h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>Customer: <strong>{selectedTicket.customer_name}</strong></div>
                <div>Priority: <strong>{selectedTicket.priority}</strong></div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>{selectedTicket.subject}</div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.4, background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 4 }}>
                {selectedTicket.message}
              </div>
            </div>

            {selectedTicket.staff_response && (
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>Previous Response:</div>
                <div style={{ color: 'var(--text-main)', lineHeight: 1.4 }}>{selectedTicket.staff_response}</div>
              </div>
            )}

            {user?.role !== 'CUSTOMER' ? (
              <form onSubmit={handleSendReply}>
                <div className="form-group">
                  <label className="form-label">Support Response / Solution</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Type official operations reply to customer..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Update Ticket Status</label>
                  <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="RESOLVED">RESOLVED - Solution Provided</option>
                    <option value="IN_PROGRESS">IN_PROGRESS - Investigating Issue</option>
                    <option value="CLOSED">CLOSED - Ticket Finalized</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setSelectedTicket(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={replyLoading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Send size={15} />
                    <span>{replyLoading ? 'Submitting...' : 'Send Response'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedTicket(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
