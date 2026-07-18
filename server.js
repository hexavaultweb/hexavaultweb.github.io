/**
 * server.js — HexaVault Diamond backend
 * REST API + static file server. Menjalankan: `npm install && npm start`
 * lalu buka http://localhost:3000
 */
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { load, save } = require('./lib/db');
const TIER_CONFIG = require('./shared/tier-benefits.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Password & token helpers (built-in crypto, no extra deps) ---------- */
function hashPassword(password, salt){
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash){
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(check, 'hex'), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function genToken(){ return crypto.randomBytes(24).toString('hex'); }

/* ---------- Tier / membership benefit helpers ----------
   Semua transaksi (topup & joki) menghitung diskon & cashback poin berdasarkan
   TIER USER SAAT INI (dihitung dari poin yang sudah ia miliki SEBELUM transaksi
   ini berjalan) — bukan dari input client — supaya tidak bisa dimanipulasi. */
function getBenefit(points){
  return TIER_CONFIG.tiers.find(t => points >= t.min && (t.max === null || points <= t.max)) || TIER_CONFIG.tiers[0];
}
function publicUser(u){
  const benefit = getBenefit(u.points);
  return {
    id: u.id, name: u.name, email: u.email, points: u.points, stamps: u.stamps,
    tier: { name: benefit.name, emoji: benefit.emoji, discPct: benefit.discPct, pointMult: benefit.pointMult, stampPerTx: benefit.stampPerTx }
  };
}

/* ---------- Auth middleware ---------- */
function requireAuth(req, res, next){
  // DEV-ONLY bypass: aktif HANYA kalau dijalankan dengan `DEV_NO_AUTH=1 npm start`.
  // Dipakai untuk mendesain halaman yang butuh login (mis. tukar poin) tanpa harus
  // login dulu. Default OFF, jadi produksi/Render tetap aman SELAMA env ini tidak diset.
  if(process.env.DEV_NO_AUTH === '1'){
    const db = load();
    const user = db.users[0];
    if(!user) return res.status(500).json({ error: 'DEV_NO_AUTH: belum ada user di data/db.json' });
    console.warn('⚠️  DEV_NO_AUTH aktif — auth di-bypass sebagai user:', user.email);
    req.user = user; req.db = db;
    return next();
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if(!token) return res.status(401).json({ error: 'Belum login' });
  const db = load();
  const session = db.sessions.find(s => s.token === token);
  if(!session) return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' });
  const user = db.users.find(u => u.id === session.userId);
  if(!user) return res.status(401).json({ error: 'Akun tidak ditemukan' });
  req.user = user; req.db = db;
  next();
}

/* ---------- TIER CONFIG (public, dipakai frontend untuk preview diskon) ---------- */
app.get('/api/tiers', (req, res) => {
  res.json({ tiers: TIER_CONFIG.tiers });
});

/* ---------- AUTH ROUTES ---------- */
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if(!name || !email || !password) return res.status(400).json({ error: 'Lengkapi semua data pendaftaran' });
  const db = load();
  if(db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase())){
    return res.status(409).json({ error: 'Email sudah terdaftar, silakan masuk' });
  }
  const { salt, hash } = hashPassword(password);
  const user = { id: db.nextUserId++, name, email, salt, hash, points: 0, stamps: 0, createdAt: new Date().toISOString() };
  db.users.push(user);
  const token = genToken();
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  save(db);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const db = load();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if(!user || !verifyPassword(password || '', user.salt, user.hash)){
    return res.status(401).json({ error: 'Email atau kata sandi salah' });
  }
  const token = genToken();
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  save(db);
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.slice(7);
  const db = req.db;
  db.sessions = db.sessions.filter(s => s.token !== token);
  save(db);
  res.json({ ok: true });
});

