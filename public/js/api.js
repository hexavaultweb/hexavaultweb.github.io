/* ==========================================================================
   API.JS — talks to the Express backend (server.js). Token is kept in
   localStorage so login persists across page reloads AND across both pages
   (index.html + joki-ml.html), since they're served from the same origin.
   This is a real deployed app (not the in-chat preview), so localStorage is
   the right tool here — it's just a session token, not app data.
   ========================================================================== */
const TOKEN_KEY = 'hxv_token';
function getToken(){ return localStorage.getItem(TOKEN_KEY); }
function setToken(t){ localStorage.setItem(TOKEN_KEY, t); }
function clearToken(){ localStorage.removeItem(TOKEN_KEY); }

async function apiFetch(url, opts = {}){
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const token = getToken();
  if(token) headers['Authorization'] = 'Bearer ' + token;
  let res;
  try{
    res = await fetch(url, { ...opts, headers });
  }catch(e){
    throw new Error('Tidak bisa menghubungi server. Pastikan `npm start` sedang berjalan.');
  }
  const data = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error(data.error || 'Terjadi kesalahan pada server');
  return data;
}
