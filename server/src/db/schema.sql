-- ==============================================================================
-- VEHICLE RENTAL DATABASE MANAGEMENT SYSTEM (DBMS) - ENTERPRISE RELATIONAL SCHEMA
-- ==============================================================================
-- Normalized SQLite3 schema with Foreign Key constraints, strict type-checking,
-- business-rule checks, relational indexes, and automated audit logging.

PRAGMA foreign_keys = ON;

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE CHECK(name IN ('ADMIN', 'STAFF', 'CUSTOMER')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    username TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED')),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until DATETIME,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- 2b. Password Reset Tokens Table (Secure Token Hashing)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Branches Table (Multi-Branch Fleet Operations)
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    manager_name TEXT,
    operating_hours TEXT DEFAULT '08:00 AM - 10:00 PM',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Locations Table (Preserved for backwards-compatibility & multi-depot pickups)
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    branch_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 5. Customers Table (KYC, Driving License & Indian ID Proofs)
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    driving_license_no TEXT NOT NULL UNIQUE,
    license_expiry DATE NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    id_card_type TEXT DEFAULT 'AADHAAR' CHECK(id_card_type IN ('AADHAAR', 'PAN', 'DRIVERS_LICENSE', 'PASSPORT')),
    id_card_no TEXT,
    kyc_status TEXT DEFAULT 'VERIFIED' CHECK(kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    preferred_category_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    branch_id INTEGER,
    employee_code TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL DEFAULT 'OPERATIONS' CHECK(department IN ('OPERATIONS', 'CUSTOMER_SERVICE', 'LOGISTICS', 'WORKSHOP', 'MANAGEMENT')),
    designation TEXT NOT NULL,
    hire_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 7. Vehicle Categories Table
CREATE TABLE IF NOT EXISTS vehicle_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    daily_rate REAL NOT NULL CHECK(daily_rate >= 0),
    hourly_rate REAL NOT NULL DEFAULT 0 CHECK(hourly_rate >= 0),
    deposit_amount REAL NOT NULL DEFAULT 5000 CHECK(deposit_amount >= 0),
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Vehicles Table (Comprehensive Fleet & Compliance Specification)
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    branch_id INTEGER,
    reg_number TEXT NOT NULL UNIQUE,
    vin TEXT UNIQUE,
    engine_number TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT,
    year INTEGER NOT NULL,
    color TEXT,
    fuel_type TEXT NOT NULL CHECK(fuel_type IN ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'CNG')),
    transmission TEXT NOT NULL CHECK(transmission IN ('AUTOMATIC', 'MANUAL')),
    seating_capacity INTEGER NOT NULL DEFAULT 5,
    mileage INTEGER NOT NULL DEFAULT 0,
    daily_rate REAL NOT NULL CHECK(daily_rate >= 0),
    hourly_rate REAL NOT NULL DEFAULT 0 CHECK(hourly_rate >= 0),
    extra_km_rate REAL NOT NULL DEFAULT 15.0 CHECK(extra_km_rate >= 0),
    extra_hour_rate REAL NOT NULL DEFAULT 250.0 CHECK(extra_hour_rate >= 0),
    purchase_price REAL DEFAULT 0,
    current_value REAL DEFAULT 0,
    last_service_km INTEGER DEFAULT 0,
    next_service_km INTEGER DEFAULT 10000,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN (
        'AVAILABLE', 'RESERVED', 'READY_FOR_PICKUP', 'RENTED', 'RETURNED', 
        'INSPECTION', 'MAINTENANCE', 'DAMAGED', 'OUT_OF_SERVICE', 'RETIRED'
    )),
    insurance_policy_no TEXT,
    insurance_expiry DATE,
    puc_number TEXT,
    puc_expiry DATE,
    fitness_expiry DATE,
    permit_number TEXT,
    permit_expiry DATE,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES vehicle_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 9. Rate Cards Table (Advanced Dynamic Rate Engine)
