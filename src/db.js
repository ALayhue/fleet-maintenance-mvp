// src/db.js - SQLite and schema init
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const dbPath = path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

function initDb() {
  db.pragma('journal_mode = WAL');
  db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','driver','technician')),
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tractor','trailer')),
    make TEXT,
    model TEXT,
    year INTEGER,
    vin TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checklist_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('tractor','trailer')),
    title TEXT NOT NULL,
    created_by_user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    is_required INTEGER DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    driver_id INTEGER,
    technician_id INTEGER,
    company_name TEXT,
    mileage INTEGER,
    estimated_time_minutes INTEGER,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS maintenance_record_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    item_id INTEGER,
    status TEXT CHECK (status IN ('pass','fail','repair_needed')) DEFAULT 'pass',
    comments TEXT,
    photo_url TEXT,
    FOREIGN KEY (record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    signature_image_url TEXT NOT NULL,
    signed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE
  );
  `);

  seedTemplates();
}

function seedTemplates() {
  const count = db.prepare(`SELECT COUNT(*) as c FROM checklist_templates`).get().c;
  if (count > 0) return;

  // Create default templates and items
  const insertTpl = db.prepare(`INSERT INTO checklist_templates (vehicle_type, title) VALUES (?, ?)`);
  const tractorTplId = insertTpl.run('tractor', 'Tractor Major Systems').lastInsertRowid;
  const trailerTplId = insertTpl.run('trailer', 'Trailer Major Systems').lastInsertRowid;

  const insertItem = db.prepare(`INSERT INTO checklist_items (template_id, item_name, description) VALUES (?, ?, ?)`);
  const tractorItems = [
    ['Engine', 'Leaks, belts, hoses'],
    ['Brakes', 'Pads, lines, air system'],
    ['Tires/Wheels', 'Tread, pressure, lug nuts'],
    ['Lights/Electrical', 'Headlights, turn signals, wiring'],
    ['Suspension/Steering', 'Shocks, bushings, steering play'],
    ['Fluids', 'Oil, coolant, brake fluid'],
    ['Exhaust', 'Leaks, mounting'],
    ['Cab/Interior', 'Horn, seat belts, mirrors']
  ];
  tractorItems.forEach(([name, desc]) => insertItem.run(tractorTplId, name, desc));

  const trailerItems = [
    ['Coupling/Kingpin', 'Locking mechanism, wear'],
    ['Landing Gear', 'Operation, damage'],
    ['Brakes', 'Drums, lines'],
    ['Tires/Wheels', 'Tread, pressure, lug nuts'],
    ['Lights/Electrical', 'Marker, brake, wiring'],
    ['Doors/Seals', 'Operation, damage'],
    ['Frame/Crossmembers', 'Cracks, rust'],
    ['Suspension', 'Springs, bushings']
  ];
  trailerItems.forEach(([name, desc]) => insertItem.run(trailerTplId, name, desc));
}

function createDefaultUsers() {
  const admin = db.prepare(`SELECT * FROM users WHERE email = ?`).get('admin@example.com');
  if (!admin) {
    db.prepare(`INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)`)
      .run('Admin', 'admin@example.com', 'admin', bcrypt.hashSync('admin123', 10));
  }
  const driver = db.prepare(`SELECT * FROM users WHERE email = ?`).get('driver@example.com');
  if (!driver) {
    db.prepare(`INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)`)
      .run('Driver', 'driver@example.com', 'driver', bcrypt.hashSync('driver123', 10));
  }
}

function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

module.exports = { db, initDb, getUserByEmail, createDefaultUsers };
