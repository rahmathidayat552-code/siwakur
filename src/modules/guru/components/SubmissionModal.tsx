import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileUp,
  Link2,
  MessageSquareWarning,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';
import {
  formatSubjectsSummary,
  normalizeSubjectsList,
  submitTeachingDevice,
} from '@/src/services/firebase/firestoreService';
import {
  buildSubmissionFileName,
  uploadTeachingFile,
} from '@/src/services/google/driveService';
import { CurriculumTask, SubmissionType, TaskSubmission } from '@/src/types';

interface SubmissionModalProps {
  task: CurriculumTask;
  existingSubmission: TaskSubmission | null;
  onClose: () => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  task,
  existingSubmission,
  onClose,
}) => {
  const { user, profile, googleAccessToken, connectGoogle } = useAuth();
  const teacherSubjects = useMemo(
    () => normalizeSubjectsList(profile?.subjects, profile?.subject),
    [profile?.subjects, profile?.subject]
  );

  const [selectedSubmissionSubjects, setSelectedSubmissionSubjects] = useState<string[]>(() => {
    if (existingSubmission?.teacherSubject) {
      const existingList = normalizeSubjectsList(undefined, existingSubmission.teacherSubject);
      if (existingList.length > 0) return existingList;
    }
    return teacherSubjects.length > 0 ? teacherSubjects : [];
  });

  const resolvedSubmissionSubject = useMemo(
    () =>
      formatSubjectsSummary(
        selectedSubmissionSubjects,
        profile?.subject || 'Mapel'
      ),
    [selectedSubmissionSubjects, profile?.subject]
  );

  const [mode, setMode] = useState<SubmissionType>(
    existingSubmission?.submissionType || 'drive_upload'
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState(
    existingSubmission?.submissionType === 'external_link'
      ? existingSubmission.fileUrl
      : ''
  );
  const [hasEditedExternalName, setHasEditedExternalName] = useState(
    existingSubmission?.submissionType === 'external_link'
  );
  const [customExternalName, setCustomExternalName] = useState(
    existingSubmission?.submissionType === 'external_link'
      ? existingSubmission.fileName
      : ''
  );
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generatedExternalName = useMemo(
    () =>
      buildSubmissionFileName(
        task.title,
        profile?.fullName || 'Guru',
        resolvedSubmissionSubject
      ),
    [task.title, profile?.fullName, resolvedSubmissionSubject]
  );

  const externalName = hasEditedExternalName
    ? customExternalName
    : generatedExternalName;

  const previewFileName = useMemo(() => {
    const teacherName = profile?.fullName || 'Guru';
    return buildSubmissionFileName(
      task.title,
      teacherName,
      resolvedSubmissionSubject,
      selectedFile?.name
    );
  }, [task.title, profile?.fullName, resolvedSubmissionSubject, selectedFile]);

  const toggleSubmissionSubject = (subjectName: string) => {
    setErrorMsg(null);
    const exists = selectedSubmissionSubjects.some(
      (s) => s.toLowerCase() === subjectName.toLowerCase()
    );
    if (exists) {
      if (selectedSubmissionSubjects.length === 1) {
        setErrorMsg('Minimal satu mata pelajaran harus dipilih untuk setoran ini.');
        return;
      }
      setSelectedSubmissionSubjects(
        selectedSubmissionSubjects.filter(
          (s) => s.toLowerCase() !== subjectName.toLowerCase()
        )
      );
    } else {
      setSelectedSubmissionSubjects([...selectedSubmissionSubjects, subjectName]);
    }
  };

  const isRevision = Boolean(existingSubmission);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setErrorMsg(null);

    if (teacherSubjects.length > 0 && selectedSubmissionSubjects.length === 0) {
      setErrorMsg('Pilih minimal satu mata pelajaran untuk setoran ini.');
      return;
    }

    if (isRevision && !confirmOverwrite) {
      setErrorMsg(
        'Centang persetujuan pembaruan berkas terlebih dahulu sebelum mengirim revisi.'
      );
      return;
    }

    if (mode === 'drive_upload' && !selectedFile) {
      setErrorMsg('Pilih berkas perangkat ajar yang akan diunggah ke Google Drive.');
      return;
    }

    if (mode === 'external_link') {
      const trimmedUrl = externalUrl.trim();
      if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
        setErrorMsg('Masukkan tautan Google Docs / Drive yang valid (diawali https://).');
        return;
      }
      if (!externalName.trim()) {
        setErrorMsg('Nama dokumen wajib diisi.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'drive_upload' && selectedFile) {
        let token = googleAccessToken;
        if (!token) {
          token = await connectGoogle();
        }

        const uploaded = await uploadTeachingFile({
          file: selectedFile,
          taskTitle: task.title,
          teacherName: profile.fullName,
          subject: resolvedSubmissionSubject,
          folderId: task.driveFolderId || undefined,
          accessToken: token,
        });

        await submitTeachingDevice({
          taskId: task.id,
          taskTitle: task.title,
          teacherUid: user.uid,
          teacherEmail: profile.email,
          teacherName: profile.fullName,
          teacherNip: profile.nip,
          teacherSubject: resolvedSubmissionSubject,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          driveFileId: uploaded.fileId,
          submissionType: 'drive_upload',
          isRevision,
        });
      } else {
        await submitTeachingDevice({
          taskId: task.id,
          taskTitle: task.title,
          teacherUid: user.uid,
          teacherEmail: profile.email,
          teacherName: profile.fullName,
          teacherNip: profile.nip,
          teacherSubject: resolvedSubmissionSubject,
          fileName: externalName.trim(),
          fileUrl: externalUrl.trim(),
          driveFileId: '',
          submissionType: 'external_link',
          isRevision,
        });
      }

      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal mengirim perangkat ajar.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">
              {isRevision ? 'Kirim Revisi Perangkat Ajar' : 'Setor Perangkat Ajar'}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {task.title} · Deadline {task.deadline}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup modal pengumpulan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {existingSubmission?.status === 'Perlu Revisi' &&
          existingSubmission.revisionNote && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
              <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">Catatan Revisi Wakasek Kurikulum:</p>
                <p className="mt-0.5 leading-relaxed">{existingSubmission.revisionNote}</p>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Subject selector when teacher teaches multiple subjects */}
          {teacherSubjects.length > 1 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <span className="mb-2 block text-xs font-semibold text-slate-700">
                Mata Pelajaran pada Setoran Ini
              </span>
              <div className="flex flex-wrap gap-1.5">
                {teacherSubjects.map((subj) => {
                  const isActive = selectedSubmissionSubjects.some(
                    (s) => s.toLowerCase() === subj.toLowerCase()
                  );
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => toggleSubmissionSubject(subj)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-teal-700 bg-teal-50 font-semibold text-teal-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {isActive && <Check className="h-3 w-3 text-teal-700" />}
                      <span>{subj}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('drive_upload');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === 'drive_upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Unggah ke Google Drive</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('external_link');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === 'external_link'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Tempel Link Docs / Drive</span>
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'drive_upload' ? (
            <div className="space-y-3">
              <label
                htmlFor="device-file-input"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-teal-700 hover:bg-teal-50/30"
              >
                <FileUp className="h-7 w-7 text-teal-700" />
                <p className="mt-2 text-xs font-semibold text-slate-800">
                  {selectedFile
                    ? selectedFile.name
                    : 'Klik untuk memilih berkas perangkat ajar'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Format didukung: PDF, DOCX, XLSX, PPTX
                </p>
                <input
                  id="device-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  className="sr-only"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-medium text-slate-600">
                  Nama file otomatis di Google Drive:
                </p>
                <p className="font-mono-tabular mt-1 break-all font-semibold text-slate-900">
                  {previewFileName}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="ext-name"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Nama Dokumen
                </label>
                <input
                  id="ext-name"
                  type="text"
                  required
                  value={externalName}
                  onChange={(e) => {
                    setHasEditedExternalName(true);
                    setCustomExternalName(e.target.value);
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ext-url"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Tautan Google Docs / Google Drive
                </label>
                <input
                  id="ext-url"
                  type="url"
                  required
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Pastikan akses tautan diatur ke &ldquo;Siapa saja yang memiliki tautan dapat melihat&rdquo;.
                </p>
              </div>
            </div>
          )}

          {isRevision && (
            <label className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={confirmOverwrite}
                onChange={(e) => setConfirmOverwrite(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-teal-700 focus:ring-teal-700"
              />
              <span>
                Saya mengonfirmasi penggantian berkas setoran sebelumnya dengan versi revisi terbaru ini.
              </span>
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isSubmitting
                ? mode === 'drive_upload'
                  ? 'Mengunggah ke Drive...'
                  : 'Menyimpan...'
                : isRevision
                ? 'Kirim Revisi'
                : 'Kirim Perangkat Ajar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
