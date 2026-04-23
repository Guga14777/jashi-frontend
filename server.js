// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const app = express();

// --- middleware ---
app.use(cors());
app.use(express.json());

// --- config ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DB_PATH = process.env.DB_PATH || './app-data.sqlite';
const PORT = Number(process.env.PORT) || 5182;

// --- db ---
const db = new Database(DB_PATH);

// --- bootstrap tables (idempotent) ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT, last_name TEXT,
  phone TEXT, role TEXT DEFAULT 'customer',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  route_from TEXT, route_to TEXT,
  vehicle TEXT, price INTEGER,
  status TEXT, eta_days INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// --- helpers ---
const newId = (p) =>
  `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const auth = (req, res, next) => {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  try {
    if (!token) throw new Error('no token');
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// --- health ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Auth: register/login/me ---
app.post(
  '/api/auth/register',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      email,
      password,
      firstName = '',
      lastName = '',
      phone = '',
      role = 'customer',
    } = req.body;

    const normalizedEmail = (email || '').toLowerCase();
    const exists = db
      .prepare('SELECT 1 FROM users WHERE email = ?')
      .get(normalizedEmail);
    if (exists) return res.status(409).json({ error: 'Email already exists' });

    const id = newId('usr');
    const hash = await bcrypt.hash(password, 10);
    db.prepare(
      `INSERT INTO users (id,email,password_hash,first_name,last_name,phone,role)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(id, normalizedEmail, hash, firstName, lastName, phone, role);

    const token = jwt.sign({ id, role, email: normalizedEmail }, JWT_SECRET, {
      expiresIn: '7d',
    });
    return res.json({
      token,
      user: { id, email: normalizedEmail, firstName, lastName, phone, role },
    });
  },
);

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase();
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizedEmail);
  if (!row) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: row.id, role: row.role, email: row.email },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
  res.json({
    token,
    user: {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      role: row.role,
    },
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({
    user: {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      role: row.role,
    },
  });
});

// --- Quotes ---
app.post('/api/quotes', auth, (req, res) => {
  const id = newId('qte');
  const payload = JSON.stringify(req.body || {});
  db.prepare('INSERT INTO quotes (id,user_id,payload) VALUES (?,?,?)').run(
    id,
    req.user.id,
    payload,
  );
  res.json({ id });
});

app.get('/api/quotes', auth, (req, res) => {
  const rows = db
    .prepare(
      'SELECT id,payload,created_at FROM quotes WHERE user_id=? ORDER BY created_at DESC',
    )
    .all(req.user.id);
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      ...JSON.parse(r.payload),
      createdAt: r.created_at,
    })),
  });
});

// --- Shipments ---
app.get('/api/shipments', auth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM shipments WHERE user_id=? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ items: rows });
});

// Optional seed
app.post('/api/dev/seed-shipment', auth, (req, res) => {
  const id = newId('shp');
  const {
    from = 'Atlanta, GA',
    to = 'Beverly Hills, CA',
    vehicle = '2022 Toyota Camry',
    price = 1250,
    status = 'Accepted',
    etaDays = 2,
  } = req.body || {};
  db.prepare(
    `INSERT INTO shipments (id,user_id,route_from,route_to,vehicle,price,status,eta_days)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(id, req.user.id, from, to, vehicle, price, status, etaDays);
  res.json({ id });
});

// --- start server ---
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
