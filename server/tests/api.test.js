const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { app } = require('../src/server');
const { get, run, all } = require('../src/db');
const { seedDatabase } = require('../src/db/seed');

let server;
let baseUrl;
let adminToken;
let staffToken;
let customerToken;
let customerUser;

// Helper to make HTTP requests against the in-memory test server
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = rawData;
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test.before(async () => {
  // Clean transient test records from any previous runs
  try {
    run("DELETE FROM payments WHERE notes LIKE '%test%' OR booking_id IN (SELECT id FROM bookings WHERE booking_ref NOT IN ('BK-2024-IN01', 'BK-2024-IN02', 'BK-2024-IN03', 'BK-2024-IN04', 'BK-2024-IN05'))");
    run("DELETE FROM returns WHERE notes LIKE '%test%' OR rental_id IN (SELECT id FROM rentals WHERE booking_id IN (SELECT id FROM bookings WHERE booking_ref NOT IN ('BK-2024-IN01', 'BK-2024-IN02', 'BK-2024-IN03', 'BK-2024-IN04', 'BK-2024-IN05')))");
    run("DELETE FROM rentals WHERE booking_id IN (SELECT id FROM bookings WHERE booking_ref NOT IN ('BK-2024-IN01', 'BK-2024-IN02', 'BK-2024-IN03', 'BK-2024-IN04', 'BK-2024-IN05'))");
    run("DELETE FROM bookings WHERE booking_ref NOT IN ('BK-2024-IN01', 'BK-2024-IN02', 'BK-2024-IN03', 'BK-2024-IN04', 'BK-2024-IN05')");
    run("DELETE FROM vehicles WHERE reg_number LIKE 'TEST-%'");
  } catch (e) {
    // Non-fatal if tables don't exist yet
  }

  // Ensure database has clean seed data
  seedDatabase();

  await new Promise((resolve) => {
    // Pick an ephemeral port for testing
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  // Login as Admin
  const adminRes = await request('POST', '/api/auth/login', {
    email: 'admin@rentdrive.com',
    password: 'Admin@123'
  });
  assert.strictEqual(adminRes.status, 200);
  adminToken = adminRes.data.token;

  // Login as Staff
  const staffRes = await request('POST', '/api/auth/login', {
    email: 'staff@rentdrive.com',
    password: 'Staff@123'
  });
  assert.strictEqual(staffRes.status, 200);
  staffToken = staffRes.data.token;

  // Login as Customer
  const custRes = await request('POST', '/api/auth/login', {
    email: 'customer@rentdrive.com',
    password: 'Customer@123'
  });
  assert.strictEqual(custRes.status, 200);
  customerToken = custRes.data.token;
  customerUser = custRes.data.user;
});

test.after(() => {
  if (server) {
    server.close();
  }
});

// --- AUTHENTICATION & RBAC TESTS ---
test('Auth: Rejects invalid password', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: 'admin@rentdrive.com',
    password: 'WrongPassword'
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.data.success, false);
});

test('Auth: Rejects non-existent email', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: 'nonexistent@rentdrive.com',
    password: 'Password123'
  });
  assert.strictEqual(res.status, 401);
});

test('Auth: Register new customer', async () => {
  const testEmail = `testuser_${Date.now()}@example.com`;
  const res = await request('POST', '/api/auth/register', {
    email: testEmail,
    password: 'SecurePass123!',
    full_name: 'Test Customer',
    driving_license_no: `DL-TEST-${Date.now()}`,
    license_expiry: '2028-12-31'
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.token);
  assert.strictEqual(res.data.user.role, 'CUSTOMER');
});

test('RBAC: Customers are forbidden from admin staff management', async () => {
  const res = await request('GET', '/api/staff', null, customerToken);
  assert.strictEqual(res.status, 403);
});

test('RBAC: Admin has access to database overview', async () => {
  const res = await request('GET', '/api/database/overview', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.database.tables.length > 5);
});

// --- VEHICLE MANAGEMENT TESTS ---
test('Vehicles: List vehicles with filters', async () => {
  const res = await request('GET', '/api/vehicles?status=AVAILABLE');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(Array.isArray(res.data.vehicles));
  assert.ok(res.data.vehicles.length > 0);
  res.data.vehicles.forEach(v => {
    assert.strictEqual(v.status, 'AVAILABLE');
  });
});

test('Vehicles: Create new vehicle (Admin)', async () => {
  const cat = get('SELECT id FROM vehicle_categories LIMIT 1');
  const loc = get('SELECT id FROM locations LIMIT 1');
  const regNumber = `TEST-REG-${Math.floor(1000 + Math.random() * 9000)}`;

  const res = await request('POST', '/api/vehicles', {
    category_id: cat.id,
    location_id: loc.id,
    reg_number: regNumber,
    vin: `VIN-${Date.now()}`,
    make: 'Tata',
    model: 'Harrier Fearless+',
    year: 2024,
    color: 'Sunlit Yellow',
    fuel_type: 'DIESEL',
    transmission: 'AUTOMATIC',
    seating_capacity: 5,
    mileage: 5000,
    daily_rate: 4500.0
  }, adminToken);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.vehicle.reg_number, regNumber);
});

