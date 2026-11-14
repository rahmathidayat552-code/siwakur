# Arsitektur Lengkap Aplikasi SIWAKUR
**Sistem Informasi Wakil Kurikulum — SMKN 9 Bulukumba**

Dokumen ini menjelaskan arsitektur teknis, struktur kode modular, model basis data Cloud Firestore, aturan keamanan (RBAC), integrasi Google Workspace (Drive & Sheets), serta konfigurasi deployment produksi untuk aplikasi **SIWAKUR**.

---

## 1. Ringkasan Teknologi (Tech Stack)

| Lapisan | Teknologi | Peran dalam Sistem |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript + Vite 8 | Antarmuka SPA (Single Page Application) dengan pengetikan statis penuh |
| **Routing & Code Splitting** | React Router DOM 7 + `React.lazy` & `Suspense` | Navigasi rute dan *lazy loading* terpisah antara Portal Wakur dan Portal Guru |
| **Styling & Ikon** | Tailwind CSS 4 + Lucide React | Sistem desain responsif dengan tipografi *Plus Jakarta Sans* & *JetBrains Mono* |
| **Autentikasi** | Firebase Authentication | Login Google (OAuth Popup) dan Email/Password dengan validasi `email_verified` |
| **Basis Data Real-Time** | Cloud Firestore (Enterprise Edition) | Penyimpanan data terpusat dengan sinkronisasi `onSnapshot` real-time (tanpa `localStorage`) |
| **Penyimpanan Berkas** | Google Drive API v3 (REST, Client-Side OAuth) | Pembuatan folder tugas otomatis dan pengunggahan berkas perangkat ajar guru |
| **Pelaporan & Rekap** | Google Sheets API v4 (REST, Client-Side OAuth) | Pembuatan dan pemformatan otomatis Google Spreadsheet rekap pengumpulan guru |
| **Keamanan Rules** | Firestore Security Rules v2 + `@firebase/eslint-plugin-security-rules` | Validasi skema, isolasi PII, dan kontrol akses berbasis peran (RBAC) |
| **Hosting Produksi** | Vercel (`siwakur.vercel.app`) | SPA rewrite & header `Cross-Origin-Opener-Policy` untuk popup OAuth Google |

---

## 2. Prinsip Desain & Struktur Direktori

SIWAKUR menerapkan arsitektur **Feature-Based Modularity** dengan **isolasi ketat** antar modul peran (`wakur` dan `guru`):
- Modul **`src/modules/wakur/`** dan modul **`src/modules/guru/`** dilarang melakukan *cross-import* satu sama lain.
- Semua komunikasi data berjalan melalui layanan terpusat di `src/services/` dan tipe bersama di `src/types/`.
- Tidak ada penyimpanan data aplikasi maupun token sensitif di `localStorage` atau `sessionStorage`.