CREATE TABLE IF NOT EXISTS rate_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    branch_id INTEGER,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    hourly_rate REAL NOT NULL CHECK(hourly_rate >= 0),
    daily_rate REAL NOT NULL CHECK(daily_rate >= 0),
    weekly_rate REAL NOT NULL CHECK(weekly_rate >= 0),
    monthly_rate REAL NOT NULL CHECK(monthly_rate >= 0),
    weekend_multiplier REAL NOT NULL DEFAULT 1.15,
    extra_km_rate REAL NOT NULL DEFAULT 15.0,
    extra_hour_rate REAL NOT NULL DEFAULT 250.0,
    late_return_hourly_rate REAL NOT NULL DEFAULT 350.0,
    cancellation_fee_fixed REAL NOT NULL DEFAULT 500.0,
    cancellation_fee_percent REAL NOT NULL DEFAULT 10.0,
    security_deposit REAL NOT NULL DEFAULT 5000.0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES vehicle_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 10. Bookings Table (Reservations & Lifecycle)
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    pickup_location_id INTEGER NOT NULL,
    return_location_id INTEGER NOT NULL,
    branch_id INTEGER,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    original_end_date DATETIME,
    total_days INTEGER NOT NULL CHECK(total_days > 0),
    extended_days INTEGER NOT NULL DEFAULT 0,
    daily_rate REAL NOT NULL CHECK(daily_rate >= 0),
    base_amount REAL NOT NULL CHECK(base_amount >= 0),
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    estimated_total REAL NOT NULL CHECK(estimated_total >= 0),
    deposit_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN (
        'ENQUIRY', 'PENDING', 'APPROVED', 'CONFIRMED', 'PICKUP', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REFUNDED'
    )),
    extension_status TEXT NOT NULL DEFAULT 'NONE' CHECK(extension_status IN ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED')),
    cancellation_reason TEXT,
    cancellation_fee REAL DEFAULT 0,
    refund_amount REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (pickup_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (return_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 11. Digital Rental Agreements Table
CREATE TABLE IF NOT EXISTS rental_agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_number TEXT NOT NULL UNIQUE,
    booking_id INTEGER NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    terms_and_conditions TEXT NOT NULL,
    damage_liability_limit REAL NOT NULL DEFAULT 10000.0,
    fuel_policy TEXT NOT NULL DEFAULT 'SAME_TO_SAME',
    km_policy TEXT NOT NULL DEFAULT 'UNLIMITED',
    customer_signature TEXT,
    staff_signature TEXT,
    signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'SIGNED' CHECK(status IN ('DRAFT', 'SIGNED', 'EXECUTED', 'TERMINATED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
);

-- 12. Rentals Table (Active & Executed Trips)
CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_ref TEXT NOT NULL UNIQUE,
    booking_id INTEGER NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    staff_id INTEGER,
    pickup_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_return_time DATETIME NOT NULL,
    start_mileage INTEGER NOT NULL,
    fuel_level_pickup TEXT NOT NULL DEFAULT 'FULL' CHECK(fuel_level_pickup IN ('FULL', '75%', '50%', '25%')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'RETURNED', 'CLOSED')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 13. Digital Vehicle Inspections Table (Pickup & Return Quality Audits)
CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_id INTEGER,
    vehicle_id INTEGER NOT NULL,
    staff_id INTEGER,
    inspection_type TEXT NOT NULL CHECK(inspection_type IN ('PICKUP_DISPATCH', 'RETURN_CHECKIN', 'PERIODIC', 'MAINTENANCE')),
    odometer_reading INTEGER NOT NULL,
    fuel_level TEXT NOT NULL,
    exterior_front TEXT DEFAULT 'PASS' CHECK(exterior_front IN ('PASS', 'MINOR_SCRATCH', 'DENT', 'DAMAGED')),
    exterior_rear TEXT DEFAULT 'PASS' CHECK(exterior_rear IN ('PASS', 'MINOR_SCRATCH', 'DENT', 'DAMAGED')),
    exterior_left TEXT DEFAULT 'PASS' CHECK(exterior_left IN ('PASS', 'MINOR_SCRATCH', 'DENT', 'DAMAGED')),
    exterior_right TEXT DEFAULT 'PASS' CHECK(exterior_right IN ('PASS', 'MINOR_SCRATCH', 'DENT', 'DAMAGED')),
    roof_condition TEXT DEFAULT 'PASS' CHECK(roof_condition IN ('PASS', 'DENT', 'DAMAGED')),
    interior_cabin TEXT DEFAULT 'PASS' CHECK(interior_cabin IN ('PASS', 'STAINS', 'TEAR', 'CLEANING_REQ')),
    tyres_condition TEXT DEFAULT 'PASS' CHECK(tyres_condition IN ('PASS', 'WORN', 'PUNCTURE', 'REPLACE_REQ')),
    lights_condition TEXT DEFAULT 'PASS' CHECK(lights_condition IN ('PASS', 'CRACKED', 'BULB_FAILED')),
    mirrors_windows TEXT DEFAULT 'PASS' CHECK(mirrors_windows IN ('PASS', 'CRACKED', 'SCRATCHED')),
    has_damage INTEGER NOT NULL DEFAULT 0,
    damage_details TEXT,
    estimated_damage_cost REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 14. Returns Table
CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_id INTEGER NOT NULL UNIQUE,
    vehicle_id INTEGER NOT NULL,
    staff_id INTEGER,
    actual_return_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    return_mileage INTEGER NOT NULL,
    fuel_level_return TEXT NOT NULL DEFAULT 'FULL' CHECK(fuel_level_return IN ('FULL', '75%', '50%', '25%', 'EMPTY')),
    vehicle_condition TEXT NOT NULL DEFAULT 'EXCELLENT' CHECK(vehicle_condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED')),
    late_hours INTEGER NOT NULL DEFAULT 0,
    late_fee REAL NOT NULL DEFAULT 0,
    damage_fee REAL NOT NULL DEFAULT 0,
    fuel_fee REAL NOT NULL DEFAULT 0,
    extra_km INTEGER NOT NULL DEFAULT 0,
    extra_km_fee REAL NOT NULL DEFAULT 0,
    toll_parking_fee REAL NOT NULL DEFAULT 0,
    total_additional_charges REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 15. Invoices Table (Commercial Billing & Settlement Documents)
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    booking_id INTEGER NOT NULL,
    rental_id INTEGER,
    customer_id INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    base_amount REAL NOT NULL CHECK(base_amount >= 0),
    extra_km_amount REAL NOT NULL DEFAULT 0,
    extra_hours_amount REAL NOT NULL DEFAULT 0,
    late_fee_amount REAL NOT NULL DEFAULT 0,
    damage_amount REAL NOT NULL DEFAULT 0,
    fuel_penalty_amount REAL NOT NULL DEFAULT 0,
    toll_parking_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    paid_amount REAL NOT NULL DEFAULT 0,
    balance_due REAL NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK(payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- 16. Rental Charges Table (Itemized Ledger Items)
CREATE TABLE IF NOT EXISTS rental_charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_id INTEGER,
    booking_id INTEGER,
    invoice_id INTEGER,
    charge_type TEXT NOT NULL CHECK(charge_type IN (
        'BASE_RENTAL', 'EXTRA_KM', 'EXTRA_HOURS', 'LATE_RETURN', 'DAMAGE', 
        'FUEL_PENALTY', 'TOLL_PARKING', 'CLEANING', 'DISCOUNT', 'CANCELLATION_FEE', 'MISC'
    )),
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_rate REAL NOT NULL,
    tax_rate REAL NOT NULL DEFAULT 18.0,
    amount REAL NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

-- 17. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_ref TEXT NOT NULL UNIQUE,
    invoice_id INTEGER,
    booking_id INTEGER,
    rental_id INTEGER,
    customer_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method TEXT NOT NULL CHECK(payment_method IN (
        'UPI', 'UPI_TRANSFER', 'CARD', 'NET_BANKING', 'BANK_TRANSFER', 'CASH', 'DEPOSIT_ADJUST'
    )),
    status TEXT NOT NULL DEFAULT 'PAID' CHECK(status IN ('PAID', 'PARTIAL', 'PENDING', 'REFUNDED', 'FAILED')),
    transaction_ref TEXT,
    notes TEXT,
    recorded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 18. Fines & Penalties Table
CREATE TABLE IF NOT EXISTS fines_charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    charge_type TEXT NOT NULL CHECK(charge_type IN ('LATE_RETURN', 'DAMAGE', 'FUEL_PENALTY', 'TOLL_TRAFFIC', 'CLEANING')),
    amount REAL NOT NULL CHECK(amount >= 0),
    reason TEXT,
    is_paid INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE
);

-- 19. Fuel Logs Table (Fleet Efficiency & Expense Audits)
CREATE TABLE IF NOT EXISTS fuel_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    logged_by_staff_id INTEGER,
    fill_date DATE NOT NULL,
    odometer_reading INTEGER NOT NULL,
    litres REAL NOT NULL CHECK(litres > 0),
    rate_per_litre REAL NOT NULL CHECK(rate_per_litre > 0),
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    fuel_station TEXT,
    payment_method TEXT DEFAULT 'CARD',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (logged_by_staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 20. Expenses Table (Fleet Costing, Tolls, Insurance, Staffing)
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    branch_id INTEGER,
    category TEXT NOT NULL CHECK(category IN (
        'FUEL', 'MAINTENANCE', 'INSURANCE', 'PERMIT', 'PUC', 'CLEANING', 
        'TOLL_PARKING', 'REPAIRS', 'STAFF_DRIVER', 'MISC'
    )),
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    expense_date DATE NOT NULL,
    vendor_name TEXT,
    invoice_ref TEXT,
    payment_method TEXT DEFAULT 'BANK_TRANSFER',
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 21. Maintenance Table
CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    maintenance_type TEXT NOT NULL CHECK(maintenance_type IN (
        'PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'SCHEDULED_SERVICE', 
        'TYRE_REPLACEMENT', 'OIL_CHANGE', 'BRAKE_SERVICE', 'BATTERY', 'BODY_WORK', 'ROUTINE_SERVICE', 'REPAIR', 'INSPECTION'
    )),
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    parts_cost REAL NOT NULL DEFAULT 0 CHECK(parts_cost >= 0),
    labour_cost REAL NOT NULL DEFAULT 0 CHECK(labour_cost >= 0),
    cost REAL NOT NULL DEFAULT 0 CHECK(cost >= 0),
    service_provider TEXT,
    next_service_mileage INTEGER,
    next_service_date DATE,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
);

-- 22. Approvals Table (Governance & Admin Decision Queue)
CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    approval_type TEXT NOT NULL CHECK(approval_type IN (
        'BOOKING_APPROVAL', 'RENTAL_EXTENSION', 'CANCELLATION_REFUND', 
        'DAMAGE_WAIVER', 'MAINTENANCE_JOB', 'EXPENSE_OVER_LIMIT', 'VEHICLE_RETIREMENT'
    )),
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    requested_by_user_id INTEGER NOT NULL,
    reviewed_by_user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    request_details TEXT NOT NULL,
    decision_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 23. Notifications Table (System Alerts & Message Center)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFO' CHECK(type IN ('INFO', 'SUCCESS', 'WARNING', 'URGENT', 'CRITICAL')),
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 24. Support Tickets Table (Customer CRM & Issue Escalation)
CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_ref TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    booking_id INTEGER,
    subject TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL' CHECK(category IN ('BOOKING', 'BILLING', 'VEHICLE_ISSUE', 'ACCIDENT_BREAKDOWN', 'GENERAL')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    message TEXT NOT NULL,
    staff_response TEXT,
    assigned_staff_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- 25. Audit Logs Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 26. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relational Indexes for Optimal Query Execution
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_branch ON vehicles(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_dates ON bookings(vehicle_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
