const bcrypt = require('bcryptjs');
const { execScript, run, all, get, transaction } = require('./index');
const { runMigrations } = require('./migrate');

function seedDatabase(fresh = true) {
  console.log(`Seeding database with authentic Indian commercial vehicle rental data (fresh: ${fresh})...`);

  // Ensure fresh schema migration if requested
  runMigrations(fresh);

  transaction(() => {
    // =========================================================================
    // 1. Roles
    // =========================================================================
    const roles = [
      { name: 'ADMIN', description: 'System Administrator with full governance and database access' },
      { name: 'STAFF', description: 'Operations and fleet desk staff for bookings, rentals, inspections & returns' },
      { name: 'CUSTOMER', description: 'Registered self-drive customer for vehicle reservations and trips' }
    ];

    for (const r of roles) {
      run('INSERT INTO roles (name, description) VALUES (?, ?)', [r.name, r.description]);
    }

    const adminRoleId = get('SELECT id FROM roles WHERE name = ?', ['ADMIN']).id;
    const staffRoleId = get('SELECT id FROM roles WHERE name = ?', ['STAFF']).id;
    const customerRoleId = get('SELECT id FROM roles WHERE name = ?', ['CUSTOMER']).id;

    const adminPasswordHash = bcrypt.hashSync('Admin@12345', 10);
    const staffPasswordHash = bcrypt.hashSync('Staff@12345', 10);
    const customerPasswordHash = bcrypt.hashSync('Customer@12345', 10);

    // =========================================================================
    // 2. Branches
    // =========================================================================
    const branches = [
      { name: 'Delhi Airport Terminal 3 Hub', code: 'BR-DEL-01', address: 'Terminal 3 Arrivals, Aerocity', city: 'New Delhi', phone: '+91 11 2565 0101', email: 'delhi.t3@rentdrive.in', manager: 'Rajesh Sharma', hours: '24x7 Open' },
      { name: 'Connaught Place Central Depot', code: 'BR-DEL-02', address: 'Block C, Inner Circle, Connaught Place', city: 'New Delhi', phone: '+91 11 2341 0202', email: 'delhi.cp@rentdrive.in', manager: 'Amit Verma', hours: '07:00 AM - 11:00 PM' },
      { name: 'BKC Business Fleet Hub', code: 'BR-BOM-01', address: 'G Block, Bandra Kurla Complex', city: 'Mumbai', phone: '+91 22 2650 0303', email: 'mumbai.bkc@rentdrive.in', manager: 'Priya Patel', hours: '06:00 AM - 12:00 AM' },
      { name: 'Koramangala Tech Depot', code: 'BR-BLR-01', address: '80ft Road, 4th Block, Koramangala', city: 'Bengaluru', phone: '+91 80 2553 0404', email: 'bangalore@rentdrive.in', manager: 'Sunil Kumar', hours: '07:00 AM - 11:00 PM' }
    ];

    for (const b of branches) {
      run(
        `INSERT INTO branches (name, code, address, city, phone, email, manager_name, operating_hours, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [b.name, b.code, b.address, b.city, b.phone, b.email, b.manager, b.hours]
      );
    }

    const brDEL1 = get('SELECT id FROM branches WHERE code = ?', ['BR-DEL-01']).id;
    const brDEL2 = get('SELECT id FROM branches WHERE code = ?', ['BR-DEL-02']).id;
    const brBOM1 = get('SELECT id FROM branches WHERE code = ?', ['BR-BOM-01']).id;
    const brBLR1 = get('SELECT id FROM branches WHERE code = ?', ['BR-BLR-01']).id;

    // =========================================================================
    // 3. Locations (Mapped to Branches)
    // =========================================================================
    const locations = [
      { name: 'IGI Airport T3 Arrivals Depot', code: 'LOC-DEL01', address: 'Aerocity Hub Pillar 8', city: 'New Delhi', phone: '+91 11 2565 0101', email: 'delhi.t3@rentdrive.in', branch_id: brDEL1 },
      { name: 'Connaught Place Central Hub', code: 'LOC-DEL02', address: 'Inner Circle, Rajiv Chowk', city: 'New Delhi', phone: '+91 11 2341 0202', email: 'delhi.cp@rentdrive.in', branch_id: brDEL2 },
      { name: 'BKC Financial Center Depot', code: 'LOC-BOM01', address: 'G Block BKC Opposite MCA', city: 'Mumbai', phone: '+91 22 2650 0303', email: 'mumbai.bkc@rentdrive.in', branch_id: brBOM1 },
      { name: 'Koramangala 4th Block Hub', code: 'LOC-BLR01', address: 'Near Sony World Signal, Koramangala', city: 'Bengaluru', phone: '+91 80 2553 0404', email: 'bangalore@rentdrive.in', branch_id: brBLR1 }
    ];

    for (const loc of locations) {
      run(
        `INSERT INTO locations (name, code, address, city, phone, email, branch_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [loc.name, loc.code, loc.address, loc.city, loc.phone, loc.email, loc.branch_id]
      );
    }

    const locDEL1 = get('SELECT id FROM locations WHERE code = ?', ['LOC-DEL01']).id;
    const locDEL2 = get('SELECT id FROM locations WHERE code = ?', ['LOC-DEL02']).id;
    const locBOM1 = get('SELECT id FROM locations WHERE code = ?', ['LOC-BOM01']).id;
    const locBLR1 = get('SELECT id FROM locations WHERE code = ?', ['LOC-BLR01']).id;

    // =========================================================================
    // 4. Users (Admin, Staff, 12 Customers)
    // =========================================================================
    const users = [
      // Admin
      { role_id: adminRoleId, email: 'admin@rentdrive.com', username: 'admin', password: adminPasswordHash, full_name: 'Rajesh Sharma', phone: '+91 98100 12345' },
      // Staff Members
      { role_id: staffRoleId, email: 'staff@rentdrive.com', username: 'staff', password: staffPasswordHash, full_name: 'Amit Verma', phone: '+91 98200 23456' },
      { role_id: staffRoleId, email: 'priya.ops@rentdrive.com', username: 'priya', password: staffPasswordHash, full_name: 'Priya Patel', phone: '+91 98300 34567' },
      { role_id: staffRoleId, email: 'sunil.ops@rentdrive.com', username: 'sunil', password: staffPasswordHash, full_name: 'Sunil Kumar', phone: '+91 98400 45678' },
      // 12 Realistic Customers
      { role_id: customerRoleId, email: 'customer@rentdrive.com', username: 'customer', password: customerPasswordHash, full_name: 'Arjun Kapoor', phone: '+91 98111 55001' },
      { role_id: customerRoleId, email: 'sneha.deshmukh@example.com', username: 'sneha', password: customerPasswordHash, full_name: 'Sneha Deshmukh', phone: '+91 98222 55002' },
      { role_id: customerRoleId, email: 'vikram.rao@example.com', username: 'vikram', password: customerPasswordHash, full_name: 'Vikramaditya Rao', phone: '+91 98333 55003' },
      { role_id: customerRoleId, email: 'ananya.iyer@example.com', username: 'ananya', password: customerPasswordHash, full_name: 'Ananya Iyer', phone: '+91 98444 55004' },
      { role_id: customerRoleId, email: 'rahul.mehra@example.com', username: 'rahul', password: customerPasswordHash, full_name: 'Rahul Mehra', phone: '+91 98555 55005' },
      { role_id: customerRoleId, email: 'pooja.hegde@example.com', username: 'pooja', password: customerPasswordHash, full_name: 'Pooja Hegde', phone: '+91 98666 55006' },
      { role_id: customerRoleId, email: 'rohan.joshi@example.com', username: 'rohan', password: customerPasswordHash, full_name: 'Rohan Joshi', phone: '+91 98777 55007' },
      { role_id: customerRoleId, email: 'neha.sharma@example.com', username: 'neha', password: customerPasswordHash, full_name: 'Neha Sharma', phone: '+91 98888 55008' },
      { role_id: customerRoleId, email: 'karthik.reddy@example.com', username: 'karthik', password: customerPasswordHash, full_name: 'Karthik Reddy', phone: '+91 98999 55009' },
      { role_id: customerRoleId, email: 'divya.nair@example.com', username: 'divya', password: customerPasswordHash, full_name: 'Divya Nair', phone: '+91 98101 55010' },
      { role_id: customerRoleId, email: 'kabir.malhotra@example.com', username: 'kabir', password: customerPasswordHash, full_name: 'Kabir Malhotra', phone: '+91 98102 55011' },
      { role_id: customerRoleId, email: 'meera.nambiar@example.com', username: 'meera', password: customerPasswordHash, full_name: 'Meera Nambiar', phone: '+91 98103 55012' }
    ];

    for (const u of users) {
      run(
        `INSERT INTO users (role_id, email, username, password_hash, full_name, phone, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [u.role_id, u.email, u.username, u.password, u.full_name, u.phone]
      );
    }

    const adminUser = get('SELECT id FROM users WHERE email = ?', ['admin@rentdrive.com']);
    const staffUser1 = get('SELECT id FROM users WHERE email = ?', ['staff@rentdrive.com']);
    const staffUser2 = get('SELECT id FROM users WHERE email = ?', ['priya.ops@rentdrive.com']);
    const staffUser3 = get('SELECT id FROM users WHERE email = ?', ['sunil.ops@rentdrive.com']);

    // =========================================================================
    // 5. Staff Profiles
    // =========================================================================
    const staffMembers = [
      { user_id: staffUser1.id, branch_id: brDEL2, code: 'EMP-DEL-101', dept: 'OPERATIONS', desig: 'Senior Fleet Supervisor', hire: '2022-04-10' },
      { user_id: staffUser2.id, branch_id: brBOM1, code: 'EMP-BOM-102', dept: 'CUSTOMER_SERVICE', desig: 'Hub Operations Lead', hire: '2022-08-15' },
      { user_id: staffUser3.id, branch_id: brBLR1, code: 'EMP-BLR-103', dept: 'LOGISTICS', desig: 'Fleet Dispatcher', hire: '2023-01-20' }
    ];

    for (const s of staffMembers) {
      run(
        `INSERT INTO staff (user_id, branch_id, employee_code, department, designation, hire_date, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [s.user_id, s.branch_id, s.code, s.dept, s.desig, s.hire]
      );
    }

    const staff1 = get('SELECT id FROM staff WHERE employee_code = ?', ['EMP-DEL-101']).id;
    const staff2 = get('SELECT id FROM staff WHERE employee_code = ?', ['EMP-BOM-102']).id;
    const staff3 = get('SELECT id FROM staff WHERE employee_code = ?', ['EMP-BLR-103']).id;

    // =========================================================================
    // 6. Customers Table (12 Profiles with Aadhaar / PAN / Indian DL)
    // =========================================================================
    const customerUsers = all('SELECT id, full_name, email FROM users WHERE role_id = ? ORDER BY id ASC', [customerRoleId]);
    const customerKyc = [
      { dl: 'DL-0420180012345', exp: '2029-06-30', addr: 'Flat 402, Shivalik Apts, Barakhamba Road', city: 'New Delhi', state: 'Delhi', pin: '110001', type: 'AADHAAR', no: '9812-4521-3341', kyc: 'VERIFIED', notes: 'Preferred corporate renter' },
      { dl: 'MH-0220190045678', exp: '2028-09-15', addr: 'Bandra West, Hill Road, Near Mehboob Studio', city: 'Mumbai', state: 'Maharashtra', pin: '400050', type: 'AADHAAR', no: '8876-1234-9901', kyc: 'VERIFIED', notes: 'Frequent weekend traveler' },
      { dl: 'KA-0120200078901', exp: '2030-02-28', addr: 'Indiranagar 100ft Road, Stage 2', city: 'Bengaluru', state: 'Karnataka', pin: '560038', type: 'PAN', no: 'ABCDE1234F', kyc: 'VERIFIED', notes: 'Regular executive SUV driver' },
      { dl: 'TN-0920210088992', exp: '2027-11-10', addr: 'Anna Nagar East, 2nd Avenue', city: 'Chennai', state: 'Tamil Nadu', pin: '600102', type: 'AADHAAR', no: '7765-4321-8890', kyc: 'VERIFIED', notes: 'Family road trips' },
      { dl: 'DL-1020210099881', exp: '2031-01-14', addr: 'Sector 54, Golf Course Road', city: 'Gurugram', state: 'Haryana', pin: '122002', type: 'AADHAAR', no: '6543-9876-1122', kyc: 'VERIFIED', notes: 'Prefers electric and automatic sedans' },
      { dl: 'MH-0320220077665', exp: '2029-04-20', addr: 'Koregaon Park, Lane 7', city: 'Pune', state: 'Maharashtra', pin: '411001', type: 'PAN', no: 'PQRSX5678K', kyc: 'VERIFIED', notes: 'Weekend getaways to Lonavala' },
      { dl: 'KA-0520210033221', exp: '2032-08-11', addr: 'Whitefield Main Road, ITPL area', city: 'Bengaluru', state: 'Karnataka', pin: '560066', type: 'AADHAAR', no: '4321-8765-4433', kyc: 'VERIFIED', notes: 'Tech executive self-drive' },
      { dl: 'DL-0120190022114', exp: '2028-12-05', addr: 'Model Town III, Ring Road', city: 'New Delhi', state: 'Delhi', pin: '110009', type: 'DRIVERS_LICENSE', no: 'DL-0120190022114', kyc: 'VERIFIED', notes: 'Prefers compact hatchbacks' },
      { dl: 'TS-0720200055443', exp: '2030-07-19', addr: 'Jubilee Hills, Road No. 36', city: 'Hyderabad', state: 'Telangana', pin: '500033', type: 'PAN', no: 'KLMNP9012Z', kyc: 'VERIFIED', notes: 'Corporate business trips' },
      { dl: 'KL-0720180066778', exp: '2029-10-30', addr: 'Panampilly Nagar, Main Avenue', city: 'Kochi', state: 'Kerala', pin: '682036', type: 'AADHAAR', no: '3210-9876-5544', kyc: 'VERIFIED', notes: 'Annual hill station tour' },
      { dl: 'HR-2620220011998', exp: '2032-03-25', addr: 'DLF Phase 5, Club Drive', city: 'Gurugram', state: 'Haryana', pin: '122009', type: 'AADHAAR', no: '2109-8765-6655', kyc: 'VERIFIED', notes: 'Luxury executive renter' },
      { dl: 'MH-1220200088112', exp: '2030-11-15', addr: 'Viman Nagar, Central Avenue', city: 'Pune', state: 'Maharashtra', pin: '411014', type: 'AADHAAR', no: '1098-7654-7766', kyc: 'VERIFIED', notes: 'Regular airport commuter' }
    ];

    for (let i = 0; i < customerUsers.length; i++) {
      const u = customerUsers[i];
      const k = customerKyc[i] || customerKyc[0];
      run(
        `INSERT INTO customers (user_id, driving_license_no, license_expiry, address, city, state, postal_code, id_card_type, id_card_no, kyc_status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, k.dl, k.exp, k.addr, k.city, k.state, k.pin, k.type, k.no, k.kyc, k.notes]
      );
    }

    const customers = all('SELECT id, user_id FROM customers ORDER BY id ASC');

    // =========================================================================
    // 7. Vehicle Categories
    // =========================================================================
    const categories = [
      { name: 'Economy Hatchback', code: 'CAT-HATCH', desc: 'Fuel efficient, agile city commuters like Swift & Tiago', daily_rate: 1800.0, hourly_rate: 150.0, deposit: 5000.0, icon: 'Zap' },
      { name: 'Premium Compact Sedan', code: 'CAT-SEDAN', desc: 'Comfortable family sedans with smooth highway cruise like City & Verna', daily_rate: 2800.0, hourly_rate: 220.0, deposit: 7000.0, icon: 'Car' },
      { name: 'Compact & Adventure SUV', code: 'CAT-SUV', desc: 'High ground clearance SUVs & 4x4 for trips like Thar, Creta & XUV700', daily_rate: 4500.0, hourly_rate: 350.0, deposit: 10000.0, icon: 'Compass' },
      { name: 'Luxury Executive', code: 'CAT-LUX', desc: 'Top tier chauffeur or self-drive luxury sedans & SUVs like BMW 3 Series & E-Class', daily_rate: 9500.0, hourly_rate: 800.0, deposit: 25000.0, icon: 'Crown' },
      { name: 'Electric & Green (EV)', code: 'CAT-EV', desc: 'Zero tailpipe emissions, fast charging, eco-friendly drive like Nexon EV', daily_rate: 3500.0, hourly_rate: 280.0, deposit: 8000.0, icon: 'BatteryCharging' },
      { name: 'Cruiser & Sports Motorcycles', code: 'CAT-BIKE', desc: 'Powerful cruiser and sport bikes like Royal Enfield Classic 350, Yamaha R15 & Duke 390', daily_rate: 1100.0, hourly_rate: 90.0, deposit: 3000.0, icon: 'Bike' },
      { name: 'City Commuter Scooters', code: 'CAT-SCOOTER', desc: 'Agile automatic city scooters like Honda Activa 6G, Jupiter & Access 125', daily_rate: 500.0, hourly_rate: 45.0, deposit: 1500.0, icon: 'Zap' },
      { name: 'Electric Smart Scooters (EV)', code: 'CAT-EV-SCOOTER', desc: 'Connected silent electric scooters with touch screen like Ather 450X & Ola S1 Pro', daily_rate: 650.0, hourly_rate: 55.0, deposit: 2000.0, icon: 'BatteryCharging' }
    ];

    for (const cat of categories) {
      run(
        `INSERT INTO vehicle_categories (name, code, description, daily_rate, hourly_rate, deposit_amount, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cat.name, cat.code, cat.desc, cat.daily_rate, cat.hourly_rate, cat.deposit, cat.icon]
      );
    }

    const catHatch = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-HATCH']).id;
    const catSedan = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-SEDAN']).id;
    const catSUV = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-SUV']).id;
    const catLux = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-LUX']).id;
    const catEV = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-EV']).id;
    const catBike = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-BIKE']).id;
    const catScooter = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-SCOOTER']).id;
    const catEVScooter = get('SELECT id FROM vehicle_categories WHERE code = ?', ['CAT-EV-SCOOTER']).id;

    // =========================================================================
    // 8. Rate Cards (Stored in DB, Multi-Tier Pricing)
    // =========================================================================
    const rateCards = [
      { cat_id: catHatch, br_id: null, code: 'RC-HATCH-STD', name: 'Standard Hatchback Rate Card', hourly: 150.0, daily: 1800.0, weekly: 11000.0, monthly: 42000.0, weekend: 1.15, extra_km: 12.0, extra_hr: 200.0, late_hr: 300.0, canc_fixed: 400.0, canc_pct: 10.0, deposit: 5000.0 },
      { cat_id: catSedan, br_id: null, code: 'RC-SEDAN-STD', name: 'Executive Sedan Rate Card', hourly: 220.0, daily: 2800.0, weekly: 17500.0, monthly: 65000.0, weekend: 1.20, extra_km: 15.0, extra_hr: 250.0, late_hr: 350.0, canc_fixed: 500.0, canc_pct: 10.0, deposit: 7000.0 },
      { cat_id: catSUV, br_id: null, code: 'RC-SUV-STD', name: 'Adventure & Family SUV Rate Card', hourly: 350.0, daily: 4500.0, weekly: 28000.0, monthly: 98000.0, weekend: 1.25, extra_km: 18.0, extra_hr: 350.0, late_hr: 450.0, canc_fixed: 750.0, canc_pct: 15.0, deposit: 10000.0 },
      { cat_id: catLux, br_id: null, code: 'RC-LUX-STD', name: 'Luxury Prestige Rate Card', hourly: 800.0, daily: 9500.0, weekly: 60000.0, monthly: 220000.0, weekend: 1.30, extra_km: 25.0, extra_hr: 750.0, late_hr: 1000.0, canc_fixed: 2000.0, canc_pct: 20.0, deposit: 25000.0 },
      { cat_id: catEV, br_id: null, code: 'RC-EV-STD', name: 'Green EV Mobility Rate Card', hourly: 280.0, daily: 3500.0, weekly: 22000.0, monthly: 78000.0, weekend: 1.15, extra_km: 14.0, extra_hr: 300.0, late_hr: 400.0, canc_fixed: 500.0, canc_pct: 10.0, deposit: 8000.0 },
      { cat_id: catBike, br_id: null, code: 'RC-BIKE-STD', name: 'Motorcycles & Cruiser Rate Card', hourly: 90.0, daily: 1100.0, weekly: 6800.0, monthly: 24000.0, weekend: 1.15, extra_km: 6.0, extra_hr: 120.0, late_hr: 180.0, canc_fixed: 200.0, canc_pct: 10.0, deposit: 3000.0 },
      { cat_id: catScooter, br_id: null, code: 'RC-SCOOTER-STD', name: 'City Commuter Scooters Rate Card', hourly: 45.0, daily: 500.0, weekly: 3000.0, monthly: 11000.0, weekend: 1.10, extra_km: 4.0, extra_hr: 60.0, late_hr: 100.0, canc_fixed: 100.0, canc_pct: 10.0, deposit: 1500.0 },
      { cat_id: catEVScooter, br_id: null, code: 'RC-EV-SCOOTER-STD', name: 'Smart Electric Scooters Rate Card', hourly: 55.0, daily: 650.0, weekly: 4000.0, monthly: 14000.0, weekend: 1.10, extra_km: 5.0, extra_hr: 80.0, late_hr: 120.0, canc_fixed: 150.0, canc_pct: 10.0, deposit: 2000.0 }
    ];

    for (const rc of rateCards) {
      run(
        `INSERT INTO rate_cards (category_id, branch_id, code, name, hourly_rate, daily_rate, weekly_rate, monthly_rate, weekend_multiplier, extra_km_rate, extra_hour_rate, late_return_hourly_rate, cancellation_fee_fixed, cancellation_fee_percent, security_deposit, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [rc.cat_id, rc.br_id, rc.code, rc.name, rc.hourly, rc.daily, rc.weekly, rc.monthly, rc.weekend, rc.extra_km, rc.extra_hr, rc.late_hr, rc.canc_fixed, rc.canc_pct, rc.deposit]
      );
    }

    // =========================================================================
    // 9. Vehicles (15+ Indian Fleet with Full Specifications, Compliance & Images)
    // =========================================================================
    const vehiclesData = [
      {
        cat: catHatch, loc: locDEL1, br: brDEL1, reg: 'DL-01-AZ-1102', vin: 'MA3FNEB1S00112233', eng: 'K12M1928374',
        make: 'Maruti Suzuki', model: 'Swift ZXi', variant: 'DualJet AMT', year: 2023, color: 'Pearl Arctic White',
        fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, mileage: 18450, daily: 1800.0, hourly: 150.0,
        extra_km: 12.0, extra_hr: 200.0, purchase: 850000.0, cur_val: 720000.0, last_srv: 15000, next_srv: 25000,
        status: 'AVAILABLE', ins_no: 'ICICI-LOMB-778811', ins_exp: '2027-04-15', puc: 'PUC-DL-2026-991', puc_exp: '2027-02-10',
        fit_exp: '2038-04-14', permit: 'AITP-DEL-2023-441', permit_exp: '2028-04-14', img: '/cars/swift.svg'
      },
      {
        cat: catHatch, loc: locDEL2, br: brDEL2, reg: 'DL-04-BX-4421', vin: 'MAT625514P0088771', eng: 'REVOTRON1199',
        make: 'Tata', model: 'Tiago XZ+', variant: 'Revotron Dual-Tone', year: 2022, color: 'Daytona Grey',
        fuel: 'PETROL', trans: 'MANUAL', seats: 5, mileage: 26800, daily: 1600.0, hourly: 140.0,
        extra_km: 12.0, extra_hr: 180.0, purchase: 740000.0, cur_val: 590000.0, last_srv: 25000, next_srv: 35000,
        status: 'AVAILABLE', ins_no: 'HDFC-ERGO-441122', ins_exp: '2027-06-20', puc: 'PUC-DL-2026-332', puc_exp: '2027-03-15',
        fit_exp: '2037-06-19', permit: 'AITP-DEL-2022-882', permit_exp: '2027-06-19', img: '/cars/tiago.svg'
      },
      {
        cat: catSedan, loc: locDEL1, br: brDEL1, reg: 'DL-02-CE-8890', vin: 'MAKGR5839M0044556', eng: 'L15B2938471',
        make: 'Honda', model: 'City ZX', variant: 'i-VTEC CVT Sunroof', year: 2023, color: 'Platinum White Pearl',
        fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, mileage: 15300, daily: 2900.0, hourly: 230.0,
        extra_km: 15.0, extra_hr: 250.0, purchase: 1550000.0, cur_val: 1350000.0, last_srv: 10000, next_srv: 20000,
        status: 'RENTED', ins_no: 'BAJAJ-ALL-889900', ins_exp: '2027-05-18', puc: 'PUC-DL-2026-551', puc_exp: '2027-04-12',
        fit_exp: '2038-05-17', permit: 'AITP-DEL-2023-771', permit_exp: '2028-05-17', img: '/cars/city.svg'
      },
      {
        cat: catSedan, loc: locBOM1, br: brBOM1, reg: 'MH-01-EE-3344', vin: 'MALH351CMN0022331', eng: 'G4FL8877221',
        make: 'Hyundai', model: 'Verna SX(O)', variant: '1.5 Turbo DCT', year: 2023, color: 'Abyss Black Pearl',
        fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, mileage: 12400, daily: 2800.0, hourly: 220.0,
        extra_km: 15.0, extra_hr: 250.0, purchase: 1680000.0, cur_val: 1480000.0, last_srv: 10000, next_srv: 20000,
        status: 'AVAILABLE', ins_no: 'TATA-AIG-112233', ins_exp: '2027-08-10', puc: 'PUC-MH-2026-118', puc_exp: '2027-05-08',
        fit_exp: '2038-08-09', permit: 'AITP-MH-2023-339', permit_exp: '2028-08-09', img: '/cars/verna.svg'
      },
      {
        cat: catSUV, loc: locDEL2, br: brDEL2, reg: 'DL-03-TC-5522', vin: 'MA1TA2SKHN0099882', eng: 'D22D4R99182',
        make: 'Mahindra', model: 'Thar LX 4x4', variant: 'Hard Top Diesel AT', year: 2023, color: 'Rocky Beige',
        fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 4, mileage: 22100, daily: 4800.0, hourly: 380.0,
        extra_km: 18.0, extra_hr: 350.0, purchase: 1820000.0, cur_val: 1600000.0, last_srv: 20000, next_srv: 30000,
        status: 'RENTED', ins_no: 'CHOLA-MS-998877', ins_exp: '2027-03-30', puc: 'PUC-DL-2026-774', puc_exp: '2027-01-20',
        fit_exp: '2038-03-29', permit: 'AITP-DEL-2023-112', permit_exp: '2028-03-29', img: '/cars/thar.svg'
      },
      {
        cat: catSUV, loc: locBOM1, br: brBOM1, reg: 'MH-02-FF-7711', vin: 'MALC351DMN0066554', eng: 'U2CRDI1493',
        make: 'Hyundai', model: 'Creta SX(O)', variant: '1.5 CRDi Panoramic Sunroof', year: 2023, color: 'Ranger Khaki',
        fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 5, mileage: 19800, daily: 4200.0, hourly: 330.0,
        extra_km: 16.0, extra_hr: 320.0, purchase: 1950000.0, cur_val: 1720000.0, last_srv: 15000, next_srv: 25000,
        status: 'AVAILABLE', ins_no: 'SBI-GEN-554433', ins_exp: '2027-07-14', puc: 'PUC-MH-2026-442', puc_exp: '2027-04-18',
        fit_exp: '2038-07-13', permit: 'AITP-MH-2023-991', permit_exp: '2028-07-13', img: '/cars/creta.svg'
      },
      {
        cat: catSUV, loc: locBLR1, br: brBLR1, reg: 'KA-05-MK-9988', vin: 'MA1TA2TKHN0044119', eng: 'MH22D4R5561',
        make: 'Mahindra', model: 'XUV700 AX7L', variant: 'AWD Luxury Pack ADAS', year: 2023, color: 'Midnight Black',
        fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, mileage: 16700, daily: 5500.0, hourly: 420.0,
        extra_km: 20.0, extra_hr: 400.0, purchase: 2650000.0, cur_val: 2350000.0, last_srv: 15000, next_srv: 25000,
        status: 'AVAILABLE', ins_no: 'RELIANCE-GI-223344', ins_exp: '2027-09-05', puc: 'PUC-KA-2026-665', puc_exp: '2027-06-15',
        fit_exp: '2038-09-04', permit: 'AITP-KA-2023-552', permit_exp: '2028-09-04', img: '/cars/xuv700.svg'
      },
      {
        cat: catSUV, loc: locDEL1, br: brDEL1, reg: 'DL-01-CR-6633', vin: 'MBJ11BE41P0011228', eng: '2GDFTV2755',
        make: 'Toyota', model: 'Innova Crysta', variant: '2.4 ZX 7-Seater Captain Seats', year: 2023, color: 'Super White',
        fuel: 'DIESEL', trans: 'MANUAL', seats: 7, mileage: 31200, daily: 4900.0, hourly: 380.0,
        extra_km: 18.0, extra_hr: 350.0, purchase: 2580000.0, cur_val: 2280000.0, last_srv: 30000, next_srv: 40000,
        status: 'AVAILABLE', ins_no: 'UNITED-IND-881199', ins_exp: '2027-02-28', puc: 'PUC-DL-2026-887', puc_exp: '2027-01-30',
        fit_exp: '2038-02-27', permit: 'AITP-DEL-2023-338', permit_exp: '2028-02-27', img: '/cars/innova.svg'
      },
      {
        cat: catSUV, loc: locBLR1, br: brBLR1, reg: 'KA-01-JJ-4400', vin: 'MBJ11BK41P0033449', eng: '1GDFTV2788',
        make: 'Toyota', model: 'Fortuner Legender', variant: '4x4 AT Dual-Tone 500Nm', year: 2023, color: 'Platinum White / Black',
        fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, mileage: 24500, daily: 7500.0, hourly: 600.0,
        extra_km: 22.0, extra_hr: 500.0, purchase: 4650000.0, cur_val: 4150000.0, last_srv: 20000, next_srv: 30000,
        status: 'RESERVED', ins_no: 'IFFCO-TOKIO-772211', ins_exp: '2027-11-20', puc: 'PUC-KA-2026-992', puc_exp: '2027-08-14',
        fit_exp: '2038-11-19', permit: 'AITP-KA-2023-881', permit_exp: '2028-11-19', img: '/cars/fortuner.svg'
      },
      {
        cat: catSUV, loc: locDEL2, br: brDEL2, reg: 'HR-26-EE-9901', vin: 'MA3EZB11S0077889', eng: 'K15C1988223',
        make: 'Maruti Suzuki', model: 'Grand Vitara Alpha', variant: 'AllGrip AWD Hybrid', year: 2023, color: 'Grandeur Grey',
        fuel: 'HYBRID', trans: 'AUTOMATIC', seats: 5, mileage: 14200, daily: 3800.0, hourly: 300.0,
        extra_km: 15.0, extra_hr: 300.0, purchase: 1980000.0, cur_val: 1750000.0, last_srv: 10000, next_srv: 20000,
        status: 'AVAILABLE', ins_no: 'NEW-INDIA-991122', ins_exp: '2027-10-15', puc: 'PUC-HR-2026-221', puc_exp: '2027-07-10',
        fit_exp: '2038-10-14', permit: 'AITP-HR-2023-441', permit_exp: '2028-10-14', img: '/cars/grandvitara.svg'
      },
      {
        cat: catLux, loc: locDEL1, br: brDEL1, reg: 'DL-01-LX-0003', vin: 'WBA5R11030F009988', eng: 'B48B20O1199',
        make: 'BMW', model: '3 Series Gran Limousine', variant: '330Li M Sport LWB', year: 2023, color: 'Portimao Blue Metallic',
        fuel: 'PETROL', trans: 'AUTOMATIC', seats: 5, mileage: 11200, daily: 9500.0, hourly: 800.0,
        extra_km: 25.0, extra_hr: 750.0, purchase: 6200000.0, cur_val: 5400000.0, last_srv: 10000, next_srv: 20000,
        status: 'RENTED', ins_no: 'HDFC-ERGO-LUX-99', ins_exp: '2027-09-30', puc: 'PUC-DL-2026-114', puc_exp: '2027-06-25',
        fit_exp: '2038-09-29', permit: 'AITP-DEL-2023-009', permit_exp: '2028-09-29', img: '/cars/bmw3.svg'
      },
      {
        cat: catLux, loc: locBOM1, br: brBOM1, reg: 'MH-01-EE-7700', vin: 'WDD2130041A998877', eng: 'OM65492088',
        make: 'Mercedes-Benz', model: 'E-Class Exclusive', variant: 'E 220d LWB Burmester', year: 2023, color: 'Obsidian Black',
        fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 5, mileage: 14800, daily: 11000.0, hourly: 950.0,
        extra_km: 30.0, extra_hr: 900.0, purchase: 7600000.0, cur_val: 6800000.0, last_srv: 15000, next_srv: 25000,
        status: 'AVAILABLE', ins_no: 'BAJAJ-LUX-332211', ins_exp: '2027-12-10', puc: 'PUC-MH-2026-881', puc_exp: '2027-09-12',
        fit_exp: '2038-12-09', permit: 'AITP-MH-2023-772', permit_exp: '2028-12-09', img: '/cars/eclass.svg'
      },
      {
        cat: catEV, loc: locDEL1, br: brDEL1, reg: 'DL-01-EV-2024', vin: 'MAT625514EV001122', eng: 'PMSM105KW',
        make: 'Tata', model: 'Nexon EV Empowered+', variant: 'Long Range 40.5 kWh 465km', year: 2023, color: 'Empowered Oxide',
        fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 5, mileage: 9400, daily: 3500.0, hourly: 280.0,
        extra_km: 14.0, extra_hr: 300.0, purchase: 1950000.0, cur_val: 1750000.0, last_srv: 7500, next_srv: 15000,
        status: 'AVAILABLE', ins_no: 'ICICI-EV-449911', ins_exp: '2027-07-22', puc: 'PUC-EXEMPT-EV', puc_exp: '2030-01-01',
        fit_exp: '2038-07-21', permit: 'AITP-DEL-2023-559', permit_exp: '2028-07-21', img: '/cars/nexon.svg'
      },
      {
        cat: catSUV, loc: locDEL2, br: brDEL2, reg: 'DL-02-MS-7711', vin: 'MA1TA2SKHN0088114', eng: 'D22D4R1199',
        make: 'Mahindra', model: 'Scorpio-N Z8L', variant: '4xplor Diesel 4WD 7-Seater', year: 2023, color: 'Deep Forest',
        fuel: 'DIESEL', trans: 'AUTOMATIC', seats: 7, mileage: 28900, daily: 4600.0, hourly: 360.0,
        extra_km: 18.0, extra_hr: 350.0, purchase: 2450000.0, cur_val: 2150000.0, last_srv: 20000, next_srv: 30000,
        status: 'MAINTENANCE', ins_no: 'HDFC-ERGO-339911', ins_exp: '2027-01-15', puc: 'PUC-DL-2026-441', puc_exp: '2026-11-20',
        fit_exp: '2038-01-14', permit: 'AITP-DEL-2023-993', permit_exp: '2028-01-14', img: '/cars/xuv700.svg'
      },
      {
        cat: catSedan, loc: locBLR1, br: brBLR1, reg: 'KA-03-NV-5544', vin: 'MAKGR5839M0099112', eng: 'L15B2911002',
        make: 'Honda', model: 'City V', variant: 'i-VTEC Manual', year: 2022, color: 'Meteoroid Grey Metallic',
        fuel: 'PETROL', trans: 'MANUAL', seats: 5, mileage: 34100, daily: 2600.0, hourly: 210.0,
        extra_km: 15.0, extra_hr: 240.0, purchase: 1350000.0, cur_val: 1050000.0, last_srv: 30000, next_srv: 40000,
        status: 'AVAILABLE', ins_no: 'SBI-GEN-771199', ins_exp: '2027-04-10', puc: 'PUC-KA-2026-339', puc_exp: '2027-02-14',
        fit_exp: '2037-04-09', permit: 'AITP-KA-2022-774', permit_exp: '2027-04-09', img: '/cars/city.svg'
      },
      // --- Motorcycles / Cruiser / Sports Bikes ---
      {
        cat: catBike, loc: locDEL1, br: brDEL1, reg: 'DL-01-BK-3501', vin: 'ME3J3C5H8N001201', eng: 'J1-349CC-7711',
        make: 'Royal Enfield', model: 'Classic 350 Reborn', variant: 'Halcyon Black Dual-Channel ABS', year: 2023, color: 'Halcyon Black',
        fuel: 'PETROL', trans: 'MANUAL', seats: 2, mileage: 8200, daily: 1100.0, hourly: 90.0,
        extra_km: 6.0, extra_hr: 120.0, purchase: 220000.0, cur_val: 195000.0, last_srv: 5000, next_srv: 10000,
        status: 'AVAILABLE', ins_no: 'ICICI-LOMB-BK-001', ins_exp: '2027-08-15', puc: 'PUC-DL-2026-BK1', puc_exp: '2027-05-10',
        fit_exp: '2038-08-14', permit: 'AITP-DEL-2023-BK1', permit_exp: '2028-08-14', img: '/cars/classic350.svg'
      },
      {
        cat: catBike, loc: locBLR1, br: brBLR1, reg: 'KA-01-SP-1550', vin: 'ME1RG6518N004455', eng: 'G3J4E009988',
        make: 'Yamaha', model: 'YZF R15 V4', variant: 'Racing Blue Quickshifter ABS', year: 2023, color: 'Racing Blue',
        fuel: 'PETROL', trans: 'MANUAL', seats: 2, mileage: 6400, daily: 1300.0, hourly: 110.0,
        extra_km: 7.0, extra_hr: 140.0, purchase: 185000.0, cur_val: 165000.0, last_srv: 5000, next_srv: 10000,
        status: 'AVAILABLE', ins_no: 'HDFC-ERGO-BK-002', ins_exp: '2027-06-20', puc: 'PUC-KA-2026-BK2', puc_exp: '2027-04-18',
        fit_exp: '2038-06-19', permit: 'AITP-KA-2023-BK2', permit_exp: '2028-06-19', img: '/cars/r15.svg'
      },
      {
        cat: catBike, loc: locBOM1, br: brBOM1, reg: 'MH-02-DK-3900', vin: 'MD9JC6161P007788', eng: '9380100441',
        make: 'KTM', model: '390 Duke', variant: 'Electronic Orange Cornering ABS', year: 2023, color: 'Electronic Orange',
        fuel: 'PETROL', trans: 'MANUAL', seats: 2, mileage: 11200, daily: 1600.0, hourly: 130.0,
        extra_km: 8.0, extra_hr: 160.0, purchase: 310000.0, cur_val: 270000.0, last_srv: 10000, next_srv: 15000,
        status: 'RENTED', ins_no: 'BAJAJ-ALL-BK-003', ins_exp: '2027-05-12', puc: 'PUC-MH-2026-BK3', puc_exp: '2027-03-15',
        fit_exp: '2038-05-11', permit: 'AITP-MH-2023-BK3', permit_exp: '2028-05-11', img: '/cars/duke390.svg'
      },
      {
        cat: catBike, loc: locDEL2, br: brDEL2, reg: 'DL-02-CB-3500', vin: 'ME4NC5920N008899', eng: 'NC59E007711',
        make: 'Honda', model: 'Hness CB350', variant: 'DLX Pro Dual Tone Bluetooth', year: 2023, color: 'Precious Red Metallic',
        fuel: 'PETROL', trans: 'MANUAL', seats: 2, mileage: 7500, daily: 1150.0, hourly: 95.0,
        extra_km: 6.5, extra_hr: 125.0, purchase: 215000.0, cur_val: 190000.0, last_srv: 5000, next_srv: 10000,
        status: 'AVAILABLE', ins_no: 'SBI-GEN-BK-004', ins_exp: '2027-09-01', puc: 'PUC-DL-2026-BK4', puc_exp: '2027-07-01',
        fit_exp: '2038-08-31', permit: 'AITP-DEL-2023-BK4', permit_exp: '2028-08-31', img: '/cars/classic350.svg'
      },
      // --- Commuter Scooters ---
      {
        cat: catScooter, loc: locDEL1, br: brDEL1, reg: 'DL-01-SC-6001', vin: 'ME4JF9130N001144', eng: 'JF91E004455',
        make: 'Honda', model: 'Activa 6G', variant: 'Deluxe H-Smart Keyless', year: 2023, color: 'Decent Blue Metallic',
        fuel: 'PETROL', trans: 'AUTOMATIC', seats: 2, mileage: 9800, daily: 500.0, hourly: 45.0,
        extra_km: 4.0, extra_hr: 60.0, purchase: 82000.0, cur_val: 72000.0, last_srv: 8000, next_srv: 12000,
        status: 'AVAILABLE', ins_no: 'NEW-IND-SC-001', ins_exp: '2027-07-10', puc: 'PUC-DL-2026-SC1', puc_exp: '2027-05-15',
        fit_exp: '2038-07-09', permit: 'AITP-DEL-2023-SC1', permit_exp: '2028-07-09', img: '/cars/activa.svg'
      },
      {
        cat: catScooter, loc: locBLR1, br: brBLR1, reg: 'KA-03-SC-1250', vin: 'MD626AK90N005522', eng: 'AK9E003311',
        make: 'TVS', model: 'Jupiter 125', variant: 'Disc SmartXonnect Bluetooth', year: 2023, color: 'Titanium Grey',
        fuel: 'PETROL', trans: 'AUTOMATIC', seats: 2, mileage: 12400, daily: 550.0, hourly: 50.0,
        extra_km: 4.0, extra_hr: 65.0, purchase: 94000.0, cur_val: 81000.0, last_srv: 10000, next_srv: 15000,
        status: 'AVAILABLE', ins_no: 'ICICI-LOMB-SC-002', ins_exp: '2027-04-18', puc: 'PUC-KA-2026-SC2', puc_exp: '2027-02-20',
        fit_exp: '2038-04-17', permit: 'AITP-KA-2023-SC2', permit_exp: '2028-04-17', img: '/cars/activa.svg'
      },
      {
        cat: catScooter, loc: locBOM1, br: brBOM1, reg: 'MH-01-SC-1255', vin: 'MB8DK41AP006677', eng: 'DK41E008899',
        make: 'Suzuki', model: 'Access 125', variant: 'Ride Connect Edition LED', year: 2023, color: 'Metallic Matte Black',
        fuel: 'PETROL', trans: 'AUTOMATIC', seats: 2, mileage: 14100, daily: 520.0, hourly: 48.0,
        extra_km: 4.0, extra_hr: 60.0, purchase: 91000.0, cur_val: 78000.0, last_srv: 12000, next_srv: 16000,
        status: 'AVAILABLE', ins_no: 'HDFC-ERGO-SC-003', ins_exp: '2027-08-25', puc: 'PUC-MH-2026-SC3', puc_exp: '2027-06-30',
        fit_exp: '2038-08-24', permit: 'AITP-MH-2023-SC3', permit_exp: '2028-08-24', img: '/cars/activa.svg'
      },
      // --- Smart Electric Scooters (EV) ---
      {
        cat: catEVScooter, loc: locBLR1, br: brBLR1, reg: 'KA-05-EV-4500', vin: 'MAT450X3N0011223', eng: 'PMSM-6KW-ATH1',
        make: 'Ather Energy', model: 'Ather 450X Gen 3', variant: 'Pro Pack 3.7kWh 150km Range Warp Mode', year: 2023, color: 'Space Grey',
        fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 2, mileage: 7800, daily: 650.0, hourly: 55.0,
        extra_km: 5.0, extra_hr: 80.0, purchase: 155000.0, cur_val: 138000.0, last_srv: 5000, next_srv: 10000,
        status: 'AVAILABLE', ins_no: 'Acko-EV-SC-001', ins_exp: '2027-10-15', puc: 'PUC-EXEMPT-EV', puc_exp: '2030-01-01',
        fit_exp: '2038-10-14', permit: 'AITP-KA-2023-EV1', permit_exp: '2028-10-14', img: '/cars/ather.svg'
      },
      {
        cat: catEVScooter, loc: locDEL1, br: brDEL1, reg: 'DL-01-EV-0101', vin: 'MA4S1PRO2P004455', eng: 'HYPERDRIVE-11KW',
        make: 'Ola Electric', model: 'Ola S1 Pro Gen 2', variant: '4kWh MoveOS 4 Hyper Mode 195km', year: 2023, color: 'Jet Black',
        fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 2, mileage: 6900, daily: 700.0, hourly: 60.0,
        extra_km: 5.0, extra_hr: 85.0, purchase: 147000.0, cur_val: 132000.0, last_srv: 5000, next_srv: 10000,
        status: 'AVAILABLE', ins_no: 'Digit-EV-SC-002', ins_exp: '2027-11-20', puc: 'PUC-EXEMPT-EV', puc_exp: '2030-01-01',
        fit_exp: '2038-11-19', permit: 'AITP-DEL-2023-EV2', permit_exp: '2028-11-19', img: '/cars/ather.svg'
      },
      {
        cat: catEVScooter, loc: locBOM1, br: brBOM1, reg: 'MH-02-EV-7788', vin: 'MD626EV78N008899', eng: 'BLDC-4.4KW-IQ',
        make: 'TVS', model: 'iQube S', variant: 'SmartXonnect 3.4kWh 100km Range', year: 2023, color: 'Mint Blue',
        fuel: 'ELECTRIC', trans: 'AUTOMATIC', seats: 2, mileage: 9200, daily: 600.0, hourly: 50.0,
        extra_km: 4.5, extra_hr: 75.0, purchase: 130000.0, cur_val: 115000.0, last_srv: 7500, next_srv: 12500,
        status: 'AVAILABLE', ins_no: 'ICICI-LOMB-EV-003', ins_exp: '2027-09-05', puc: 'PUC-EXEMPT-EV', puc_exp: '2030-01-01',
        fit_exp: '2038-09-04', permit: 'AITP-MH-2023-EV3', permit_exp: '2028-09-04', img: '/cars/ather.svg'
      }
    ];

    for (const v of vehiclesData) {
      run(
        `INSERT INTO vehicles (
          category_id, location_id, branch_id, reg_number, vin, engine_number, make, model, variant, year, color,
          fuel_type, transmission, seating_capacity, mileage, daily_rate, hourly_rate, extra_km_rate, extra_hour_rate,
          purchase_price, current_value, last_service_km, next_service_km, status,
          insurance_policy_no, insurance_expiry, puc_number, puc_expiry, fitness_expiry, permit_number, permit_expiry, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          v.cat, v.loc, v.br, v.reg, v.vin, v.eng, v.make, v.model, v.variant, v.year, v.color,
          v.fuel, v.trans, v.seats, v.mileage, v.daily, v.hourly, v.extra_km, v.extra_hr,
          v.purchase, v.cur_val, v.last_srv, v.next_srv, v.status,
          v.ins_no, v.ins_exp, v.puc, v.puc_exp, v.fit_exp, v.permit, v.permit_exp, v.img
        ]
      );
    }

    const vSwift = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-01-AZ-1102']).id;
    const vTiago = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-04-BX-4421']).id;
    const vCity = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-02-CE-8890']).id;
    const vVerna = get('SELECT id FROM vehicles WHERE reg_number = ?', ['MH-01-EE-3344']).id;
    const vThar = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-03-TC-5522']).id;
    const vCreta = get('SELECT id FROM vehicles WHERE reg_number = ?', ['MH-02-FF-7711']).id;
    const vXUV = get('SELECT id FROM vehicles WHERE reg_number = ?', ['KA-05-MK-9988']).id;
    const vInnova = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-01-CR-6633']).id;
    const vFortuner = get('SELECT id FROM vehicles WHERE reg_number = ?', ['KA-01-JJ-4400']).id;
    const vGVitara = get('SELECT id FROM vehicles WHERE reg_number = ?', ['HR-26-EE-9901']).id;
    const vBMW = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-01-LX-0003']).id;
    const vEClass = get('SELECT id FROM vehicles WHERE reg_number = ?', ['MH-01-EE-7700']).id;
    const vNexon = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-01-EV-2024']).id;
    const vScorpio = get('SELECT id FROM vehicles WHERE reg_number = ?', ['DL-02-MS-7711']).id;

    // =========================================================================
    // 10. Bookings (20+ Relational Bookings Across All Stages)
    // =========================================================================
    const bookingsData = [
      // 1. Active Rental 1 (BMW 330Li - Customer 1: Arjun Kapoor)
      {
        ref: 'BK-2026-1001', cust: customers[0].id, veh: vBMW, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-10-06 10:00:00', end: '2026-10-10 10:00:00', days: 4, rate: 9500.0, base: 38000.0,
        disc: 1500.0, tax: 6570.0, total: 43070.0, dep: 25000.0, status: 'ACTIVE', ext: 'NONE', notes: 'Corporate client VIP airport pickup'
      },
      // 2. Active Rental 2 (Mahindra Thar - Customer 2: Sneha Deshmukh)
      {
        ref: 'BK-2026-1002', cust: customers[1].id, veh: vThar, p_loc: locDEL2, r_loc: locDEL2, br: brDEL2,
        start: '2026-10-05 09:00:00', end: '2026-10-09 18:00:00', days: 5, rate: 4800.0, base: 24000.0,
        disc: 1000.0, tax: 4140.0, total: 27140.0, dep: 10000.0, status: 'ACTIVE', ext: 'NONE', notes: 'Himachal hill tour expedition'
      },
      // 3. Active Rental 3 (Honda City - Customer 3: Vikramaditya Rao)
      {
        ref: 'BK-2026-1003', cust: customers[2].id, veh: vCity, p_loc: locDEL1, r_loc: locDEL2, br: brDEL1,
        start: '2026-10-07 14:00:00', end: '2026-10-11 14:00:00', days: 4, rate: 2900.0, base: 11600.0,
        disc: 500.0, tax: 1998.0, total: 13098.0, dep: 7000.0, status: 'ACTIVE', ext: 'REQUESTED', notes: 'Requested 1 extra day extension'
      },
      // 4. Completed Rental 1 (Toyota Innova Crysta - Customer 4: Ananya Iyer)
      {
        ref: 'BK-2026-0901', cust: customers[3].id, veh: vInnova, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-09-20 08:00:00', end: '2026-09-25 20:00:00', days: 5, rate: 4900.0, base: 24500.0,
        disc: 1000.0, tax: 4230.0, total: 27730.0, dep: 10000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Agra-Jaipur Golden Triangle roadtrip'
      },
      // 5. Completed Rental 2 (Tata Nexon EV - Customer 5: Rahul Mehra)
      {
        ref: 'BK-2026-0902', cust: customers[4].id, veh: vNexon, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-09-26 11:00:00', end: '2026-09-29 11:00:00', days: 3, rate: 3500.0, base: 10500.0,
        disc: 0.0, tax: 1890.0, total: 12390.0, dep: 8000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Delhi-Chandigarh expressway drive'
      },
      // 6. Completed Rental 3 (Hyundai Creta - Customer 6: Pooja Hegde)
      {
        ref: 'BK-2026-0903', cust: customers[5].id, veh: vCreta, p_loc: locBOM1, r_loc: locBOM1, br: brBOM1,
        start: '2026-09-15 10:00:00', end: '2026-09-18 18:00:00', days: 3, rate: 4200.0, base: 12600.0,
        disc: 500.0, tax: 2178.0, total: 14278.0, dep: 10000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Mumbai to Goa weekend drive'
      },
      // 7. Completed Rental 4 (Maruti Swift - Customer 7: Rohan Joshi)
      {
        ref: 'BK-2026-0904', cust: customers[6].id, veh: vSwift, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-09-10 09:00:00', end: '2026-09-12 21:00:00', days: 2, rate: 1800.0, base: 3600.0,
        disc: 0.0, tax: 648.0, total: 4248.0, dep: 5000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Local city errands'
      },
      // 8. Confirmed Upcoming 1 (Toyota Fortuner - Customer 8: Neha Sharma)
      {
        ref: 'BK-2026-1004', cust: customers[7].id, veh: vFortuner, p_loc: locBLR1, r_loc: locBLR1, br: brBLR1,
        start: '2026-10-12 07:00:00', end: '2026-10-16 19:00:00', days: 4, rate: 7500.0, base: 30000.0,
        disc: 1500.0, tax: 5130.0, total: 33630.0, dep: 15000.0, status: 'CONFIRMED', ext: 'NONE', notes: 'Coorg coffee estate drive'
      },
      // 9. Confirmed Upcoming 2 (Mercedes E-Class - Customer 9: Karthik Reddy)
      {
        ref: 'BK-2026-1005', cust: customers[8].id, veh: vEClass, p_loc: locBOM1, r_loc: locBOM1, br: brBOM1,
        start: '2026-10-14 10:00:00', end: '2026-10-18 10:00:00', days: 4, rate: 11000.0, base: 44000.0,
        disc: 2000.0, tax: 7560.0, total: 49560.0, dep: 25000.0, status: 'CONFIRMED', ext: 'NONE', notes: 'Wedding luxury convoy'
      },
      // 10. Confirmed Upcoming 3 (Mahindra XUV700 - Customer 10: Divya Nair)
      {
        ref: 'BK-2026-1006', cust: customers[9].id, veh: vXUV, p_loc: locBLR1, r_loc: locBLR1, br: brBLR1,
        start: '2026-10-15 08:00:00', end: '2026-10-19 20:00:00', days: 4, rate: 5500.0, base: 22000.0,
        disc: 1000.0, tax: 3780.0, total: 24780.0, dep: 10000.0, status: 'CONFIRMED', ext: 'NONE', notes: 'Ooty hill station trip'
      },
      // 11. Approved Pending Pickup (Grand Vitara - Customer 11: Kabir Malhotra)
      {
        ref: 'BK-2026-1007', cust: customers[10].id, veh: vGVitara, p_loc: locDEL2, r_loc: locDEL2, br: brDEL2,
        start: '2026-10-09 10:00:00', end: '2026-10-12 18:00:00', days: 3, rate: 3800.0, base: 11400.0,
        disc: 500.0, tax: 1962.0, total: 12862.0, dep: 8000.0, status: 'APPROVED', ext: 'NONE', notes: 'Approved by staff Amit Verma'
      },
      // 12. Pending Approval (Tata Tiago - Customer 12: Meera Nambiar)
      {
        ref: 'BK-2026-1008', cust: customers[11].id, veh: vTiago, p_loc: locDEL2, r_loc: locDEL2, br: brDEL2,
        start: '2026-10-11 09:00:00', end: '2026-10-13 18:00:00', days: 2, rate: 1600.0, base: 3200.0,
        disc: 0.0, tax: 576.0, total: 3776.0, dep: 5000.0, status: 'PENDING', ext: 'NONE', notes: 'Awaiting KYC check review'
      },
      // 13. Cancelled Booking with Refund (Hyundai Verna - Customer 1: Arjun Kapoor)
      {
        ref: 'BK-2026-0801', cust: customers[0].id, veh: vVerna, p_loc: locBOM1, r_loc: locBOM1, br: brBOM1,
        start: '2026-08-10 10:00:00', end: '2026-08-14 10:00:00', days: 4, rate: 2800.0, base: 11200.0,
        disc: 0.0, tax: 2016.0, total: 13216.0, dep: 7000.0, status: 'REFUNDED', ext: 'NONE',
        c_reason: 'Client flight cancelled due to monsoons', c_fee: 500.0, r_amt: 6500.0, notes: 'Cancellation fee of ₹500 deducted'
      },
      // 14. Enquiry Stage (BMW 330Li - Customer 4: Ananya Iyer)
      {
        ref: 'BK-2026-1009', cust: customers[3].id, veh: vBMW, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-10-25 10:00:00', end: '2026-10-28 18:00:00', days: 3, rate: 9500.0, base: 28500.0,
        disc: 1000.0, tax: 4950.0, total: 32450.0, dep: 25000.0, status: 'ENQUIRY', ext: 'NONE', notes: 'Corporate quote sent'
      },
      // 15. Completed Rental 5 (Toyota Innova Crysta - Customer 2: Sneha Deshmukh)
      {
        ref: 'BK-2026-0802', cust: customers[1].id, veh: vInnova, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-08-15 08:00:00', end: '2026-08-18 20:00:00', days: 3, rate: 4900.0, base: 14700.0,
        disc: 500.0, tax: 2556.0, total: 16756.0, dep: 10000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Independence day long-weekend drive'
      },
      // 16. Completed Rental 6 (Tata Tiago - Customer 5: Rahul Mehra)
      {
        ref: 'BK-2026-0803', cust: customers[4].id, veh: vTiago, p_loc: locDEL2, r_loc: locDEL2, br: brDEL2,
        start: '2026-08-20 10:00:00', end: '2026-08-22 18:00:00', days: 2, rate: 1600.0, base: 3200.0,
        disc: 0.0, tax: 576.0, total: 3776.0, dep: 5000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Smooth return, no damages'
      },
      // 17. Completed Rental 7 (BMW 330Li - Customer 11: Kabir Malhotra)
      {
        ref: 'BK-2026-0804', cust: customers[10].id, veh: vBMW, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-08-25 12:00:00', end: '2026-08-28 12:00:00', days: 3, rate: 9500.0, base: 28500.0,
        disc: 1500.0, tax: 4860.0, total: 31860.0, dep: 25000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Luxury executive drive, settled via UPI'
      },
      // 18. Completed Rental 8 (Hyundai Creta - Customer 7: Rohan Joshi)
      {
        ref: 'BK-2026-0701', cust: customers[6].id, veh: vCreta, p_loc: locBOM1, r_loc: locBOM1, br: brBOM1,
        start: '2026-07-10 10:00:00', end: '2026-07-14 18:00:00', days: 4, rate: 4200.0, base: 16800.0,
        disc: 800.0, tax: 2880.0, total: 18880.0, dep: 10000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Monsoon Konkan drive'
      },
      // 19. Completed Rental 9 (Mahindra Thar - Customer 8: Neha Sharma)
      {
        ref: 'BK-2026-0702', cust: customers[7].id, veh: vThar, p_loc: locDEL2, r_loc: locDEL2, br: brDEL2,
        start: '2026-07-20 09:00:00', end: '2026-07-23 20:00:00', days: 3, rate: 4800.0, base: 14400.0,
        disc: 500.0, tax: 2502.0, total: 16402.0, dep: 10000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Rishikesh adventure'
      },
      // 20. Completed Rental 10 (Tata Nexon EV - Customer 9: Karthik Reddy)
      {
        ref: 'BK-2026-0703', cust: customers[8].id, veh: vNexon, p_loc: locDEL1, r_loc: locDEL1, br: brDEL1,
        start: '2026-07-26 11:00:00', end: '2026-07-29 11:00:00', days: 3, rate: 3500.0, base: 10500.0,
        disc: 0.0, tax: 1890.0, total: 12390.0, dep: 8000.0, status: 'COMPLETED', ext: 'NONE', notes: 'Agra Taj Express drive'
      }
    ];

    for (const b of bookingsData) {
      run(
        `INSERT INTO bookings (
          booking_ref, customer_id, vehicle_id, pickup_location_id, return_location_id, branch_id,
          start_date, end_date, original_end_date, total_days, daily_rate, base_amount,
          discount_amount, tax_amount, estimated_total, deposit_amount, status, extension_status,
          cancellation_reason, cancellation_fee, refund_amount, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.ref, b.cust, b.veh, b.p_loc, b.r_loc, b.br,
          b.start, b.end, b.start, b.days, b.rate, b.base,
          b.disc, b.tax, b.total, b.dep, b.status, b.ext,
          b.c_reason || null, b.c_fee || 0, b.r_amt || 0, b.notes
        ]
      );
    }

    // =========================================================================
    // 11. Digital Rental Agreements
    // =========================================================================
    const activeAndCompletedBookings = all(
      `SELECT id, booking_ref, customer_id, vehicle_id, start_date, end_date, estimated_total, deposit_amount
       FROM bookings WHERE status IN ('ACTIVE', 'COMPLETED', 'CONFIRMED')`
    );

    const agreementTerms = `
1. RENTER RESPONSIBILITY: The renter agrees to operate the vehicle in strict accordance with the Motor Vehicles Act (1988), Indian traffic regulations, and safety mandates.
2. SPEED LIMIT: Maximum permissible highway speed is governed by local state laws (100 km/h on expressways). Exceeding 120 km/h triggers automated telemetry penalties.
3. FUEL POLICY: Same-to-Same. Vehicle is dispatched with recorded fuel levels and must be returned at the equivalent level. Deficits are charged at ₹115/L plus ₹250 refueling service fee.
4. DAMAGE LIABILITY: Renter maximum damage liability is capped at ₹10,000 for standard accidental damage provided all safety terms were adhered to and an immediate FIR / incident log was raised.
5. LATE RETURN: A 1-hour grace period applies. Subsequent delays are billed at the vehicle's published hourly penalty rate plus standard rental charge.
6. GEOGRAPHICAL RESTRICTIONS: Interstate travel permits are active for All-India Tourist Permit vehicles. Cross-border international entry is strictly forbidden.
    `.trim();

    for (const bk of activeAndCompletedBookings) {
      const agrRef = `AGR-${bk.booking_ref.replace('BK-', '')}`;
      run(
        `INSERT INTO rental_agreements (
          agreement_number, booking_id, customer_id, vehicle_id, terms_and_conditions,
          damage_liability_limit, fuel_policy, km_policy, customer_signature, staff_signature, signed_at, status
        ) VALUES (?, ?, ?, ?, ?, 10000.0, 'SAME_TO_SAME', 'UNLIMITED', ?, ?, ?, 'EXECUTED')`,
        [
          agrRef, bk.id, bk.customer_id, bk.vehicle_id, agreementTerms,
          'Digitally Signed - Verified via Aadhaar OTP', 'Amit Verma (Senior Fleet Supervisor)', bk.start_date
        ]
      );
    }

    // =========================================================================
    // 12. Rentals (Active & Completed Trips)
    // =========================================================================
    // Active Rentals
    const bkActive1 = get('SELECT id, vehicle_id, customer_id, start_date, end_date FROM bookings WHERE booking_ref = ?', ['BK-2026-1001']);
    const bkActive2 = get('SELECT id, vehicle_id, customer_id, start_date, end_date FROM bookings WHERE booking_ref = ?', ['BK-2026-1002']);
    const bkActive3 = get('SELECT id, vehicle_id, customer_id, start_date, end_date FROM bookings WHERE booking_ref = ?', ['BK-2026-1003']);

    const activeRentals = [
      { bk: bkActive1, ref: 'RNT-2026-1001', staff: staff1, start_km: 11000, fuel: 'FULL' },
      { bk: bkActive2, ref: 'RNT-2026-1002', staff: staff1, start_km: 21800, fuel: 'FULL' },
      { bk: bkActive3, ref: 'RNT-2026-1003', staff: staff2, start_km: 15100, fuel: 'FULL' }
    ];

    for (const r of activeRentals) {
      run(
        `INSERT INTO rentals (rental_ref, booking_id, customer_id, vehicle_id, staff_id, pickup_time, expected_return_time, start_mileage, fuel_level_pickup, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Dispatched after pre-trip digital inspection')`,
        [r.ref, r.bk.id, r.bk.customer_id, r.bk.vehicle_id, r.staff, r.bk.start_date, r.bk.end_date, r.start_km, r.fuel]
      );
    }

    // Completed Rentals
    const completedBookingRefs = ['BK-2026-0901', 'BK-2026-0902', 'BK-2026-0903', 'BK-2026-0904', 'BK-2026-0802', 'BK-2026-0803', 'BK-2026-0804', 'BK-2026-0701', 'BK-2026-0702', 'BK-2026-0703'];
    const completedRentalsList = [];

    for (const bref of completedBookingRefs) {
      const bk = get('SELECT id, vehicle_id, customer_id, start_date, end_date FROM bookings WHERE booking_ref = ?', [bref]);
      const rRef = `RNT-${bref.replace('BK-', '')}`;
      const v = get('SELECT mileage FROM vehicles WHERE id = ?', [bk.vehicle_id]);
      const startKm = Math.max(1000, v.mileage - 800);
      
      const rId = run(
        `INSERT INTO rentals (rental_ref, booking_id, customer_id, vehicle_id, staff_id, pickup_time, expected_return_time, start_mileage, fuel_level_pickup, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FULL', 'RETURNED', 'Completed and returned safely')`,
        [rRef, bk.id, bk.customer_id, bk.vehicle_id, staff1, bk.start_date, bk.end_date, startKm]
      ).lastInsertRowid;

      completedRentalsList.push({ id: rId, bk, rRef, startKm, endKm: startKm + 450 });
    }

    // =========================================================================
    // 13. Digital Inspections (Pickup & Return)
    // =========================================================================
    // Pickup Inspections for Active
    for (const r of activeRentals) {
      const rentRow = get('SELECT id FROM rentals WHERE rental_ref = ?', [r.ref]);
      run(
        `INSERT INTO inspections (
          rental_id, vehicle_id, staff_id, inspection_type, odometer_reading, fuel_level,
          exterior_front, exterior_rear, exterior_left, exterior_right, roof_condition,
          interior_cabin, tyres_condition, lights_condition, mirrors_windows, has_damage, notes
        ) VALUES (?, ?, ?, 'PICKUP_DISPATCH', ?, ?, 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 0, 'Pre-trip full inspection verified')`,
        [rentRow.id, r.bk.vehicle_id, r.staff, r.start_km, r.fuel]
      );
    }

    // Return Inspections and Returns table for Completed
    for (const cr of completedRentalsList) {
      // 1. Return Inspection
      run(
        `INSERT INTO inspections (
          rental_id, vehicle_id, staff_id, inspection_type, odometer_reading, fuel_level,
          exterior_front, exterior_rear, exterior_left, exterior_right, roof_condition,
          interior_cabin, tyres_condition, lights_condition, mirrors_windows, has_damage, notes
        ) VALUES (?, ?, ?, 'RETURN_CHECKIN', ?, 'FULL', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 0, 'Return inspection passed successfully')`,
        [cr.id, cr.bk.vehicle_id, staff1, cr.endKm]
      );

      // 2. Returns Table Record
      const extraKm = 30;
      const extraKmFee = extraKm * 15.0; // ₹450
      const lateHours = 0;
      const lateFee = 0;
      const tollFee = 350.0;
      const totalAdd = extraKmFee + lateFee + tollFee;

      const retId = run(
        `INSERT INTO returns (
          rental_id, vehicle_id, staff_id, actual_return_time, return_mileage, fuel_level_return,
          vehicle_condition, late_hours, late_fee, damage_fee, fuel_fee, extra_km, extra_km_fee,
          toll_parking_fee, total_additional_charges, notes
        ) VALUES (?, ?, ?, ?, ?, 'FULL', 'EXCELLENT', ?, ?, 0, 0, ?, ?, ?, ?, 'Settlement processed cleanly')`,
        [cr.id, cr.bk.vehicle_id, staff1, cr.bk.end_date, cr.endKm, lateHours, lateFee, extraKm, extraKmFee, tollFee, totalAdd]
      ).lastInsertRowid;

      // 3. Fines/Penalties if toll applied
      run(
        `INSERT INTO fines_charges (return_id, charge_type, amount, reason, is_paid)
         VALUES (?, 'TOLL_TRAFFIC', ?, 'FasTag Express Highway Toll Deduction', 1)`,
        [retId, tollFee]
      );
    }

    // =========================================================================
    // 14. Invoices & Rental Charges (Itemized Ledger & Accounting)
    // =========================================================================
    // Generate invoices for completed bookings
    for (let i = 0; i < completedRentalsList.length; i++) {
      const cr = completedRentalsList[i];
      const bk = get('SELECT * FROM bookings WHERE id = ?', [cr.bk.id]);
      const invNum = `INV-2026-${2000 + i}`;
      const extraKmAmount = 450.0;
      const tollAmount = 350.0;
      const netTotal = bk.estimated_total + extraKmAmount + tollAmount;

      const invId = run(
        `INSERT INTO invoices (
          invoice_number, booking_id, rental_id, customer_id, issue_date, due_date,
          base_amount, extra_km_amount, extra_hours_amount, late_fee_amount, damage_amount,
          fuel_penalty_amount, toll_parking_amount, discount_amount, tax_amount, total_amount,
          paid_amount, balance_due, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, 0, 'PAID', 'Settled in full upon vehicle return')`,
        [
          invNum, bk.id, cr.id, bk.customer_id, bk.end_date.split(' ')[0], bk.end_date.split(' ')[0],
          bk.base_amount, extraKmAmount, tollAmount, bk.discount_amount, bk.tax_amount, netTotal, netTotal
        ]
      ).lastInsertRowid;

      // Line items in rental_charges
      run(
        `INSERT INTO rental_charges (rental_id, booking_id, invoice_id, charge_type, description, quantity, unit_rate, tax_rate, amount, created_by)
         VALUES (?, ?, ?, 'BASE_RENTAL', 'Base Self-Drive Rental Fee', ?, ?, 18.0, ?, ?)`,
        [cr.id, bk.id, invId, bk.total_days, bk.daily_rate, bk.base_amount, adminUser.id]
      );

      run(
        `INSERT INTO rental_charges (rental_id, booking_id, invoice_id, charge_type, description, quantity, unit_rate, tax_rate, amount, created_by)
         VALUES (?, ?, ?, 'EXTRA_KM', 'Extra Mileage Covered Over Allotment', 30, 15.0, 18.0, 450.0, ?)`,
        [cr.id, bk.id, invId, staff1]
      );

      run(
        `INSERT INTO rental_charges (rental_id, booking_id, invoice_id, charge_type, description, quantity, unit_rate, tax_rate, amount, created_by)
         VALUES (?, ?, ?, 'TOLL_PARKING', 'Electronic Toll Collection (FasTag)', 1, 350.0, 0.0, 350.0, ?)`,
        [cr.id, bk.id, invId, staff1]
      );

      // Payment Record for this Invoice
      run(
        `INSERT INTO payments (
          payment_ref, invoice_id, booking_id, rental_id, customer_id, amount, payment_date,
          payment_method, status, transaction_ref, notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UPI', 'PAID', ?, 'Instant UPI settlement via QR code', ?)`,
        [
          `PAY-2026-${3000 + i}`, invId, bk.id, cr.id, bk.customer_id, netTotal, bk.end_date,
          `UPI/RD/98127391${i}`, staff1
        ]
      );
    }

    // Invoices for Active Rentals (Advance Paid)
    for (let i = 0; i < activeRentals.length; i++) {
      const r = activeRentals[i];
      const bk = get('SELECT * FROM bookings WHERE id = ?', [r.bk.id]);
      const rentRow = get('SELECT id FROM rentals WHERE rental_ref = ?', [r.ref]);
      const invNum = `INV-2026-ACT-${100 + i}`;

      const invId = run(
        `INSERT INTO invoices (
          invoice_number, booking_id, rental_id, customer_id, issue_date, due_date,
          base_amount, extra_km_amount, extra_hours_amount, late_fee_amount, damage_amount,
          fuel_penalty_amount, toll_parking_amount, discount_amount, tax_amount, total_amount,
          paid_amount, balance_due, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?, ?, ?, 0, 'PAID', 'Advance rental & refundable deposit received')`,
        [
          invNum, bk.id, rentRow.id, bk.customer_id, bk.start_date.split(' ')[0], bk.end_date.split(' ')[0],
          bk.base_amount, bk.discount_amount, bk.tax_amount, bk.estimated_total, bk.estimated_total
        ]
      ).lastInsertRowid;

      run(
        `INSERT INTO payments (
          payment_ref, invoice_id, booking_id, rental_id, customer_id, amount, payment_date,
          payment_method, status, transaction_ref, notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CARD', 'PAID', ?, 'HDFC Credit Card Advance Rental', ?)`,
        [
          `PAY-ACT-${500 + i}`, invId, bk.id, rentRow.id, bk.customer_id, bk.estimated_total, bk.start_date,
          `TXN-CARD-994411${i}`, r.staff
        ]
      );
    }

    // =========================================================================
    // 15. Fuel Logs Table (Fleet Efficiency & KM/L Tracking)
    // =========================================================================
    const fuelLogsData = [
      { veh: vBMW, date: '2026-10-05', odo: 10980, lit: 45.0, rate: 96.72, total: 4352.4, station: 'Indian Oil Aerocity Delhi' },
      { veh: vThar, date: '2026-10-04', odo: 21750, lit: 50.0, rate: 89.62, total: 4481.0, station: 'Bharat Petroleum CP Depot' },
      { veh: vCity, date: '2026-10-06', odo: 15050, lit: 38.0, rate: 96.72, total: 3675.36, station: 'HP Petrol Pump Vasant Kunj' },
      { veh: vInnova, date: '2026-09-19', odo: 30400, lit: 55.0, rate: 89.62, total: 4929.1, station: 'Shell Fuel Station Mahipalpur' },
      { veh: vCreta, date: '2026-09-14', odo: 19300, lit: 42.0, rate: 89.62, total: 3764.04, station: 'HP Auto Care BKC Mumbai' },
      { veh: vFortuner, date: '2026-09-02', odo: 23800, lit: 65.0, rate: 89.62, total: 5825.3, station: 'Indian Oil Koramangala Bangalore' },
      { veh: vSwift, date: '2026-09-08', odo: 18100, lit: 32.0, rate: 96.72, total: 3095.04, station: 'Indian Oil Dhaula Kuan' },
      { veh: vVerna, date: '2026-08-01', odo: 12100, lit: 40.0, rate: 96.72, total: 3868.8, station: 'Bharat Petroleum Bandra West' },
      { veh: vEClass, date: '2026-09-10', odo: 14200, lit: 60.0, rate: 89.62, total: 5377.2, station: 'Shell BKC Commercial Hub' },
      { veh: vGVitara, date: '2026-09-20', odo: 13800, lit: 35.0, rate: 96.72, total: 3385.2, station: 'Indian Oil Golf Course Road Gurgaon' }
    ];

    for (const fl of fuelLogsData) {
      run(
        `INSERT INTO fuel_logs (vehicle_id, logged_by_staff_id, fill_date, odometer_reading, litres, rate_per_litre, total_amount, fuel_station, payment_method, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CARD', 'Routine fuel top-up prior to trip dispatch')`,
        [fl.veh, staff1, fl.date, fl.odo, fl.lit, fl.rate, fl.total, fl.station]
      );
    }

    // =========================================================================
    // 16. Fleet Expenses Table
    // =========================================================================
    const expensesData = [
      { veh: vBMW, br: brDEL1, cat: 'INSURANCE', desc: 'Annual Zero-Dep Comprehensive Commercial Insurance Renewal', amt: 72000.0, date: '2026-04-10', vendor: 'HDFC ERGO General Insurance', ref: 'INV-INS-2026-01' },
      { veh: vInnova, br: brDEL1, cat: 'MAINTENANCE', desc: '30,000 km Scheduled Major Periodic Service & Synthetic Oil Change', amt: 14500.0, date: '2026-05-15', vendor: 'Toyota Espirit Okhla Hub', ref: 'INV-TOY-4491' },
      { veh: vThar, br: brDEL2, cat: 'REPAIRS', desc: 'Underbody protective skid plate upgrade and wheel alignment', amt: 8500.0, date: '2026-06-20', vendor: 'Mahindra Koncept Automobiles', ref: 'INV-MAH-8821' },
      { veh: vNexon, br: brDEL1, cat: 'CLEANING', desc: 'Professional 3M Interior Ceramic Detailing & Deep Foam Clean', amt: 3500.0, date: '2026-07-05', vendor: '3M Car Care Aerocity', ref: 'INV-3M-2210' },
      { veh: vFortuner, br: brBLR1, cat: 'PERMIT', desc: 'All India Tourist Permit (AITP) 5-Year National Authorization', amt: 18000.0, date: '2026-03-12', vendor: 'RTO Transport Department Bengaluru', ref: 'RTO-PER-991' },
      { veh: vScorpio, br: brDEL2, cat: 'MAINTENANCE', desc: 'Brake pad replacement and suspension bush inspection', amt: 9200.0, date: '2026-10-02', vendor: 'Mahindra Service Center Gurgaon', ref: 'INV-MAH-9910' },
      { veh: null, br: brDEL1, cat: 'STAFF_DRIVER', desc: 'Monthly logistics driver stipend for depot-to-depot vehicle repositioning', amt: 22000.0, date: '2026-09-30', vendor: 'Logistics Fleet Driver Pool', ref: 'SAL-DRV-0926' },
      { veh: null, br: brBOM1, cat: 'TOLL_PARKING', desc: 'Depot monthly commercial airport parking pass at T2 Mumbai', amt: 12000.0, date: '2026-09-01', vendor: 'Mumbai International Airport Ltd', ref: 'MIAL-PRK-881' }
    ];

    for (const exp of expensesData) {
      run(
        `INSERT INTO expenses (vehicle_id, branch_id, category, description, amount, expense_date, vendor_name, invoice_ref, payment_method, approved_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BANK_TRANSFER', ?)`,
        [exp.veh, exp.br, exp.cat, exp.desc, exp.amt, exp.date, exp.vendor, exp.ref, adminUser.id]
      );
    }

    // =========================================================================
    // 17. Fleet Maintenance Records
    // =========================================================================
    const maintenanceRecords = [
      {
        veh: vScorpio, type: 'BRAKE_SERVICE', desc: 'Front & Rear ceramic brake pads replacement, brake fluid flushing and rotor resurfacing',
        start: '2026-10-02', end: '2026-10-09', parts: 6200.0, labour: 3000.0, cost: 9200.0, provider: 'Mahindra Authorized Service Center Gurgaon',
        next_odo: 35000, next_dt: '2027-04-10', status: 'IN_PROGRESS', notes: 'Vehicle kept in workshop under active maintenance'
      },
      {
        veh: vInnova, type: 'SCHEDULED_SERVICE', desc: '30,000 km Periodic Service - Engine oil, oil filter, air filter, cabin AC filter replacement and tyre rotation',
        start: '2026-05-15', end: '2026-05-16', parts: 9800.0, labour: 4700.0, cost: 14500.0, provider: 'Toyota Espirit Okhla Delhi',
        next_odo: 40000, next_dt: '2026-11-15', status: 'COMPLETED', notes: 'All mechanical inspections passed successfully'
      },
      {
        veh: vThar, type: 'TYRE_REPLACEMENT', desc: 'All-Terrain Apollo Apterra AT2 tyre replacement and high-speed dynamic wheel balancing',
        start: '2026-06-20', end: '2026-06-21', parts: 28000.0, labour: 2000.0, cost: 30000.0, provider: 'Apollo Tyres Prime Hub New Delhi',
        next_odo: 50000, next_dt: '2027-06-20', status: 'COMPLETED', notes: 'Excellent off-road grip restored'
      },
      {
        veh: vCity, type: 'OIL_CHANGE', desc: '10,000 km Honda Genuine Fully Synthetic 0W-20 engine oil change and multi-point check',
        start: '2026-04-10', end: '2026-04-10', parts: 3200.0, labour: 1200.0, cost: 4400.0, provider: 'Ace Honda Service Depot Delhi',
        next_odo: 20000, next_dt: '2026-10-15', status: 'COMPLETED', notes: 'Ready for smooth highway runs'
      },
      {
        veh: vBMW, type: 'PREVENTIVE', desc: 'Annual Computerized Diagnostic Telemetry Scan, Software iDrive OS Update & Brake Sensor Check',
        start: '2026-03-05', end: '2026-03-06', parts: 4500.0, labour: 6500.0, cost: 11000.0, provider: 'BMW Deutsche Motoren Delhi',
        next_odo: 20000, next_dt: '2027-03-05', status: 'COMPLETED', notes: 'Clean diagnostic report - zero fault codes'
      }
    ];

    for (const m of maintenanceRecords) {
      run(
        `INSERT INTO maintenance (
          vehicle_id, maintenance_type, description, start_date, end_date, parts_cost,
          labour_cost, cost, service_provider, next_service_mileage, next_service_date, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.veh, m.type, m.desc, m.start, m.end, m.parts, m.labour, m.cost, m.provider, m.next_odo, m.next_dt, m.status, m.notes]
      );
    }

    // =========================================================================
    // 18. Approvals Queue Table (Governance & Admin Decision Making)
    // =========================================================================
    const approvalsData = [
      {
        type: 'RENTAL_EXTENSION', entity_type: 'BOOKING', entity_id: bkActive3.id,
        req_by: customerUsers[2].id, rev_by: null, status: 'PENDING',
        details: JSON.stringify({ booking_ref: 'BK-2026-1003', vehicle: 'Honda City ZX (DL-02-CE-8890)', additional_days: 1, new_end_date: '2026-10-12 14:00:00', additional_amount: 3422.0 }),
        notes: null
      },
      {
        type: 'BOOKING_APPROVAL', entity_type: 'BOOKING', entity_id: 12,
        req_by: customerUsers[3].id, rev_by: null, status: 'PENDING',
        details: JSON.stringify({ booking_ref: 'BK-2026-1008', vehicle: 'Tata Tiago XZ+ (DL-04-BX-4421)', duration: '2 Days', total_amount: 3776.0 }),
        notes: null
      },
      {
        type: 'CANCELLATION_REFUND', entity_type: 'BOOKING', entity_id: 13,
        req_by: customerUsers[0].id, rev_by: adminUser.id, status: 'APPROVED',
        details: JSON.stringify({ booking_ref: 'BK-2026-0801', gross_paid: 7000.0, cancellation_fee: 500.0, net_refund: 6500.0, method: 'ORIGINAL_PAYMENT_UPI' }),
        notes: 'Monsoon flight cancellation verified with airline ticket proof.'
      },
      {
        type: 'MAINTENANCE_JOB', entity_type: 'VEHICLE', entity_id: vScorpio,
        req_by: staffUser1.id, rev_by: adminUser.id, status: 'APPROVED',
        details: JSON.stringify({ vehicle_reg: 'DL-02-MS-7711', job: 'Brake pads replacement and rotor machining', quote_amount: 9200.0, vendor: 'Mahindra Service Gurgaon' }),
        notes: 'Safety critical component replacement approved immediately.'
      }
    ];

    for (const app of approvalsData) {
      run(
        `INSERT INTO approvals (approval_type, entity_type, entity_id, requested_by_user_id, reviewed_by_user_id, status, request_details, decision_notes, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [app.type, app.entity_type, app.entity_id, app.req_by, app.rev_by, app.status, app.details, app.notes, app.rev_by ? '2026-10-06 14:30:00' : null]
      );
    }

    // =========================================================================
    // 19. Notifications (Dynamic Inbox for Users)
    // =========================================================================
    const notificationsData = [
      { user_id: adminUser.id, title: 'Trip Extension Requested', msg: 'Vikramaditya Rao requested 1-day extension for booking BK-2026-1003 (Honda City).', type: 'WARNING', link: '/approvals', read: 0 },
      { user_id: adminUser.id, title: 'Fleet Maintenance Alert', msg: 'Mahindra Scorpio-N (DL-02-MS-7711) is currently undergoing brake maintenance.', type: 'INFO', link: '/fleet-maintenance', read: 0 },
      { user_id: adminUser.id, title: 'Document Expiry Warning', msg: 'PUC for Mahindra Scorpio-N (DL-02-MS-7711) expires in 43 days (20 Nov 2026).', type: 'WARNING', link: '/vehicles', read: 0 },
      { user_id: staffUser1.id, title: 'Upcoming Trip Pickup', msg: 'Arjun Kapoor scheduled for BMW 330Li pickup at IGI Airport T3 Hub.', type: 'INFO', link: '/rentals', read: 1 },
      { user_id: staffUser1.id, title: 'Vehicle Return Checkin', msg: 'Toyota Innova Crysta returned from Agra roadtrip with zero defects.', type: 'SUCCESS', link: '/returns', read: 1 },
      { user_id: customerUsers[0].id, title: 'Booking Confirmed!', msg: 'Your reservation for BMW 3 Series (BK-2026-1001) is confirmed with complimentary airport pickup.', type: 'SUCCESS', link: '/customer-portal', read: 0 },
      { user_id: customerUsers[0].id, title: 'Rental Agreement Ready', msg: 'Digital Rental Agreement AGR-2026-1001 has been generated and signed.', type: 'INFO', link: '/customer-portal', read: 0 },
      { user_id: customerUsers[2].id, title: 'Extension Request Submitted', msg: 'Your request for a 1-day extension on Honda City (BK-2026-1003) is under review.', type: 'INFO', link: '/customer-portal', read: 0 }
    ];

    for (const notif of notificationsData) {
      run(
        `INSERT INTO notifications (user_id, title, message, type, link, is_read)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [notif.user_id, notif.title, notif.msg, notif.type, notif.link, notif.read]
      );
    }

    // =========================================================================
    // 20. Support Tickets (Customer CRM & Issue Escalation)
    // =========================================================================
    const supportTicketsData = [
      {
        ref: 'TCK-2026-101', cust: customers[0].id, bk: bkActive1.id, sub: 'FasTag Auto-Recharge and Airport Express Lane Guidance',
        cat: 'BILLING', pri: 'MEDIUM', stat: 'IN_PROGRESS',
        msg: 'Does the car include an activated FasTag for IGI Airport express expressway gates or should I pay cash at booths?',
        resp: 'Hello Arjun, all RentDrive fleet vehicles are equipped with commercial Paytm/ICICI FasTags linked directly to our centralized fleet account. Tolls are automatically debited and reconciled on return with zero surcharge.',
        staff: staff1
      },
      {
        ref: 'TCK-2026-102', cust: customers[2].id, bk: bkActive3.id, sub: 'Rental Extension Request for 24 Additional Hours',
        cat: 'BOOKING', pri: 'HIGH', stat: 'OPEN',
        msg: 'My client meeting in Gurugram has been extended by one day. I have submitted an extension request for 11 Oct to 12 Oct.',
        resp: null, staff: staff1
      },
      {
        ref: 'TCK-2026-103', cust: customers[1].id, bk: bkActive2.id, sub: 'In-Cabin Bluetooth Apple CarPlay Pairing Assistance',
        cat: 'VEHICLE_ISSUE', pri: 'LOW', stat: 'RESOLVED',
        msg: 'How do I toggle the touchscreen console between Wireless Apple CarPlay and Android Auto on the Thar LX?',
        resp: 'Under the Mahindra infotainment settings, navigate to Connectivity -> Devices -> Enable Wireless Projection and pair via Bluetooth code 0000.',
        staff: staff2
      }
    ];

    for (const tck of supportTicketsData) {
      run(
        `INSERT INTO support_tickets (
          ticket_ref, customer_id, booking_id, subject, category, priority, status, message, staff_response, assigned_staff_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tck.ref, tck.cust, tck.bk, tck.sub, tck.cat, tck.pri, tck.stat, tck.msg, tck.resp, tck.staff]
      );
    }

    // =========================================================================
    // 21. Audit Logs (Immutable Security & Operations Trail)
    // =========================================================================
    const auditEvents = [
      { u: adminUser.id, act: 'LOGIN', ent: 'AUTH', id: adminUser.id, det: { method: 'PASSWORD', role: 'ADMIN', ip: '127.0.0.1' }, ip: '127.0.0.1' },
      { u: adminUser.id, act: 'INITIALIZE_SCHEMA', ent: 'DATABASE', id: 1, det: { tables_created: 26, relational_constraints: 'STRICT_FK' }, ip: '127.0.0.1' },
      { u: staffUser1.id, act: 'CREATE_BOOKING', ent: 'BOOKING', id: 1, det: { ref: 'BK-2026-1001', customer: 'Arjun Kapoor', vehicle: 'BMW 330Li' }, ip: '127.0.0.1' },
      { u: staffUser1.id, act: 'DISPATCH_RENTAL', ent: 'RENTAL', id: 1, det: { ref: 'RNT-2026-1001', odometer: 11000, fuel: 'FULL' }, ip: '127.0.0.1' },
      { u: staffUser1.id, act: 'INSPECTION_RECORDED', ent: 'INSPECTION', id: 1, det: { type: 'PICKUP_DISPATCH', defects_found: 0 }, ip: '127.0.0.1' },
      { u: adminUser.id, act: 'APPROVE_CANCELLATION_REFUND', ent: 'APPROVALS', id: 3, det: { booking_ref: 'BK-2026-0801', refund_amount: 6500.0 }, ip: '127.0.0.1' },
      { u: staffUser1.id, act: 'RECORD_PAYMENT', ent: 'PAYMENT', id: 1, det: { amount: 27730.0, method: 'UPI', ref: 'PAY-2026-3000' }, ip: '127.0.0.1' },
      { u: adminUser.id, act: 'UPDATE_RATE_CARD', ent: 'RATE_CARDS', id: 1, det: { code: 'RC-HATCH-STD', weekend_multiplier: 1.15 }, ip: '127.0.0.1' }
    ];

    for (const ae of auditEvents) {
      run(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ae.u, ae.act, ae.ent, ae.id, JSON.stringify(ae.det), ae.ip]
      );
    }

    // =========================================================================
    // 22. System Settings
    // =========================================================================
    const settings = [
      { key: 'COMPANY_NAME', val: 'RentDrive India Private Limited', desc: 'Commercial Entity Trade Name' },
      { key: 'CURRENCY_CODE', val: 'INR', desc: 'Base System Currency (₹)' },
      { key: 'GST_TAX_RATE', val: '18.0', desc: 'Goods and Services Tax percentage for vehicle rental services' },
      { key: 'LATE_RETURN_GRACE_MINUTES', val: '60', desc: 'Grace period in minutes before hourly late penalty applies' },
      { key: 'SECURITY_DEPOSIT_REQUIRED', val: 'true', desc: 'Whether refundable security deposit is mandatory at booking' },
      { key: 'AUTO_APPROVE_CUSTOMER_KYC', val: 'true', desc: 'Automated Aadhaar / PAN OCR verification status' },
      { key: 'FLEET_SUPPORT_HOTLINE', val: '+91 1800 200 4400', desc: '24x7 Emergency Roadside Assistance Helpline' },
      { key: 'HEAD_OFFICE_ADDRESS', val: 'Level 5, Aerocity Worldmark 1, New Delhi 110037, India', desc: 'Corporate HQ Address' }
    ];

    for (const st of settings) {
      run(
        `INSERT INTO system_settings (key, value, description)
         VALUES (?, ?, ?)`,
        [st.key, st.val, st.desc]
      );
    }

    console.log('Database successfully seeded with complete enterprise relational records.');
  });
}

if (require.main === module) {
  try {
    seedDatabase(true);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

module.exports = { seedDatabase };
