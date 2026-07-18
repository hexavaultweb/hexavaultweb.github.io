/**
 * lib/db.js — Simple file-based JSON database.
 *
 * Kenapa bukan SQLite/MySQL? Supaya proyek ini bisa langsung `npm install && npm start`
 * tanpa perlu compiler native (banyak driver SQL butuh build tools yang belum tentu
 * terpasang di laptop mahasiswa). Setiap perubahan langsung ditulis ke data/db.json,
 * jadi datanya tetap PERSISTEN antar restart server — bukan lagi disimpan di memori
 * browser yang hilang saat refresh.
 *
 * Kalau untuk deployment sungguhan / nilai tambah tugas akhir, modul ini bisa diganti
 * dengan driver SQLite/PostgreSQL asli — cukup ganti isi load()/save() di bawah,
 * seluruh route di server.js tidak perlu diubah karena hanya memanggil fungsi ini.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function emptyDb(){
  return { users: [], sessions: [], transactions: [], nextUserId: 1, nextTxId: 1 };
}

function load(){
  if(!fs.existsSync(DB_PATH)){
    const initial = emptyDb();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try{
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }catch(e){
    console.error('DB rusak / tidak terbaca, membuat ulang database kosong:', e.message);
    const fresh = emptyDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

function save(data){
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
