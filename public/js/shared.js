/* ==========================================================================
   SHARED.JS — logic shared by index.html (topup) and joki-ml.html (joki):
   toast, modals, auth (now backed by the real Express + JSON-file database in
   server.js — see js/api.js), payment method selector, and a REAL EMVCo-format
   QRIS payload generator (with valid CRC16 checksum) rendered into a scannable
   QR via the CDN "qrcode" library.

   Login persists automatically across reloads AND across both pages via a
   token stored in localStorage (see restoreSession()) — you only log in once.

   IMPORTANT (be transparent with users of this template):
   The QRIS payload is *structurally valid* EMVCo/QRIS — scanning it with any
   generic EMV QR reader will correctly show the transaction amount you set.
   It is NOT connected to a real acquirer/bank, so it will not settle an
   actual payment. To go live, register as a QRIS merchant with a licensed
   Payment System Provider (PJSP) and use their official API/NMID.
   ========================================================================== */

/* ---------- Toast ---------- */
function toast(msg, isError){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast';
  if(isError){ t.style.borderColor = 'var(--danger)'; t.style.borderLeftColor = 'var(--danger)'; }
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, 3500);
}

/* ---------- Modal helpers ---------- */
function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){ document.getElementById(id).classList.remove('show'); }

/* ---------- Tier / membership benefit config ----------
   Diambil dari server (shared/tier-benefits.json lewat GET /api/tiers) supaya
   nilai diskon & cashback poin yang ditampilkan di UI SELALU sinkron dengan
   yang benar-benar dihitung & divalidasi ulang di server saat transaksi. */
const TIER_STATE = { tiers: [] };
async function loadTierConfig(){
  try{
    const data = await apiFetch('/api/tiers');
    TIER_STATE.tiers = data.tiers;
  }catch(e){
    console.error('Gagal memuat konfigurasi tier:', e.message);
    TIER_STATE.tiers = [{ name:'Bronze', min:0, max:null, discPct:0, pointMult:1, stampPerTx:1, emoji:'🥉' }];
  }
}
function getBenefitForPoints(points){
  return TIER_STATE.tiers.find(t => points >= t.min && (t.max === null || points <= t.max)) || TIER_STATE.tiers[0];
}
/** Harga setelah diskon member, dibulatkan ke rupiah penuh. */
function applyTierDiscount(price, benefit){
  const b = benefit || (AUTH.currentUser ? getBenefitForPoints(AUTH.currentUser.points) : TIER_STATE.tiers[0]);
  const discountAmount = Math.round(price * b.discPct);
  return { finalPrice: price - discountAmount, discountAmount, benefit: b };
}
/** Badge kecil "Diskon Member (Gold -3%)" — dipakai di summary & resi. Kosong kalau diskon 0%. */
function tierDiscountBadgeHtml(benefit){
  if(!benefit || benefit.discPct <= 0) return '';
  return `<span class="tier-badge-inline">${benefit.emoji} ${benefit.name} · Diskon Member -${Math.round(benefit.discPct*100)}%</span>`;
}

