import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { ConfirmDialog } from '@/src/core/components/ConfirmDialog';
import { WAKUR_EMAIL } from '@/src/services/firebase/firebaseConfig';
import {
  addWakurAdmin,
  deleteWakurAdmin,
} from '@/src/services/firebase/firestoreService';
import { WakurAdmin } from '@/src/types';

interface WakurAdminsManagerProps {
  admins: WakurAdmin[];
}

export const WakurAdminsManager: React.FC<WakurAdminsManagerProps> = ({ admins }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [adminToDelete, setAdminToDelete] = useState<WakurAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);
    setFormSuccess(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (admins.some((a) => a.email.toLowerCase() === normalizedEmail)) {
      setFormError('Email ini sudah terdaftar sebagai admin Wakasek Kurikulum.');
      return;
    }

    setIsSaving(true);
    try {
      await addWakurAdmin(
        {
          email: normalizedEmail,
          fullName,
          note: note || 'Staf / Wakil Kurikulum',
        },
        user.uid
      );
      setEmail('');
      setFullName('');
      setNote('');
      setFormSuccess(
        `${normalizedEmail} berhasil ditambahkan sebagai admin Wakasek Kurikulum. Pengguna dapat langsung masuk menggunakan tombol Sign in with Google.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menambahkan admin Wakur.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    setIsDeleting(true);
    try {
      await deleteWakurAdmin(adminToDelete.email);
      setAdminToDelete(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal mencabut akses admin Wakur.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Super-Wakur Utama (.env) */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Super-Wakur Utama (Konfigurasi Sistem)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Email induk yang diset melalui <span className="font-mono-tabular font-semibold text-slate-700">VITE_WAKUR_EMAIL</span> di .env / Vercel sebagai pengaman utama agar akses tidak terkunci.
              </p>
              <p className="font-mono-tabular mt-2 text-sm font-semibold text-slate-900">
                {WAKUR_EMAIL}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap sm:self-center">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            Akun Induk Terkunci
          </span>
        </div>
      </section>

      {/* Form Tambah Admin Wakur Baru */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-900">
            Tambah Email Wakur / Staf Kurikulum
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Email yang ditambahkan di sini akan otomatis memiliki akses penuh ke modul Wakasek Kurikulum saat masuk dengan tombol <strong className="font-semibold text-slate-700">Sign in with Google</strong>, tanpa perlu mengubah file .env atau redeploy.
          </p>
        </div>

        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleAddAdmin} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="wakur-admin-email"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Email Google / Belajar.id
            </label>
            <input
              id="wakur-admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahmathidayat553@guru.smk.belajar.id"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div>
            <label
              htmlFor="wakur-admin-name"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Nama Lengkap
            </label>
            <input
              id="wakur-admin-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Rahmat Hidayat, S.Pd."
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div>
            <label
              htmlFor="wakur-admin-note"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Jabatan / Keterangan
            </label>
            <input
              id="wakur-admin-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Staf Kurikulum / Wakur 2"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div className="flex justify-end md:col-span-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Tambah Admin Wakur'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Tabel Daftar Admin Wakur Tambahan */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Daftar Email Wakur Tambahan ({admins.length})
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Perubahan daftar ini langsung aktif secara real-time di database dan login.
          </p>
        </div>

        {admins.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Belum ada email Wakur tambahan yang didaftarkan.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tambahkan email staf atau wakil kurikulum lain melalui formulir di atas jika diperlukan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Nama Lengkap</th>
                  <th className="px-5 py-3">Email Google</th>
                  <th className="px-5 py-3">Jabatan / Keterangan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {admin.fullName}
                    </td>
                    <td className="font-mono-tabular px-5 py-3.5 text-xs text-slate-700">
                      {admin.email}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {admin.note || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setAdminToDelete(admin)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 whitespace-nowrap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Cabut Akses</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(adminToDelete)}
        title="Cabut Akses Admin Wakur?"
        description={
          adminToDelete
            ? `Email ${adminToDelete.email} (${adminToDelete.fullName}) akan kehilangan akses ke Portal Wakasek Kurikulum secara langsung.`
            : ''
        }
        confirmLabel="Cabut Akses"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setAdminToDelete(null)}
      />
    </div>
  );
};
