# Flowchart Sistem SIWAKUR
**SMKN 9 Bulukumba — Diagram Alur Sistem & Proses Bisnis**

Dokumen ini berisi seluruh flowchart sistem **SIWAKUR** menggunakan format diagram **Mermaid** yang dapat langsung dirender di GitHub, VS Code, Notion, maupun viewer Markdown modern.

---

## 1. Arsitektur Alur Data Keseluruhan

```mermaid
flowchart LR
    subgraph Client["Browser Pengguna (React + Vite SPA)"]
        UI_Auth["AuthPage (/auth)"]
        UI_Wakur["WakurModule (/wakur - Lazy)"]
        UI_Guru["GuruModule (/guru - Lazy)"]
        TokenMem["Token OAuth In-Memory"]
    end

    subgraph Firebase["Firebase (gen-lang-client-0204854375)"]
        FB_Auth["Firebase Authentication"]
        FB_Rules["Firestore Security Rules"]
        FB_DB["Cloud Firestore<br/>(users, wakur_admins, whitelisted_teachers,<br/>whitelist_status, subjects, tasks, submissions)"]
    end

    subgraph Google["Google Workspace APIs"]
        G_Drive["Google Drive API v3"]
        G_Sheets["Google Sheets API v4"]
    end

    UI_Auth -->|"Login Email / Google Popup"| FB_Auth
    FB_Auth -->|"ID Token + Access Token"| TokenMem
    UI_Wakur <-->|"onSnapshot / CRUD"| FB_Rules
    UI_Guru <-->|"onSnapshot / CRUD"| FB_Rules
    FB_Rules <--> FB_DB
    UI_Wakur -->|"Buat Folder Tugas (Bearer Token)"| G_Drive
    UI_Wakur -->|"Export Rekap Tabel (Bearer Token)"| G_Sheets
    UI_Guru -->|"Upload Perangkat Ajar (Bearer Token)"| G_Drive
    TokenMem -.->|"Bearer Token"| G_Drive
    TokenMem -.->|"Bearer Token"| G_Sheets
```

---

## 2. Flowchart Autentikasi & Penentuan Peran (*Role Resolution*)

```mermaid
flowchart TD
    A([Pengguna Buka Aplikasi]) --> B{Sudah Login di Firebase?}
    B -- Tidak --> C[/Tampil Halaman /auth/]
    B -- Ya --> D[Jalankan ensureUserProfile]

    C --> C1[Tab Masuk: Email/Sand atau Google Popup]
    C --> C2[Tab Aktivasi Akun Guru]
    C1 --> D

    D --> E{Email == VITE_WAKUR_EMAIL<br/>dan emailVerified == true?}
    E -- Ya --> F[Role = 'wakur'<br/>Super-Wakur Utama]
    E -- Tidak --> G{emailVerified == true dan<br/>ada di koleksi wakur_admins?}
    G -- Ya --> F2[Role = 'wakur'<br/>Admin Wakur Dinamis]
    G -- Tidak --> H{Ada di koleksi<br/>whitelisted_teachers/email?}

    H -- Tidak --> I[Sign Out Otomatis +<br/>Tampilkan Pesan Email Belum Terdaftar]
    H -- Ya --> J{Sudah Ditautkan<br/>ke UID Lain?}
    J -- Ya --> K[Sign Out + Tolak:<br/>Email Tertaut Akun Lain]
    J -- Tidak --> L[Update isRegistered=true & uid<br/>Sinkron ke users/uid]

    F --> M[/Arahkan ke /wakur/]
    F2 --> M
    L --> N[/Arahkan ke /guru/]
```

---

## 3. Flowchart Aktivasi Akun Guru (Email & Password Baru)

