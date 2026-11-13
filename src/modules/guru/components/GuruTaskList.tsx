import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileUp,
  MessageSquareWarning,
  Upload,
} from 'lucide-react';
import { CurriculumTask, TaskSubmission } from '@/src/types';
import { SubmissionModal } from './SubmissionModal';

interface GuruTaskListProps {
  tasks: CurriculumTask[];
  submissions: TaskSubmission[];
  isLoading: boolean;
}

type TaskFilter = 'all' | 'pending' | 'revision' | 'approved';

export const GuruTaskList: React.FC<GuruTaskListProps> = ({
  tasks,
  submissions,
  isLoading,
}) => {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedTask, setSelectedTask] = useState<{
    task: CurriculumTask;
    submission: TaskSubmission | null;
  } | null>(null);

  const submissionByTaskId = useMemo(() => {
    const map = new Map<string, TaskSubmission>();
    submissions.forEach((sub) => {
      map.set(sub.taskId, sub);
    });
    return map;
  }, [submissions]);

  const summary = useMemo(() => {
    let approved = 0;
    let revision = 0;
    let waiting = 0;
    let notSubmitted = 0;

    tasks.forEach((task) => {
      const sub = submissionByTaskId.get(task.id);
      if (!sub) {
        notSubmitted += 1;
      } else if (sub.status === 'Disetujui') {
        approved += 1;
      } else if (sub.status === 'Perlu Revisi') {
        revision += 1;
      } else {
        waiting += 1;
      }
    });

    return {
      total: tasks.length,
      approved,
      revision,
      waiting,
      notSubmitted,
    };
  }, [tasks, submissionByTaskId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const sub = submissionByTaskId.get(task.id);
      if (filter === 'all') return true;
      if (filter === 'pending') return !sub || sub.status === 'Menunggu Verifikasi';
      if (filter === 'revision') return sub?.status === 'Perlu Revisi';
      if (filter === 'approved') return sub?.status === 'Disetujui';
      return true;
    });
  }, [tasks, submissionByTaskId, filter]);

  const renderStatus = (sub: TaskSubmission | null) => {
    if (!sub) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          Belum Menyetor
        </span>
      );
    }
    if (sub.status === 'Disetujui') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Disetujui
        </span>
      );
    }
    if (sub.status === 'Perlu Revisi') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
          <MessageSquareWarning className="h-3.5 w-3.5 text-red-600" />
          Perlu Revisi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        Menunggu Verifikasi
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ringkasan Pribadi Guru */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Total Tagihan Tugas</p>
          <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-slate-900">
            {summary.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Belum Disetor</p>
          <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-slate-900">
            {summary.notSubmitted}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Perlu Revisi</p>
          <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-red-700">
            {summary.revision}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Disetujui</p>
          <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-emerald-700">
            {summary.approved}
          </p>
        </div>
      </div>

      {/* Daftar Tagihan Tugas */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Daftar Tagihan Perangkat Ajar
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Unggah dokumen perangkat ajar sesuai ketentuan atau kirim ulang jika berstatus Perlu Revisi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'pending', label: 'Aktif / Menunggu' },
              { id: 'revision', label: 'Perlu Revisi' },
              { id: 'approved', label: 'Disetujui' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id as TaskFilter)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileUp className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              Belum ada tagihan perangkat ajar dari Wakasek Kurikulum.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tagihan tugas baru akan muncul otomatis secara real-time di halaman ini.
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Tidak ada tugas pada filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredTasks.map((task) => {
              const sub = submissionByTaskId.get(task.id) || null;
              const isApproved = sub?.status === 'Disetujui';

              return (
                <div key={task.id} className="p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {task.title}
                        </h3>
                        {renderStatus(sub)}
                      </div>

                      {task.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono-tabular inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Deadline: {task.deadline}
                        </span>
                        {sub && (
                          <>
                            <span aria-hidden="true">·</span>
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="max-w-xs truncate">{sub.fileName}</span>
                            </a>
                          </>
                        )}
                      </div>

                      {sub?.status === 'Perlu Revisi' && sub.revisionNote && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900">
                          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                          <div>
                            <span className="font-semibold">Catatan Revisi: </span>
                            <span>{sub.revisionNote}</span>
                          </div>
                        </div>
                      )}

                      {sub?.status === 'Disetujui' && sub.revisionNote && (
                        <p className="mt-2 text-xs text-emerald-700">
                          Catatan Wakur: {sub.revisionNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isApproved ? (
                        <button
                          type="button"
                          onClick={() => setSelectedTask({ task, submission: sub })}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap ${
                            sub?.status === 'Perlu Revisi'
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-teal-700 hover:bg-teal-800'
                          }`}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>
                            {sub
                              ? sub.status === 'Perlu Revisi'
                                ? 'Unggah Revisi'
                                : 'Perbarui Berkas'
                              : 'Setor Perangkat'}
                          </span>
                        </button>
                      ) : (
                        sub && (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Lihat Berkas</span>
                          </a>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedTask && (
        <SubmissionModal
          task={selectedTask.task}
          existingSubmission={selectedTask.submission}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};