```text
/
├── firebase-blueprint.json          # Skema entitas & path Firestore (Intermediate Representation)
├── firestore.rules                  # Aturan keamanan & validasi Zero-Trust Cloud Firestore
├── firebase-applet-config.json      # Konfigurasi proyek Firebase & Firestore Database ID
├── eslint.config.js                 # Konfigurasi ESLint untuk audit firestore.rules
├── vercel.json                      # SPA rewrite & header COOP (same-origin-allow-popups)
├── index.html                       # Entry HTML & metadata aplikasi
├── .env.example                     # Template variabel lingkungan (VITE_WAKUR_EMAIL)
├── docs/                            # Dokumentasi arsitektur, flowchart, fitur & panduan
└── src/
    ├── App.tsx                      # Router utama + Route-Based Lazy Loading (/wakur, /guru)
    ├── index.css                    # Konfigurasi Tailwind CSS & Google GSI button style
    ├── types/
    │   └── index.ts                 # Interface TypeScript bersama (UserProfile, SchoolSubject, dll.)
    ├── core/
    │   ├── auth/
    │   │   ├── AuthContext.tsx      # State sesi global, role, dan akses token Google in-memory
    │   │   ├── AuthPage.tsx         # Halaman Login & Aktivasi Akun Guru
    │   │   └── ProtectedRoute.tsx   # Penjaga rute berdasarkan status login & role
    │   ├── components/
    │   │   └── ConfirmDialog.tsx    # Dialog konfirmasi kustom (pengganti window.confirm)
    │   └── layout/
    │       ├── AppShell.tsx         # Kerangka navigasi sidebar/header responsif
    │       └── LoadingScreen.tsx    # Layar pemuatan saat inisialisasi sesi & lazy chunk
    ├── services/
    │   ├── firebase/
    │   │   ├── firebaseConfig.ts    # Inisialisasi Firebase, scope OAuth, cache token in-memory
    │   │   ├── authService.ts       # Alur login, aktivasi whitelist, resolusi role & error mapping
    │   │   └── firestoreService.ts  # Subscriber onSnapshot & operasi CRUD + batch Firestore
    │   └── google/
    │       ├── driveService.ts      # Operasi Google Drive (root folder, folder tugas, upload multipart)
    │       └── sheetsService.ts     # Ekspor & styling otomatis rekap ke Google Sheets API v4
    └── modules/
        ├── wakur/                   # Modul khusus Wakasek Kurikulum (terisolasi)
        │   ├── WakurModule.tsx      # Controller state real-time & navigasi tab Wakur
        │   └── components/
        │       ├── WakurDashboard.tsx      # Ringkasan KPI & progres kepatuhan guru
        │       ├── TeacherWhitelist.tsx    # Pendaftaran whitelist guru & edit multi-mapel
        │       ├── SubjectManagement.tsx   # CRUD katalog mata pelajaran sekolah
        │       ├── TaskManagement.tsx      # Pembuatan tugas & folder Drive otomatis
        │       ├── VerificationExport.tsx  # Review dokumen guru, catatan revisi & export Sheets
        │       └── WakurAdminsManager.tsx  # Manajemen multi-admin Wakur dinamis
        └── guru/                    # Modul khusus Guru (terisolasi)
            ├── GuruModule.tsx       # Controller state real-time & navigasi tab Guru
            └── components/
                ├── GuruTaskList.tsx        # Ringkasan & daftar tagihan perangkat ajar guru
                ├── GuruSubjectSelector.tsx # Pemilihan multi-mata pelajaran oleh guru
                └── SubmissionModal.tsx     # Modal upload Drive / tempel link & revisi berkas
```

---

## 3. Arsitektur Autentikasi & Otorisasi (RBAC)

### 3.1 Hierarki Penentuan Peran (*Role Resolution*)
Saat pengguna masuk (via Google Popup atau Email/Password), `ensureUserProfile()` di `src/services/firebase/authService.ts` menentukan hak akses dengan urutan prioritas berikut:

1. **Bootstrap Super-Wakur (`VITE_WAKUR_EMAIL`)**
   - Default: `rahmathidayat552@guru.smk.belajar.id` (wajib `emailVerified === true`).
   - Memiliki hak akses penuh `wakur` secara permanen dan tidak dapat dihapus dari UI.
2. **Admin Wakur Dinamis (`wakur_admins/{email}`)**
   - Jika email pengguna terverifikasi (`emailVerified === true`) dan dokumennya ada di koleksi `wakur_admins`, pengguna otomatis mendapat peran `wakur`.
3. **Guru Terdaftar di Whitelist (`whitelisted_teachers/{email}`)**
   - Jika bukan Wakur, sistem memeriksa dokumen whitelist berdasarkan huruf kecil email (`email.toLowerCase()`).
   - Jika tidak ditemukan, sesi langsung di-`signOut` dan pesan penolakan yang ramah ditampilkan.
   - Jika ditemukan dan belum aktif (`isRegistered === false`), akun langsung ditautkan ke `uid` Firebase Auth dan diperbarui di `whitelisted_teachers` + `whitelist_status` melalui `writeBatch`.

