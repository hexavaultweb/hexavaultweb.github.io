/* ==========================================================================
   TOPUP.JS — page logic specific to index.html.
   Depends on: js/nav.js, js/api.js, js/shared.js (load those first).

   Benefit tier member (diskon harga & cashback poin) diambil dari
   TIER_STATE (lihat js/shared.js -> loadTierConfig()) yang datanya berasal
   dari server (shared/tier-benefits.json). Harga yang ditampilkan di grid
   paket & ringkasan SUDAH memperhitungkan diskon tier user saat ini — tapi
   nominal final yang benar-benar tersimpan & jadi dasar poin/stempel tetap
   DIHITUNG ULANG di server (lihat server.js) supaya tidak bisa dimanipulasi.
   ========================================================================== */
window.HXV_PAGE = 'topup';

/* ---------- Data ---------- */
const PACKAGES = [
  {id:1, dia:86, price:20000, bonus:0, tag:''},
  {id:2, dia:172, price:40000, bonus:0, tag:''},
  {id:3, dia:257, price:60000, bonus:0, tag:''},
  {id:4, dia:344, price:79000, bonus:0, tag:'HEMAT'},
  {id:5, dia:429, price:99000, bonus:0, tag:''},
  {id:6, dia:514, price:118000, bonus:10, tag:''},
  {id:7, dia:706, price:159000, bonus:0, tag:'TERLARIS'},
  {id:8, dia:878, price:199000, bonus:20, tag:''},
  {id:9, dia:1050, price:239000, bonus:0, tag:''},
  {id:10, dia:1412, price:319000, bonus:30, tag:''},
  {id:11, dia:2195, price:479000, bonus:50, tag:''},
  {id:12, dia:3688, price:799000, bonus:90, tag:'HEMAT'},
  {id:13, dia:5532, price:1199000, bonus:150, tag:''},
  {id:14, dia:9288, price:1999000, bonus:300, tag:'PALING BANYAK'},
  {id:15, dia:'Weekly Pass', price:30000, bonus:0, tag:'PASS', isPass:true},
  {id:16, dia:'Twilight Pass', price:149000, bonus:0, tag:'PASS', isPass:true},
];
const REDEEM_OPTIONS = [
  {points:1000, dia:100},
  {points:3500, dia:300},
  {points:8000, dia:500},
];

/* ---------- State ---------- */
let selectedPackage = null;
let mlAccount = {userId:'', zoneId:'', nickname:''};
let lastReceipt = null; // filled right before payment, used to render the post-payment receipt

