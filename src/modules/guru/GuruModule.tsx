import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { AppShell, NavItem } from '@/src/core/layout/AppShell';
import {
  normalizeSubjectsList,
  subscribeToSubjects,
  subscribeToTasks,
  subscribeToTeacherSubmissions,
} from '@/src/services/firebase/firestoreService';
import { CurriculumTask, SchoolSubject, TaskSubmission } from '@/src/types';
import { GuruTaskList } from './components/GuruTaskList';
import { GuruSubjectSelector } from './components/GuruSubjectSelector';

const GURU_NAV: NavItem[] = [
  {
    id: 'tasks',
    label: 'Tagihan Perangkat Ajar',
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    id: 'subjects',
    label: 'Mata Pelajaran Saya',
    icon: <BookOpen className="h-4 w-4" />,
  },
];

export const GuruModule: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState<CurriculumTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const teacherSubjects = useMemo(
    () => normalizeSubjectsList(profile?.subjects, profile?.subject),
    [profile?.subjects, profile?.subject]
  );

  useEffect(() => {
    if (!user) return;

    let loaded = { tasks: false, submissions: false };
    const markDone = (key: keyof typeof loaded) => {
      loaded = { ...loaded, [key]: true };
      if (loaded.tasks && loaded.submissions) {
        setIsLoading(false);
      }
    };

    const unsubTasks = subscribeToTasks(
      (data) => {
        setTasks(data);
        markDone('tasks');
      },
      (err) => {
        setDataError(err.message);
        markDone('tasks');
      }
    );

    const unsubSubmissions = subscribeToTeacherSubmissions(
      user.uid,
      (data) => {
        setSubmissions(data);
        markDone('submissions');
      },
      (err) => {
        setDataError(err.message);
        markDone('submissions');
      }
    );

    const unsubSubjects = subscribeToSubjects(
      (data) => {
        setSubjects(data);
      },
      (err) => {
        setDataError(err.message);
      }
    );

    return () => {
      unsubTasks();
      unsubSubmissions();
      unsubSubjects();
    };
  }, [user]);

  return (
    <AppShell
      roleLabel="Portal Guru"
      navItems={GURU_NAV}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Selamat Datang, {profile?.fullName || 'Guru SMKN 9 Bulukumba'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            NIP {profile?.nip || '-'} ·{' '}
            {teacherSubjects.length > 0
              ? `${teacherSubjects.length} Mata Pelajaran Diampu`
              : 'Belum memilih mata pelajaran'}
          </p>
          {teacherSubjects.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {teacherSubjects.map((subj) => (
                <span
                  key={subj}
                  className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {subj}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setActiveTab(activeTab === 'subjects' ? 'tasks' : 'subjects')
          }
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:self-center whitespace-nowrap"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-teal-700" />
          <span>
            {activeTab === 'subjects'
              ? 'Kembali ke Tagihan'
              : 'Atur Mata Pelajaran'}
          </span>
        </button>
      </div>

      {dataError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          Gagal memuat data Firestore: {dataError}
        </div>
      )}

      {activeTab === 'subjects' ? (
        <GuruSubjectSelector subjects={subjects} />
      ) : (
        <GuruTaskList
          tasks={tasks}
          submissions={submissions}
          isLoading={isLoading}
        />
      )}
    </AppShell>
  );
};

export default GuruModule;
