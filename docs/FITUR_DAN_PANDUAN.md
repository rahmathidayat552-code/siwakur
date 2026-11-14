# Fitur Lengkap & Panduan Penggunaan SIWAKUR
**Sistem Informasi Wakil Kurikulum — SMKN 9 Bulukumba**

Dokumen ini merangkum seluruh fitur aplikasi SIWAKUR beserta panduan operasional untuk **Admin Wakur (Wakasek Kurikulum)**, **Guru**, dan panduan **Konfigurasi Layanan & Deployment**.

---

## Bagian 1: Daftar Fitur Lengkap

### 1.1 Fitur Autentikasi & Keamanan
- **Dual Metode Login**: Masuk menggunakan akun **Google (Sign in with Google)** atau **Email & Kata Sandi**.
- **Aktivasi Mandiri Akun Guru**: Guru yang telah didaftarkan Wakur dapat membuat kata sandi sendiri melalui tab **Aktivasi Akun Guru** tanpa campur tangan admin untuk manajemen sandi.
- **Proteksi Whitelist & Anti-Spoofing**: Hanya email yang terdaftar di `wakur_admins`, `VITE_WAKUR_EMAIL`, atau `whitelisted_teachers` yang dapat mengakses sistem.
- **Pesan Error Informatif**: Kesalahan domain, izin database, atau email belum terdaftar langsung diterjemahkan ke bahasa Indonesia yang jelas.

### 1.2 Fitur Portal Wakasek Kurikulum (`/wakur`)
1. **Dashboard Statistik (`WakurDashboard`)**
   - Kartu KPI real-time: Total Guru Terdaftar, Guru Sudah Aktivasi, Total Tagihan Tugas, dan Progres Pengumpulan Tugas Aktif.
   - Daftar tugas terbaru beserta rasio kepatuhan pengumpulan guru.
   - Daftar ringkas setoran yang masih **Menunggu Verifikasi**.
2. **Database Guru / Whitelist (`TeacherWhitelist`)**
   - Pendaftaran guru baru (Email, Nama & Gelar, NIP/NUPTK, serta **pemilihan multi-mata pelajaran** dari katalog atau input manual).
   - Pencarian berdasarkan nama, NIP, email, atau mata pelajaran, serta filter status aktivasi (`Semua`, `Sudah Aktivasi`, `Belum Aktivasi`).
   - Edit daftar mata pelajaran guru langsung dari tabel (`Mapel`) dan hapus guru dengan konfirmasi aman.
3. **Manajemen Mata Pelajaran (`SubjectManagement`)**
   - CRUD katalog mata pelajaran resmi sekolah: **Tambah**, **Edit**, dan **Hapus** mata pelajaran.
   - Atribut lengkap: **Nama Mata Pelajaran**, **Kode Mapel** (opsional), dan **Kelompok** (`Umum`, `Kejuruan`, `Muatan Lokal`, `Lainnya`).
   - Statistik jumlah mapel per kelompok, fitur pencarian, dan filter kelompok.
4. **Manajemen Tugas (`TaskManagement`)**
   - Pembuatan tagihan perangkat ajar (Judul Tugas, Deskripsi/Instruksi, Batas Waktu/Deadline).
   - Opsi pembuatan folder otomatis di Google Drive (`SIWAKUR - SMKN 9 Bulukumba/[Judul Tugas]`) lengkap dengan tautan folder.
   - Pantauan persentase progres setoran per tugas serta penghapusan tugas.
5. **Verifikasi & Export Google Sheets (`VerificationExport`)**
   - Pemantauan tabel seluruh guru terhadap tugas tertentu (baik yang sudah maupun belum menyetor).
   - Pratinjau tautan berkas dan modal verifikasi dengan status **Disetujui** atau **Perlu Revisi** (wajib disertai catatan revisi).
   - **Export Rekap ke Google Sheets** satu klik yang otomatis membuat spreadsheet berformat rapi berisi data guru, status aktivasi, status setoran, tautan berkas, dan catatan revisi.
6. **Manajemen Admin Wakur (`WakurAdminsManager`)**
   - Pengelolaan dinamis email Wakasek Kurikulum / Tim Kurikulum tambahan melalui UI (`wakur_admins`).
   - Perlindungan akun **Super-Wakur Utama** dari penghapusan tidak sengaja.

### 1.3 Fitur Portal Guru (`/guru`)
1. **Profil & Pemilihan Multi-Mata Pelajaran (`GuruSubjectSelector`)**
   - Guru dapat melihat ringkasan mata pelajaran yang diampu di header portal.
   - Melalui tab **Mata Pelajaran Saya** atau tombol **Atur Mata Pelajaran**, guru dapat mencari, memfilter kelompok, dan memilih **lebih dari satu mata pelajaran** (hingga 20 mapel) dari daftar yang dikelola Wakur.
