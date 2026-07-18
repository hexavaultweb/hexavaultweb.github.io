/* ==========================================================================
   JOKI.JS — page logic specific to joki-ml.html.
   Depends on: js/nav.js, js/api.js, js/shared.js (load those first).

   Diskon member (berdasarkan tier — lihat js/shared.js loadTierConfig())
   diterapkan ke total harga joki juga ("diskon semua paket" berlaku
   platform-wide), sementara cashback poin & stempel tetap khusus dari
   transaksi Top Up Diamond sesuai desain awal.
   ========================================================================== */
window.HXV_PAGE = 'joki';

/* ---------- Data ---------- */
// Badge icons are ORIGINAL designs (shape + color inspired by the tier name),
// not official game assets — Moonton's real rank badges are copyrighted.
const TIERS = [
  {name:'Warrior', c1:'#8a6a4f', c2:'#5c4530', icon:'shield', perStar:3000},
  {name:'Elite', c1:'#b9c3cc', c2:'#7c8891', icon:'shieldwing', perStar:4000},
  {name:'Master', c1:'#4fa3ff', c2:'#1e5fbf', icon:'gem', perStar:5000},
  {name:'Grandmaster', c1:'#2e7bff', c2:'#123a8f', icon:'gemlaurel', perStar:6500},
  {name:'Epic', c1:'#a06bff', c2:'#5a2fc4', icon:'starcrystal', perStar:8500},
  {name:'Legend', c1:'#ff8a3d', c2:'#c9451a', icon:'flame', perStar:11000},
  {name:'Mythic', c1:'#c95bff', c2:'#5d0fb8', icon:'cosmic', perStar:15000},
  {name:'Mythical Honor', c1:'#e2b6ff', c2:'#8a2be2', icon:'crown1', perStar:20000},
  {name:'Mythical Glory', c1:'#ffd76a', c2:'#c98a12', icon:'crown2', perStar:28000},
  {name:'Mythical Immortal', c1:'#7ef2ff', c2:'#ff6bd6', icon:'phoenix', perStar:40000},
];
const STAR_PACKAGES = [
  {stars:5, tag:''}, {stars:10, tag:''}, {stars:15, tag:''}, {stars:20, tag:'TERLARIS'}, {stars:25, tag:''},
  {stars:30, tag:'HEMAT'}, {stars:40, tag:''}, {stars:50, tag:'HEMAT'}, {stars:75, tag:''}, {stars:100, tag:'PALING HEMAT'},
];
function starDiscount(stars){
  if(stars>=100) return 0.15;
  if(stars>=75) return 0.10;
  if(stars>=50) return 0.06;
  if(stars>=30) return 0.03;
  return 0;
}
const MODES = [
  {id:'full', name:'Full Joki (Share Akun)', desc:'Booster login & mainkan akun Anda langsung, paling cepat.', mult:1},
  {id:'duo', name:'Autowin / Ditemani Pro', desc:'Booster push rank bareng Anda satu tim, akun tetap dipegang sendiri.', mult:1.4},
];
const ADDONS = [
  {id:'sync', name:'Sync VPN Aman', desc:'Login dari lokasi seolah perangkat Anda sendiri', price:50000},
  {id:'live', name:'Livestream Progress', desc:'Pantau progress pengerjaan secara real-time', price:30000},
  {id:'priority', name:'Prioritas Antrian', desc:'Dikerjakan booster dalam < 15 menit', price:40000},
  {id:'role', name:'Pilih Role Favorit', desc:'Tentukan role/hero yang dipakai booster', price:20000},
];

/* ---------- State ---------- */
let rankIdx = null, selectedStars = null, modeId = 'full';
let selectedAddons = new Set();
let lastReceipt = null;

