# HexaVault Diamond — Proyek Tugas Akhir

Simulasi platform Top Up Diamond Mobile Legends + Joki Rank, dengan backend nyata (Express + database), sistem membership, poin, kartu stempel, dan QRIS asli (format EMVCo) — dibundel lokal, tidak bergantung CDN.

## Fitur utama
- **Login sekali di awal** — sesi disimpan lewat token, tidak perlu login ulang tiap pindah halaman/refresh
- **Database sungguhan** — semua user & transaksi tersimpan permanen di `data/db.json`, bukan cuma di memori browser
- **QRIS nyata** — payload sesuai standar EMVCo dengan checksum CRC16 valid, nominal terbaca otomatis saat discan
- **Ringkasan/resi transaksi** hanya muncul setelah pemesanan selesai — bukan mengganggu selama memilih paket
- **Benefit tier member diterapkan nyata ke transaksi** — diskon harga, cashback poin, dan kecepatan stempel dihitung ULANG di server sesuai tier user saat itu, bukan cuma teks di halaman Membership
- Poin, stempel, dan bonus dihitung **di server** (tidak bisa dimanipulasi dari browser)

## Struktur Proyek
```
hexavault/
├── server.js            → Backend Express: routing API + serve frontend
├── package.json
├── lib/db.js              → Modul database file JSON sederhana
├── shared/tier-benefits.json → Satu-satunya sumber kebenaran benefit tier (dipakai server & frontend)
├── data/db.json           → File database (dibuat otomatis saat server pertama jalan)
└── public/                → Semua file frontend
    ├── index.html            → Halaman Top Up Diamond
    ├── joki-ml.html          → Halaman Joki Rank
    ├── css/main.css | topup.css | joki.css
    ├── js/
    │   ├── nav.js              → Navbar identik di kedua halaman
    │   ├── api.js               → Helper fetch ke backend + penyimpanan token sesi
    │   ├── shared.js            → Auth, metode pembayaran, generator QRIS, alur pembayaran, resi, config tier
    │   ├── topup.js | joki.js   → Logika masing-masing halaman
    │   └── vendor/qrcode.min.js → Library QR (dibundel lokal, MIT license)
    └── assets/logos/          → Taruh logo resmi e-wallet/bank di sini
```

## Cara menjalankan
```bash
npm install
npm start
```
Lalu buka **http://localhost:3000** di browser. Server ini melayani frontend sekaligus API dari satu origin yang sama — jadi tidak ada masalah CORS, dan file lokal (`file://`) tidak perlu lagi karena semua sudah lewat server.

> Butuh Node.js versi 18 ke atas. Tidak perlu install database terpisah (SQLite/MySQL/dll) — datanya otomatis tersimpan di `data/db.json`.

## Bagaimana login "sekali di awal" bekerja
Saat register/login, backend membuat **token sesi** yang disimpan di `localStorage` browser (`js/api.js`). Setiap kali halaman dimuat (`index.html` maupun `joki-ml.html`), token itu dicek ulang ke server (`restoreSession()` di `js/shared.js`) — kalau masih valid, user otomatis ter-login tanpa perlu isi form lagi. Karena kedua halaman disajikan dari server yang sama, sesi ini otomatis nyambung di kedua halaman.

## Bagaimana ringkasan transaksi bekerja
Selama memilih paket/rank, sidebar hanya menampilkan **total harga** — supaya tidak mengganggu proses memilih. Begitu pembayaran **berhasil**, resi lengkap (akun, item, metode, poin, nomor stempel, ID transaksi) baru ditampilkan di layar hasil pembayaran. Riwayat lengkap semua transaksi tetap bisa dilihat kapan saja di halaman Riwayat.

## Bagaimana benefit tier diterapkan ke transaksi
Semua angka benefit (diskon %, pengali cashback poin, kecepatan stempel) didefinisikan **sekali** di `shared/tier-benefits.json`:

| Tier | Diskon | Cashback Poin | Stempel/transaksi |
|---|---|---|---|
| 🥉 Bronze (0-499 poin) | 0% | 1x | +1 |
| 🥈 Silver (500-1.499 poin) | 1% | 1.2x | +1 |
| 🥇 Gold (1.500-4.999 poin) | 3% | 1.5x | +2 |
| 💎 Platinum (5.000+ poin) | 5% | 2x | +2 |

