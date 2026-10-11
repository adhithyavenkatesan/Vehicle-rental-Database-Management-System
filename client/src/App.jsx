import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';

// Core Application Pages
import { DashboardPage } from './pages/DashboardPage';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { BookingsPage } from './pages/BookingsPage';
import { RentalsPage } from './pages/RentalsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { CustomersPage } from './pages/CustomersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { FuelPage } from './pages/FuelPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FleetAnalyticsPage } from './pages/FleetAnalyticsPage';
import { BranchesPage } from './pages/BranchesPage';
import { StaffPage } from './pages/StaffPage';
import { RateCardsPage } from './pages/RateCardsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { RentalCalendarPage } from './pages/RentalCalendarPage';
import { RentalAgreementsPage } from './pages/RentalAgreementsPage';
import { SupportTicketsPage } from './pages/SupportTicketsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DatabasePage } from './pages/DatabasePage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ProfilePage } from './pages/ProfilePage';
import { Car, ShieldAlert } from 'lucide-react';

export function App() {
  const { user, loading } = useAuth();

  // Role-appropriate default tabs:
  // ADMIN -> 'dashboard'
  // STAFF -> 'staff-dashboard'
  // CUSTOMER -> 'customer-portal'
  const getDefaultTab = (role) => {
    if (role === 'ADMIN') return 'dashboard';
    if (role === 'STAFF') return 'staff-dashboard';
    if (role === 'CUSTOMER') return 'customer-portal';
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState(() => getDefaultTab(user?.role));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Workflow states across pages
  const [initialBookingVehicle, setInitialBookingVehicle] = useState(null);
  const [preselectedBookingForPickup, setPreselectedBookingForPickup] = useState(null);
  const [preselectedRentalForReturn, setPreselectedRentalForReturn] = useState(null);

  // Update tab automatically when user logs in or role changes
  useEffect(() => {
    if (user) {
      setCurrentTab(getDefaultTab(user.role));
    }
  }, [user?.role]);

  // Page titles lookup
  const titles = {
    dashboard: 'Executive Operations & Fleet Dashboard',
    'staff-dashboard': 'Fleet Operations & Dispatch Desk',
    'customer-portal': 'Self-Drive Customer Rental Hub',
    vehicles: user?.role === 'CUSTOMER' ? 'Explore Self-Drive Fleet' : 'Fleet Asset Management',
    bookings: user?.role === 'CUSTOMER' ? 'My Trip Reservations' : 'Bookings & Reservations Master',
    rentals: 'Active Rentals & Handover Dispatch',
    returns: 'Vehicle Returns, Settlements & Check-in',
    customers: 'Customer Master Directory & KYC',
    payments: 'Financial Ledger & Transactions',
    invoices: user?.role === 'CUSTOMER' ? 'My Billing Statements' : 'Invoices & Commercial Billing Statements',
    maintenance: 'Workshop & Fleet Maintenance',
    fuel: 'Fuel Logs & KM/L Efficiency Management',
    expenses: 'Fleet Operating Expenses & Vouchers',
    analytics: 'Per-Vehicle Profitability & Contribution',
    utilization: 'Fleet Capacity & Utilization Analytics',
    branches: 'Multi-Branch Depot Operations',
    staff: 'Operations & Desk Staff Directory',
    rates: 'Rate Cards & Dynamic Pricing Engine',
    approvals: 'Governance & Approval Decision Queue',
    calendar: 'Fleet Dispatch & Availability Calendar',
    agreements: user?.role === 'CUSTOMER' ? 'My Rental Agreements' : 'Digital Rental Agreements Repository',
    tickets: user?.role === 'CUSTOMER' ? 'Customer Support & Help Desk' : 'Customer CRM & Roadside Support Desk',
    reports: 'Financial & Operational Reports',
    database: 'Relational Database Management (DBMS)',
    audit: 'Security & Activity Audit Logs',
    settings: 'Relational Database Management (DBMS)',
    profile: 'My Account, KYC & Driving License'
  };

  // Define tab permissions by role
  const rolePermissions = {
    ADMIN: [
      'dashboard', 'vehicles', 'bookings', 'rentals', 'returns', 'customers', 'calendar',
      'invoices', 'payments', 'expenses', 'reports', 'maintenance', 'fuel', 'documents',
      'approvals', 'branches', 'staff', 'rates', 'analytics', 'utilization',
      'tickets', 'database', 'audit', 'settings', 'profile'
    ],
    STAFF: [
      'staff-dashboard', 'vehicles', 'bookings', 'rentals', 'returns', 'customers', 'calendar',
      'invoices', 'payments', 'expenses', 'maintenance', 'fuel', 'documents',
      'approvals', 'utilization', 'tickets', 'profile'
    ],
    CUSTOMER: [
      'customer-portal', 'vehicles', 'bookings', 'agreements', 'invoices', 'tickets', 'profile'
    ]
  };

  // Check if current tab is permitted for user's role
  const isTabPermitted = (tab) => {
    if (!user) return false;
    const allowed = rolePermissions[user.role] || [];
    return allowed.includes(tab);
  };

  const handleBookVehicle = (vehicle) => {
    setInitialBookingVehicle(vehicle);
    setCurrentTab('bookings');
  };

  const handleDispatchPickup = (booking) => {
    setPreselectedBookingForPickup(booking);
    setCurrentTab('rentals');
  };

  const handleProcessReturn = (rental) => {
    setPreselectedRentalForReturn(rental);
    setCurrentTab('returns');
  };

  const handleLoginSuccess = (authenticatedUser) => {
    setCurrentTab(getDefaultTab(authenticatedUser.role));
  };

  // 1. Full-screen Loading State during session token verification
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#ffffff',
          fontFamily: 'var(--font-sans)'
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
          }}
        >
          <Car size={30} color="#ffffff" />
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.88rem', fontWeight: 600 }}>
          Initializing Secure Session...
        </p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 2. Unauthenticated Gate: FIRST AND ONLY SCREEN IS LOGIN
  // No Sidebar, No Navbar, No Dashboard, No Vehicle list visible
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Authenticated: Render Main Application Layout with dynamic role navigation
  const activeTabValid = isTabPermitted(currentTab) ? currentTab : getDefaultTab(user.role);

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-container" style={{ flex: 1 }}>
        {/* Role-Restricted Sidebar */}
        <Sidebar
          currentTab={activeTabValid}
          onSelectTab={(tab) => {
            if (isTabPermitted(tab)) {
              setCurrentTab(tab);
            } else {
              setCurrentTab(getDefaultTab(user.role));
            }
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Workspace */}
        <div className="main-content">
          <Navbar
            currentTitle={titles[activeTabValid] || 'RentDrive DBMS'}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onNavigate={(tab) => {
              if (isTabPermitted(tab)) {
                setCurrentTab(tab);
              } else {
                setCurrentTab(getDefaultTab(user.role));
              }
            }}
          />

          <main className="page-body">
            {/* Customer Rental Hub */}
            {activeTabValid === 'customer-portal' && (
              <CustomerPortalPage onNavigate={(tab) => setCurrentTab(tab)} />
            )}

            {/* Staff Operations Desk */}
            {activeTabValid === 'staff-dashboard' && (
              <StaffDashboardPage
                onNavigate={(tab) => setCurrentTab(tab)}
                onDispatchPickup={handleDispatchPickup}
                onProcessReturn={handleProcessReturn}
              />
            )}

            {/* Admin Executive Dashboard */}
            {activeTabValid === 'dashboard' && (
              <DashboardPage onNavigate={(tab) => setCurrentTab(tab)} />
            )}

            {/* Fleet Asset Management */}
            {activeTabValid === 'vehicles' && (
              <VehiclesPage onBookVehicle={handleBookVehicle} />
            )}

            {/* Bookings & Reservations */}
            {activeTabValid === 'bookings' && (
              <BookingsPage
                initialBookingVehicle={initialBookingVehicle}
                onClearInitialVehicle={() => setInitialBookingVehicle(null)}
                onDispatchPickup={handleDispatchPickup}
              />
            )}

            {/* Active Rentals & Dispatch */}
            {activeTabValid === 'rentals' && (
              <RentalsPage
                onProcessReturn={handleProcessReturn}
                preselectedBooking={preselectedBookingForPickup}
                onClearPreselectedBooking={() => setPreselectedBookingForPickup(null)}
              />
            )}

            {/* Returns & Check-In */}
            {activeTabValid === 'returns' && (
              <ReturnsPage
                preselectedRental={preselectedRentalForReturn}
                onClearPreselectedRental={() => setPreselectedRentalForReturn(null)}
              />
            )}

            {/* Customers Master */}
            {activeTabValid === 'customers' && <CustomersPage />}

            {/* Rental Calendar */}
            {activeTabValid === 'calendar' && (
              <RentalCalendarPage onNavigate={(tab) => setCurrentTab(tab)} />
            )}

            {/* Invoices & Billing */}
            {activeTabValid === 'invoices' && <InvoicesPage />}

            {/* Financial Ledger & Payments */}
            {activeTabValid === 'payments' && <PaymentsPage />}

            {/* Fleet Expenses */}
            {activeTabValid === 'expenses' && <ExpensesPage />}

            {/* Financial Reports (Admin Only) */}
            {activeTabValid === 'reports' && <ReportsPage />}

            {/* Fleet Maintenance */}
            {activeTabValid === 'maintenance' && <MaintenancePage />}

            {/* Fuel Logs */}
            {activeTabValid === 'fuel' && <FuelPage />}

            {/* Vehicle Documents & Compliance */}
            {activeTabValid === 'documents' && (
              <VehiclesPage onBookVehicle={handleBookVehicle} initialFilter="COMPLIANCE" />
            )}

            {/* Governance Approvals Queue */}
            {activeTabValid === 'approvals' && <ApprovalsPage />}

            {/* Multi-Branch Management (Admin Only) */}
            {activeTabValid === 'branches' && <BranchesPage />}

            {/* Staff Management (Admin Only) */}
            {activeTabValid === 'staff' && <StaffPage />}

            {/* Dynamic Rate Cards (Admin Only) */}
            {activeTabValid === 'rates' && <RateCardsPage />}

            {/* Fleet Profitability & Analytics (Admin Only) */}
            {(activeTabValid === 'analytics' || activeTabValid === 'utilization') && (
              <FleetAnalyticsPage />
            )}

            {/* Digital Rental Agreements */}
            {activeTabValid === 'agreements' && <RentalAgreementsPage />}

            {/* CRM & Roadside Support Tickets */}
            {activeTabValid === 'tickets' && <SupportTicketsPage />}

            {/* Relational Database Hub (Admin Only) */}
            {activeTabValid === 'database' && <DatabasePage />}

            {/* Audit Logs (Admin Only) */}
            {activeTabValid === 'audit' && <AuditLogsPage />}

            {/* System Settings (Admin Only) */}
            {activeTabValid === 'settings' && <DatabasePage />}

            {/* User Profile & KYC */}
            {activeTabValid === 'profile' && <ProfilePage />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