/* ---------- TRANSACTIONS ---------- */
// Membuat transaksi. `nominal` yang dikirim client adalah HARGA ASLI (sebelum
// diskon member) — server yang menghitung ulang diskon berdasarkan tier user
// SAAT INI (dari poin yang sudah dimiliki, bukan dari input client), lalu
// itulah yang jadi nominal final yang tersimpan & poin/stempel yang didapat.
// Ini mencegah client mengaku-aku diskon tier yang tidak sesuai haknya.
app.post('/api/transactions', requireAuth, (req, res) => {
  const { source, orderId, item, nominal, method, status, meta } = req.body || {};
  if(!source || !orderId || !item || nominal === undefined || !method || !status){
    return res.status(400).json({ error: 'Data transaksi tidak lengkap' });
  }
  const db = req.db;
  const benefit = getBenefit(req.user.points); // tier SEBELUM transaksi ini dihitung
  const grossNominal = Math.round(nominal);
  const discountAmount = Math.round(grossNominal * benefit.discPct);
  const finalNominal = grossNominal - discountAmount;

  const tx = {
    id: db.nextTxId++, userId: req.user.id, source, orderId, item,
    grossNominal, discountAmount, nominal: finalNominal, method, status,
    tierAtPurchase: benefit.name,
    meta: meta || {}, createdAt: new Date().toISOString()
  };
  db.transactions.push(tx);

  let bonusAwarded = false;
  let poinEarned = 0;
  let stampsAdded = 0;
  if((source === 'topup' || source === 'joki') && status === 'success'){
    poinEarned = Math.floor((finalNominal / 1000) * benefit.pointMult);
    stampsAdded = benefit.stampPerTx;
    req.user.points += poinEarned;
    req.user.stamps += stampsAdded;
    // Stempel bisa nambah lebih dari 1 per transaksi (tier Gold/Platinum), jadi
    // dicek pakai while supaya tetap benar walau langsung tembus/lewat 10.
    while(req.user.stamps >= 10){
      req.user.stamps -= 10;
      bonusAwarded = true;
      db.transactions.push({
        id: db.nextTxId++, userId: req.user.id, source: 'topup', orderId: 'BONUS-' + Date.now() + '-' + db.nextTxId,
        item: '🎁 Bonus 55 Diamond (Reward Stempel ke-10)', grossNominal: 0, discountAmount: 0, nominal: 0,
        method: 'Reward Stempel', status: 'success', tierAtPurchase: benefit.name, meta: {}, createdAt: new Date().toISOString()
      });
    }
  }
  save(db);
  res.json({
    transaction: tx, user: publicUser(req.user), bonusAwarded,
    benefit: { tier: benefit.name, emoji: benefit.emoji, discPct: benefit.discPct, pointMult: benefit.pointMult, stampPerTx: benefit.stampPerTx },
    poinEarned, stampsAdded, grossNominal, discountAmount, finalNominal
  });
});

app.get('/api/transactions', requireAuth, (req, res) => {
  const source = req.query.source;
  let list = req.db.transactions.filter(t => t.userId === req.user.id);
  if(source) list = list.filter(t => t.source === source);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ transactions: list });
});

/* ---------- REDEEM POIN ---------- */
app.post('/api/redeem', requireAuth, (req, res) => {
  const { points, diamonds } = req.body || {};
  if(!points || !diamonds) return res.status(400).json({ error: 'Data redeem tidak valid' });
  const db = req.db;
  if(req.user.points < points) return res.status(400).json({ error: 'Poin tidak cukup' });
  req.user.points -= points;
  const tx = {
    id: db.nextTxId++, userId: req.user.id, source: 'topup', orderId: 'RDM-' + Date.now(),
    item: `🔄 Redeem ${diamonds} Diamond (Poin)`, grossNominal: 0, discountAmount: 0, nominal: 0, method: 'Tukar Poin', status: 'success',
    tierAtPurchase: getBenefit(req.user.points).name, meta: {}, createdAt: new Date().toISOString()
  };
  db.transactions.push(tx);
  save(db);
  res.json({ user: publicUser(req.user), transaction: tx });
});

app.listen(PORT, () => {
  console.log(`✅ HexaVault Diamond server jalan di http://localhost:${PORT}`);
});
