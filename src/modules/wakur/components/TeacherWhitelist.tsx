import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { ConfirmDialog } from '@/src/core/components/ConfirmDialog';
import {
  addWhitelistedTeacher,
  deleteWhitelistedTeacher,
} from '@/src/services/firebase/firestoreService';
import { WhitelistedTeacher } from '@/src/types';

interface TeacherWhitelistProps {
  teachers: WhitelistedTeacher[];
}

export const TeacherWhitelist: React.FC<TeacherWhitelistProps> = ({ teachers }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'pending'>('all');
  const [teacherToDelete, setTeacherToDelete] = useState<WhitelistedTeacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTeachers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return teachers.filter((t) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'registered' && t.isRegistered) ||
        (statusFilter === 'pending' && !t.isRegistered);

      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        t.fullName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      );
    });
  }, [teachers, searchTerm, statusFilter]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);
    setFormSuccess(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (teachers.some((t) => t.email.toLowerCase() === normalizedEmail)) {
      setFormError('Email guru ini sudah terdaftar dalam database whitelist.');
      return;
    }

    setIsSaving(true);
    try {
      await addWhitelistedTeacher(
        {
          email: normalizedEmail,
          fullName,
          nip,
          subject,
        },
        user.uid
      );
      setEmail('');
      setFullName('');
      setNip('');
      setSubject('');
      setFormSuccess(
        `Guru ${fullName.trim()} (${normalizedEmail}) berhasil ditambahkan ke whitelist.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambahkan guru ke whitelist.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    try {
      await deleteWhitelistedTeacher(teacherToDelete.email);
      setTeacherToDelete(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menghapus data guru.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Input Whitelist Guru */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-900">
            Daftarkan Email Guru ke Whitelist
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Guru yang didaftarkan dapat mengaktivasi akun SIWAKUR menggunakan email terdaftar atau masuk langsung via Google.
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

        <form onSubmit={handleAddTeacher} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="wl-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Email Guru
            </label>
            <input
              id="wl-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guru@guru.smk.belajar.id"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div>
            <label htmlFor="wl-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nama Lengkap &amp; Gelar
            </label>
            <input
              id="wl-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Drs. Ahmad Fauzi, M.Pd."
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div>
            <label htmlFor="wl-nip" className="mb-1.5 block text-xs font-semibold text-slate-700">
              NIP / NUPTK
            </label>
            <input
              id="wl-nip"
              type="text"
              required
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="198504122010011008"
              className="font-mono-tabular h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div>
            <label htmlFor="wl-subject" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Mata Pelajaran
            </label>
            <input
              id="wl-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Produktif TKJ"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div className="flex justify-end sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Tambahkan ke Whitelist'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Tabel Database Email Guru */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Database Guru SMKN 9 Bulukumba ({teachers.length})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Daftar resmi guru yang diizinkan mengakses sistem pengumpulan perangkat ajar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, NIP, mapel..."
                className="h-9 w-56 rounded-lg border border-slate-300 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'registered', label: 'Sudah Aktivasi' },
                { id: 'pending', label: 'Belum Aktivasi' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id as typeof statusFilter)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              {teachers.length === 0
                ? 'Belum ada guru terdaftar di whitelist.'
                : 'Tidak ada data guru yang cocok dengan pencarian Anda.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Gunakan formulir di atas untuk mendaftarkan guru baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Nama Lengkap</th>
                  <th className="px-5 py-3">NIP</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Mata Pelajaran</th>
                  <th className="px-5 py-3">Status Aktivasi</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {teacher.fullName}
                    </td>
                    <td className="font-mono-tabular px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      {teacher.nip}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      {teacher.email}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      {teacher.subject}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {teacher.isRegistered ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Sudah Aktivasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          Belum Aktivasi
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setTeacherToDelete(teacher)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 whitespace-nowrap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
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
        isOpen={Boolean(teacherToDelete)}
        title="Hapus Guru dari Whitelist?"
        description={
          teacherToDelete
            ? `Apakah Anda yakin ingin menghapus ${teacherToDelete.fullName} (${teacherToDelete.email}) dari daftar whitelist guru SMKN 9 Bulukumba?`
            : ''
        }
        confirmLabel="Hapus Guru"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTeacherToDelete(null)}
      />
    </div>
  );
};
