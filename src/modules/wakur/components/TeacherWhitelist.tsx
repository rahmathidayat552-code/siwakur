import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { ConfirmDialog } from '@/src/core/components/ConfirmDialog';
import {
  addWhitelistedTeacher,
  deleteWhitelistedTeacher,
  formatSubjectsSummary,
  normalizeSubjectsList,
  updateTeacherSubjectsByWakur,
} from '@/src/services/firebase/firestoreService';
import { SchoolSubject, WhitelistedTeacher } from '@/src/types';

interface TeacherWhitelistProps {
  teachers: WhitelistedTeacher[];
  subjects: SchoolSubject[];
  onNavigateSubjects?: () => void;
}

export const TeacherWhitelist: React.FC<TeacherWhitelistProps> = ({
  teachers,
  subjects,
  onNavigateSubjects,
}) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [manualSubjectInput, setManualSubjectInput] = useState('');
  const [subjectPickerQuery, setSubjectPickerQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'pending'>('all');
  const [teacherToDelete, setTeacherToDelete] = useState<WhitelistedTeacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingTeacher, setEditingTeacher] = useState<WhitelistedTeacher | null>(null);
  const [editingSubjects, setEditingSubjects] = useState<string[]>([]);
  const [editingManualInput, setEditingManualInput] = useState('');
  const [editingQuery, setEditingQuery] = useState('');
  const [isUpdatingSubjects, setIsUpdatingSubjects] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filteredMasterSubjects = useMemo(() => {
    const q = subjectPickerQuery.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [subjects, subjectPickerQuery]);

  const filteredEditMasterSubjects = useMemo(() => {
    const q = editingQuery.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [subjects, editingQuery]);

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

  const toggleSubjectSelection = (
    subjectName: string,
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const exists = currentList.some(
      (item) => item.toLowerCase() === subjectName.toLowerCase()
    );
    if (exists) {
      setter(currentList.filter((item) => item.toLowerCase() !== subjectName.toLowerCase()));
    } else {
      if (currentList.length >= 20) return;
      setter([...currentList, subjectName]);
    }
  };

  const handleAddManualSubject = (
    inputValue: string,
    clearInput: () => void,
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const trimmed = inputValue.trim().slice(0, 120);
    if (trimmed.length < 2) return;
    if (!currentList.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      if (currentList.length < 20) {
        setter([...currentList, trimmed]);
      }
    }
    clearInput();
  };

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

    const combinedSubjects = normalizeSubjectsList([
      ...selectedSubjects,
      ...(manualSubjectInput.trim() ? [manualSubjectInput.trim()] : []),
    ]);

    if (combinedSubjects.length === 0) {
      setFormError('Pilih atau tambahkan minimal satu mata pelajaran.');
      return;
    }

    setIsSaving(true);
    try {
      await addWhitelistedTeacher(
        {
          email: normalizedEmail,
          fullName,
          nip,
          subject: formatSubjectsSummary(combinedSubjects, ''),
          subjects: combinedSubjects,
        },
        user.uid
      );
      setEmail('');
      setFullName('');
      setNip('');
      setSelectedSubjects([]);
      setManualSubjectInput('');
      setSubjectPickerQuery('');
      setFormSuccess(
        `Guru ${fullName.trim()} (${normalizedEmail}) berhasil ditambahkan ke whitelist.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambahkan guru ke whitelist.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditSubjectsModal = (teacher: WhitelistedTeacher) => {
    setEditingTeacher(teacher);
    setEditingSubjects(normalizeSubjectsList(teacher.subjects, teacher.subject));
    setEditingManualInput('');
    setEditingQuery('');
    setEditError(null);
  };

  const handleSaveEditedSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setEditError(null);

    const combined = normalizeSubjectsList([
      ...editingSubjects,
      ...(editingManualInput.trim() ? [editingManualInput.trim()] : []),
    ]);
    if (combined.length === 0) {
      setEditError('Pilih minimal satu mata pelajaran untuk guru ini.');
      return;
    }

    setIsUpdatingSubjects(true);
    try {
      await updateTeacherSubjectsByWakur(
        editingTeacher.email,
        combined,
        editingTeacher.uid
      );
      setEditingTeacher(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Gagal memperbarui mata pelajaran guru.'
      );
    } finally {
      setIsUpdatingSubjects(false);
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
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Daftarkan Email Guru ke Whitelist
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Guru yang didaftarkan dapat memilih atau memperbarui lebih dari satu mata pelajaran saat masuk ke Portal Guru.
            </p>
          </div>
          {onNavigateSubjects && (
            <button
              type="button"
              onClick={onNavigateSubjects}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <BookOpen className="h-3.5 w-3.5 text-teal-700" />
              <span>Kelola Mata Pelajaran ({subjects.length})</span>
            </button>
          )}
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

        <form onSubmit={handleAddTeacher} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          </div>

          {/* Multi-Subject Selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-semibold text-slate-800">
                  Pilih Mata Pelajaran (Bisa Lebih dari Satu)
                </span>
                <p className="text-xs text-slate-500">
                  Terpilih:{' '}
                  <span className="font-mono-tabular font-semibold text-teal-800">
                    {selectedSubjects.length}
                  </span>{' '}
                  mata pelajaran
                </p>
              </div>

              {subjects.length > 0 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={subjectPickerQuery}
                    onChange={(e) => setSubjectPickerQuery(e.target.value)}
                    placeholder="Filter daftar mapel..."
                    className="h-8 w-52 rounded-lg border border-slate-300 bg-white pr-2.5 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {selectedSubjects.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selectedSubjects.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      toggleSubjectSelection(item, selectedSubjects, setSelectedSubjects)
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900 hover:bg-teal-100"
                  >
                    <span>{item}</span>
                    <X className="h-3 w-3 text-teal-700" />
                  </button>
                ))}
              </div>
            )}

            {subjects.length > 0 ? (
              <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMasterSubjects.map((subj) => {
                  const isChecked = selectedSubjects.some(
                    (s) => s.toLowerCase() === subj.name.toLowerCase()
                  );
                  return (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() =>
                        toggleSubjectSelection(subj.name, selectedSubjects, setSelectedSubjects)
                      }
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        isChecked
                          ? 'border-teal-700 bg-teal-50 font-semibold text-teal-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">
                        {subj.code ? `${subj.code} · ` : ''}
                        {subj.name}
                      </span>
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isChecked
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mb-3 text-xs text-slate-500">
                Belum ada mata pelajaran di menu Manajemen Mata Pelajaran. Anda tetap dapat mengetik manual di bawah ini atau menambahkan katalog mapel terlebih dahulu.
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={manualSubjectInput}
                onChange={(e) => setManualSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualSubject(
                      manualSubjectInput,
                      () => setManualSubjectInput(''),
                      selectedSubjects,
                      setSelectedSubjects
                    );
                  }
                }}
                placeholder="Tambah mapel manual (opsional, contoh: Produktif TKJ)"
                className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  handleAddManualSubject(
                    manualSubjectInput,
                    () => setManualSubjectInput(''),
                    selectedSubjects,
                    setSelectedSubjects
                  )
                }
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Mapel</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
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
                {filteredTeachers.map((teacher) => {
                  const teacherSubjects = normalizeSubjectsList(
                    teacher.subjects,
                    teacher.subject
                  );
                  return (
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
                        {teacherSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacherSubjects.map((subj) => (
                              <span
                                key={subj}
                                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {subj}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>{teacher.subject}</span>
                        )}
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
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditSubjectsModal(teacher)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Mapel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeacherToDelete(teacher)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Edit Mata Pelajaran Guru */}
      {editingTeacher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Atur Mata Pelajaran Guru
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editingTeacher.fullName} · {editingTeacher.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                disabled={isUpdatingSubjects}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup modal edit mata pelajaran"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedSubjects} className="mt-4 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Mata Pelajaran Terpilih ({editingSubjects.length})
                  </span>
                  {subjects.length > 0 && (
                    <input
                      type="text"
                      value={editingQuery}
                      onChange={(e) => setEditingQuery(e.target.value)}
                      placeholder="Cari mapel..."
                      className="h-8 w-44 rounded-lg border border-slate-300 px-2.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                    />
                  )}
                </div>

                {editingSubjects.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {editingSubjects.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          toggleSubjectSelection(item, editingSubjects, setEditingSubjects)
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900 hover:bg-teal-100"
                      >
                        <span>{item}</span>
                        <X className="h-3 w-3 text-teal-700" />
                      </button>
                    ))}
                  </div>
                )}

                {subjects.length > 0 && (
                  <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-2">
                    {filteredEditMasterSubjects.map((subj) => {
                      const isChecked = editingSubjects.some(
                        (s) => s.toLowerCase() === subj.name.toLowerCase()
                      );
                      return (
                        <button
                          key={subj.id}
                          type="button"
                          onClick={() =>
                            toggleSubjectSelection(
                              subj.name,
                              editingSubjects,
                              setEditingSubjects
                            )
                          }
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            isChecked
                              ? 'border-teal-700 bg-teal-50 font-semibold text-teal-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="truncate">{subj.name}</span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isChecked
                                ? 'border-teal-700 bg-teal-700 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingManualInput}
                  onChange={(e) => setEditingManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualSubject(
                        editingManualInput,
                        () => setEditingManualInput(''),
                        editingSubjects,
                        setEditingSubjects
                      );
                    }
                  }}
                  placeholder="Tambah mapel manual jika belum ada di katalog..."
                  className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddManualSubject(
                      editingManualInput,
                      () => setEditingManualInput(''),
                      editingSubjects,
                      setEditingSubjects
                    )
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </button>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  disabled={isUpdatingSubjects}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSubjects}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {isUpdatingSubjects ? 'Menyimpan...' : 'Simpan Mata Pelajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
