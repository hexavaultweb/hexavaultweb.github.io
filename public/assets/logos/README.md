# Folder Logo Pembayaran

Taruh file logo resmi di sini dengan nama persis seperti berikut (huruf kecil semua), maka akan otomatis dipakai menggantikan badge fallback di halaman:

| Metode            | Nama file yang diharapkan |
|--------------------|----------------------------|
| QRIS               | `qris.svg`                |
| GoPay               | `gopay.svg`                |
| OVO                 | `ovo.svg`                  |
| DANA                | `dana.svg`                 |
| ShopeePay           | `shopeepay.svg`            |
| LinkAja             | `linkaja.svg`              |
| BCA                 | `bca.svg`                  |
| Mandiri             | `mandiri.svg`              |
| BNI                 | `bni.svg`                  |
| BRI                 | `bri.svg`                  |
| Permata             | `permata.svg`              |
| CIMB Niaga          | `cimb.svg`                 |

Format PNG (`.png`) juga bisa, tinggal ganti ekstensi di `js/shared.js` pada bagian `PAY_CATEGORIES` (properti `img src="assets/logos/${m.id}.svg"` di fungsi `renderPayMethods`).

**Penting**: logo-logo ini adalah aset bermerek dagang milik masing-masing perusahaan. Pastikan penggunaannya sesuai ketentuan brand guideline resmi mereka sebelum dipakai di produk yang benar-benar dipublikasikan/dikomersialkan.