/* ---------- Badge SVG (original design) ---------- */
function badgeSvg(t){
  const gid = 'grad-'+t.name.replace(/\s/g,'');
  const shapes = {
    shield: `<path d="M28 5 L48 13 V33 C48 46 28 53 28 53 C28 53 8 46 8 33 V13 Z"/>`,
    shieldwing: `<path d="M28 5 L48 13 V33 C48 46 28 53 28 53 C28 53 8 46 8 33 V13 Z"/><path d="M8 20 L2 26 L8 32" stroke-width="2" fill="none"/><path d="M48 20 L54 26 L48 32" stroke-width="2" fill="none"/>`,
    gem: `<polygon points="28,4 46,20 38,52 18,52 10,20"/>`,
    gemlaurel: `<polygon points="28,4 46,20 38,52 18,52 10,20"/><circle cx="28" cy="28" r="6" fill="#fff" opacity=".5"/>`,
    starcrystal: `<polygon points="28,3 34,20 52,20 37,31 43,49 28,38 13,49 19,31 4,20 22,20"/>`,
    flame: `<path d="M28 4 C36 16 44 22 40 34 C38 42 30 50 28 53 C26 50 18 42 16 34 C12 22 20 16 28 4 Z"/>`,
    cosmic: `<polygon points="28,2 33,18 50,14 38,26 48,40 32,34 28,52 24,34 8,40 18,26 6,14 23,18"/>`,
    crown1: `<path d="M8 40 L12 18 L22 30 L28 12 L34 30 L44 18 L48 40 Z"/>`,
    crown2: `<path d="M8 40 L12 16 L22 29 L28 10 L34 29 L44 16 L48 40 Z"/><circle cx="28" cy="12" r="3" fill="#fff"/>`,
    phoenix: `<path d="M28 4 C40 10 48 22 44 36 C42 44 34 52 28 53 C22 52 14 44 12 36 C8 22 16 10 28 4 Z"/><path d="M28 14 C33 20 35 28 28 40 C21 28 23 20 28 14 Z" fill="#fff" opacity=".4"/>`,
  };
  return `<svg viewBox="0 0 56 56" width="100%" height="100%">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient></defs>
    <g fill="url(#${gid})" stroke="rgba(255,255,255,.5)" stroke-width="1">${shapes[t.icon]}</g>
  </svg>`;
}

/* ---------- Rank + star package selection ---------- */
function renderRankGrid(){
  document.getElementById('rankGrid').innerHTML = TIERS.map((t,i)=>`
    <div class="tier-card" id="rank-${i}" onclick="selectRank(${i})">
      <div class="tier-badge">${badgeSvg(t)}</div>
      <div class="tname">${t.name}</div>
      <div class="tprice">${fmt(t.perStar)}/⭐</div>
    </div>`).join('');
}
function selectRank(i){
  rankIdx = i; selectedStars = null;
  document.querySelectorAll('#rankGrid .tier-card').forEach(el=>el.classList.remove('active-from'));
  document.getElementById('rank-'+i).classList.add('active-from');
  renderStarGrid();
  document.getElementById('sl1').classList.add('done');
  updateSummary();
}
/** Harga bintang setelah diskon paket bintang itu sendiri (tag HEMAT dst),
    BELUM termasuk diskon member tier — itu ditambahkan lagi di updateSummary(). */
function starBasePrice(p){
  if(rankIdx===null) return 0;
  const disc = starDiscount(p.stars);
  return Math.round(TIERS[rankIdx].perStar * p.stars * (1-disc));
}
function starPriceLabel(p, disc){
  if(rankIdx===null) return 'Pilih rank dulu';
  const base = TIERS[rankIdx].perStar * p.stars;
  const final = starBasePrice(p);
  return disc ? `<s>${fmt(base)}</s>${fmt(final)}` : fmt(final);
}
function renderStarGrid(){
  document.getElementById('starGrid').innerHTML = STAR_PACKAGES.map((p,i)=>{
    const disc = starDiscount(p.stars);
    return `<div class="star-pkg" id="star-${i}" onclick="selectStarPkg(${i})">
      ${p.tag ? `<div class="badge">${p.tag}</div>` : ''}
      <div class="scount">⭐ ${p.stars}</div>
      <div class="sdisc">${disc? 'Hemat '+Math.round(disc*100)+'%' : ''}</div>
      <div class="sprice">${starPriceLabel(p, disc)}</div>
    </div>`;
  }).join('');
}
function selectStarPkg(i){
  if(rankIdx===null){ toast('Pilih rank saat ini terlebih dahulu', true); return; }
  selectedStars = i;
  document.querySelectorAll('.star-pkg').forEach(el=>el.classList.remove('selected'));
  document.getElementById('star-'+i).classList.add('selected');
  updateSummary();
}
function calcRankPrice(){
  if(rankIdx===null || selectedStars===null) return 0;
  return starBasePrice(STAR_PACKAGES[selectedStars]);
}