/* ---------- Navbar wiring ---------- */
const SECTION_ORDER = ['home','topup','membership','redeem','history'];
function onNavItemClick(key){ navigateSection(key); }
function navigateSection(page){
  if(!AUTH.currentUser && page!=='home'){ openModal('authOverlay'); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  setActiveNavKey(page);
  history.replaceState(null,'', page==='home' ? location.pathname : `#${page}`);
  if(page==='membership') renderMembership();
  if(page==='redeem') renderRedeem();
  if(page==='history') renderHistory();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ---------- ID check ---------- */
function checkNick(){
  const uid = document.getElementById('mlUserId').value.trim();
  const zid = document.getElementById('mlZoneId').value.trim();
  const box = document.getElementById('nickPreview');
  if(uid.length>=4 && zid.length>=2){
    let hash = 0;
    for(const c of uid+zid) hash = (hash*31 + c.charCodeAt(0)) >>> 0;
    const names = ['ShadowBlade','NightHawk','LunarWolf','CrimsonFury','StarReaper','GhostViper','IronPhantom','BlazeStorm','FrostKnight','VenomStrike'];
    mlAccount.userId = uid; mlAccount.zoneId = zid;
    mlAccount.nickname = names[hash % names.length] + (hash%99);
    document.getElementById('nickResult').textContent = mlAccount.nickname;
    box.classList.add('show');
  } else {
    box.classList.remove('show');
    mlAccount.nickname = '';
  }
  updateSummary();
}

/* ---------- Package grid (harga sudah tampil diskon sesuai tier user) ---------- */
function renderPackages(){
  const grid = document.getElementById('pkgGrid');
  const benefit = AUTH.currentUser ? getBenefitForPoints(AUTH.currentUser.points) : null;
  grid.innerHTML = PACKAGES.map(p=>{
    const hasDiscount = benefit && benefit.discPct > 0;
    const finalPrice = hasDiscount ? applyTierDiscount(p.price, benefit).finalPrice : p.price;
    return `
    <div class="pkg" onclick="selectPackage(${p.id})" id="pkg-${p.id}">
      ${p.tag ? `<div class="badge">${p.tag}</div>` : ''}
      <div class="dia">💎 ${p.isPass ? p.dia : fmtNum(p.dia)}</div>
      <div class="bonus">${p.bonus ? '+'+p.bonus+' Bonus' : ''}</div>
      <div class="price">${hasDiscount ? `<span class="price-strike">${fmt(p.price)}</span>${fmt(finalPrice)}` : fmt(p.price)}</div>
    </div>`;
  }).join('');
}
function selectPackage(id){
  selectedPackage = PACKAGES.find(p=>p.id===id);
  document.querySelectorAll('.pkg').forEach(el=>el.classList.remove('selected'));
  document.getElementById('pkg-'+id).classList.add('selected');
  document.getElementById('stepline-2').classList.add('done');
  updateSummary();
}

/* ---------- Summary (slim — full receipt only appears after payment) ---------- */
function currentFinalPrice(){
  if(!selectedPackage) return { finalPrice: 0, discountAmount: 0, benefit: null };
  const benefit = AUTH.currentUser ? getBenefitForPoints(AUTH.currentUser.points) : null;
  if(!benefit || benefit.discPct <= 0) return { finalPrice: selectedPackage.price, discountAmount: 0, benefit };
  return applyTierDiscount(selectedPackage.price, benefit);
}
function updateSummary(){
  document.getElementById('sumPkg').textContent = selectedPackage ? `${selectedPackage.isPass?selectedPackage.dia:fmtNum(selectedPackage.dia)+' Diamond'}${selectedPackage.bonus? ' +'+selectedPackage.bonus:''}` : '—';
  const { finalPrice, benefit } = currentFinalPrice();
  animateNumber(document.getElementById('sumTotal'), finalPrice);
  const badgeEl = document.getElementById('sumTierBadge');
  if(badgeEl) badgeEl.innerHTML = selectedPackage ? tierDiscountBadgeHtml(benefit) : '';
  const ready = mlAccount.nickname && selectedPackage && PAYSTATE.method;
  document.getElementById('payBtn').disabled = !ready;
  document.getElementById('stepline-1').classList.toggle('done', !!mlAccount.nickname);
  if(PAYSTATE.method) document.getElementById('stepline-3').classList.add('done');
}
window.onPaymentChanged = updateSummary;

/* ---------- Checkout ---------- */
function startPayment(){
  if(!selectedPackage){ return; }
  if(!mlAccount.nickname){
    document.getElementById('mlUserId').closest('.card').classList.add('shake');
    setTimeout(()=>document.getElementById('mlUserId').closest('.card').classList.remove('shake'), 500);
    toast('Isi User ID & Zone ID dulu ya', true);
    return;
  }
  const { finalPrice } = currentFinalPrice();
  startPaymentFlow({
    amount: finalPrice,
    orderPrefix: 'HXV',
    onSuccess: handleTopupSuccess,
    onFail: handleTopupFail,
  });
}
window.onSuccessMessage = function(){ return `Diamond telah dikirim ke akun <b>${mlAccount.nickname}</b>.`; };
window.onViewHistory = function(){ navigateSection('history'); };
window.onRetryPayment = function(){ startPayment(); };

function itemLabelFor(pkg){
  return `${pkg.isPass ? pkg.dia : fmtNum(pkg.dia)+' Diamond'}${pkg.bonus?' +'+pkg.bonus+' Bonus':''}`;
}
async function handleTopupSuccess(order){
  const pkg = selectedPackage;
  // Kirim harga ASLI (sebelum diskon) — server yang menghitung ulang diskon
  // berdasarkan tier user saat ini & itulah yang jadi nominal final tersimpan.
  const data = await apiFetch('/api/transactions', {
    method:'POST',
    body: JSON.stringify({
      source:'topup', orderId: order, item: itemLabelFor(pkg), nominal: pkg.price,
      method: PAYSTATE.method.name, status:'success',
      meta: { account: `${mlAccount.nickname} (${mlAccount.userId}/${mlAccount.zoneId})` }
    })
  });
  AUTH.currentUser = data.user;
  lastReceipt = {
    orderId: order, item: itemLabelFor(pkg), account: `${mlAccount.nickname} (${mlAccount.userId}/${mlAccount.zoneId})`,
    method: PAYSTATE.method.name, grossNominal: data.grossNominal, discountAmount: data.discountAmount,
    nominal: data.finalNominal, poin: data.poinEarned, stampsAdded: data.stampsAdded, stampNow: AUTH.currentUser.stamps,
    bonusAwarded: data.bonusAwarded, benefit: data.benefit
  };
  renderNavRight();
  renderPackages(); // refresh harga di grid, siapa tahu tier user baru saja naik
  if(data.bonusAwarded) setTimeout(()=>toast('🎉 Selamat! Kamu dapat 55 Diamond gratis dari kartu stempel!'), 600);
}
async function handleTopupFail(order, msg){
  try{
    await apiFetch('/api/transactions', {
      method:'POST',
      body: JSON.stringify({
        source:'topup', orderId: order, item: itemLabelFor(selectedPackage), nominal: selectedPackage.price,
        method: PAYSTATE.method.name, status:'failed',
        meta: { account: `${mlAccount.nickname} (${mlAccount.userId}/${mlAccount.zoneId})`, note: msg }
      })
    });
  }catch(e){ /* still show the failure to the user even if logging failed */ }
}
window.buildReceiptHtml = function(orderId){
  if(!lastReceipt || lastReceipt.orderId !== orderId) return '';
  const r = lastReceipt;
  const hasDiscount = r.discountAmount > 0;
  return `<div class="receipt">
    <div class="receipt-title">Ringkasan Transaksi</div>
    ${receiptRow('Akun', r.account)}
    ${receiptRow('Item', r.item)}
    ${receiptRow('Metode', r.method)}
    ${hasDiscount ? receiptRow('Harga Awal', fmt(r.grossNominal)) : ''}
    ${hasDiscount ? receiptRow(`Diskon Member (${r.benefit.emoji} ${r.benefit.tier} -${Math.round(r.benefit.discPct*100)}%)`, '-'+fmt(r.discountAmount)) : ''}
    ${receiptRow('Total Dibayar', fmt(r.nominal), true)}
    ${receiptRow(`Poin didapat (${r.benefit.pointMult}x)`, '+'+fmtNum(r.poin))}
    ${receiptRow('Stempel', (r.stampsAdded>1? '+'+r.stampsAdded+' sekaligus · ':'') + (r.stampNow===0? '10/10 🎁' : r.stampNow+'/10'))}
    ${receiptRow('ID Transaksi', r.orderId)}
  </div>`;
};

/* ---------- Membership ---------- */
function renderMembership(){
  if(!AUTH.currentUser || TIER_STATE.tiers.length===0) return;
  const u = AUTH.currentUser;
  const benefit = getBenefitForPoints(u.points);
  const idx = TIER_STATE.tiers.indexOf(benefit);
  const next = TIER_STATE.tiers[idx+1];
  document.getElementById('curTierName').textContent = `${benefit.emoji} ${benefit.name}`;
  document.getElementById('curPoints').textContent = fmtNum(u.points);
  let pct = 100, text = 'Kamu sudah di tier tertinggi — nikmati semua benefit maksimal!';
  if(next){
    pct = Math.min(100, Math.round(((u.points - benefit.min) / (next.min - benefit.min))*100));
    text = `${fmtNum(next.min - u.points)} poin lagi menuju tier ${next.emoji} ${next.name}`;
  }
  document.getElementById('tierProgressFill').style.width = pct+'%';
  document.getElementById('tierProgressText').textContent = text;
  document.querySelectorAll('.tier').forEach(el=>el.classList.remove('current'));
  const tierEls = document.querySelectorAll('.tier');
  if(tierEls[idx]) tierEls[idx].classList.add('current');
  const grid = document.getElementById('stampGrid');
  grid.innerHTML = '';
  for(let i=0;i<10;i++){
    const filled = i < u.stamps;
    grid.innerHTML += `<div class="stamp ${filled?'filled':''} ${i===9?'reward':''}">${filled?'💎':(i===9?'🎁':'')}</div>`;
  }
  // Highlight ringkasan benefit tier AKTIF saat ini (bukan cuma daftar statis)
  const activeBox = document.getElementById('activeBenefitBox');
  if(activeBox){
    activeBox.innerHTML = `
      <div class="active-benefit-title">${benefit.emoji} Benefit ${benefit.name} yang sedang aktif untukmu:</div>
      <div class="active-benefit-grid">
        <div><b>${benefit.discPct>0? '-'+Math.round(benefit.discPct*100)+'%' : '—'}</b><span>Diskon semua paket</span></div>
        <div><b>${benefit.pointMult}x</b><span>Cashback poin</span></div>
        <div><b>${benefit.stampPerTx>1? '+'+benefit.stampPerTx+' / transaksi' : 'Normal'}</b><span>Kecepatan stempel</span></div>
      </div>`;
  }
}

/* ---------- Redeem ---------- */
function renderRedeem(){
  if(!AUTH.currentUser) return;
  document.getElementById('redeemPointsShow').textContent = fmtNum(AUTH.currentUser.points);
  const grid = document.getElementById('redeemGrid');
  grid.innerHTML = REDEEM_OPTIONS.map((r,i)=>`
    <div class="redeem-card">
      <div style="font-family:var(--display); font-size:20px;">💎 ${r.dia} Diamond</div>
      <div class="cost">${fmtNum(r.points)} Poin</div>
      <button class="btn ${AUTH.currentUser.points>=r.points?'btn-grad':'btn-ghost'} btn-block" ${AUTH.currentUser.points<r.points?'disabled':''} onclick="doRedeem(${i})">Tukar Sekarang</button>
    </div>
  `).join('');
}
async function doRedeem(i){
  const r = REDEEM_OPTIONS[i];
  if(AUTH.currentUser.points < r.points) return;
  try{
    const data = await apiFetch('/api/redeem', { method:'POST', body: JSON.stringify({points:r.points, diamonds:r.dia}) });
    AUTH.currentUser = data.user;
    renderRedeem();
    renderNavRight();
    toast(`Berhasil menukar ${fmtNum(r.points)} poin dengan ${r.dia} Diamond!`);
  }catch(e){ toast(e.message, true); }
}

/* ---------- History ---------- */
async function renderHistory(){
  if(!AUTH.currentUser) return;
  const body = document.getElementById('historyBody');
  const empty = document.getElementById('historyEmpty');
  body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--muted-2);">Memuat riwayat...</td></tr>`;
  empty.style.display = 'none';
  try{
    const data = await apiFetch('/api/transactions?source=topup');
    const list = data.transactions;
    if(list.length===0){ body.innerHTML=''; empty.style.display='block'; return; }
    body.innerHTML = list.map(tx=>`
      <tr>
        <td style="font-family:var(--mono); font-size:12px;">${tx.orderId}</td>
        <td style="font-size:12px; color:var(--muted);">${new Date(tx.createdAt).toLocaleString('id-ID')}</td>
        <td>${tx.item}${tx.discountAmount>0 ? `<div style="font-size:10.5px; color:var(--green2);">Hemat ${fmt(tx.discountAmount)} (${tx.tierAtPurchase})</div>` : ''}</td>
        <td style="font-family:var(--mono);">${tx.nominal? fmt(tx.nominal) : '—'}</td>
        <td>${tx.method}</td>
        <td><span class="badge-status badge-${tx.status==='success'?'success':(tx.status==='pending'?'pending':'failed')}">${tx.status==='success'?'BERHASIL':(tx.status==='pending'?'PENDING':'GAGAL')}</span></td>
      </tr>
    `).join('');
  }catch(e){
    body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger);">Gagal memuat riwayat: ${e.message}</td></tr>`;
  }
}

/* ---------- Auth hooks ---------- */
window.onAfterLogin = function(){ renderNavRight(); renderPackages(); navigateSection('topup'); };
window.onLogout = function(){ renderNavRight(); renderPackages(); navigateSection('home'); };

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  const initialKey = (location.hash || '#home').replace('#','');
  const startKey = SECTION_ORDER.includes(initialKey) ? initialKey : 'home';
  renderNavbar(startKey);
  await loadTierConfig(); // ambil daftar benefit tier dari server sebelum render apa pun yg butuh diskon
  renderPackages();
  renderPayTabs();
  updateSummary();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+startKey).classList.add('active');

  await restoreSession(); // auto-login kalau token masih tersimpan — tidak perlu login ulang
  renderNavRight();
  renderPackages(); // render ulang: sekarang AUTH.currentUser sudah terisi, harga diskon bisa muncul
  updateSummary();
  if(AUTH.currentUser && startKey !== 'home'){
    if(startKey==='membership') renderMembership();
    if(startKey==='redeem') renderRedeem();
    if(startKey==='history') renderHistory();
  }
});
