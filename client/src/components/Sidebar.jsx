import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Car,
  CalendarCheck,
  KeyRound,
  RotateCcw,
  Users,
  CreditCard,
  BarChart3,
  Receipt,
  FileSpreadsheet,
  Wrench,
  Fuel,
  FileCheck,
  Building2,
  Tags,
  CheckSquare,
  TrendingUp,
  PieChart,
  DollarSign,
  Bell,
  Database,
  ShieldAlert,
  Settings,
  HelpCircle,
  FileText,
  UserCheck
} from 'lucide-react';

export function Sidebar({ currentTab, onSelectTab, isOpen, onClose }) {
  const { user } = useAuth();
  const role = user?.role || 'CUSTOMER';

  // Grouped Navigation structure per specification
  const adminStaffSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
        { id: 'staff-dashboard', label: 'Operations Desk', icon: LayoutDashboard, roles: ['STAFF'] }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'vehicles', label: 'Fleet Vehicles', icon: Car, roles: ['ADMIN', 'STAFF'] },
        { id: 'bookings', label: 'Bookings & Reservations', icon: CalendarCheck, roles: ['ADMIN', 'STAFF'] },
        { id: 'rentals', label: 'Rentals & Dispatch', icon: KeyRound, roles: ['ADMIN', 'STAFF'] },
        { id: 'returns', label: 'Returns & Inspections', icon: RotateCcw, roles: ['ADMIN', 'STAFF'] },
        { id: 'customers', label: 'Customer Directory', icon: Users, roles: ['ADMIN', 'STAFF'] },
        { id: 'calendar', label: 'Rental Calendar', icon: CalendarCheck, roles: ['ADMIN', 'STAFF'] }
      ]
    },
    {
      title: 'FINANCE',
      items: [
        { id: 'invoices', label: 'Invoices & Billing', icon: Receipt, roles: ['ADMIN', 'STAFF'] },
        { id: 'payments', label: 'Payments Ledger', icon: CreditCard, roles: ['ADMIN', 'STAFF'] },
        { id: 'expenses', label: 'Fleet Expenses', icon: FileSpreadsheet, roles: ['ADMIN', 'STAFF'] },
        { id: 'reports', label: 'Financial Reports', icon: BarChart3, roles: ['ADMIN'] }
      ]
    },
    {
      title: 'FLEET & COMPLIANCE',
      items: [
        { id: 'maintenance', label: 'Fleet Maintenance', icon: Wrench, roles: ['ADMIN', 'STAFF'] },
        { id: 'fuel', label: 'Fuel Management', icon: Fuel, roles: ['ADMIN', 'STAFF'] },
        { id: 'documents', label: 'Compliance & Documents', icon: FileCheck, roles: ['ADMIN', 'STAFF'] }
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'approvals', label: 'Approvals Queue', icon: CheckSquare, roles: ['ADMIN', 'STAFF'] },
        { id: 'branches', label: 'Branch Management', icon: Building2, roles: ['ADMIN', 'STAFF'] },
        { id: 'staff', label: 'Staff Management', icon: UserCheck, roles: ['ADMIN', 'STAFF'] },
        { id: 'rates', label: 'Rate Cards', icon: Tags, roles: ['ADMIN', 'STAFF'] }
      ]
    },
    {
      title: 'ANALYTICS',
      items: [
        { id: 'analytics', label: 'Fleet Profitability', icon: TrendingUp, roles: ['ADMIN'] },
        { id: 'utilization', label: 'Fleet Utilization', icon: PieChart, roles: ['ADMIN', 'STAFF'] }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'tickets', label: 'Support Tickets', icon: HelpCircle, roles: ['ADMIN', 'STAFF'] },
        { id: 'database', label: 'Database (DBMS)', icon: Database, roles: ['ADMIN', 'STAFF'] },
        { id: 'audit', label: 'Audit Logs', icon: ShieldAlert, roles: ['ADMIN'] },
        { id: 'settings', label: 'System Settings', icon: Settings, roles: ['ADMIN'] }
      ]
    }
  ];

  // Dedicated Customer Portal Navigation
  const customerSections = [
    {
      title: 'PORTAL',
      items: [
        { id: 'customer-portal', label: 'My Rental Hub', icon: LayoutDashboard, roles: ['CUSTOMER'] },
        { id: 'vehicles', label: 'Browse Fleet', icon: Car, roles: ['CUSTOMER'] },
        { id: 'bookings', label: 'My Bookings', icon: CalendarCheck, roles: ['CUSTOMER'] },
        { id: 'agreements', label: 'Rental Agreements', icon: FileText, roles: ['CUSTOMER'] },
        { id: 'invoices', label: 'My Invoices', icon: Receipt, roles: ['CUSTOMER'] },
        { id: 'tickets', label: 'Support & Help Desk', icon: HelpCircle, roles: ['CUSTOMER'] },
        { id: 'profile', label: 'My Profile & KYC', icon: Users, roles: ['CUSTOMER'] }
      ]
    }
  ];

  const activeSections = role === 'CUSTOMER' ? customerSections : adminStaffSections;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
          }}
        >
          <Car size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            RentDrive<span style={{ color: 'var(--primary)' }}>.</span>
          </h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            Enterprise DBMS
          </span>
        </div>
      </div>

      {/* Grouped Navigation List */}
      <nav style={{ padding: '0.75rem 0.5rem', flex: 1, overflowY: 'auto' }}>
        {activeSections.map((sec, sIdx) => {
          const permittedItems = sec.items.filter((item) => item.roles.includes(role));
          if (permittedItems.length === 0) return null;

          return (
            <div key={sIdx} style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  color: 'var(--text-dim)',
                  padding: '0.35rem 0.85rem',
                  letterSpacing: '0.06em'
                }}
              >
                {sec.title}
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: 0, margin: 0 }}>
                {permittedItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          onSelectTab(item.id);
                          if (onClose) onClose();
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.55rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.86rem',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#ffffff' : 'var(--text-muted)',
                          background: isActive ? 'var(--primary-gradient)' : 'transparent',
                          boxShadow: isActive ? '0 2px 10px rgba(59, 130, 246, 0.35)' : 'none',
                          transition: 'all 0.15s ease',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <Icon size={17} color={isActive ? '#ffffff' : 'currentColor'} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Current User Pill at Bottom */}
      {user && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-tertiary)',
            margin: '0.5rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name}
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: user.role === 'ADMIN' ? 'var(--primary)' : user.role === 'STAFF' ? 'var(--success)' : 'var(--warning)',
                letterSpacing: '0.04em'
              }}
            >
              {user.role}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