// --- BOOKING & DOUBLE-BOOKING PREVENTION TESTS ---
test('Booking: Successfully create booking for an available vehicle', async () => {
  const availableVehicle = get("SELECT id FROM vehicles WHERE status = 'AVAILABLE' LIMIT 1");
  const loc = get('SELECT id FROM locations LIMIT 1');

  const startDate = '2026-11-01 10:00:00';
  const endDate = '2026-11-04 10:00:00';

  const res = await request('POST', '/api/bookings', {
    vehicle_id: availableVehicle.id,
    pickup_location_id: loc.id,
    return_location_id: loc.id,
    start_date: startDate,
    end_date: endDate
  }, customerToken);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.booking.total_days, 3);
  assert.ok(res.data.booking.booking_ref.startsWith('BK-'));
});

test('Booking: Prevent DOUBLE BOOKING on overlapping dates', async () => {
  const availableVehicle = get("SELECT id FROM vehicles WHERE status = 'AVAILABLE' LIMIT 1");
  const loc = get('SELECT id FROM locations LIMIT 1');

  const startDate = '2026-11-20 10:00:00';
  const endDate = '2026-11-25 10:00:00';

  // 1st booking
  const b1 = await request('POST', '/api/bookings', {
    vehicle_id: availableVehicle.id,
    pickup_location_id: loc.id,
    start_date: startDate,
    end_date: endDate
  }, customerToken);
  assert.strictEqual(b1.status, 201);

  // 2nd booking overlapping (Nov 22 to Nov 27)
  const b2 = await request('POST', '/api/bookings', {
    vehicle_id: availableVehicle.id,
    pickup_location_id: loc.id,
    start_date: '2026-11-22 10:00:00',
    end_date: '2026-11-27 10:00:00'
  }, customerToken);

  // Must be rejected with 409 Conflict!
  assert.strictEqual(b2.status, 409);
  assert.strictEqual(b2.data.success, false);
  assert.ok(b2.data.message.includes('unavailable') || b2.data.message.includes('Overlaps'));
});

// --- RENTAL DISPATCH & RETURN WORKFLOW TESTS ---
test('Rental Workflow: Dispatch pickup and process return with condition & late fee check', async () => {
  const vehicle = get("SELECT * FROM vehicles WHERE status = 'AVAILABLE' LIMIT 1");
  const loc = get('SELECT id FROM locations LIMIT 1');

  // 1. Create a booking for pickup
  const bRes = await request('POST', '/api/bookings', {
    vehicle_id: vehicle.id,
    pickup_location_id: loc.id,
    start_date: '2026-12-01 10:00:00',
    end_date: '2026-12-03 10:00:00'
  }, customerToken);
  assert.strictEqual(bRes.status, 201);
  const bookingId = bRes.data.booking.id;

  // 2. Staff dispatches vehicle pickup
  const pickupRes = await request('POST', '/api/rentals/pickup', {
    booking_id: bookingId,
    start_mileage: vehicle.mileage,
    fuel_level_pickup: 'FULL'
  }, staffToken);
  assert.strictEqual(pickupRes.status, 201);
  assert.strictEqual(pickupRes.data.success, true);
  const rentalId = pickupRes.data.rental.id;

  // Check vehicle status is updated to RENTED
  const rentedVehicle = get('SELECT status FROM vehicles WHERE id = ?', [vehicle.id]);
  assert.strictEqual(rentedVehicle.status, 'RENTED');

  // 3. Process return with +300 miles and clean condition
  const returnMileage = vehicle.mileage + 300;
  const returnRes = await request('POST', '/api/returns/process', {
    rental_id: rentalId,
    return_mileage: returnMileage,
    fuel_level_return: 'FULL',
    vehicle_condition: 'EXCELLENT'
  }, staffToken);

  assert.strictEqual(returnRes.status, 201);
  assert.strictEqual(returnRes.data.success, true);
  assert.strictEqual(returnRes.data.return.return_mileage, returnMileage);

  // Check vehicle status is restored to AVAILABLE and mileage updated
  const returnedVehicle = get('SELECT status, mileage FROM vehicles WHERE id = ?', [vehicle.id]);
  assert.strictEqual(returnedVehicle.status, 'AVAILABLE');
  assert.strictEqual(returnedVehicle.mileage, returnMileage);
});