```mermaid
flowchart TD
    A([Guru Pilih Tab Aktivasi Akun]) --> B[Input Email, Kata Sandi, Konfirmasi Sandi]
    B --> C{Validasi Input<br/>Sandi >= 6 char & Cocok?}
    C -- Tidak --> D[Tampilkan Error Validasi]
    C -- Ya --> E[Cek whitelist_status/email<br/>Non-PII]

    E --> F{Dokumen Ada &<br/>active == true?}
    F -- Tidak --> G[Tolak: Email Belum Didaftarkan Wakur]
    F -- Ya --> H{isRegistered == true?}
    H -- Ya --> I[Arahkan ke Tab Masuk Login]
    H -- Tidak --> J[createUserWithEmailAndPassword]

    J --> K{Berhasil Buat Akun Auth?}
    K -- Tidak --> L[Tampilkan Error Auth]
    K -- Ya --> M[Ambil Data Lengkap<br/>whitelisted_teachers/email]

    M --> N{Data Whitelist Ada?}
    N -- Tidak --> O[Rollback: Hapus Akun Auth Yatim]
    N -- Ya --> P[Batch Update:<br/>whitelisted_teachers & whitelist_status<br/>isRegistered=true, uid]
    P --> Q[Simpan Profil Lengkap ke users/uid<br/>termasuk array subjects]
    Q --> R([Masuk ke Portal Guru /guru])
```

---

## 4. Flowchart Manajemen Mata Pelajaran & Multi-Mapel Guru

```mermaid
flowchart TD
    subgraph Wakur["Admin Wakur: Katalog & Penugasan"]
        W1([Buka Menu Mata Pelajaran]) --> W2[Tambah / Edit / Hapus Mapel<br/>Nama, Kode, Kelompok]
        W2 --> W3[(Koleksi /subjects)]
        W4([Buka Database Guru]) --> W5[Daftarkan Guru / Klik Tombol Mapel]
        W3 --> W5
        W5 --> W6[Centang 1 atau Lebih Mapel<br/>+ Opsional Input Manual]
        W6 --> W7[(Simpan ke whitelisted_teachers<br/>& users jika sudah aktif)]
    end

    subgraph Guru["Portal Guru: Pemilihan Multi-Mapel"]
        G1([Guru Masuk ke /guru]) --> G2[Klik Atur Mata Pelajaran /<br/>Tab Mata Pelajaran Saya]
        W3 -.->|"onSnapshot real-time"| G2
        G2 --> G3[Cari & Filter Kelompok Mapel]
        G3 --> G4[Centang Lebih dari 1 Mapel<br/>Maksimal 20 Mapel]
        G4 --> G5[Klik Simpan Pilihan Mapel]
        G5 --> G6{Batch Update:<br/>users/uid & whitelisted_teachers/email}
        G6 -- Sukses --> G7[Update State Profil Lokal<br/>Siap Dipakai Saat Setor Tugas]
    end
```

---

## 5. Flowchart Manajemen Tugas & Folder Otomatis Google Drive (Wakur)

```mermaid
flowchart TD
    A([Wakur Buka Menu Manajemen Tugas]) --> B[Isi Judul, Deskripsi, Deadline]
    B --> C{Opsi Buat Folder<br/>Otomatis di Drive Aktif?}
    C -- Tidak --> D[Simpan Tugas ke Firestore /tasks<br/>driveFolderId = kosong]
    C -- Ya --> E{Sudah Ada Token<br/>Google OAuth?}
    E -- Tidak --> F[Buka Popup Hubungkan Google Workspace]
    F --> G{Izin Drive Disetujui?}
    G -- Tidak --> H[Tampilkan Pesan Gagal OAuth]
    G -- Ya --> I[Cari / Buat Folder Induk:<br/>SIWAKUR - SMKN 9 Bulukumba]
    E -- Ya --> I

    I --> J[Buat Subfolder Tugas di Drive]
    J --> K[Set Permission Folder: Anyone Reader]
    K --> L[Simpan Tugas + driveFolderId & driveFolderUrl<br/>ke Firestore /tasks]
    D --> M([Tugas Muncul Real-Time di Portal Guru])
    L --> M
```

---

## 6. Flowchart Pengumpulan Perangkat Ajar oleh Guru

