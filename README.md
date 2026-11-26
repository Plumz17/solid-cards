# SolidCard

SolidCard adalah aplikasi web flashcard berbasis [Solid](https://solidproject.org/). Pengguna membuat dan menyimpan deck langsung di Solid Pod miliknya; aplikasi tidak memiliki backend sendiri. Deck dapat dipelajari, dibagikan sebagai tautan publik, dan disalin ke Pod pengguna lain.

## Fitur

- **Masuk dengan Solid:** pilih provider Solid (default: `https://solidcommunity.net`) dan autentikasi melalui provider tersebut. Sesi sebelumnya dipulihkan saat aplikasi dibuka kembali.
- **Kelola deck di Pod sendiri:** lihat daftar deck dan jumlah kartu, buat deck, ubah nama/deskripsi, edit kartu, serta hapus deck. Deck baru bersifat privat secara default.
- **Buat dan atur kartu:** setiap kartu memiliki sisi depan dan belakang; tambahkan, hapus, atau ubah urutan kartu.
- **Gambar kartu:** tambahkan gambar terpisah di sisi depan dan belakang. Format yang didukung JPEG, PNG, GIF, dan WebP, hingga 5 MB per gambar.
- **Privasi dan berbagi:** ubah deck menjadi publik atau privat dan salin tautan untuk dibagikan. Deck publik dapat dibaca siapa saja, tetapi hanya pemilik yang dapat mengubahnya. Gambar mengikuti pengaturan akses deck.
- **Pratinjau dan kloning:** buka tautan aplikasi atau URL file deck untuk melihat deck secara read-only, termasuk tanpa login jika deck publik. Balik kartu di pratinjau, lalu kloning deck ke Pod sendiri. Klon merupakan salinan terpisah; perubahan atau penghapusan deck asli tidak mengubah klon.
- **Belajar:** pelajari kartu satu per satu dengan urutan acak atau urutan deck, batasi jumlah kartu, dan tandai “Again” atau “Got it”. Tersedia progress, stopwatch opsional, musik latar opsional, dan ringkasan sesi. Progress sesi tidak disimpan ke Pod.
- **Friends:** ikuti pengguna menggunakan WebID, berhenti mengikuti, dan lihat deck publik mereka. Daftar orang yang diikuti disimpan di Pod pengguna.
- **Tautan setelah login:** membuka tautan deck, lalu login jika diperlukan, akan mengembalikan pengguna ke deck tersebut.

## Menjalankan secara lokal

### Prasyarat

- Node.js 22 dan npm (versi Node yang digunakan workflow CI/deploy proyek).
- Akun pada provider Solid yang mendukung autentikasi browser dan Pod.

### Instalasi dan server pengembangan

Dari direktori proyek, jalankan:

```sh
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite di terminal (biasanya `http://localhost:5173`). Masuk menggunakan Solid provider. Kolom provider sudah diisi dengan `https://solidcommunity.net`, tetapi dapat diganti dengan provider lain yang kompatibel.

### Build dan pratinjau build

```sh
npm run build
npm run preview
```

Perintah `preview` menyajikan hasil build dari `dist/` secara lokal.

## Penyimpanan dan privasi

Semua deck disimpan di Pod pemilik pada `solidcard/decks/<nama-deck>/<nama-deck>.ttl`; gambar disimpan bersama file deck. Data deck dan kartu menggunakan format RDF/Turtle dengan istilah Schema.org. Aplikasi menemukan alamat Pod melalui WebID pengguna dan membaca/menulis data menggunakan sesi Solid yang terautentikasi.

Deck privat hanya dapat dibaca oleh pihak yang memiliki akses di Pod. Deck publik dapat dibaca siapa saja, tetapi aplikasi tidak memberikan akses tulis kepada orang lain. Hanya deck publik yang muncul di daftar publik yang digunakan untuk menampilkan deck pengguna yang diikuti. Menghapus deck juga menghapus gambar miliknya dan entri daftar publik; klon milik pengguna lain tetap ada.

## Teknologi

- React 19 dan JavaScript
- Vite
- `@inrupt/solid-client` dan `@inrupt/solid-client-authn-browser`
- GitHub Pages untuk hosting

## Deploy

Workflow GitHub Actions di `.github/workflows/deploy.yml` berjalan saat ada push ke branch `main` atau dijalankan manual. Workflow menginstal dependency, membangun aplikasi, dan menerbitkan `dist/` ke GitHub Pages. Untuk mengaktifkannya, atur **Settings → Pages → Build and deployment → Source** ke **GitHub Actions**.

Konfigurasi Vite menggunakan base path `/solid-cards/` untuk deployment GitHub Pages. Situs proyek tersedia di <https://plumz17.github.io/solid-cards/>.