### 3.2 Penjaga Rute & Lazy Loading
- `src/App.tsx` memuat `WakurModule` dan `GuruModule` secara *lazy* sehingga kode Portal Wakur tidak ikut diunduh oleh browser Guru, dan sebaliknya.
- `ProtectedRoute.tsx` memverifikasi `user` dan `role === allowedRole`. Jika tidak cocok, pengguna otomatis diarahkan ke rute sesuai perannya (`/wakur` atau `/guru`) atau ke `/auth`.

---

## 4. Arsitektur Basis Data Cloud Firestore

Semua koleksi berada pada database Firestore `ai-studio-15032b4a-e1ad-418b-b22d-c11a9e15a209` dengan skema referensi pada `firebase-blueprint.json`.

### 4.1 Daftar Koleksi & Fungsi

| Koleksi & Pattern ID | Fungsi Utama | Hak Baca | Hak Tulis |
| :--- | :--- | :--- | :--- |
| `/users/{userId}` | Profil pengguna terautentikasi (`uid`, `email`, `fullName`, `nip`, `subject`, `subjects[]`, `role`) | Pemilik (`uid`) atau `wakur` | Create oleh pemilik terverifikasi; Update oleh `wakur` atau pemilik (hanya profil/mapel) |
| `/wakur_admins/{adminEmail}` | Daftar admin Wakasek Kurikulum tambahan | `wakur` atau pemilik email terverifikasi (`get`) | Create, Update, Delete oleh `wakur` (Super-Wakur utama dilindungi dari penghapusan) |
| `/whitelisted_teachers/{teacherEmail}` | Data PII guru yang diizinkan mengaktivasi akun (`fullName`, `nip`, `subject`, `subjects[]`, `isRegistered`, `uid`) | `wakur` atau guru pemilik email (`get`) | Create/Delete oleh `wakur`; Update oleh `wakur`, aktivasi awal guru, atau update mapel guru aktif |
| `/whitelist_status/{teacherEmail}` | Status aktivasi non-PII (`active`, `isRegistered`, `uid`) untuk cek pra-pendaftaran tanpa membocorkan PII | `get` per email dokumen (`list: false`) | Create/Delete oleh `wakur`; Update oleh `wakur` atau guru saat aktivasi pertama |
| `/subjects/{subjectId}` | Master katalog mata pelajaran (`schoolId`, `name`, `code`, `category`) | Pengguna login (`wakur` atau `guru`) | Create, Update, Delete oleh `wakur` |
| `/tasks/{taskId}` | Tugas pengumpulan perangkat ajar (`schoolId`, `title`, `description`, `deadline`, `driveFolderId`, `driveFolderUrl`) | Pengguna login dengan filter `schoolId == 'smkn9-bulukumba'` | Create, Update, Delete oleh `wakur` |
| `/submissions/{submissionId}` | Setoran perangkat ajar per guru per tugas (`{taskId}_{teacherUid}`) | `wakur` atau guru pemilik (`teacherUid == auth.uid`) | Create oleh guru terverifikasi; Update status/catatan oleh `wakur`, revisi berkas oleh guru selama belum `Disetujui` |

### 4.2 Strategi Query Bebas Composite Index
Untuk memastikan aplikasi langsung berjalan tanpa kendala *missing composite index* pada Firestore:
- Query hanya menggunakan filter tunggal (`where('schoolId', '==', 'smkn9-bulukumba')` pada `tasks` & `subjects`, atau `where('teacherUid', '==', teacherUid)` pada `submissions`).
- Pengurutan data (`createdAt`, `updatedAt`, `fullName`, `category`) dilakukan di sisi klien setelah data diterima melalui `onSnapshot`.

---

## 5. Model Keamanan Firestore Rules (`firestore.rules`)

