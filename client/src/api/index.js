const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetch wrapper that automatically attaches JWT and handles error responses
 */
async function request(endpoint, options = {}) {
  const token = sessionStorage.getItem('rentdrive_token') || localStorage.getItem('rentdrive_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch (netErr) {
    const error = new Error('Could not connect to backend server. Please verify backend is running on port 5000.');
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data.message || data.error || (response.status === 502 || response.status === 504 
      ? 'Backend service is starting up or temporarily unavailable.' 
      : response.status === 404
      ? 'Requested endpoint not found.'
      : 'An unexpected server error occurred.');
    const error = new Error(msg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }).catch(() => {}),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyResetToken: (token) => request(`/auth/verify-reset-token/${encodeURIComponent(token)}`),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  updateProfile: (profile) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  changePassword: (data) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),

  // Vehicles
  getVehicles: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/vehicles${query ? `?${query}` : ''}`);
  },
  getVehicle: (id) => request(`/vehicles/${id}`),
  createVehicle: (data) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (id, data) => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  // Categories & Locations
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getLocations: () => request('/locations'),
  createLocation: (data) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id, data) => request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Branches
  getBranches: () => request('/branches'),
  getBranch: (id) => request(`/branches/${id}`),
  createBranch: (data) => request('/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id, data) => request(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Rate Cards
  getRates: () => request('/rates'),
  getRate: (id) => request(`/rates/${id}`),
  calculateRate: (data) => request('/rates/calculate', { method: 'POST', body: JSON.stringify(data) }),
  createRate: (data) => request('/rates', { method: 'POST', body: JSON.stringify(data) }),
  updateRate: (id, data) => request(`/rates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Customers
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/customers${query ? `?${query}` : ''}`);
  },
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Staff
  getStaff: () => request('/staff'),
  createStaff: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id, data) => request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Bookings
  getBookings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/bookings${query ? `?${query}` : ''}`);
  },
  getBooking: (id) => request(`/bookings/${id}`),
  createBooking: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateBookingStatus: (id, data) => request(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Rental Agreements
  getAgreements: () => request('/agreements'),
  getAgreement: (id) => request(`/agreements/${id}`),
  getAgreementByBooking: (bookingId) => request(`/agreements/booking/${bookingId}`),
  generateAgreement: (bookingId) => request(`/agreements/generate/${bookingId}`, { method: 'POST' }),

  // Rentals & Returns
  getRentals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rentals${query ? `?${query}` : ''}`);
  },
  getRental: (id) => request(`/rentals/${id}`),
  pickupRental: (data) => request('/rentals/pickup', { method: 'POST', body: JSON.stringify(data) }),
  getReturns: () => request('/returns'),
  processReturn: (data) => request('/returns/process', { method: 'POST', body: JSON.stringify(data) }),

  // Digital Inspections
  getInspections: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inspections${query ? `?${query}` : ''}`);
  },
  getInspectionsForRental: (rentalId) => request(`/inspections/rental/${rentalId}`),
  createInspection: (data) => request('/inspections', { method: 'POST', body: JSON.stringify(data) }),

  // Invoices & Customer Ledger
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/invoices${query ? `?${query}` : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  getCustomerLedger: (customerId) => request(`/invoices/ledger/${customerId}`),
  payInvoice: (id, data) => request(`/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),

  // Payments
  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payments${query ? `?${query}` : ''}`);
  },
  getPayment: (id) => request(`/payments/${id}`),
  createPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Fuel Management
  getFuelLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/fuel${query ? `?${query}` : ''}`);
  },
  getFuelStats: () => request('/fuel/stats'),
  createFuelLog: (data) => request('/fuel', { method: 'POST', body: JSON.stringify(data) }),

  // Fleet Expenses
  getExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/expenses${query ? `?${query}` : ''}`);
  },
  getExpenseSummary: () => request('/expenses/summary'),
  createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),

  // Advanced Fleet Analytics
  getProfitabilityAnalytics: () => request('/analytics/profitability'),
  getUtilizationAnalytics: () => request('/analytics/utilization'),

  // Approvals Queue
  getApprovals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/approvals${query ? `?${query}` : ''}`);
  },
  reviewApproval: (id, data) => request(`/approvals/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // Customer CRM Support Tickets
  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tickets${query ? `?${query}` : ''}`);
  },
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  replyTicket: (id, data) => request(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),

  // Global Search
  searchGlobal: (query) => request(`/search?q=${encodeURIComponent(query)}`),

  // Maintenance
  getMaintenance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/maintenance${query ? `?${query}` : ''}`);
  },
  createMaintenance: (data) => request('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  completeMaintenance: (id, data) => request(`/maintenance/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Dashboard & Reports
  getDashboardStats: () => request('/dashboard/stats'),
  getFinancialReports: () => request('/reports/financials'),
  getFleetUtilization: () => request('/reports/fleet-utilization'),
  getMaintenanceSummary: () => request('/reports/maintenance-summary'),

  // DBMS Administration
  getDbOverview: () => request('/database/overview'),
  getTableData: (table, page = 1, limit = 25) => request(`/database/tables/${table}?page=${page}&limit=${limit}`),
  insertTableRow: (table, data) => request(`/database/tables/${table}/row`, { method: 'POST', body: JSON.stringify(data) }),
  updateTableRow: (table, id, data) => request(`/database/tables/${table}/row/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTableRow: (table, id) => request(`/database/tables/${table}/row/${id}`, { method: 'DELETE' }),
  runSql: (sql) => request('/database/query', { method: 'POST', body: JSON.stringify({ sql }) }),
  downloadBackupUrl: `${API_BASE}/database/backup`,

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit${query ? `?${query}` : ''}`);
  }
};
