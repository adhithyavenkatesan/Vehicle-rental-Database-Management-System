# 🚗 RentDrive Enterprise — Vehicle Rental Database Management System

A production-grade, commercial **Vehicle Rental Database Management System (DBMS)** built with a normalized relational database engine, strict referential integrity constraints, role-based access control, real-time fleet operations, dynamic financial ledgers, and an interactive DBMS administration hub.

---

## 🌟 Key System Capabilities

- **Relational Integrity & Normalization**: Built upon a normalized SQLite3 relational architecture with foreign keys enabled (`PRAGMA foreign_keys = ON;`), WAL mode, primary keys, and composite indexes.
- **Double Booking Prevention**: Enforces strict mathematical interval overlap checks (`start_date < existing_end_date AND end_date > existing_start_date`) to prevent double-booking identical vehicles.
- **Operational Rental Lifecycle**:
  `Booking (Confirmed) ➔ Vehicle Handover (Odometer & Fuel Check) ➔ Active Rental ➔ Return & Condition Inspection ➔ Auto-Settle Fines & Restoration to Available`.
- **Intelligent Return Calculator**: Automatic calculation of overdue hours, late return fees, fuel penalties, and damage charges. Auto-routes damaged vehicles to maintenance.
- **Fleet Maintenance Lock**: Taking a vehicle under service automatically locks it from customer booking and dispatch until certified and restored.
- **Dedicated DBMS Administration Hub**:
  - Live relational schema viewer (columns, data types, primary keys, foreign keys, row counts).
  - Paginated table row browser.
  - Interactive SQL Query Console (execute live SQL-92 / SQLite queries).
  - One-click full database JSON backup export.
- **Role-Based Access Control (RBAC)**: Distinct permissions for **Admin**, **Staff**, and **Customer**.
- **Strict Authentication Gate**: Initial screen is strictly the enterprise Login Page with zero dashboard exposure before real database authentication. No instant role switches or mock bypasses.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Database** | SQLite3 (`node:sqlite` Native Engine) with WAL mode & Foreign Keys |
| **Backend API** | Node.js, Express 5, JWT (`jsonwebtoken`), `bcryptjs`, CORS |
| **Frontend UI** | React 19, Vite, Vanilla CSS Design System with Glassmorphism |
| **Icons & Typography** | `lucide-react`, Google Fonts (*Plus Jakarta Sans*, *Outfit*, *JetBrains Mono*) |
| **Testing** | Node.js Native Test Runner (`node:test`, `node:assert`) |

---

## 👥 Active Database Credentials (Username or Email Supported)

| Role | Username | Email | Password | Scope & Dashboard |
|---|---|---|---|---|
| **ADMIN** | `admin` | `admin@rentdrive.com` | `Admin@12345` | Full Fleet, Financials, DBMS Hub, Staff Management (`/admin/dashboard`) |
| **STAFF** | `staff` | `staff@rentdrive.com` | `Staff@12345` | Counter Operations, Dispatches, Returns, Digital Inspections (`/staff/dashboard`) |
| **CUSTOMER** | `customer` | `customer@rentdrive.com` | `Customer@12345` | Self-Drive Catalog, Trip Bookings, Digital Agreements (`/customer/dashboard`) |

---

## 📊 Enterprise Relational Database Architecture

The system normalizes 26 relational database entities:

1. `roles` (System authorization roles: ADMIN, STAFF, CUSTOMER)
2. `users` (Authentication, bcrypt hashed credentials, phone, account status, lockout tracking, last login)
3. `password_reset_tokens` (Cryptographic SHA-256 hashed reset tokens with 30m expiration)
4. `branches` (Multi-branch depot operations, addresses, contact details, operating hours)
5. `locations` (Airport terminal & depot pickup/dropoff stations)
6. `customers` (KYC details, driving license numbers, expiry, verified address, ID proof)
7. `staff` (Employee code, department, designation, branch assignment, hire date)
8. `vehicle_categories` (Class specifications, daily rates, deposit amounts)
9. `vehicles` (License plates, VIN, make, model, year, specs, fuel, status: AVAILABLE, RESERVED, RENTED, MAINTENANCE, etc.)
10. `rate_cards` (Dynamic pricing engine: daily, hourly, weekend multiplier, extra KM, late fee parameters)
11. `bookings` (Date intervals, estimated total fare, double-booking interval overlap prevention)
12. `rental_agreements` (Digital contracts, liability limits, fuel policies, terms, customer/staff signatures)
13. `rentals` (Dispatch handover records, pickup odometer, fuel level, staff handler)
14. `inspections` (Digital pickup & return quality checklists, exterior/interior/tyres condition, damage photos/costs)
15. `returns` (Return timestamp, return odometer, fuel penalty, damage fees, condition settlement)
16. `invoices` (Commercial billing statements, itemized charges, discount, taxes, balance due)
17. `rental_charges` (Itemized financial ledger items: base rental, extra km, late fees, damage, penalties)
18. `payments` (Reconciled transaction ledger, payment methods: UPI, Card, NetBanking, Cash)
19. `fines_charges` (Itemized overdue and repair fee line items)
20. `fuel_logs` (Fleet efficiency & fuel tracking, odometer readings, litres, KM/L calculations)
21. `expenses` (Fleet operational costs: maintenance, insurance, permits, cleaning, toll/parking)
22. `maintenance` (Workshop service tickets, preventive/corrective, parts/labour costs, next service date)
23. `approvals` (Governance queue: booking approvals, rental extensions, refunds, damage waivers, expense limits)
24. `notifications` (Real-time system alerts, unread counts, action links)
25. `support_tickets` (Customer CRM help desk, issue prioritization, staff assignments, resolution notes)
26. `audit_logs` (Immutable security and operational event trail with IP tracking)
27. `system_settings` (Configurable tax rates, currency codes, late fee parameters)

