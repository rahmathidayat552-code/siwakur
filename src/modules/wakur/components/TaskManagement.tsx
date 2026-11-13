import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import { ConfirmDialog } from '@/src/core/components/ConfirmDialog';
import { createTask, deleteTask } from '@/src/services/firebase/firestoreService';
import { createTaskFolder } from '@/src/services/google/driveService';
import { CurriculumTask, TaskSubmission } from '@/src/types';

interface TaskManagementProps {
  tasks: CurriculumTask[];
  submissions: TaskSubmission[];
  totalTeachers: number;
}

export const TaskManagement: React.FC<TaskManagementProps> = ({
  tasks,
  submissions,
  totalTeachers,
}) => {
  const { user, googleAccessToken, connectGoogle } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<CurriculumTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (title.trim().length < 3) {
      setErrorMsg('Judul tugas minimal 3 karakter.');
      return;
    }
    if (!deadline) {
      setErrorMsg('Batas waktu pengumpulan wajib diisi.');
      return;
    }

    setIsCreating(true);
    try {
      let token = googleAccessToken;
      if (!token) {
        token = await connectGoogle();
      }

      const folder = await createTaskFolder(title.trim(), token);

      await createTask(
        {
          title: title.trim(),
          description: description.trim(),
          deadline,
          driveFolderId: folder.folderId,
          driveFolderUrl: folder.folderUrl,
        },
        user.uid
      );

      setSuccessMsg(
        `Tugas "${title.trim()}" dan folder Google Drive berhasil dibuat.`
      );
      setTitle('');
      setDescription('');
      setDeadline('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal membuat tugas dan folder Google Drive.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus tugas.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Buat Tugas Baru */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Buat Tugas Perangkat Ajar Baru
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Setiap tugas baru akan otomatis membuat folder arsip di Google Drive Anda dan tampil secara real-time di portal guru.
            </p>
          </div>
          {!googleAccessToken && (
            <button
              type="button"
              onClick={() => void connectGoogle()}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              Hubungkan Google Drive Dulu
            </button>
          )}
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

        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label
                htmlFor="task-title"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Judul Tugas Perangkat Ajar
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Modul Ajar & ATP Semester Ganjil 2026/2027"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>

            <div>
              <label
                htmlFor="task-deadline"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Batas Waktu (Deadline)
              </label>
              <input
                id="task-deadline"
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="font-mono-tabular h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="task-desc"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Deskripsi / Instruksi Pengumpulan
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tuliskan rincian format dokumen (PDF/Docx), komponen CP-TP-ATP, atau ketentuan khusus..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
            >
              <FolderPlus className="h-4 w-4" />
              <span>
                {isCreating
                  ? 'Membuat Folder Drive & Tugas...'
                  : 'Buat Tugas & Folder Drive'}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Daftar Tugas Aktif */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Daftar Tugas Perangkat Ajar ({tasks.length})
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Setiap tugas terhubung dengan folder khusus di Google Drive.
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Belum ada tugas perangkat ajar.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Buat tugas baru melalui formulir di atas agar guru dapat mulai mengunggah berkas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {tasks.map((task) => {
              const taskSubmissions = submissions.filter((s) => s.taskId === task.id);
              const approvedCount = taskSubmissions.filter(
                (s) => s.status === 'Disetujui'
              ).length;

              return (
                <div
                  key={task.id}
                  className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono-tabular">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Deadline: {task.deadline}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {taskSubmissions.length}/{totalTeachers} terkumpul
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-emerald-700">
                        {approvedCount} disetujui
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.driveFolderUrl && (
                      <a
                        href={task.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-teal-700" />
                        <span>Folder Drive</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setTaskToDelete(task)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        title="Hapus Tugas Perangkat Ajar?"
        description={
          taskToDelete
            ? `Tugas "${taskToDelete.title}" akan dihapus dari SIWAKUR. Folder di Google Drive tidak dihapus secara otomatis.`
            : ''
        }
        confirmLabel="Hapus Tugas"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
