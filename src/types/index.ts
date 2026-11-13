import { Timestamp } from 'firebase/firestore';

export type UserRole = 'wakur' | 'guru';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  nip: string;
  subject: string;
  role: UserRole;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface WhitelistedTeacher {
  id: string; // email.toLowerCase()
  email: string;
  fullName: string;
  nip: string;
  subject: string;
  isRegistered: boolean;
  uid: string | null;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CurriculumTask {
  id: string;
  schoolId: 'smkn9-bulukumba';
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  driveFolderId: string;
  driveFolderUrl: string;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type SubmissionStatus = 'Menunggu Verifikasi' | 'Disetujui' | 'Perlu Revisi';
export type SubmissionType = 'drive_upload' | 'external_link';

export interface TaskSubmission {
  id: string; // `${taskId}_${teacherUid}`
  taskId: string;
  taskTitle: string;
  teacherUid: string;
  teacherEmail: string;
  teacherName: string;
  teacherNip: string;
  teacherSubject: string;
  fileName: string;
  fileUrl: string;
  driveFileId: string;
  submissionType: SubmissionType;
  status: SubmissionStatus;
  revisionNote: string;
  reviewedBy: string;
  submittedAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewTeacherInput {
  email: string;
  fullName: string;
  nip: string;
  subject: string;
}

export interface NewTaskInput {
  title: string;
  description: string;
  deadline: string;
  driveFolderId: string;
  driveFolderUrl: string;
}
