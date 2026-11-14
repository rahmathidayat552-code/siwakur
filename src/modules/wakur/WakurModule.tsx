import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { AppShell, NavItem } from '@/src/core/layout/AppShell';
import {
  subscribeToAllSubmissions,
  subscribeToTasks,
  subscribeToWakurAdmins,
  subscribeToWhitelistedTeachers,
} from '@/src/services/firebase/firestoreService';
import {
  CurriculumTask,
  TaskSubmission,
  WakurAdmin,
  WhitelistedTeacher,
} from '@/src/types';
import { WakurDashboard } from './components/WakurDashboard';
import { TeacherWhitelist } from './components/TeacherWhitelist';
import { TaskManagement } from './components/TaskManagement';
import { VerificationExport } from './components/VerificationExport';
import { WakurAdminsManager } from './components/WakurAdminsManager';

const WAKUR_NAV: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Statistik',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: 'whitelist',
    label: 'Database Guru',
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: 'tasks',
    label: 'Manajemen Tugas',
    icon: <FolderKanban className="h-4 w-4" />,
  },
  {
    id: 'verification',
    label: 'Verifikasi & Export',
    icon: <CheckSquare className="h-4 w-4" />,
  },
  {
    id: 'wakur-admins',
    label: 'Admin Wakur',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
];

export const WakurModule: React.FC = () => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [teachers, setTeachers] = useState<WhitelistedTeacher[]>([]);
  const [tasks, setTasks] = useState<CurriculumTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [wakurAdmins, setWakurAdmins] = useState<WakurAdmin[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== 'wakur') return;

    let loadedFlags = { teachers: false, tasks: false, submissions: false };
    const markLoaded = (key: keyof typeof loadedFlags) => {
      loadedFlags = { ...loadedFlags, [key]: true };
      if (loadedFlags.teachers && loadedFlags.tasks && loadedFlags.submissions) {
        setIsLoadingData(false);
      }
    };

    const unsubTeachers = subscribeToWhitelistedTeachers(
      (data) => {
        setTeachers(data);
        markLoaded('teachers');
      },
      (err) => {
        setDataError(err.message);
        markLoaded('teachers');
      }
    );

    const unsubTasks = subscribeToTasks(
      (data) => {
        setTasks(data);
        markLoaded('tasks');
      },
      (err) => {
        setDataError(err.message);
        markLoaded('tasks');
      }
    );

    const unsubSubmissions = subscribeToAllSubmissions(
      (data) => {
        setSubmissions(data);
        markLoaded('submissions');
      },
      (err) => {
        setDataError(err.message);
        markLoaded('submissions');
      }
    );

    const unsubWakurAdmins = subscribeToWakurAdmins(
      (data) => {
        setWakurAdmins(data);
      },
      (err) => {
        setDataError(err.message);
      }
    );

    return () => {
      unsubTeachers();
      unsubTasks();
      unsubSubmissions();
      unsubWakurAdmins();
    };
  }, [user, role]);

  return (
    <AppShell
      roleLabel="Wakasek Kurikulum"
      navItems={WAKUR_NAV}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {dataError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          Gagal memuat data Firestore: {dataError}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <WakurDashboard
          teachers={teachers}
          tasks={tasks}
          submissions={submissions}
          isLoadingData={isLoadingData}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'whitelist' && <TeacherWhitelist teachers={teachers} />}

      {activeTab === 'tasks' && (
        <TaskManagement
          tasks={tasks}
          submissions={submissions}
          totalTeachers={teachers.length}
        />
      )}

      {activeTab === 'verification' && (
        <VerificationExport
          tasks={tasks}
          teachers={teachers}
          submissions={submissions}
        />
      )}

      {activeTab === 'wakur-admins' && (
        <WakurAdminsManager admins={wakurAdmins} />
      )}
    </AppShell>
  );
};

export default WakurModule;
