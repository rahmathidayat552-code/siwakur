import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  MessageSquareWarning,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { reviewSubmission } from '@/src/services/firebase/firestoreService';
import { exportRecapToSheets } from '@/src/services/google/sheetsService';
import {
  CurriculumTask,
  SubmissionStatus,
  TaskSubmission,
  WhitelistedTeacher,
} from '@/src/types';

interface VerificationExportProps {
  tasks: CurriculumTask[];
  teachers: WhitelistedTeacher[];
  submissions: TaskSubmission[];
}

export const VerificationExport: React.FC<VerificationExportProps> = ({
  tasks,
  teachers,
  submissions,
}) => {
  const { user, googleAccessToken, connectGoogle } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [reviewingSubmission, setReviewingSubmission] = useState<TaskSubmission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>('Disetujui');
  const [revisionNote, setRevisionNote] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    } else if (selectedTaskId && !tasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id || '');
    }
  }, [tasks, selectedTaskId]);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const monitoringRows = useMemo(() => {
    if (!activeTask) return [];
    const taskSubs = submissions.filter((s) => s.taskId === activeTask.id);
    const byEmail = new Map<string, TaskSubmission>();
    const byUid = new Map<string, TaskSubmission>();

    taskSubs.forEach((s) => {
      byEmail.set(s.teacherEmail.toLowerCase(), s);
      byUid.set(s.teacherUid, s);
    });

    return teachers.map((teacher) => {
      const submission =
        (teacher.uid ? byUid.get(teacher.uid) : undefined) ||
        byEmail.get(teacher.email.toLowerCase()) ||
        null;
      return { teacher, submission };
    });
  }, [activeTask, teachers, submissions]);

  const openReviewModal = (submission: TaskSubmission) => {
    setReviewingSubmission(submission);
    setReviewStatus(
      submission.status === 'Menunggu Verifikasi' ? 'Disetujui' : submission.status
    );
    setRevisionNote(submission.revisionNote || '');
    setActionError(null);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reviewingSubmission) return;

    if (reviewStatus === 'Perlu Revisi' && !revisionNote.trim()) {
      setActionError('Tuliskan catatan revisi agar guru mengetahui bagian yang perlu diperbaiki.');
      return;
    }

    setIsSavingReview(true);
    setActionError(null);
    try {
      await reviewSubmission(
        reviewingSubmission.id,
        reviewStatus,
        revisionNote,
        user.uid
      );
      setReviewingSubmission(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal menyimpan hasil verifikasi.'
      );
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleExportToSheets = async () => {
    if (!activeTask) return;
    setActionError(null);
    setExportedUrl(null);
    setIsExporting(true);

    try {
      let token = googleAccessToken;
      if (!token) {
        token = await connectGoogle();
      }
      const result = await exportRecapToSheets({
        task: activeTask,
        teachers,
        submissions,
        accessToken: token,
      });
      setExportedUrl(result.spreadsheetUrl);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Gagal mengekspor rekap ke Google Sheets.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const renderStatusBadge = (submission: TaskSubmission | null) => {
    if (!submission) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          Belum Menyetor
        </span>
      );
    }

    if (submission.status === 'Disetujui') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Disetujui
        </span>
      );
    }

    if (submission.status === 'Perlu Revisi') {
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

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="verify-task-select"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Pilih Tugas Perangkat Ajar
          </label>
          <select
            id="verify-task-select"
            value={selectedTaskId}
            onChange={(e) => {
              setSelectedTaskId(e.target.value);
              setExportedUrl(null);
            }}
            disabled={tasks.length === 0}
            className="h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-teal-700 focus:outline-none disabled:bg-slate-100"
          >
            {tasks.length === 0 ? (
              <option value="">Belum ada tugas tersedia</option>
            ) : (
              tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} (Deadline: {task.deadline})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeTask?.driveFolderUrl && (
            <a
              href={activeTask.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Buka Folder Drive</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleExportToSheets}
            disabled={!activeTask || isExporting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>
              {isExporting ? 'Mengekspor Rekap...' : 'Export Rekap ke Google Sheets'}
            </span>
          </button>
        </div>
      </section>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {exportedUrl && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 text-xs font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Rekap status pengumpulan guru berhasil diekspor ke Google Sheets.
            </span>
          </div>
          <a
            href={exportedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            <span>Buka Google Sheets</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Tabel Monitoring Pengumpulan */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Monitoring &amp; Verifikasi Pengumpulan
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Tinjau berkas perangkat ajar yang disetor guru, berikan persetujuan, atau kirim catatan revisi.
          </p>
        </div>

        {!activeTask ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Belum ada tugas yang dapat dimonitor.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Buat tugas perangkat ajar terlebih dahulu pada menu Manajemen Tugas.
            </p>
          </div>
        ) : monitoringRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Belum ada guru dalam database whitelist.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Guru &amp; Mapel</th>
                  <th className="px-5 py-3">NIP</th>
                  <th className="px-5 py-3">Berkas Perangkat Ajar</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monitoringRows.map(({ teacher, submission }) => (
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
                    <td className="px-5 py-3.5">
                      {submission ? (
                        <div className="space-y-1">
                          <a
                            href={submission.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-xs truncate">{submission.fileName}</span>
                          </a>
                          {submission.revisionNote && (
                            <p className="text-xs text-slate-500">
                              Catatan: {submission.revisionNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Belum ada berkas</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {renderStatusBadge(submission)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {submission ? (
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={submission.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Preview
                          </a>
                          <button
                            type="button"
                            onClick={() => openReviewModal(submission)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            Verifikasi
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Verifikasi / Catatan Revisi */}
      {reviewingSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Verifikasi Perangkat Ajar
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {reviewingSubmission.teacherName} · {reviewingSubmission.teacherSubject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingSubmission(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup modal verifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-medium text-slate-700">Berkas yang dikirim:</p>
                <a
                  href={reviewingSubmission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="break-all">{reviewingSubmission.fileName}</span>
                </a>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Keputusan Verifikasi
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('Disetujui')}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                      reviewStatus === 'Disetujui'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Disetujui</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('Perlu Revisi')}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                      reviewStatus === 'Perlu Revisi'
                        ? 'border-red-600 bg-red-50 text-red-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquareWarning className="h-4 w-4" />
                    <span>Perlu Revisi</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="revision-note-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Catatan untuk Guru {reviewStatus === 'Perlu Revisi' ? '(Wajib diisi)' : '(Opsional)'}
                </label>
                <textarea
                  id="revision-note-input"
                  rows={3}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Tuliskan catatan kelengkapan atau bagian perangkat ajar yang perlu direvisi..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingSubmission(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingReview}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {isSavingReview ? 'Menyimpan...' : 'Simpan Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