/* ---------- Mode & addons ---------- */
function renderModes(){
  document.getElementById('modeToggle').innerHTML = MODES.map(m=>`
    <div class="mode ${m.id===modeId?'active':''}" onclick="setMode('${m.id}')">
      <b>${m.name}</b><span>${m.desc}</span><span class="mmult">×${m.mult} dari harga dasar</span>
    </div>`).join('');
  togglePassField();
}
function setMode(id){ modeId = id; renderModes(); document.getElementById('sl2').classList.add('done'); updateSummary(); }
function togglePassField(){
  document.getElementById('passField').style.display = modeId==='full' ? 'block' : 'none';
  document.getElementById('passWarn').style.display = modeId==='full' ? 'flex' : 'none';
}
function renderAddons(){
  document.getElementById('addonGrid').innerHTML = ADDONS.map(a=>`
    <label class="opt-card ${selectedAddons.has(a.id)?'checked':''}" for="addon-${a.id}">
      <input type="checkbox" id="addon-${a.id}" ${selectedAddons.has(a.id)?'checked':''} onchange="toggleAddon('${a.id}')">
      <div><b>${a.name}</b><span>${a.desc}</span><span class="oprice">+${fmt(a.price)}</span></div>
    </label>`).join('');
}
function toggleAddon(id){
  if(selectedAddons.has(id)) selectedAddons.delete(id); else selectedAddons.add(id);
  renderAddons(); updateSummary();
}

/* ---------- Summary (slim — full receipt only appears after payment) ---------- */
function baseTotalPrice(){
  let base = calcRankPrice();
  base = Math.round(base * MODES.find(m=>m.id===modeId).mult);
  let addonTotal = 0;
  selectedAddons.forEach(id=>{ addonTotal += ADDONS.find(a=>a.id===id).price; });
  return base + addonTotal;
}
/** Harga akhir SETELAH diskon member tier turut diterapkan. */
function currentFinalPrice(){
  const base = baseTotalPrice();
  const benefit = AUTH.currentUser ? getBenefitForPoints(AUTH.currentUser.points) : null;
  if(!benefit || benefit.discPct <= 0) return { finalPrice: base, discountAmount: 0, benefit };
  return applyTierDiscount(base, benefit);
}
function updateSummary(){
  document.getElementById('sumRoute').textContent = (rankIdx!==null && selectedStars!==null) ? `${TIERS[rankIdx].name} • ${STAR_PACKAGES[selectedStars].stars} Bintang` : '—';
  const uid = document.getElementById('jkUserId').value.trim();
  const zid = document.getElementById('jkZoneId').value.trim();
  document.getElementById('sl3').classList.toggle('done', !!(uid && zid));
  const { finalPrice, benefit } = currentFinalPrice();
  animateNumber(document.getElementById('sumTotal'), finalPrice);
  const badgeEl = document.getElementById('sumTierBadge');
  if(badgeEl) badgeEl.innerHTML = (rankIdx!==null && selectedStars!==null) ? tierDiscountBadgeHtml(benefit) : '';
  const ready = rankIdx!==null && selectedStars!==null && uid && zid && PAYSTATE.method;
  document.getElementById('payBtn').disabled = !ready;
  if(PAYSTATE.method) document.getElementById('sl4').classList.add('done');
}
window.onPaymentChanged = updateSummary;

/* ---------- Checkout ---------- */
function startPayment(){
  if(rankIdx===null || selectedStars===null) return;
  const { finalPrice } = currentFinalPrice();
  startPaymentFlow({
    amount: finalPrice,
    orderPrefix: 'JKI',
    onSuccess: handleJokiSuccess,
    onFail: handleJokiFail,
  });
}
window.onSuccessMessage = function(){ return 'Booster akan menghubungi kamu melalui kontak akun dalam ≤15 menit.'; };
window.onViewHistory = function(){ document.getElementById('page-joki-history')?.scrollIntoView({behavior:'smooth'}); };
window.onRetryPayment = function(){ startPayment(); };

