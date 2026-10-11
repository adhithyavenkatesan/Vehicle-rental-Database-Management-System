import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Car, KeyRound, Wrench } from 'lucide-react';

export function RentalCalendarPage({ onNavigate }) {
  const [bookings, setBookings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, mRes] = await Promise.all([
        api.getBookings(),
        api.getMaintenance()
      ]);
      if (bRes.success) setBookings(bRes.bookings || []);
      if (mRes.success) setMaintenance(mRes.maintenance || []);
    } catch (err) {
      console.error('Error fetching calendar schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to check if event falls on a specific day
  const getEventsForDay = (day) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const matchingBookings = bookings.filter((b) => {
      const start = b.start_date?.split(' ')[0];
      const end = b.end_date?.split(' ')[0];
      return targetDateStr >= start && targetDateStr <= end;
    });

    const matchingMaint = maintenance.filter((m) => {
      const start = m.start_date?.split(' ')[0];
      const end = m.end_date?.split(' ')[0] || m.start_date;
      return targetDateStr >= start && targetDateStr <= end;
    });

    return {
      bookings: matchingBookings,
      maintenance: matchingMaint
    };
  };

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
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Fleet Operations & Rental Calendar
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Visual dispatch timeline of bookings, pickups, returns, and workshop maintenance schedules
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={prevMonth} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.65rem' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 800, minWidth: 150, textAlign: 'center', fontSize: '1rem' }}>
              {monthNames[month]} {year}
            </span>
            <button onClick={nextMonth} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.65rem' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Days of week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-dim)',
            padding: '0.65rem 0'
          }}
        >
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days Matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--border-subtle)', gap: '1px' }}>
          {/* Empty cells before 1st of month */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} style={{ minHeight: 110, background: 'var(--bg-tertiary)', opacity: 0.5 }} />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const events = getEventsForDay(dayNum);
            const isToday =
              dayNum === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            return (
              <div
                key={`day-${dayNum}`}
                style={{
                  minHeight: 110,
                  background: 'var(--bg-secondary)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: isToday ? 800 : 600,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isToday ? 'var(--primary)' : 'transparent',
                      color: isToday ? '#ffffff' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {dayNum}
                  </span>
                  {(events.bookings.length > 0 || events.maintenance.length > 0) && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                      {events.bookings.length + events.maintenance.length}
                    </span>
                  )}
                </div>

                {/* Event badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', maxHeight: 80 }}>
                  {events.bookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onNavigate && onNavigate('bookings')}
                      title={`${b.booking_ref} - ${b.make} ${b.model}`}
                      style={{
                        padding: '2px 5px',
                        borderRadius: 3,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        background: b.status === 'ACTIVE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: b.status === 'ACTIVE' ? 'var(--primary)' : 'var(--success)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {b.make} ({b.reg_number?.slice(-4)})
                    </div>
                  ))}

                  {events.maintenance.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onNavigate && onNavigate('maintenance')}
                      title={`Maintenance: ${m.description}`}
                      style={{
                        padding: '2px 5px',
                        borderRadius: 3,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Maint: {m.maintenance_type}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
