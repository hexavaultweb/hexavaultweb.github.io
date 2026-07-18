/* ==========================================================================
   NAV.JS — renders the SAME navbar markup on index.html and joki-ml.html.
   Each page must set `window.HXV_PAGE` ('topup' | 'joki') BEFORE this script
   runs, and must provide `window.onNavItemClick(key)` for same-page items
   (used only on index.html to switch SPA sections).
   ========================================================================== */
const NAV_ITEMS = [
  {key:'home', label:'Beranda'},
  {key:'topup', label:'Top Up'},
  {key:'membership', label:'Membership'},
  {key:'redeem', label:'Tukar Poin'},
  {key:'history', label:'Riwayat'},
  {key:'joki', label:'Joki Rank'},
];

const BRAND_MARK_SVG = `<svg viewBox="0 0 40 40"><polygon points="20,1 37,10.5 37,29.5 20,39 3,29.5 3,10.5" fill="none" stroke="url(#navg1)" stroke-width="2"/>
  <polygon points="20,10 29,15 29,25 20,30 11,25 11,15" fill="url(#navg2)" opacity=".85"/>
  <defs><linearGradient id="navg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e8bff"/><stop offset="1" stop-color="#12d492"/></linearGradient>
  <linearGradient id="navg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22c1ff"/><stop offset="1" stop-color="#1fe6a8"/></linearGradient></defs></svg>`;

function navTargetHref(key){
  if(key === 'joki') return 'joki-ml.html';
  // topup-family key
  return (window.HXV_PAGE === 'joki') ? `index.html#${key}` : `#${key}`;
}

function renderNavbar(activeKey){
  const root = document.getElementById('navbar-root');
  if(!root) return;
  const isTopupPage = window.HXV_PAGE === 'topup';

  const linksHtml = NAV_ITEMS.map(item=>{
    const isActive = item.key === activeKey;
    const belongsToTopupSpa = item.key !== 'joki';
    if(isTopupPage && belongsToTopupSpa){
      return `<button type="button" class="navbtn ${isActive?'active':''}" data-key="${item.key}" onclick="onNavItemClick('${item.key}')">${item.label}</button>`;
    }
    return `<a class="navbtn ${isActive?'active':''}" href="${navTargetHref(item.key)}">${item.label}</a>`;
  }).join('');

  root.innerHTML = `
    <header>
      <div class="nav">
        <div class="brand">
          <div class="brand-mark">${BRAND_MARK_SVG}</div>
          <div>
            <div class="brand-text">Hexa<span>Vault</span></div>
            <div class="brand-sub">Diamond Exchange</div>
          </div>
        </div>
        <div class="navlinks" id="navlinks">${linksHtml}</div>
        <div class="nav-right" id="navRight"></div>
      </div>
    </header>`;
}

function setActiveNavKey(activeKey){
  document.querySelectorAll('#navlinks .navbtn').forEach(el=>{
    const key = el.dataset.key;
    if(key){ el.classList.toggle('active', key===activeKey); }
  });
}