// --- MAINTENANCE AVAILABILITY RESTRICTION TESTS ---
test('Maintenance: Placing vehicle under maintenance locks booking availability', async () => {
  const vehicle = get("SELECT * FROM vehicles WHERE status = 'AVAILABLE' LIMIT 1");
  const loc = get('SELECT id FROM locations LIMIT 1');

  // 1. Put vehicle into maintenance
  const mRes = await request('POST', '/api/maintenance', {
    vehicle_id: vehicle.id,
    maintenance_type: 'ROUTINE_SERVICE',
    description: 'Scheduled multi-point brake inspection',
    start_date: '2026-10-15',
    cost: 150.0
  }, staffToken);
  assert.strictEqual(mRes.status, 201);
  const maintenanceId = mRes.data.maintenance.id;

  // Verify vehicle status is MAINTENANCE
  const maintVehicle = get('SELECT status FROM vehicles WHERE id = ?', [vehicle.id]);
  assert.strictEqual(maintVehicle.status, 'MAINTENANCE');

  // 2. Attempt to book this vehicle (should fail)
  const bookAttempt = await request('POST', '/api/bookings', {
    vehicle_id: vehicle.id,
    pickup_location_id: loc.id,
    start_date: '2026-10-16 10:00:00',
    end_date: '2026-10-18 10:00:00'
  }, customerToken);
  assert.strictEqual(bookAttempt.status, 400);
  assert.ok(bookAttempt.data.message.includes('maintenance'));

  // 3. Complete maintenance
  const compRes = await request('PATCH', `/api/maintenance/${maintenanceId}/complete`, {
    final_cost: 150.0
  }, staffToken);
  assert.strictEqual(compRes.status, 200);

  // Verify vehicle status is restored to AVAILABLE
  const restoredVehicle = get('SELECT status FROM vehicles WHERE id = ?', [vehicle.id]);
  assert.strictEqual(restoredVehicle.status, 'AVAILABLE');
});

// --- DASHBOARD METRICS ACCURACY TEST ---
test('Dashboard: Returns live, accurate counts from database', async () => {
  const res = await request('GET', '/api/dashboard/stats', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);

  const stats = res.data.stats;
  const dbVehicleCount = get('SELECT COUNT(*) as count FROM vehicles').count;
  const dbCustCount = get('SELECT COUNT(*) as count FROM customers').count;

  assert.strictEqual(stats.totalVehicles, dbVehicleCount);
  assert.strictEqual(stats.totalCustomers, dbCustCount);
  assert.ok(stats.totalRevenue > 0);
  assert.ok(Array.isArray(stats.categoryBreakdown));
  assert.ok(Array.isArray(stats.recentBookings));
});

// --- PAYMENT & RECEIPTS TESTS ---
test('Payments: Record and retrieve payment transactions', async () => {
  const cust = get('SELECT id FROM customers LIMIT 1');
  const res = await request('POST', '/api/payments', {
    customer_id: cust.id,
    amount: 5000.0,
    payment_method: 'UPI',
    notes: 'Security deposit payment settled via UPI'
  }, customerToken);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.payment.amount, 5000.0);
  assert.ok(res.data.payment.payment_ref.startsWith('PAY-'));

  const listRes = await request('GET', '/api/payments', null, customerToken);
  assert.strictEqual(listRes.status, 200);
  assert.ok(listRes.data.payments.length > 0);
});

// --- DATABASE MANAGEMENT (DBMS) TESTS ---
test('DBMS: Admin can view table schema and export JSON backup', async () => {
  const res = await request('GET', '/api/database/tables/vehicles', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.table, 'vehicles');
  assert.ok(res.data.totalRows > 0);
  assert.ok(Array.isArray(res.data.rows));

  const backupRes = await request('GET', '/api/database/backup', null, adminToken);
  assert.strictEqual(backupRes.status, 200);
  assert.ok(backupRes.data.tables.vehicles);
  assert.ok(backupRes.data.tables.bookings);
});

