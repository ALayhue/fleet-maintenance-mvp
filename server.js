// server.js - Express API + static client + Socket.IO
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const fileUpload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const { Server } = require('socket.io');
const http = require('http');

const { db, initDb, getUserByEmail, createDefaultUsers } = require('./src/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Middlewares
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
} else {
  app.use(cors());
}

// File uploads dir
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Nodemailer transport (optional)
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Auth middleware
function auth(requiredRole = null) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing token' });
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Socket.IO
io.on('connection', (socket) => {
  // In a real app, authenticate here
  console.log('socket connected');
  socket.on('disconnect', () => console.log('socket disconnected'));
});

// Routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.role, name: user.name });
});

// Units
app.get('/api/units', auth(), (req, res) => {
  const rows = db.prepare(`SELECT * FROM units ORDER BY unit_number`).all();
  res.json(rows);
});
app.post('/api/units', auth('admin'), (req, res) => {
  const { unit_number, type, make, model, year, vin } = req.body;
  const stmt = db.prepare(`INSERT INTO units (unit_number, type, make, model, year, vin) VALUES (?, ?, ?, ?, ?, ?)`);
  try {
    const info = stmt.run(unit_number, type, make || '', model || '', year || null, vin || '');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Checklist templates
app.get('/api/checklist-templates', auth(), (req, res) => {
  const { vehicle_type } = req.query;
  const rows = db.prepare(`SELECT * FROM checklist_templates WHERE vehicle_type = ?`).all(vehicle_type || 'tractor');
  const items = db.prepare(`SELECT * FROM checklist_items WHERE template_id IN (SELECT id FROM checklist_templates WHERE vehicle_type = ?)`)
    .all(vehicle_type || 'tractor');
  res.json({ templates: rows, items });
});

// Create maintenance record
app.post('/api/maintenance-records', auth(), (req, res) => {
  // Expect JSON fields + optional files (photos[], signature)
  const {
    unit_id, driver_id, technician_id, company_name, mileage,
    estimated_time_minutes, notes, checklistItems // [{item_id, status, comments}]
  } = req.body;

  // Save signature/photo uploads if present
  let signature_url = null;
  if (req.files && req.files.signature) {
    const sig = Array.isArray(req.files.signature) ? req.files.signature[0] : req.files.signature;
    const name = 'sig_' + Date.now() + '_' + sig.name.replace(/\s+/g, '_');
    const savePath = path.join(uploadsDir, name);
    sig.mv(savePath);
    signature_url = '/uploads/' + name;
  }

  const insertRec = db.prepare(`INSERT INTO maintenance_records
    (unit_id, driver_id, technician_id, company_name, mileage, estimated_time_minutes, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'))
  `);
  const info = insertRec.run(unit_id, driver_id || null, technician_id || null, company_name || '', mileage || 0, estimated_time_minutes || 0, notes || '');
  const record_id = info.lastInsertRowid;

  if (signature_url) {
    db.prepare(`INSERT INTO signatures (record_id, signature_image_url, signed_at) VALUES (?, ?, datetime('now'))`)
      .run(record_id, signature_url);
  }

  // checklist items
  let parsed = [];
  try { parsed = JSON.parse(checklistItems || '[]'); } catch {}
  const insertItem = db.prepare(`INSERT INTO maintenance_record_items (record_id, item_id, status, comments, photo_url) VALUES (?, ?, ?, ?, ?)`);
  const insertMany = db.transaction((items) => {
    items.forEach(i => insertItem.run(record_id, i.item_id, i.status || 'pass', i.comments || '', i.photo_url || ''));
  });
  insertMany(parsed);

  // Notify admins
  const unit = db.prepare(`SELECT unit_number FROM units WHERE id = ?`).get(unit_id);
  const driver = driver_id ? db.prepare(`SELECT name FROM users WHERE id = ?`).get(driver_id) : { name: 'N/A' };
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

  // Socket.IO broadcast
  io.emit('newRecord', { record_id, unitNumber: unit?.unit_number, driverName: driver?.name || 'N/A' });

  // Email
  if (transporter && admins.length) {
    const mail = {
      from: 'noreply@fleet.local',
      to: admins.join(','),
      subject: `New maintenance record - Unit ${unit?.unit_number}`,
      html: `<p>A new maintenance record was submitted by <b>${driver?.name || 'N/A'}</b> for unit <b>${unit?.unit_number}</b>.</p>
             <p>Estimated time: ${estimated_time_minutes || 0} minutes</p>`
    };
    transporter.sendMail(mail).catch(console.error);
  } else {
    console.log('[notify] New record created for unit', unit?.unit_number);
  }

  res.status(201).json({ id: record_id });
});

// List maintenance records (filter by unit_id)
app.get('/api/maintenance-records', auth(), (req, res) => {
  const { unit_id } = req.query;
  let rows;
  if (unit_id) {
    rows = db.prepare(`SELECT mr.*, u.unit_number FROM maintenance_records mr
                       JOIN units u ON u.id = mr.unit_id WHERE unit_id = ? ORDER BY created_at DESC`).all(unit_id);
  } else {
    rows = db.prepare(`SELECT mr.*, u.unit_number FROM maintenance_records mr
                       JOIN units u ON u.id = mr.unit_id ORDER BY created_at DESC`).all();
  }
  res.json(rows);
});

// Users (admin can create technicians/drivers)
app.get('/api/users', auth('admin'), (req, res) => {
  const rows = db.prepare(`SELECT id, name, email, role FROM users ORDER BY created_at DESC`).all();
  res.json(rows);
});
app.post('/api/users', auth('admin'), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare(`INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)`)
      .run(name, email, role, hash);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve client (built React)
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

initDb();
createDefaultUsers();

server.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