Alurnya:
1. Frontend mengambil tabel ini sekali lewat `GET /api/tiers` saat halaman dimuat (`loadTierConfig()` di `js/shared.js`), lalu dipakai untuk **preview** harga diskon di grid paket & ringkasan sebelum bayar
2. Saat checkout, frontend tetap mengirim **harga asli** (`nominal`) ke `POST /api/transactions`
3. **Server** menghitung ulang tier user berdasarkan poin yang ia miliki **saat itu** (dari database, bukan dari input client), lalu menerapkan diskon & pengali poin dari tabel yang sama → hasil `discountAmount`, `finalNominal`, `poinEarned`, `stampsAdded` dikembalikan ke frontend untuk ditampilkan di resi

Karena perhitungan akhir selalu di server dan berbasis data yang tersimpan di database (bukan yang dikirim client), **user tidak bisa memalsukan tier/diskon miliknya** lewat DevTools atau modifikasi request. Diskon berlaku untuk transaksi Top Up maupun Joki Rank; cashback poin & stempel berlaku untuk kedua sumber transaksi juga (karena keduanya sama-sama pembelian di platform).

Untuk mengubah persentase/pengali benefit, cukup edit `shared/tier-benefits.json` — otomatis konsisten di backend maupun tampilan frontend tanpa perlu ubah kode lain.

## Database
Memakai file JSON sederhana (`lib/db.js`) supaya proyek bisa langsung `npm install && npm start` tanpa perlu compiler native (banyak driver SQL butuh build tools yang belum tentu terpasang). Struktur data:
- **users**: id, name, email, salt+hash password (bukan plaintext), points, stamps
- **sessions**: token → userId (untuk auth)
- **transactions**: id, userId, source (`topup`/`joki`), orderId, item, nominal, method, status, meta, createdAt

Untuk nilai tambah tugas akhir, modul `lib/db.js` bisa diganti ke SQLite/PostgreSQL asli — seluruh route di `server.js` hanya memanggil `load()`/`save()`, jadi tidak perlu mengubah logic lain.

## Cara kerja QRIS
`public/js/shared.js` → `buildQrisPayload()` membangun payload TLV sesuai format standar **EMVCo Merchant Presented QR** (dasar dari QRIS Indonesia), termasuk checksum CRC16 yang sudah diverifikasi benar terhadap test vector standar. Payload dirender jadi QR sungguhan lewat `public/js/vendor/qrcode.min.js` — dibundel LOKAL dari npm package `qrcode` v1.5.3 (bukan dari CDN, karena path CDN resmi paket ini ternyata tidak konsisten menyediakan file build-nya). Jadi kalau discan pakai aplikasi pembaca QR apa pun, nominal (tag `54`) akan terbaca sesuai harga transaksi.

⚠️ **Catatan penting**: merchant ID pada payload (`ID99HEXAVAULT0001`) adalah data contoh/dummy — ini BUKAN QRIS yang terdaftar di bank/PJSP mana pun, jadi tidak akan benar-benar memproses pembayaran. Untuk produksi sungguhan, kamu perlu daftar sebagai merchant QRIS resmi ke PJSP (bank/fintech berlisensi Bank Indonesia) dan pakai NMID + kredensial resmi mereka.

## Logo pembayaran
Logo e-wallet/bank saat ini adalah badge warna+inisial buatan sendiri (bukan aset resmi, karena berhak cipta/merek dagang). Untuk pakai logo asli:
1. Unduh logo resmi dari brand resource masing-masing provider
2. Simpan sebagai SVG/PNG dengan nama sesuai id di `public/js/shared.js` → `PAY_CATEGORIES`, contoh: `assets/logos/gopay.svg`
3. Logo otomatis tampil menggantikan badge fallback — tidak perlu ubah kode apa pun

## Langkah lanjutan untuk produksi sungguhan
- Ganti `lib/db.js` dengan database SQL asli (SQLite/PostgreSQL/MySQL)
- Integrasikan payment gateway berlisensi (Midtrans/Xendit/dll) untuk QRIS & VA yang benar-benar bisa menerima pembayaran
- Tambahkan validasi input & rate limiting di sisi server
- Pasang HTTPS (via reverse proxy seperti Nginx/Caddy) sebelum deploy publik