2. **Daftar Tagihan Perangkat Ajar (`GuruTaskList`)**
   - Ringkasan pribadi: Total Tagihan Tugas, Belum Disetor, Perlu Revisi, dan Disetujui.
   - Filter status tugas (`Semua`, `Aktif / Menunggu`, `Perlu Revisi`, `Disetujui`).
   - Tampilan langsung catatan revisi dari Wakasek Kurikulum.
3. **Pengumpulan & Revisi Perangkat Ajar (`SubmissionModal`)**
   - **Pemilihan Mapel Setoran**: Jika guru mengampu lebih dari 1 mata pelajaran, guru dapat memilih mata pelajaran mana yang berlaku untuk berkas yang disetor.
   - **Dua Mode Pengumpulan**:
     1. **Unggah ke Google Drive**: Mendukung file `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx` dengan penamaan otomatis `[JudulTugas]_[NamaGuru]_[Mapel].[ext]`.
     2. **Tempel Link Docs / Drive**: Menyimpan tautan Google Docs/Drive eksternal.
   - **Alur Revisi Aman**: Memerlukan centang konfirmasi penggantian berkas sebelum mengirim revisi; dokumen yang sudah berstatus **Disetujui** otomatis terkunci.

---

## Bagian 2: Panduan Pengguna (Operasional Harian)

### 2.1 Panduan Admin Wakur (Wakasek Kurikulum)
1. **Masuk Pertama Kali**
   - Buka aplikasi, klik **Sign in with Google**, dan pilih email resmi Wakur (default: `rahmathidayat552@guru.smk.belajar.id`).
   - Jika muncul popup izin **Google Drive & Google Sheets**, centang semua izin agar fitur pembuatan folder dan ekspor rekap berjalan lancar.
2. **Menyiapkan Katalog Mata Pelajaran**
   - Buka menu **Mata Pelajaran**.
   - Masukkan nama mata pelajaran (misal: *Matematika*, *Dasar-Dasar PPLG*), kode opsional, dan kelompoknya (`Umum`, `Kejuruan`, `Muatan Lokal`, `Lainnya`), lalu klik **Tambah Mata Pelajaran**.
3. **Mendaftarkan Guru ke Whitelist**
   - Buka menu **Database Guru**.
   - Isi **Email Guru**, **Nama Lengkap & Gelar**, **NIP / NUPTK**, lalu centang satu atau lebih mata pelajaran yang diampu guru tersebut.
   - Klik **Tambahkan ke Whitelist**.
4. **Membuat Tagihan Perangkat Ajar**
   - Buka menu **Manajemen Tugas**.
   - Isi judul tugas (misal: *Modul Ajar Semester Genap*), instruksi, dan deadline.
   - Biarkan opsi pembuatan folder Google Drive aktif, lalu klik **Buat Tugas**.
5. **Memverifikasi & Mengekspor Rekap**
   - Buka menu **Verifikasi & Export**, pilih tugas yang ingin diperiksa.
   - Klik **Preview** untuk memeriksa dokumen guru, lalu klik **Verifikasi** untuk menyetujui atau meminta revisi dengan catatan yang jelas.
   - Klik **Export Rekap ke Google Sheets** untuk menghasilkan laporan spreadsheet siap cetak/bagikan.
6. **Menambah Tim Admin Wakur Lainnya**
   - Buka menu **Admin Wakur**, masukkan email Google/Belajar.id rekan tim kurikulum, nama lengkap, dan keterangan jabatan.
   - Rekan tersebut kini dapat langsung masuk menggunakan **Sign in with Google** dan mengakses Portal Wakur.

### 2.2 Panduan Guru
1. **Aktivasi / Masuk ke Akun**
   - **Cara Termudah**: Pada tab **Masuk (Login)**, langsung klik **Sign in with Google** menggunakan email yang sudah didaftarkan Wakasek Kurikulum.
   - **Cara Email & Sandi**: Buka tab **Aktivasi Akun Guru**, masukkan email terdaftar dan buat kata sandi baru minimal 6 karakter.
2. **Memilih Lebih dari Satu Mata Pelajaran**
   - Setelah masuk ke Portal Guru, klik tombol **Atur Mata Pelajaran** atau buka menu **Mata Pelajaran Saya**.
   - Gunakan kolom pencarian atau filter kelompok (`Umum`, `Kejuruan`, `Muatan Lokal`, `Lainnya`), lalu centang semua mata pelajaran yang Anda ampu.
   - Klik **Simpan Pilihan Mapel**.