function routeLabel(){ return `${TIERS[rankIdx].name} • ${STAR_PACKAGES[selectedStars].stars} Bintang`; }
async function handleJokiSuccess(order){
  const uid = document.getElementById('jkUserId').value.trim();
  const zid = document.getElementById('jkZoneId').value.trim();
  const mode = MODES.find(m=>m.id===modeId);
  const addonNames = [...selectedAddons].map(id=>ADDONS.find(a=>a.id===id).name).join(', ') || 'Tidak ada';
  // Kirim harga dasar SEBELUM diskon member — server yang menghitung ulang
  // diskon sesuai tier user saat ini, konsisten dengan halaman Top Up.
  const grossBase = baseTotalPrice();
  const data = await apiFetch('/api/transactions', {
    method:'POST',
    body: JSON.stringify({
      source:'joki', orderId: order, item: routeLabel(), nominal: grossBase,
      method: PAYSTATE.method.name, status:'success',
      meta: { account: `${uid}/${zid}`, mode: mode.name, addons: addonNames }
    })
  });
  AUTH.currentUser = data.user;
  lastReceipt = {
    orderId: order, item: routeLabel(), account: `${uid}/${zid}`, mode: mode.name, addons: addonNames,
    method: PAYSTATE.method.name, grossNominal: data.grossNominal, discountAmount: data.discountAmount,
    nominal: data.finalNominal, benefit: data.benefit
  };
  renderNavRight();
  renderHistory();
}
async function handleJokiFail(order, msg){
  const uid = document.getElementById('jkUserId').value.trim();
  const zid = document.getElementById('jkZoneId').value.trim();
  try{
    await apiFetch('/api/transactions', {
      method:'POST',
      body: JSON.stringify({
        source:'joki', orderId: order, item: routeLabel(), nominal: baseTotalPrice(),
        method: PAYSTATE.method.name, status:'failed', meta: { account: `${uid}/${zid}`, note: msg }
      })
    });
    renderHistory();
  }catch(e){ /* still show the failure to the user even if logging failed */ }
}
window.buildReceiptHtml = function(orderId){
  if(!lastReceipt || lastReceipt.orderId !== orderId) return '';
  const r = lastReceipt;
  const hasDiscount = r.discountAmount > 0;
  return `<div class="receipt">
    <div class="receipt-title">Ringkasan Transaksi</div>
    ${receiptRow('Akun', r.account)}
    ${receiptRow('Rank & Paket', r.item)}
    ${receiptRow('Mode', r.mode)}
    ${receiptRow('Tambahan', r.addons)}
    ${receiptRow('Metode', r.method)}
    ${hasDiscount ? receiptRow('Harga Awal', fmt(r.grossNominal)) : ''}
    ${hasDiscount ? receiptRow(`Diskon Member (${r.benefit.emoji} ${r.benefit.tier} -${Math.round(r.benefit.discPct*100)}%)`, '-'+fmt(r.discountAmount)) : ''}
    ${receiptRow('Total Dibayar', fmt(r.nominal), true)}
    ${receiptRow('ID Pesanan', r.orderId)}
  </div>`;
};

/* ---------- History ---------- */
async function renderHistory(){
  const body = document.getElementById('historyBody'); const empty = document.getElementById('historyEmpty');
  if(!AUTH.currentUser){ body.innerHTML=''; empty.style.display='block'; return; }
  body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted-2);">Memuat riwayat...</td></tr>`;
  empty.style.display = 'none';
  try{
    const data = await apiFetch('/api/transactions?source=joki');
    const list = data.transactions;
    if(list.length===0){ body.innerHTML=''; empty.style.display='block'; return; }
    body.innerHTML = list.map(tx=>`
      <tr>
        <td style="font-family:var(--mono); font-size:12px;">${tx.orderId}</td>
        <td style="font-size:12px; color:var(--muted);">${new Date(tx.createdAt).toLocaleString('id-ID')}</td>
        <td>${tx.item}${tx.discountAmount>0 ? `<div style="font-size:10.5px; color:var(--green2);">Hemat ${fmt(tx.discountAmount)} (${tx.tierAtPurchase})</div>` : ''}</td>
        <td style="font-family:var(--mono);">${fmt(tx.nominal)}</td>
        <td><span class="badge-status badge-${tx.status==='success'?'success':'failed'}">${tx.status==='success'?'BERHASIL':'GAGAL'}</span></td>
      </tr>`).join('');
  }catch(e){
    body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger);">Gagal memuat riwayat: ${e.message}</td></tr>`;
  }
}

/* ---------- Auth hooks ---------- */
window.onAfterLogin = function(){ renderNavRight(); renderHistory(); updateSummary(); };
window.onLogout = function(){ renderNavRight(); renderHistory(); updateSummary(); };

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  renderNavbar('joki');
  await loadTierConfig(); // ambil daftar benefit tier dari server sebelum render apa pun yg butuh diskon
  renderRankGrid();
  renderStarGrid();
  renderModes();
  renderAddons();
  renderPayTabs();
  updateSummary();

  await restoreSession(); // auto-login kalau token masih tersimpan — tidak perlu login ulang
  renderNavRight();
  renderHistory();
  updateSummary();
});
