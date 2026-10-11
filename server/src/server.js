require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { errorHandler } = require('./middleware/errorHandler');

// Core Route handlers
const authRoutes = require('./routes/auth');
const vehiclesRoutes = require('./routes/vehicles');
const categoriesRoutes = require('./routes/categories');
const locationsRoutes = require('./routes/locations');
const customersRoutes = require('./routes/customers');
const staffRoutes = require('./routes/staff');
const bookingsRoutes = require('./routes/bookings');
const rentalsRoutes = require('./routes/rentals');
const returnsRoutes = require('./routes/returns');
const paymentsRoutes = require('./routes/payments');
const maintenanceRoutes = require('./routes/maintenance');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const databaseRoutes = require('./routes/database');
const auditRoutes = require('./routes/audit');

// Advanced Enterprise Route handlers
const branchesRoutes = require('./routes/branches');
const ratesRoutes = require('./routes/rates');
const agreementsRoutes = require('./routes/agreements');
const inspectionsRoutes = require('./routes/inspections');
const invoicesRoutes = require('./routes/invoices');
const fuelRoutes = require('./routes/fuel');
const expensesRoutes = require('./routes/expenses');
const analyticsRoutes = require('./routes/analytics');
const approvalsRoutes = require('./routes/approvals');
const notificationsRoutes = require('./routes/notifications');
const ticketsRoutes = require('./routes/tickets');
const searchRoutes = require('./routes/search');

const app = express();

// Global middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Vehicle Rental Database Management System',
    timestamp: new Date().toISOString()
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/audit', auditRoutes);

// Advanced Enterprise Endpoints
app.use('/api/branches', branchesRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/agreements', agreementsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/search', searchRoutes);

// Static client assets in production
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`[Server] Vehicle Rental DBMS API running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
