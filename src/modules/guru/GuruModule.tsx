import React, { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { AppShell, NavItem } from '@/src/core/layout/AppShell';
import {
  subscribeToTasks,
  subscribeToTeacherSubmissions,
} from '@/src/services/firebase/firestoreService';
import { CurriculumTask, TaskSubmission } from '@/src/types';
import { GuruTaskList } from './components/GuruTaskList';

const GURU_NAV: NavItem[] = [
  {
    id: 'tasks',
    label: 'Tagihan Perangkat Ajar',
    icon: <ClipboardList className="h-4 w-4" />,
  },
];

export const GuruModule: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState<CurriculumTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

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

    return () => {
      unsubTasks();
      unsubSubmissions();
    };
  }, [user]);

  return (
    <AppShell
      roleLabel="Portal Guru"
      navItems={GURU_NAV}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">
          Selamat Datang, {profile?.fullName || 'Guru SMKN 9 Bulukumba'}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          NIP {profile?.nip || '-'} · Mata Pelajaran: {profile?.subject || '-'}
        </p>
      </div>

      {dataError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          Gagal memuat data Firestore: {dataError}
        </div>
      )}

      <GuruTaskList
        tasks={tasks}
        submissions={submissions}
        isLoading={isLoading}
      />
    </AppShell>
  );
};

export default GuruModule;