```mermaid
flowchart TD
    A([Guru Klik Setor / Unggah Revisi]) --> B[Buka SubmissionModal]
    B --> C{Guru Mengampu<br/>> 1 Mata Pelajaran?}
    C -- Ya --> D[Pilih Mapel yang Berlaku<br/>untuk Setoran Ini]
    C -- Tidak --> E[Gunakan Mapel Tunggal Guru]

    D --> F{Pilih Metode Setoran}
    E --> F

    F -- "Unggah ke Google Drive" --> G[Pilih Berkas PDF/DOCX/XLSX/PPTX]
    G --> H[Generate Nama Otomatis:<br/>JudulTugas_NamaGuru_Mapel.ext]
    H --> I{Token Google Ada?}
    I -- Tidak --> J[Hubungkan Akun Google via Popup]
    J --> K[Upload Multipart ke Folder Tugas Wakur]
    I -- Ya --> K
    K --> L{Sukses Upload ke Folder Wakur?}
    L -- "403/404 Tidak Ada Izin Tulis" --> M[Fallback: Simpan ke Folder SIWAKUR<br/>di Drive Milik Guru]
    L -- Ya --> N[Set File Permission: Anyone Reader]
    M --> N

    F -- "Tempel Link Docs / Drive" --> O[Input Nama Dokumen & URL https://]
    O --> P{URL Valid?}
    P -- Tidak --> Q[Tampilkan Peringatan Format URL]
    P -- Ya --> R

    N --> R{Apakah Ini Revisi?}
    R -- Ya --> S{Centang Konfirmasi<br/>Timpa Berkas?}
    S -- Tidak --> T[Tampilkan Peringatan Konfirmasi]
    S -- Ya --> U[Update Dokumen submissions/taskId_uid<br/>status = 'Menunggu Verifikasi']
    R -- Tidak --> V[Buat Dokumen submissions/taskId_uid<br/>status = 'Menunggu Verifikasi']

    U --> W([Tampil Real-Time di Dashboard Wakur])
    V --> W
```

---

## 7. Flowchart Verifikasi Dokumen & Ekspor Rekap ke Google Sheets (Wakur)

```mermaid
flowchart TD
    A([Wakur Buka Verifikasi & Export]) --> B[Pilih Tugas Perangkat Ajar]
    B --> C[Tampilkan Tabel Monitoring Seluruh Guru]

    subgraph Verifikasi["Alur Verifikasi Dokumen Guru"]
        C --> D[Klik Verifikasi pada Baris Guru]
        D --> E[Buka Modal Verifikasi & Preview Berkas]
        E --> F{Keputusan Verifikasi}
        F -- "Disetujui" --> G[Simpan status = 'Disetujui'<br/>Catatan Opsional]
        F -- "Perlu Revisi" --> H{Catatan Revisi Diisi?}
        H -- Tidak --> I[Peringatan: Wajib Isi Catatan Revisi]
        H -- Ya --> J[Simpan status = 'Perlu Revisi'<br/>+ revisionNote]
        G --> K([Status & Catatan Muncul Real-Time di Portal Guru])
        J --> K
    end

    subgraph Ekspor["Alur Export ke Google Sheets"]
        C --> L[Klik Export Rekap ke Google Sheets]
        L --> M{Token Google Ada?}
        M -- Tidak --> N[Hubungkan Google Workspace via Popup]
        N --> O[POST Buat Spreadsheet Baru]
        M -- Ya --> O
        O --> P[PUT Tulis Data Seluruh Guru & Status]
        P --> Q[POST Format Warna Header & Auto-Resize Kolom]
        Q --> R([Tampilkan Tombol Buka Google Sheets])
    end
```

---

## 8. Flowchart Manajemen Multi-Admin Wakur

```mermaid
flowchart TD
    A([Wakur Buka Menu Admin Wakur]) --> B[Lihat Super-Wakur Utama .env<br/>+ Daftar Admin Wakur Dinamis]
    B --> C{Aksi Admin}

    C -- "Tambah Admin Baru" --> D[Isi Email, Nama Lengkap, Keterangan Jabatan]
    D --> E{Email Valid & Bukan<br/>Super-Wakur Utama?}
    E -- Tidak --> F[Tampilkan Pesan Validasi]
    E -- Ya --> G[Simpan ke /wakur_admins/email]
    G --> H([Admin Baru Otomatis Dapat Role 'wakur'<br/>Saat Login dengan Google Terverifikasi])

    C -- "Hapus Admin" --> I{Target == Super-Wakur Utama?}
    I -- Ya --> J[Diblokir UI & Firestore Rules]
    I -- Tidak --> K[Konfirmasi di ConfirmDialog]
    K --> L[Hapus Dokumen /wakur_admins/email]
    L --> M([Hak Akses Wakur Dicabut Seketika])
```