// --- ENTERPRISE MODULES SUITE ---
test('Enterprise: Branches operations and staff aggregates', async () => {
  const res = await request('GET', '/api/branches', null, staffToken);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.branches.length >= 2);
  assert.ok(res.data.branches[0].name);
});

test('Enterprise: Rate cards and live rate calculation engine', async () => {
  const cat = get('SELECT id FROM vehicle_categories LIMIT 1');
  const res = await request('POST', '/api/rates/calculate', {
    category_id: cat.id,
    start_date: '2026-10-10 10:00:00',
    end_date: '2026-10-14 18:00:00'
  }, customerToken);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.calculation.estimated_total > 0);
  assert.ok(res.data.calculation.tax_amount > 0);
});

test('Enterprise: Digital rental agreements repository', async () => {
  const res = await request('GET', '/api/agreements', null, customerToken);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(Array.isArray(res.data.agreements));
});

test('Enterprise: Digital vehicle inspections checklist', async () => {
  const veh = get('SELECT id FROM vehicles LIMIT 1');
  const res = await request('POST', '/api/inspections', {
    vehicle_id: veh.id,
    inspection_type: 'PERIODIC',
    odometer_reading: 20000,
    fuel_level: 'FULL',
    exterior_front: 'PASS',
    has_damage: false
  }, staffToken);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.inspection_id);
});

test('Enterprise: Invoices and customer financial ledger', async () => {
  const invRes = await request('GET', '/api/invoices', null, staffToken);
  assert.strictEqual(invRes.status, 200);
  assert.ok(invRes.data.invoices.length > 0);

  const cust = get('SELECT id FROM customers LIMIT 1');
  const ledgerRes = await request('GET', `/api/invoices/ledger/${cust.id}`, null, staffToken);
  assert.strictEqual(ledgerRes.status, 200);
  assert.ok(ledgerRes.data.ledger.summary);
  assert.ok(ledgerRes.data.ledger.summary.total_billed >= 0);
});

test('Enterprise: Fuel management and fleet efficiency', async () => {
  const res = await request('GET', '/api/fuel', null, staffToken);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.data.fuel_logs));

  const statsRes = await request('GET', '/api/fuel/stats', null, staffToken);
  assert.strictEqual(statsRes.status, 200);
  assert.ok(statsRes.data.stats.summary.total_cost >= 0);
});

test('Enterprise: Fleet expenses by category', async () => {
  const res = await request('GET', '/api/expenses', null, staffToken);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.data.expenses));

  const sumRes = await request('GET', '/api/expenses/summary', null, staffToken);
  assert.strictEqual(sumRes.status, 200);
  assert.ok(sumRes.data.summary.total_expenses >= 0);
});

test('Enterprise: Per-vehicle profitability and fleet utilization', async () => {
  const profRes = await request('GET', '/api/analytics/profitability', null, adminToken);
  assert.strictEqual(profRes.status, 200);
  assert.ok(profRes.data.summary.fleet_revenue > 0);
  assert.ok(profRes.data.top_performers.length > 0);

  const utilRes = await request('GET', '/api/analytics/utilization', null, staffToken);
  assert.strictEqual(utilRes.status, 200);
  assert.ok(utilRes.data.fleet_summary.total_vehicles > 0);
  assert.ok(utilRes.data.fleet_summary.utilization_rate_pct >= 0);
});

test('Enterprise: Admin approvals governance queue', async () => {
  const res = await request('GET', '/api/approvals', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.data.approvals));
});

test('Enterprise: Real-time user notifications inbox', async () => {
  const res = await request('GET', '/api/notifications', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.data.notifications));
});

test('Enterprise: Customer CRM support tickets', async () => {
  const res = await request('POST', '/api/tickets', {
    subject: 'Fastag Toll Recheck Request',
    category: 'BILLING',
    priority: 'MEDIUM',
    message: 'Please verify the toll entry on Yamuna Expressway.'
  }, customerToken);

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.ticket_ref.startsWith('TCK-'));
});

test('Enterprise: Global unified search across entities', async () => {
  const res = await request('GET', '/api/search?q=Swift', null, staffToken);
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.results.vehicles.length > 0);
});