Aturan keamanan dibangun mengikuti pendekatan **Zero-Trust & Validasi Skema Ketat**:
1. **Default Deny**: `match /{document=**} { allow read, write: if false; }` di bagian paling atas.
2. **Email Spoofing Prevention**: Fungsi `isWakur()` wajib memeriksa `request.auth.token.email_verified == true` sebelum mencocokkan email Super-Wakur maupun dokumen `wakur_admins`.
3. **Validation Blueprint Helpers**: Setiap operasi `create` dan `update` wajib melewati fungsi `isValid[Entity](incoming())` yang memeriksa kelengkapan field (`hasAll` & `hasOnly`), tipe data, batas panjang string (`maxLength`), pola regex ID (`^[a-zA-Z0-9_\-]+$`), serta guard array `subjects` (`size() <= 20`).
4. **Tiered Update & Immutable Fields**:
   - Field identitas & waktu pembuatan (`createdAt`, `createdBy`, `uid`, `email`, `schoolId`) dikunci agar tidak bisa dimanipulasi saat `update`.
   - Guru tidak dapat mengubah status verifikasi (`status`, `revisionNote`, `reviewedBy`) pada dokumen `submissions`.
   - Setoran yang sudah berstatus `Disetujui` terkunci dari perubahan ulang oleh guru.
5. **PII Isolation**: Koleksi `whitelisted_teachers` dipisahkan dari `whitelist_status` sehingga pengecekan status pra-aktivasi akun tidak pernah mengekspos nama atau NIP guru ke publik.

---

## 6. Arsitektur Integrasi Google Workspace (Drive & Sheets)

SIWAKUR menggunakan **Client-Side OAuth 2.0** melalui Firebase `GoogleAuthProvider` dengan scope:
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/spreadsheets`

### 6.1 Manajemen Access Token In-Memory
- Access token Google disimpan **eksklusif di memori RAM JavaScript** (`cachedAccessToken` di `firebaseConfig.ts`), tidak pernah ditulis ke `localStorage` atau cookie.
- Token otomatis dibersihkan saat pengguna keluar (`signOut`) atau sesi auth berakhir.
- Jika pengguna sebelumnya masuk dengan Email/Password (belum memiliki token Google), fungsi `connectGoogleWorkspace()` memanggil `linkWithPopup` / `reauthenticateWithPopup` secara otomatis tepat ketika pengguna menekan tombol integrasi Drive atau Sheets.

### 6.2 Alur Google Drive (`driveService.ts`)
- **Wakur Membuat Tugas**: Mencari atau membuat folder induk `SIWAKUR - SMKN 9 Bulukumba`, lalu membuat subfolder dengan nama judul tugas dan mengatur izin baca publik (`anyone` -> `reader`) agar tautan dapat dibuka.
- **Guru Mengunggah File**: Mengunggah file secara *multipart upload* dengan konvensi nama otomatis `[JudulTugas]_[NamaGuru]_[Mapel].[ekstensi]`. Jika folder tugas milik Wakur belum memiliki izin tulis dari akun guru, sistem melakukan *fallback* aman dengan menyimpan file ke folder `SIWAKUR - SMKN 9 Bulukumba` di Drive milik guru dan membagikan tautan bacanya ke Wakur.

### 6.3 Alur Google Sheets (`sheetsService.ts`)
- **Ekspor Rekap**: Membuat spreadsheet baru berjudul `Rekap SIWAKUR - [Judul Tugas] ([Tanggal])`, menulis header informasi tugas dan tabel lengkap seluruh guru whitelist (NIP, Nama, Email, Mapel, Status Aktivasi, Status Setoran, Nama File, Tautan Berkas, Catatan Revisi, Waktu Pembaruan), serta memformat warna header dan lebar kolom otomatis via `:batchUpdate`.

---

## 7. Arsitektur Deployment & Produksi (`vercel.json`)

- **SPA Routing**: Semua path (`/(.*)`) diarahkan ulang ke `/index.html` agar rute langsung seperti `/wakur` atau `/guru` tidak menghasilkan error `404` saat halaman di-refresh di Vercel.
- **Keamanan Popup OAuth**: Header `Cross-Origin-Opener-Policy: same-origin-allow-popups` dipasang agar `signInWithPopup`, `linkWithPopup`, dan `reauthenticateWithPopup` tetap terhubung ke jendela induk pada browser modern.