3. **Mengumpulkan Perangkat Ajar**
   - Pada menu **Tagihan Perangkat Ajar**, klik **Setor Perangkat** pada tugas yang tersedia.
   - Jika Anda memilih lebih dari satu mata pelajaran, pilih mata pelajaran untuk setoran tersebut.
   - Pilih tab **Unggah ke Google Drive** (rekomendasi, nama file otomatis rapi) atau **Tempel Link Docs / Drive** (pastikan tautan sudah diatur *Siapa saja yang memiliki tautan dapat melihat*).
   - Klik **Kirim Perangkat Ajar**.
4. **Mengirim Revisi (Jika Diminta Wakur)**
   - Tugas yang memerlukan perbaikan akan berstatus merah **Perlu Revisi** lengkap dengan catatan Wakur.
   - Klik **Unggah Revisi**, pilih berkas atau tautan baru, centang kotak konfirmasi penggantian berkas, lalu klik **Kirim Revisi**.

---

## Bagian 3: Panduan Konfigurasi Layanan & Deployment

### 3.1 Pengaturan Firebase Console (`gen-lang-client-0204854375`)
1. **Authorized Domains (Wajib untuk Vercel)**
   - Buka **Firebase Console** → Proyek `gen-lang-client-0204854375`.
   - Masuk ke **Authentication** → tab **Settings** → **Authorized domains**.
   - Klik **Add domain**, lalu tambahkan `siwakur.vercel.app` (dan `localhost` untuk pengembangan lokal).
2. **Sign-in Providers**
   - Di **Authentication** → **Sign-in method**, pastikan **Google** dan **Email/Password** berstatus *Enabled*.
3. **Firestore Database & Security Rules**
   - Database menggunakan instance `ai-studio-15032b4a-e1ad-418b-b22d-c11a9e15a209`.
   - Setiap perubahan pada `firestore.rules` harus divalidasi dengan `npx eslint firestore.rules` dan di-deploy ke Firebase.

### 3.2 Pengaturan Sinkronisasi Google Drive & Google Sheets
Agar popup login dan sinkronisasi Google Drive/Sheets berjalan mulus di domain produksi (`siwakur.vercel.app`):
1. Buka **Google Cloud Console** untuk proyek `gen-lang-client-0204854375`.
2. Masuk ke **APIs & Services** → **Enabled APIs & services**, pastikan dua API berikut sudah aktif:
   - **Google Drive API**
   - **Google Sheets API**
3. Masuk ke **APIs & Services** → **OAuth consent screen**:
   - Tambahkan scope `https://www.googleapis.com/auth/drive.file` dan `https://www.googleapis.com/auth/spreadsheets`.
   - Jika status aplikasi masih *Testing*, ubah menjadi *In Production* (atau daftarkan email guru di *Test users* selama masa uji coba).
4. Masuk ke **APIs & Services** → **Credentials** → pilih OAuth 2.0 Client ID (`221450191168-16kn09hjl942ajcrt7ipq621avg6j0of.apps.googleusercontent.com`):
   - Pada **Authorized JavaScript origins**, tambahkan `https://siwakur.vercel.app`.
   - Pada **Authorized redirect URIs**, pastikan URI handler Firebase `https://gen-lang-client-0204854375.firebaseapp.com/__/auth/handler` terdaftar.

### 3.3 Deployment ke Vercel
1. Pastikan file `vercel.json` berada di root repositori (mengatur SPA rewrite ke `/index.html` dan header `Cross-Origin-Opener-Policy: same-origin-allow-popups`).
2. Atur *Environment Variables* di **Vercel Project Settings** jika ingin mengganti email Super-Wakur bawaan:
   - `VITE_WAKUR_EMAIL=rahmathidayat552@guru.smk.belajar.id`
3. Jalankan build / push ke branch utama yang terhubung ke Vercel (`npm run build` menghasilkan folder `dist`).

---

## Bagian 4: Troubleshooting Error Umum

| Pesan Error | Penyebab | Solusi |
| :--- | :--- | :--- |
| `Firebase: Error (auth/unauthorized-domain)` | Domain hosting belum didaftarkan di Firebase Auth | Tambahkan domain (misal `siwakur.vercel.app`) di Firebase Console → Authentication → Settings → Authorized domains |
| `Email belum didaftarkan oleh Wakasek Kurikulum` | Email guru/Wakur tidak ada di `whitelisted_teachers` maupun `wakur_admins` | Minta Admin Wakur mendaftarkan email di menu **Database Guru** (untuk guru) atau **Admin Wakur** (untuk Wakur tambahan) |
| `Sesi Google Drive/Sheets berakhir` (401) | Token akses OAuth in-memory habis masa berlakunya | Klik ulang tombol aksi Drive/Sheets untuk memperbarui token lewat popup Google |
| Halaman `404 Not Found` saat refresh `/wakur` atau `/guru` di Vercel | Konfigurasi rewrite SPA belum terpasang | Pastikan `vercel.json` ikut ter-commit dan ter-deploy di root proyek |