/* ---------- Auth (demo/in-memory only, resets on reload) ---------- */
const AUTH = { currentUser:null };
function switchAuth(which){
  document.getElementById('tabLogin').classList.toggle('active', which==='login');
  document.getElementById('tabRegister').classList.toggle('active', which==='register');
  document.getElementById('loginForm').style.display = which==='login' ? 'block':'none';
  document.getElementById('registerForm').style.display = which==='register' ? 'block':'none';
}
function setAuthLoading(isLoading){
  document.querySelectorAll('#authOverlay button').forEach(b=>b.disabled = isLoading);
}
async function doRegister(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  if(!name || !email || !pass){ toast('Lengkapi semua data pendaftaran', true); return; }
  setAuthLoading(true);
  try{
    const data = await apiFetch('/api/auth/register', { method:'POST', body: JSON.stringify({name, email, password: pass}) });
    setToken(data.token);
    AUTH.currentUser = data.user;
    afterLogin();
  }catch(e){ toast(e.message, true); } finally{ setAuthLoading(false); }
}
async function doLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if(!email || !pass){ toast('Isi email dan kata sandi', true); return; }
  setAuthLoading(true);
  try{
    const data = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({email, password: pass}) });
    setToken(data.token);
    AUTH.currentUser = data.user;
    afterLogin();
  }catch(e){ toast(e.message, true); } finally{ setAuthLoading(false); }
}
async function quickDemo(){
  setAuthLoading(true);
  const demoEmail = 'demo@hexavault.gg', demoPass = 'demo12345';
  try{
    let data;
    try{
      data = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({email:demoEmail, password:demoPass}) });
    }catch(_e){
      data = await apiFetch('/api/auth/register', { method:'POST', body: JSON.stringify({name:'Demo Player', email:demoEmail, password:demoPass}) });
    }
    setToken(data.token);
    AUTH.currentUser = data.user;
    afterLogin();
  }catch(e){ toast(e.message, true); } finally{ setAuthLoading(false); }
}
// Dipanggil sekali saat halaman dimuat — kalau token tersimpan masih valid,
// user langsung login otomatis tanpa perlu isi form lagi (persist di kedua halaman).
async function restoreSession(){
  const token = getToken();
  if(!token) return false;
  try{
    const data = await apiFetch('/api/auth/me');
    AUTH.currentUser = data.user;
    return true;
  }catch(e){
    clearToken();
    return false;
  }
}
function afterLogin(){
  closeModal('authOverlay');
  toast('Berhasil masuk sebagai ' + AUTH.currentUser.name);
  if(typeof window.onAfterLogin === 'function') window.onAfterLogin();
}
async function logout(){
  try{ await apiFetch('/api/auth/logout', { method:'POST' }); }catch(e){ /* ignore */ }
  clearToken();
  AUTH.currentUser = null;
  if(typeof window.onLogout === 'function') window.onLogout();
}
function renderNavRight(){
  const el = document.getElementById('navRight');
  if(!el) return;
  if(!AUTH.currentUser){
    el.innerHTML = `<button class="btn btn-grad" onclick="openModal('authOverlay')">Masuk / Daftar</button>`;
    return;
  }
  const extra = (typeof window.renderNavRightExtra === 'function') ? window.renderNavRightExtra() : '';
  el.innerHTML = `${extra}<div class="avatar" title="${AUTH.currentUser.name}">${AUTH.currentUser.name.charAt(0).toUpperCase()}</div>
    <button class="btn btn-ghost btn-sm" onclick="logout()">Keluar</button>`;
}

/* ---------- Payment methods (shared catalog + generic renderer) ---------- */
// Real brand SVG/PNG assets can't be redistributed here (trademarked). Drop
// official files into assets/logos/<id>.svg and they'll be used automatically
// — the colored fallback badge only shows if the image fails to load.
const PAY_CATEGORIES = {
  qris: {label:'QRIS', methods:[
    {id:'qris', name:'QRIS (Semua Bank/E-Wallet)', color:'linear-gradient(135deg,#1e8bff,#12d492)', initials:'QRIS'},
  ]},
  ewallet: {label:'E-Wallet', methods:[
    {id:'gopay', name:'GoPay', color:'#00aa5b', initials:'GP'},
    {id:'ovo', name:'OVO', color:'#4c2a86', initials:'OVO'},
    {id:'dana', name:'DANA', color:'#1a7ce0', initials:'DN'},
    {id:'shopeepay', name:'ShopeePay', color:'#ee4d2d', initials:'SP'},
    {id:'linkaja', name:'LinkAja', color:'#e6252c', initials:'LA'},
  ]},
  bank: {label:'Transfer Bank / VA', methods:[
    {id:'bca', name:'BCA Virtual Account', color:'#0060af', initials:'BCA'},
    {id:'mandiri', name:'Mandiri VA', color:'#003d79', initials:'MDR'},
    {id:'bni', name:'BNI VA', color:'#f37021', initials:'BNI'},
    {id:'bri', name:'BRI VA', color:'#00529c', initials:'BRI'},
    {id:'permata', name:'Permata VA', color:'#00954c', initials:'PMT'},
    {id:'cimb', name:'CIMB Niaga VA', color:'#7a1f2b', initials:'CIMB'},
  ]}
};
const PAYSTATE = { category:'qris', method:null };

