import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import {
  normalizeSubjectsList,
  updateMyTeacherSubjects,
} from '@/src/services/firebase/firestoreService';
import { SchoolSubject, SubjectCategory } from '@/src/types';

interface GuruSubjectSelectorProps {
  subjects: SchoolSubject[];
  onSaved?: () => void;
}

const CATEGORIES: Array<'all' | SubjectCategory> = [
  'all',
  'Umum',
  'Kejuruan',
  'Muatan Lokal',
  'Lainnya',
];

export const GuruSubjectSelector: React.FC<GuruSubjectSelectorProps> = ({
  subjects,
  onSaved,
}) => {
  const { user, profile, updateProfileSubjects } = useAuth();
  const initialSubjects = useMemo(
    () => normalizeSubjectsList(profile?.subjects, profile?.subject),
    [profile?.subjects, profile?.subject]
  );

  const [selected, setSelected] = useState<string[]>(initialSubjects);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SubjectCategory>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelected(initialSubjects);
  }, [initialSubjects]);

  // Include any legacy/custom subjects already assigned to this teacher that are not in master catalog
  const customExistingSubjects = useMemo(() => {
    const masterNames = new Set(subjects.map((s) => s.name.trim().toLowerCase()));
    return selected.filter((name) => !masterNames.has(name.trim().toLowerCase()));
  }, [subjects, selected]);

  const filteredSubjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return subjects.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [subjects, searchTerm, categoryFilter]);

  const toggleSubject = (name: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const exists = selected.some((s) => s.toLowerCase() === name.toLowerCase());
    if (exists) {
      setSelected(selected.filter((s) => s.toLowerCase() !== name.toLowerCase()));
    } else {
      if (selected.length >= 20) {
        setErrorMsg('Maksimal 20 mata pelajaran yang dapat dipilih.');
        return;
      }
      setSelected([...selected, name]);
    }
  };

  const hasChanges = useMemo(() => {
    if (selected.length !== initialSubjects.length) return true;
    const initialSet = new Set(initialSubjects.map((s) => s.toLowerCase()));
    return selected.some((s) => !initialSet.has(s.toLowerCase()));
  }, [selected, initialSubjects]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (selected.length === 0) {
      setErrorMsg('Pilih minimal satu mata pelajaran yang Anda ampu.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateMyTeacherSubjects(
        user.uid,
        profile.email,
        selected
      );
      updateProfileSubjects(updated.subject, updated.subjects);
      setSuccessMsg(
        `Berhasil menyimpan ${updated.subjects.length} mata pelajaran pilihan Anda.`
      );
      if (onSaved) onSaved();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan pilihan mata pelajaran.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Pilih Mata Pelajaran yang Diampu
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Anda dapat memilih lebih dari satu mata pelajaran dari daftar yang dikelola Wakasek Kurikulum.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          Terpilih:{' '}
          <span className="font-mono-tabular font-bold text-teal-800">
            {selected.length}
          </span>{' '}
          Mapel
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Selected Summary */}
        <div>
          <span className="mb-2 block text-xs font-semibold text-slate-700">
            Mata Pelajaran Pilihan Anda Saat Ini
          </span>
          {selected.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
              Belum ada mata pelajaran dipilih. Centang satu atau lebih mata pelajaran di bawah ini.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selected.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleSubject(name)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100"
                >
                  <span>{name}</span>
                  <X className="h-3.5 w-3.5 text-teal-700" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col justify-between gap-2 pt-1 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama atau kode mapel..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none sm:w-64"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        {subjects.length === 0 && customExistingSubjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Katalog mata pelajaran belum ditambahkan oleh Wakasek Kurikulum.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Hubungi Admin Wakur untuk menambahkan daftar mata pelajaran di menu Manajemen Mata Pelajaran.
            </p>
          </div>
        ) : (
          <div className="grid max-h-80 grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {customExistingSubjects.map((customName) => (
              <button
                key={`custom-${customName}`}
                type="button"
                onClick={() => toggleSubject(customName)}
                className="flex items-center justify-between gap-2 rounded-lg border border-teal-700 bg-teal-50 px-3.5 py-2.5 text-left text-xs font-semibold text-teal-900"
              >
                <div className="min-w-0">
                  <p className="truncate">{customName}</p>
                  <p className="mt-0.5 text-[11px] font-normal text-teal-700">
                    Penugasan Sebelumnya
                  </p>
                </div>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-teal-700 bg-teal-700 text-white">
                  <Check className="h-3 w-3" />
                </span>
              </button>
            ))}

            {filteredSubjects.map((subj) => {
              const isChecked = selected.some(
                (s) => s.toLowerCase() === subj.name.toLowerCase()
              );
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => toggleSubject(subj.name)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-xs transition-colors ${
                    isChecked
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate ${isChecked ? 'font-semibold' : 'font-medium'}`}>
                      {subj.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {subj.code ? `${subj.code} · ` : ''}
                      {subj.category}
                    </p>
                  </div>
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

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Mata pelajaran yang dipilih akan muncul saat Anda menyetor perangkat ajar.
          </p>
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pilihan Mapel'}</span>
          </button>
        </div>
      </form>
    </section>
  );
};
