import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Users,
} from 'lucide-react';
import { CurriculumTask, TaskSubmission, WhitelistedTeacher } from '@/src/types';

interface WakurDashboardProps {
  teachers: WhitelistedTeacher[];
  tasks: CurriculumTask[];
  submissions: TaskSubmission[];
  isLoadingData: boolean;
  onNavigateTab: (tabId: string) => void;
}

export const WakurDashboard: React.FC<WakurDashboardProps> = ({
  teachers,
  tasks,
  submissions,
  isLoadingData,
  onNavigateTab,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');

  const registeredCount = useMemo(
    () => teachers.filter((t) => t.isRegistered).length,
    [teachers]
  );

  const stats = useMemo(() => {
    const activeTasks =
      selectedTaskId === 'all'
        ? tasks
        : tasks.filter((t) => t.id === selectedTaskId);

    const totalExpected = activeTasks.length * teachers.length;
    if (totalExpected === 0) {
      return {
        collectedCount: 0,
        approvedCount: 0,
        revisionCount: 0,
        collectionRate: 0,
        missingEntries: [] as Array<{ teacher: WhitelistedTeacher; missingTasks: CurriculumTask[] }>,
      };
    }

    const submissionMap = new Set(
      submissions.map((s) => `${s.taskId}::${s.teacherEmail.toLowerCase()}`)
    );
    const submissionUidMap = new Set(
      submissions.map((s) => `${s.taskId}::${s.teacherUid}`)
    );

    let collectedCount = 0;
    const missingEntries: Array<{ teacher: WhitelistedTeacher; missingTasks: CurriculumTask[] }> = [];

    teachers.forEach((teacher) => {
      const missingTasks: CurriculumTask[] = [];
      activeTasks.forEach((task) => {
        const hasEmailMatch = submissionMap.has(`${task.id}::${teacher.email.toLowerCase()}`);
        const hasUidMatch = teacher.uid ? submissionUidMap.has(`${task.id}::${teacher.uid}`) : false;
        if (hasEmailMatch || hasUidMatch) {
          collectedCount += 1;
        } else {
          missingTasks.push(task);
        }
      });
      if (missingTasks.length > 0) {
        missingEntries.push({ teacher, missingTasks });
      }
    });

    const filteredSubmissions =
      selectedTaskId === 'all'
        ? submissions
        : submissions.filter((s) => s.taskId === selectedTaskId);

    const approvedCount = filteredSubmissions.filter((s) => s.status === 'Disetujui').length;
    const revisionCount = filteredSubmissions.filter((s) => s.status === 'Perlu Revisi').length;
    const collectionRate = Math.round((collectedCount / totalExpected) * 100);

    return {
      collectedCount,
      approvedCount,
      revisionCount,
      collectionRate,
      missingEntries,
    };
  }, [tasks, teachers, submissions, selectedTaskId]);

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Ringkasan Kepatuhan Perangkat Ajar
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pemantauan real-time aktivitas guru dan setoran perangkat ajar SMKN 9 Bulukumba.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="dashboard-task-filter" className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Filter Tugas:
          </label>
          <select
            id="dashboard-task-filter"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none"
          >
            <option value="all">Semua Tugas ({tasks.length})</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Guru Terdaftar</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-slate-900">
            {teachers.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {registeredCount} sudah aktivasi · {teachers.length - registeredCount} belum aktivasi
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Perangkat Terkumpul</span>
            <ClipboardList className="h-4 w-4 text-teal-700" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-teal-700">
            {stats.collectionRate}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.collectedCount} dari {Math.max(0, (selectedTaskId === 'all' ? tasks.length : 1) * teachers.length)} target setoran
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Status Disetujui</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-slate-900">
            {stats.approvedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Diverifikasi lengkap oleh Wakur
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Perlu Revisi</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-slate-900">
            {stats.revisionCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Menunggu perbaikan perangkat ajar
          </p>
        </div>
      </div>

      {/* Daftar Guru yang Belum Menyetor */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Daftar Guru yang Belum Menyetor
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Menampilkan guru yang belum mengunggah perangkat ajar pada tugas aktif.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {teachers.length === 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('whitelist')}
                className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
              >
                Daftarkan Guru Pertama
              </button>
            )}
            {teachers.length > 0 && tasks.length === 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('tasks')}
                className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
              >
                Buat Tugas Perangkat Ajar
              </button>
            )}
          </div>
        </div>

        {teachers.length === 0 || tasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              {teachers.length === 0
                ? 'Belum ada data guru di Database Whitelist.'
                : 'Belum ada tugas perangkat ajar yang dibuat.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {teachers.length === 0
                ? 'Tambahkan email dan data guru terlebih dahulu agar statistik kepatuhan dapat dihitung.'
                : 'Buat tugas perangkat ajar baru untuk mulai memantau progres setoran guru.'}
            </p>
          </div>
        ) : stats.missingEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Seluruh Guru Telah Menyetor
            </p>
            <p className="mt-1 text-xs text-slate-500">
              100% guru terdaftar telah mengumpulkan perangkat ajar pada cakupan filter ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Guru &amp; Mata Pelajaran</th>
                  <th className="px-5 py-3">NIP</th>
                  <th className="px-5 py-3">Status Akun</th>
                  <th className="px-5 py-3">Tugas Belum Disetor</th>
                  <th className="px-5 py-3 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.missingEntries.map(({ teacher, missingTasks }) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{teacher.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {teacher.subject} · {teacher.email}
                      </p>
                    </td>
                    <td className="font-mono-tabular px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      {teacher.nip}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                          teacher.isRegistered
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {teacher.isRegistered ? 'Sudah Aktivasi' : 'Belum Aktivasi'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      {missingTasks.map((t) => t.title).join(' · ')}
                    </td>
                    <td className="font-mono-tabular px-5 py-3.5 text-right text-xs font-semibold text-red-700 whitespace-nowrap">
                      {missingTasks.length} tugas
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