function renderPayTabs(){
  const tabs = document.getElementById('payTabs');
  if(!tabs) return;
  tabs.innerHTML = Object.keys(PAY_CATEGORIES).map(key=>`
    <button type="button" class="paytab ${key===PAYSTATE.category?'active':''}" onclick="setPayCategory('${key}')">${PAY_CATEGORIES[key].label}</button>
  `).join('');
  renderPayMethods();
}
function setPayCategory(key){
  PAYSTATE.category = key; PAYSTATE.method = null;
  renderPayTabs();
  if(typeof window.onPaymentChanged === 'function') window.onPaymentChanged();
}
function renderPayMethods(){
  const wrap = document.getElementById('payMethods');
  if(!wrap) return;
  const list = PAY_CATEGORIES[PAYSTATE.category].methods;
  wrap.innerHTML = list.map(m=>`
    <div class="pm ${PAYSTATE.method && PAYSTATE.method.id===m.id ? 'selected':''}" onclick="selectPayMethod('${m.id}')">
      <div class="pm-logo" style="background:${m.color}">
        <img src="assets/logos/${m.id}.svg" alt="${m.name}" onerror="this.style.display='none';">
        <div class="fallback">${m.initials}</div>
      </div>
      ${m.name}
    </div>`).join('');
}
function selectPayMethod(id){
  const list = PAY_CATEGORIES[PAYSTATE.category].methods;
  PAYSTATE.method = list.find(m=>m.id===id);
  renderPayMethods();
  if(typeof window.onPaymentChanged === 'function') window.onPaymentChanged();
}

