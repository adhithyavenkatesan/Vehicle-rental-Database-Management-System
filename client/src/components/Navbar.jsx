import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  LogIn,
  Bell,
  Search,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export function Navbar({ currentTitle, onToggleSidebar, onOpenAuth, onNavigate }) {
  const { user, logout, theme, toggleTheme } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifRef = useRef(null);

  // Profile menu state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      // Silently catch in polling
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle global search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      setSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchGlobal(searchQuery);
        if (res.success) {
          setSearchResults(res.results);
          setSearchDropdownOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (notif.is_read === 0) {
      api.markNotificationRead(notif.id).catch(() => {});
      fetchNotifications();
    }
    setNotifDropdownOpen(false);
    if (notif.link && onNavigate) {
      const tab = notif.link.replace('/', '');
      onNavigate(tab);
    }
  };

  const handleSearchResultClick = (tab) => {
    setSearchDropdownOpen(false);
    setSearchQuery('');
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <header className="top-navbar" style={{ position: 'relative', zIndex: 100 }}>
      {/* Left: Hamburger & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 200 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
          aria-label="Toggle Navigation"
        >
          <Menu size={22} />
        </button>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          {currentTitle}
        </h1>
      </div>

      {/* Middle: Global Search */}
      <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 420, margin: '0 1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.75rem',
            gap: '0.5rem'
          }}
        >
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search booking ref, plate, customer, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setSearchDropdownOpen(true);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.85rem',
              color: 'var(--text-main)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setSearchDropdownOpen(false);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchDropdownOpen && searchResults && (
          <div
            style={{
              position: 'absolute',
              top: '115%',
              left: 0,
              right: 0,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: 400,
              overflowY: 'auto',
              padding: '0.75rem',
              zIndex: 1000
            }}
          >
            {/* Vehicles */}
            {searchResults.vehicles?.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Vehicles ({searchResults.vehicles.length})
                </div>
                {searchResults.vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSearchResultClick('vehicles')}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                      background: 'var(--bg-tertiary)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{v.make} {v.model}</span>
                      <span style={{ color: 'var(--text-dim)', marginLeft: '0.4rem' }}>({v.reg_number})</span>
                    </div>
                    <span className={`status-badge status-${v.status?.toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bookings */}
            {searchResults.bookings?.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Bookings ({searchResults.bookings.length})
                </div>
                {searchResults.bookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleSearchResultClick('bookings')}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                      background: 'var(--bg-tertiary)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{b.booking_ref}</span>
                      <span style={{ color: 'var(--text-dim)', marginLeft: '0.4rem' }}>{b.make} {b.model}</span>
                    </div>
                    <span className={`status-badge status-${b.status?.toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Invoices */}
            {searchResults.invoices?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Invoices ({searchResults.invoices.length})
                </div>
                {searchResults.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleSearchResultClick('invoices')}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                      background: 'var(--bg-tertiary)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{inv.invoice_number}</span>
                      <span style={{ color: 'var(--text-dim)', marginLeft: '0.4rem' }}>₹{inv.total_amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: inv.payment_status === 'PAID' ? 'var(--success)' : 'var(--warning)' }}>
                      {inv.payment_status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(!searchResults.vehicles?.length && !searchResults.bookings?.length && !searchResults.invoices?.length && !searchResults.customers?.length) && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No records found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Notifications, Profile, Theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.45rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#475569" />}
        </button>

        {user && (
          <>
            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '0.45rem',
                  borderRadius: '50%',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Notifications"
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      background: 'var(--danger)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-secondary)'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {notifDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: 340,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-tertiary)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                      <Bell size={15} color="var(--primary)" />
                      <span>Notifications ({unreadCount} new)</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        No notifications to display
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: n.is_read ? 500 : 700, color: 'var(--text-main)' }}>
                              {n.title}
                            </div>
                            {n.is_read === 0 && (
                              <button
                                onClick={(e) => handleMarkAsRead(n.id, e)}
                                title="Mark as read"
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  background: 'var(--bg-tertiary)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.1 }}>{user.full_name}</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: user.role === 'ADMIN' ? 'var(--primary)' : user.role === 'STAFF' ? 'var(--success)' : 'var(--warning)',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {user.role}
                  </span>
                </div>
                <ChevronDown size={14} color="var(--text-dim)" />
              </div>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: 230,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: 'var(--primary)'
                        }}
                      >
                        {user.role === 'ADMIN' ? 'SYSTEM ADMINISTRATOR' : user.role === 'STAFF' ? 'OPERATIONS DESK' : 'VERIFIED RENTER'}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '0.4rem 0' }}>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        if (onNavigate) onNavigate(user.role === 'CUSTOMER' ? 'customer-portal' : 'profile');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-main)',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <User size={15} color="var(--text-muted)" />
                      <span>{user.role === 'CUSTOMER' ? 'Customer Portal' : 'User Profile'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        if (onNavigate) onNavigate('profile');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-main)',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <Shield size={15} color="var(--text-muted)" />
                      <span>Account Security</span>
                    </button>
                  </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.4rem 0' }}>
                    <button
                      onClick={async () => {
                        setProfileDropdownOpen(false);
                        await logout();
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.82rem',
                        color: 'var(--danger)',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
