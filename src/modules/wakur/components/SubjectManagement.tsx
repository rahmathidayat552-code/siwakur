import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { ConfirmDialog } from '@/src/core/components/ConfirmDialog';
import {
  createSubject,
  deleteSubject,
  updateSubject,
} from '@/src/services/firebase/firestoreService';
import { SchoolSubject, SubjectCategory } from '@/src/types';

interface SubjectManagementProps {
  subjects: SchoolSubject[];
}

const CATEGORIES: SubjectCategory[] = ['Umum', 'Kejuruan', 'Muatan Lokal', 'Lainnya'];

function getCategoryStyle(category: SubjectCategory): string {
  switch (category) {
    case 'Kejuruan':
      return 'border-teal-200 bg-teal-50 text-teal-800';
    case 'Umum':
      return 'border-slate-200 bg-slate-100 text-slate-800';
    case 'Muatan Lokal':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    default:
      return 'border-slate-200 bg-white text-slate-600';
  }
}

export const SubjectManagement: React.FC<SubjectManagementProps> = ({ subjects }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<SubjectCategory>('Kejuruan');
  const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SubjectCategory>('all');
  const [subjectToDelete, setSubjectToDelete] = useState<SchoolSubject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredSubjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return subjects.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [subjects, searchTerm, categoryFilter]);

  const categoryCounts = useMemo(() => {
    return CATEGORIES.reduce<Record<SubjectCategory, number>>(
      (acc, cat) => {
        acc[cat] = subjects.filter((s) => s.category === cat).length;
        return acc;
      },
      { Umum: 0, Kejuruan: 0, 'Muatan Lokal': 0, Lainnya: 0 }
    );
  }, [subjects]);

  const resetForm = () => {
    setName('');
    setCode('');
    setCategory('Kejuruan');
    setEditingSubject(null);
  };

  const handleStartEdit = (subject: SchoolSubject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setCode(subject.code);
    setCategory(subject.category);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);
    setFormSuccess(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFormError('Nama mata pelajaran minimal 2 karakter.');
      return;
    }

    const isDuplicate = subjects.some(
      (s) =>
        s.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        s.id !== editingSubject?.id
    );
    if (isDuplicate) {
      setFormError(`Mata pelajaran "${trimmedName}" sudah terdaftar.`);
      return;
    }

    setIsSaving(true);
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: trimmedName,
          code,
          category,
        });
        setFormSuccess(`Mata pelajaran "${trimmedName}" berhasil diperbarui.`);
        resetForm();
      } else {
        await createSubject(
          {
            name: trimmedName,
            code,
            category,
          },
          user.uid
        );
        setFormSuccess(`Mata pelajaran "${trimmedName}" berhasil ditambahkan.`);
        resetForm();
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan data mata pelajaran.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSubject(subjectToDelete.id);
      if (editingSubject?.id === subjectToDelete.id) {
        resetForm();
      }
      setSubjectToDelete(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menghapus mata pelajaran.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Tambah / Ubah Mata Pelajaran */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {editingSubject
                ? `Edit Mata Pelajaran: ${editingSubject.name}`
                : 'Manajemen Mata Pelajaran SMKN 9 Bulukumba'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Daftar mata pelajaran ini akan tersedia untuk dipilih oleh Admin Wakur saat mendaftarkan guru serta dapat dipilih lebih dari satu oleh guru di Portal Guru.
            </p>
          </div>
          {editingSubject && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              <span>Batal Edit</span>
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

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label htmlFor="subj-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nama Mata Pelajaran
            </label>
            <input
              id="subj-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Pemrograman Web dan Perangkat Bergerak"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="subj-code" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Kode Mapel (Opsional)
            </label>
            <input
              id="subj-code"
              type="text"
              maxLength={30}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Contoh: PWPB / MTK"
              className="font-mono-tabular h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="subj-category" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Kelompok Mata Pelajaran
            </label>
            <select
              id="subj-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as SubjectCategory)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end sm:col-span-12">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
            >
              {editingSubject ? (
                <Pencil className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>
                {isSaving
                  ? 'Menyimpan...'
                  : editingSubject
                  ? 'Simpan Perubahan'
                  : 'Tambah Mata Pelajaran'}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Ringkasan Kelompok */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <div
            key={cat}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-medium text-slate-500">Kelompok {cat}</p>
            <p className="font-mono-tabular mt-1 text-xl font-bold text-slate-900">
              {categoryCounts[cat]}
            </p>
          </div>
        ))}
      </div>

      {/* Daftar Mata Pelajaran */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Daftar Mata Pelajaran ({subjects.length})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Kelola katalog mata pelajaran resmi yang digunakan pada whitelist dan pilihan guru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau kode mapel..."
                className="h-9 w-56 rounded-lg border border-slate-300 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {(['all', ...CATEGORIES] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCategoryFilter(opt)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === opt
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt === 'all' ? 'Semua' : opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              {subjects.length === 0
                ? 'Belum ada mata pelajaran yang ditambahkan.'
                : 'Tidak ada mata pelajaran yang cocok dengan filter Anda.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Gunakan formulir di atas untuk menambahkan mata pelajaran SMKN 9 Bulukumba.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Kode</th>
                  <th className="px-5 py-3">Nama Mata Pelajaran</th>
                  <th className="px-5 py-3">Kelompok</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSubjects.map((subj) => (
                  <tr key={subj.id} className="hover:bg-slate-50/80">
                    <td className="font-mono-tabular px-5 py-3.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {subj.code || '-'}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {subj.name}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getCategoryStyle(
                          subj.category
                        )}`}
                      >
                        {subj.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(subj)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectToDelete(subj)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(subjectToDelete)}
        title="Hapus Mata Pelajaran?"
        description={
          subjectToDelete
            ? `Apakah Anda yakin ingin menghapus mata pelajaran "${subjectToDelete.name}" dari daftar katalog? Data guru yang sudah tersimpan sebelumnya tidak akan hilang.`
            : ''
        }
        confirmLabel="Hapus Mapel"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSubjectToDelete(null)}
      />
    </div>
  );
};