/* ---------- Formatting helpers ---------- */
function fmt(n){ return 'Rp ' + n.toLocaleString('id-ID'); }
function fmtNum(n){ return n.toLocaleString('id-ID'); }
/** Animates a total price counting up/down instead of jumping instantly. */
function animateNumber(el, toValue){
  if(!el) return;
  const from = parseInt((el.textContent||'0').replace(/[^\d]/g,''), 10) || 0;
  const to = Math.round(toValue);
  if(from === to){ el.textContent = fmt(to); return; }
  const duration = 320, start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * eased));
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------- REAL EMVCo / QRIS payload builder ---------- */
function tlv(id, value){
  const len = String(value.length).padStart(2,'0');
  return id + len + value;
}
// Standard CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — the exact
// checksum algorithm specified by EMVCo for tag 63.
function crc16ccitt(str){
  let crc = 0xFFFF;
  for(let i=0;i<str.length;i++){
    crc ^= (str.charCodeAt(i) << 8);
    for(let b=0;b<8;b++){
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
/**
 * Builds a structurally-valid EMVCo Merchant Presented QR (the format QRIS
 * uses). Demo merchant identifiers — replace with your real PJSP-issued NMID
 * before going into production.
 */
function buildQrisPayload(amount, orderId){
  const merchantAccount = tlv('00','ID.CO.QRIS.WWW') + tlv('01','ID99HEXAVAULT0001');
  let payload = '';
  payload += tlv('00','01');                                   // Payload Format Indicator
  payload += tlv('01','12');                                   // 12 = dynamic QR (has fixed amount)
  payload += tlv('26', merchantAccount);                        // Merchant Account Info (demo)
  payload += tlv('52','5311');                                  // Merchant Category Code (generic)
  payload += tlv('53','360');                                   // Currency: 360 = IDR
  payload += tlv('54', String(Math.round(amount)));              // Transaction Amount
  payload += tlv('58','ID');                                    // Country Code
  payload += tlv('59', 'HEXAVAULT DIAMOND'.slice(0,25));         // Merchant Name
  payload += tlv('60', 'JAKARTA'.slice(0,15));                   // Merchant City
  payload += tlv('62', tlv('01', orderId.slice(0,20)));          // Additional Data: bill number
  payload += '6304';                                            // CRC tag + length placeholder
  const crc = crc16ccitt(payload);
  return payload + crc;
}
/** Renders the payload into a real, scannable QR using the CDN "qrcode" lib. */
function renderQrCanvas(canvasEl, payload){
  if(typeof QRCode === 'undefined'){
    const ctx = canvasEl.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvasEl.width,canvasEl.height);
    ctx.fillStyle = '#c00'; ctx.font = '11px sans-serif'; ctx.textAlign='center';
    ctx.fillText('Perlu koneksi internet', canvasEl.width/2, canvasEl.height/2 - 6);
    ctx.fillText('untuk memuat QR', canvasEl.width/2, canvasEl.height/2 + 10);
    return;
  }
  QRCode.toCanvas(canvasEl, payload, {
    width: 208, margin: 1, color:{ dark:'#0a1a2b', light:'#ffffff' }
  }, function(err){ if(err) console.error('QR render error:', err); });
}
function copyPayload(payload, btn){
  const done = ()=>{ const old = btn.textContent; btn.textContent='Tersalin ✓'; setTimeout(()=>btn.textContent=old, 1500); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(payload).then(done).catch(()=>toast('Gagal menyalin', true));
  } else { toast('Salin manual dari kotak teks di atas'); }
}

/* ---------- Generic payment flow (used by both pages) ---------- */
let PAYFLOW = null; // {amount, orderId, onSuccess(orderId), onFail(orderId,msg)}
let payTimerInt = null;

function startPaymentFlow(cfg){
  if(!AUTH.currentUser){ openModal('authOverlay'); return; }
  if(!PAYSTATE.method){ toast('Pilih metode pembayaran dahulu', true); return; }
  PAYFLOW = { ...cfg, orderId: (cfg.orderPrefix||'HXV') + '-' + Date.now().toString().slice(-8) };
  if(PAYSTATE.category === 'qris') showQrisPayment(); else showRedirectPayment();
}
function showQrisPayment(){
  const { amount, orderId } = PAYFLOW;
  const payload = buildQrisPayload(amount, orderId);
  document.getElementById('payModalTitle').textContent = 'Pembayaran QRIS';
  document.getElementById('payModalBody').innerHTML = `
    <div class="qr-box">
      <div class="amount-big">${fmt(amount)}</div>
      <p style="color:var(--muted); font-size:12.5px; margin-top:4px;">QR ini memuat nominal transaksi sesuai standar EMVCo/QRIS — nominal akan terbaca otomatis saat discan.</p>
      <div class="qr-canvas-wrap"><canvas id="qrCanvas" width="208" height="208"></canvas></div>
      <div class="qr-payload-box">
        <textarea readonly id="qrPayloadText">${payload}</textarea>
        <button class="btn btn-ghost btn-sm btn-block" style="margin-top:6px;" onclick="copyPayload('${payload}', this)">Salin Kode QRIS (raw payload)</button>
      </div>
      <div style="font-size:11px; color:var(--muted-2); font-family:var(--mono); margin-top:10px;">ID Pesanan: ${orderId}</div>
      <div class="timer" id="qrTimer">10:00</div>
      <button class="btn btn-grad btn-block" onclick="confirmPayment()">Saya Sudah Bayar</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px;" onclick="cancelPayment()">Batalkan</button>
    </div>`;
  openModal('payOverlay');
  setTimeout(()=>renderQrCanvas(document.getElementById('qrCanvas'), payload), 30);
  startCountdown('qrTimer', 600);
}
function showRedirectPayment(){
  const { amount } = PAYFLOW;
  const method = PAYSTATE.method;
  const isBank = PAYSTATE.category === 'bank';
  let vaNumber = ''; if(isBank){ for(let i=0;i<14;i++) vaNumber += Math.floor(Math.random()*10); }
  document.getElementById('payModalTitle').textContent = 'Pembayaran ' + method.name;
  document.getElementById('payModalBody').innerHTML = `
    <div class="qr-box">
      <div class="amount-big">${fmt(amount)}</div>
      <p style="color:var(--muted); font-size:12.5px; margin-top:6px;">${isBank ? 'Transfer tepat sesuai nominal di atas ke Virtual Account berikut:' : 'Buka aplikasi '+method.name+' dan selesaikan pembayaran sejumlah nominal di atas.'}</p>
      ${isBank ? `<div class="va-box"><div style="font-size:11px; color:var(--muted-2);">Kode Bank ${method.name}</div><div class="va-num">${vaNumber}</div><div style="font-size:11px; color:var(--muted-2);">a.n. HEXAVAULT DIAMOND</div></div>`
      : `<div class="va-box"><div style="font-size:13px;">📲 Notifikasi pembayaran akan dikirim ke aplikasi ${method.name} kamu</div></div>`}
      <div class="timer" id="qrTimer">10:00</div>
      <button class="btn btn-grad btn-block" onclick="confirmPayment()">Konfirmasi Pembayaran</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px;" onclick="cancelPayment()">Batalkan</button>
    </div>`;
  openModal('payOverlay');
  startCountdown('qrTimer', 600);
}
function startCountdown(elId, seconds){
  clearInterval(payTimerInt);
  let s = seconds;
  const el = document.getElementById(elId);
  payTimerInt = setInterval(()=>{
    s--;
    const m = Math.floor(s/60), ss = s%60;
    if(el) el.textContent = `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    if(s<=0){ clearInterval(payTimerInt); expirePayment(); }
  },1000);
}
function cancelPayment(){ clearInterval(payTimerInt); closeModal('payOverlay'); PAYFLOW = null; }
function expirePayment(){
  closeModal('payOverlay');
  const { orderId, onFail } = PAYFLOW;
  const msg = 'Waktu pembayaran habis. Silakan buat pesanan baru.';
  Promise.resolve(onFail ? onFail(orderId, msg) : null).finally(()=> showResult(false, orderId, msg));
}
/* ---------- Simulasi verifikasi pembayaran ----------
   Ini proyek SIMULASI (tidak terhubung payment gateway sungguhan), jadi
   default-nya dibuat SELALU BERHASIL supaya tidak mengganggu alur demo/tugas
   akhir dengan kegagalan acak yang membingungkan.
   Mau tetap menunjukkan skenario "Pembayaran Gagal" (misal untuk presentasi
   fitur error-handling)? Turunkan angka ini, contoh 0.92 = 92% berhasil / 8%
   gagal acak seperti sebelumnya. */
const PAYMENT_SUCCESS_RATE = 1.0; // 1.0 = 100% selalu berhasil

async function confirmPayment(){
  clearInterval(payTimerInt);
  document.getElementById('payModalBody').innerHTML = `<div style="text-align:center; padding:20px 0;"><div class="spinner"></div><p style="color:var(--muted); font-size:13.5px;">Memverifikasi pembayaran ke penyedia...</p></div>`;
  const { orderId, onSuccess, onFail } = PAYFLOW;
  setTimeout(async ()=>{
    const success = Math.random() < PAYMENT_SUCCESS_RATE;
    closeModal('payOverlay');
    try{
      if(success){ if(onSuccess) await onSuccess(orderId); showResult(true, orderId); }
      else{ const msg='Pembayaran gagal diverifikasi. Saldo/limit tidak mencukupi atau ditolak sistem pembayaran.'; if(onFail) await onFail(orderId,msg); showResult(false, orderId, msg); }
    }catch(e){
      showResult(false, orderId, 'Transaksi tercatat gagal karena error server: ' + e.message);
    }
  }, 1800);
}
function showResult(success, orderId, msg){
  const body = document.getElementById('resultModalBody');
  const retry = (typeof window.onRetryPayment === 'function') ? `onclick="closeModal('resultOverlay'); onRetryPayment();"` : `onclick="closeModal('resultOverlay')"`;
  if(success){
    const receiptHtml = (typeof window.buildReceiptHtml === 'function') ? window.buildReceiptHtml(orderId) : '';
    body.innerHTML = `
      <div class="result-icon ok pop-in"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="#12d492" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h3 style="font-family:var(--display); font-size:20px;">Pembayaran Berhasil!</h3>
      <p style="color:var(--muted); font-size:13.5px; margin:8px 0 4px;">${(typeof window.onSuccessMessage==='function') ? window.onSuccessMessage() : 'Pesanan kamu sedang diproses.'}</p>
      ${receiptHtml}
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button class="btn btn-ghost btn-block" onclick="closeModal('resultOverlay')">Tutup</button>
        <button class="btn btn-grad btn-block" onclick="closeModal('resultOverlay'); if(typeof window.onViewHistory==='function') window.onViewHistory();">Lihat Riwayat</button>
      </div>`;
  } else {
    body.innerHTML = `
      <div class="result-icon bad pop-in"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#ff5c72" stroke-width="3" stroke-linecap="round"/></svg></div>
      <h3 style="font-family:var(--display); font-size:20px;">Pembayaran Gagal</h3>
      <p style="color:var(--muted); font-size:13.5px; margin:8px 0 4px;">${msg||'Terjadi kesalahan saat memproses pembayaran.'}</p>
      <p style="font-family:var(--mono); font-size:11.5px; color:var(--muted-2);">ID Transaksi: ${orderId}</p>
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button class="btn btn-ghost btn-block" onclick="closeModal('resultOverlay')">Tutup</button>
        <button class="btn btn-grad btn-block" ${retry}>Coba Lagi</button>
      </div>`;
  }
  openModal('resultOverlay');
}
/** Generic helper both pages can reuse to render a line-item receipt row. */
function receiptRow(label, value, highlight){
  return `<div class="receipt-row${highlight?' hl':''}"><span>${label}</span><b>${value}</b></div>`;
}