---

## 🔐 Complete Authentication Engine

- **Strict Manual Login**: The first and only screen when navigating to `http://localhost:5000` is the **Login Page**. Both username and password inputs start completely empty.
- **No Role Switch / Demo Login**: There are no instant role switches, mock login shortcuts, or pre-filled forms anywhere in the application.
- **Real Database Verification**: Passwords are securely hashed with `bcryptjs`. Failed logins increment `failed_login_attempts` and trigger a 15-minute temporary lockout after 5 consecutive failures.
- **Public Customer Registration**: Public `/register` assigns exclusively the `CUSTOMER` role (no public Admin or Staff creation), rejects duplicate emails, requires strong passwords, and redirects to `/login` without automatic sign-in.
- **Forgot & Reset Password Workflow**: Generates cryptographically secure 32-byte tokens hashed via SHA-256 into the database with a 30-minute expiration. For local development, the reset link is cleanly output to the server console: `http://localhost:5000/reset-password/<token>`.
- **Role-Based Redirection**:
  - `ADMIN` ➔ `/admin/dashboard` (Executive KPI metrics, 10 metric cards, DBMS hub, governance queue, reports)
  - `STAFF` ➔ `/staff/dashboard` (Dispatch desk, active pickups, returns check-in, inspections)
  - `CUSTOMER` ➔ `/customer/dashboard` (Self-drive portal, fleet catalog, trip reservations, personal invoices)

---

## 🚀 Quick Start Guide

The project is structured with a decoupled **Frontend (`client/`)** and **Backend (`server/`)** architecture. You can run both concurrently in development with one command, or run each independently.

### 1. Database Setup & Seeding
```bash
npm run seed
```
Creates all 26 relational tables with strict foreign key constraints and populates authentic test records (Admin, Staff, Customer accounts, vehicles, and rate cards).

### 2. Run Both Frontend & Backend Concurrently (Recommended for Development)
```bash
npm run dev
```
- **Backend API**: Starts on `http://localhost:5000` (with live reload via `--watch`)
- **Frontend App**: Starts on `http://localhost:5173` (Vite dev server with HMR)
- Vite automatically proxies `/api/*` network requests to `http://localhost:5000`.

---

## 💻 Running Frontend & Backend Independently

You can also run or develop each layer in isolation:

### Option A: Run Backend API Alone
```bash
# From root:
npm run server

# OR navigate to the server folder:
cd server
npm start
```
- Listens on `http://localhost:5000`
- Available endpoints: `/api/vehicles`, `/api/bookings`, `/api/rentals`, `/api/returns`, `/api/database`, etc.
- Health check: `http://localhost:5000/api/health`

### Option B: Run Frontend Alone
```bash
# From root:
npm run client

# OR navigate to the client folder:
cd client
npm run dev
```
- Serves the React 19 UI on `http://localhost:5173`

---

## 🧪 Testing & Production Build

### Run Integration Tests
```bash
npm test
```
Executes 26 comprehensive integration tests covering Auth, RBAC, Vehicle CRUD, Double Booking Prevention, Dispatch Handover, Return Penalties, Maintenance Locks, and DBMS JSON exports.

### Run End-to-End Authentication Verification
```bash
node scratch/test-full-auth.js
```
Executes all 20 end-to-end authentication scenarios validating input validation, login, lockout, registration, forgot password, token expiration, password change in database, and role clearance.

### Unified Production Build & Serve
```bash
npm run build
npm start
```
Compiles optimized client assets to `client/dist/` and serves both the API and UI from a single unified server on `http://localhost:5000`.

