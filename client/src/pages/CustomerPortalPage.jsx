import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Car,
  KeyRound,
  CalendarCheck,
  Receipt,
  FileText,
  Clock,
  PlusCircle,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { RentalAgreementModal } from '../components/RentalAgreementModal';

export function CustomerPortalPage({ onNavigate }) {
  const { user } = useAuth();
  const [activeRental, setActiveRental] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);

  // Selected booking for extension / cancellation
  const [targetBooking, setTargetBooking] = useState(null);
  const [extDays, setExtDays] = useState(1);
  const [cancelReason, setCancelReason] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('GENERAL');
  const [ticketMessage, setTicketMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, rentalsRes, invoicesRes, ticketsRes] = await Promise.all([
        api.getBookings(),
        api.getRentals({ status: 'ACTIVE' }),
        api.getInvoices(),
        api.getTickets()
      ]);

      if (bookingsRes.success) setBookings(bookingsRes.bookings || []);
      if (rentalsRes.success && rentalsRes.rentals?.length > 0) {
        setActiveRental(rentalsRes.rentals[0]);
      } else {
        setActiveRental(null);
      }
      if (invoicesRes.success) setInvoices(invoicesRes.invoices || []);
      if (ticketsRes.success) setTickets(ticketsRes.tickets || []);
    } catch (err) {
      console.error('Error fetching customer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleOpenAgreement = async (bookingId) => {
    try {
      const res = await api.getAgreementByBooking(bookingId);
      if (res.success && res.agreement) {
        setSelectedAgreement(res.agreement);
        setAgreementModalOpen(true);
      } else {
        // Generate if not present
        const genRes = await api.generateAgreement(bookingId);
        if (genRes.success) {
          const newAgr = await api.getAgreement(genRes.agreement_id);
          setSelectedAgreement(newAgr.agreement);
          setAgreementModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error opening agreement:', err);
    }
  };

  const handleRequestExtension = async (e) => {
    e.preventDefault();
    if (!targetBooking) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      // Calculate additional amount
      const dailyRate = targetBooking.daily_rate;
      const addAmt = dailyRate * extDays * 1.18; // with GST
      const curEnd = new Date(targetBooking.end_date);
      curEnd.setDate(curEnd.getDate() + Number(extDays));
      const newEndDateStr = curEnd.toISOString().replace('T', ' ').slice(0, 19);

      // Submit to approvals queue via status update / direct API
      const res = await api.updateBookingStatus(targetBooking.id, {
        status: targetBooking.status,
        notes: `Extension of ${extDays} day(s) requested by customer. Proposed return: ${newEndDateStr}`
      });

      if (res.success) {
        setActionMessage({ type: 'success', text: `Trip extension request for ${extDays} day(s) submitted to dispatch supervisor.` });
        setTimeout(() => {
          setExtensionModalOpen(false);
          setActionMessage(null);
          fetchCustomerData();
        }, 1500);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit extension request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (e) => {
    e.preventDefault();
    if (!targetBooking) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await api.updateBookingStatus(targetBooking.id, {
        status: 'CANCELLED',
        cancellation_reason: cancelReason || 'Cancelled at customer request'
      });

      if (res.success) {
        setActionMessage({ type: 'success', text: 'Reservation cancelled successfully. Eligible refund processed to your original payment method.' });
        setTimeout(() => {
          setCancellationModalOpen(false);
          setActionMessage(null);
          fetchCustomerData();
        }, 1500);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to cancel reservation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await api.createTicket({
        subject: ticketSubject,
        category: ticketCategory,
        message: ticketMessage
      });

      if (res.success) {
        setActionMessage({ type: 'success', text: `Support ticket ${res.ticket_ref} created. Our operations team will respond promptly.` });
        setTicketSubject('');
        setTicketMessage('');
        setTimeout(() => {
          setNewTicketModalOpen(false);
          setActionMessage(null);
          fetchCustomerData();
        }, 1500);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to create support ticket.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card loading-container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
        <p style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Loading your personalized customer portal...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(30, 64, 175, 0.05) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Self-Drive Customer Hub
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0' }}>
            Welcome back, {user?.full_name}!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, maxWidth: 580 }}>
            Manage your ongoing self-drive roadtrips, download official digital rental agreements, request trip extensions, and review invoices in real-time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate('vehicles')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <PlusCircle size={16} />
            <span>Book Another Car</span>
          </button>
          <button
            onClick={() => setNewTicketModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <HelpCircle size={16} />
            <span>Support Request</span>
          </button>
        </div>
      </div>

      {/* Active Trip Spotlight Card */}
      {activeRental ? (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--primary)',
            background: 'var(--bg-secondary)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'var(--primary-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <KeyRound size={22} />
              </div>
              <div>
                <span className="status-badge status-active" style={{ fontSize: '0.7rem' }}>
                  ACTIVE ON-ROAD TRIP
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
                  {activeRental.make} {activeRental.model}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
                  {activeRental.reg_number}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={() => handleOpenAgreement(activeRental.booking_id)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <FileText size={15} />
                <span>View Agreement</span>
              </button>
              <button
                onClick={() => {
                  const bk = bookings.find((b) => b.id === activeRental.booking_id);
                  setTargetBooking(bk || activeRental);
                  setExtensionModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Clock size={15} />
                <span>Request Extension</span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Rental Ref</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{activeRental.rental_ref}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Pickup Odometer</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{activeRental.start_mileage?.toLocaleString('en-IN')} km</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Fuel Dispatched</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--success)' }}>{activeRental.fuel_level_pickup} Tank</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Expected Return</div>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--primary)' }}>{activeRental.expected_return_time}</div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            border: '1px dashed var(--border-subtle)'
          }}
        >
          <Car size={32} color="var(--text-dim)" style={{ margin: '0 auto 0.5rem auto' }} />
          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700 }}>No Active On-Road Rental</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            You do not currently have any vehicle checked out. Explore our premium fleet to plan your next roadtrip.
          </p>
          <button onClick={() => onNavigate('vehicles')} className="btn btn-primary btn-sm">
            Browse Available Vehicles
          </button>
        </div>
      )}

      {/* Bookings & Reservations Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>My Reservations & Trips</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Historical and upcoming vehicle bookings
            </span>
          </div>
          <button onClick={() => onNavigate('bookings')} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {bookings.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            No bookings recorded yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Vehicle</th>
                  <th>Pickup - Return</th>
                  <th>Duration</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Agreement & Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{b.booking_ref}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.make} {b.model}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{b.reg_number}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>{b.start_date?.split(' ')[0]}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>to {b.end_date?.split(' ')[0]}</div>
                    </td>
                    <td>{b.total_days} Day(s)</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>₹{b.estimated_total?.toLocaleString('en-IN')}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${b.status?.toLowerCase()}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleOpenAgreement(b.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          title="View Digital Agreement"
                        >
                          <FileText size={13} style={{ marginRight: 4 }} />
                          Agreement
                        </button>
                        {['CONFIRMED', 'PENDING'].includes(b.status) && (
                          <button
                            onClick={() => {
                              setTargetBooking(b);
                              setCancellationModalOpen(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                            title="Cancel Booking"
                          >
                            Cancel
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

      {/* Grid: Invoices & Support Tickets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Invoices */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>My Invoices & Settlements</h3>
            </div>
            <button onClick={() => onNavigate('invoices')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              All Invoices
            </button>
          </div>

          {invoices.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No billing records found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {invoices.slice(0, 4).map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Issued: {inv.issue_date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800 }}>₹{inv.total_amount?.toLocaleString('en-IN')}</div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: inv.payment_status === 'PAID' ? 'var(--success)' : 'var(--warning)' }}>
                      {inv.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Tickets */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Customer Support & Inquiries</h3>
            </div>
            <button onClick={() => setNewTicketModalOpen(true)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
              New Ticket
            </button>
          </div>

          {tickets.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No active support tickets. Need help? Raise a ticket anytime.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {tickets.slice(0, 4).map((tck) => (
                <div
                  key={tck.id}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{tck.ticket_ref}</span>
                    <span className={`status-badge status-${tck.status?.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      {tck.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{tck.subject}</div>
                  {tck.staff_response && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 8px', borderRadius: 4 }}>
                      Reply: {tck.staff_response.slice(0, 75)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Digital Rental Agreement Modal */}
      <RentalAgreementModal
        isOpen={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        agreement={selectedAgreement}
      />

      {/* Extension Request Modal */}
      {extensionModalOpen && targetBooking && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Request Trip Extension</h3>
              </div>
              <button onClick={() => setExtensionModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {actionMessage && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}
              >
                {actionMessage.text}
              </div>
            )}

            <form onSubmit={handleRequestExtension}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.84rem' }}>
                <div>Booking: <strong>{targetBooking.booking_ref}</strong></div>
                <div>Vehicle: <strong>{targetBooking.make} {targetBooking.model}</strong></div>
                <div>Scheduled Return: <strong>{targetBooking.end_date}</strong></div>
                <div>Daily Base Rate: <strong>₹{targetBooking.daily_rate}/day</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Extension Duration (Additional Days)</label>
                <select className="form-control" value={extDays} onChange={(e) => setExtDays(Number(e.target.value))}>
                  <option value={1}>1 Additional Day</option>
                  <option value={2}>2 Additional Days</option>
                  <option value={3}>3 Additional Days</option>
                  <option value={5}>5 Additional Days</option>
                  <option value={7}>1 Week Extension</option>
                </select>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
                Estimated Additional Amount: <strong>₹{(targetBooking.daily_rate * extDays * 1.18).toFixed(2)}</strong> (incl. 18% GST).
                Adjustment will be added to your final settlement invoice.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" onClick={() => setExtensionModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellationModalOpen && targetBooking && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="var(--danger)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Cancel Trip Reservation</h3>
              </div>
              <button onClick={() => setCancellationModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {actionMessage && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}
              >
                {actionMessage.text}
              </div>
            )}

            <form onSubmit={handleCancelBooking}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.84rem' }}>
                <div>Booking Ref: <strong>{targetBooking.booking_ref}</strong></div>
                <div>Vehicle: <strong>{targetBooking.make} {targetBooking.model}</strong></div>
                <div>Total Paid / Estimated: <strong>₹{targetBooking.estimated_total?.toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Cancellation</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Travel plans changed due to unexpected meeting postponement..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--danger)' }}>
                Policy Note: A standard processing cancellation fee of ₹500 applies. The remaining balance will be refunded directly to your original payment mode within 24-48 business hours.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" onClick={() => setCancellationModalOpen(false)} className="btn btn-secondary">
                  Dismiss
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-danger">
                  {actionLoading ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Support Ticket Modal */}
      {newTicketModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Raise Customer Support Ticket</h3>
              </div>
              <button onClick={() => setNewTicketModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {actionMessage && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}
              >
                {actionMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label className="form-label">Inquiry Category</label>
                <select className="form-control" value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)}>
                  <option value="GENERAL">General Support & Guidance</option>
                  <option value="BOOKING">Booking Modification</option>
                  <option value="BILLING">FasTag / Invoicing / Payment Query</option>
                  <option value="VEHICLE_ISSUE">Vehicle Feature & Tech Support</option>
                  <option value="ACCIDENT_BREAKDOWN">Roadside Assistance / Breakdown</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Airport delivery coordinate query"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Details</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe your inquiry or assistance requirement..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" onClick={() => setNewTicketModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Send size={15} />
                  <span>{actionLoading ? 'Submitting...' : 'Send Inquiry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
