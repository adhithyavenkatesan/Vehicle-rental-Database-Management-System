const fs = require('fs');
const path = require('path');
const { execScript, db } = require('./index');

function runMigrations(fresh = false) {
  console.log(`Running database schema migrations (fresh: ${fresh})...`);
  
  if (fresh) {
    console.log('Resetting existing database tables...');
    execScript(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS password_reset_tokens;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS support_tickets;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS approvals;
      DROP TABLE IF EXISTS maintenance;
      DROP TABLE IF EXISTS expenses;
      DROP TABLE IF EXISTS fuel_logs;
      DROP TABLE IF EXISTS fines_charges;
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS rental_charges;
      DROP TABLE IF EXISTS invoices;
      DROP TABLE IF EXISTS returns;
      DROP TABLE IF EXISTS inspections;
      DROP TABLE IF EXISTS rentals;
      DROP TABLE IF EXISTS rental_agreements;
      DROP TABLE IF EXISTS bookings;
      DROP TABLE IF EXISTS rate_cards;
      DROP TABLE IF EXISTS vehicles;
      DROP TABLE IF EXISTS vehicle_categories;
      DROP TABLE IF EXISTS staff;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS locations;
      DROP TABLE IF EXISTS branches;
      DROP TABLE IF EXISTS system_settings;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS roles;
      PRAGMA foreign_keys = ON;
    `);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  execScript(schemaSql);
  console.log('Database schema successfully migrated.');
}

if (require.main === module) {
  try {
    const isFresh = process.argv.includes('--fresh') || process.argv.includes('-f');
    runMigrations(isFresh);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

module.exports = { runMigrations };
