import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, SCHOOL_ID, WAKUR_EMAIL } from './firebaseConfig';
import {
  CurriculumTask,
  NewSubjectInput,
  NewTaskInput,
  NewTeacherInput,
  NewWakurAdminInput,
  SchoolSubject,
  SubjectCategory,
  SubmissionStatus,
  SubmissionType,
  TaskSubmission,
  WakurAdmin,
  WhitelistedTeacher,
} from '@/src/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function toMillis(ts?: Timestamp | null): number {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
}

export function normalizeSubjectsList(
  subjects?: string[] | null,
  fallbackSubject?: string | null
): string[] {
  const raw =
    Array.isArray(subjects) && subjects.length > 0
      ? subjects
      : (fallbackSubject || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const cleaned = item.trim().slice(0, 120);
    if (!cleaned || cleaned === '-') continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cleaned);
    }
    if (unique.length >= 20) break;
  }
  return unique;
}

export function formatSubjectsSummary(subjects: string[], fallback = '-'): string {
  const joined = subjects.join(', ').trim();
  if (!joined) return fallback;
  return joined.slice(0, 500);
}

// --- Real-time Subscriptions (onSnapshot) ---

export function subscribeToWhitelistedTeachers(
  onData: (teachers: WhitelistedTeacher[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'whitelisted_teachers';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: WhitelistedTeacher[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WhitelistedTeacher, 'id'>),
      }));
      items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToTasks(
  onData: (tasks: CurriculumTask[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'tasks';
  const q = query(collection(db, path), where('schoolId', '==', SCHOOL_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CurriculumTask[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CurriculumTask, 'id'>),
      }));
      items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToAllSubmissions(
  onData: (submissions: TaskSubmission[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'submissions';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: TaskSubmission[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskSubmission, 'id'>),
      }));
      items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToTeacherSubmissions(
  teacherUid: string,
  onData: (submissions: TaskSubmission[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'submissions';
  const q = query(collection(db, path), where('teacherUid', '==', teacherUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: TaskSubmission[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskSubmission, 'id'>),
      }));
      items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- Wakur Admins (Multi-Email Wakur Management) ---

export function subscribeToWakurAdmins(
  onData: (admins: WakurAdmin[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'wakur_admins';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: WakurAdmin[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WakurAdmin, 'id'>),
      }));
      items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addWakurAdmin(
  input: NewWakurAdminInput,
  addedByUid: string
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim().slice(0, 150);
  const note = input.note.trim().slice(0, 150);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Format alamat email admin Wakur tidak valid.');
  }
  if (email === WAKUR_EMAIL) {
    throw new Error(
      `Email ${WAKUR_EMAIL} sudah menjadi Super-Wakur Utama dari konfigurasi sistem.`
    );
  }
  if (fullName.length < 2) {
    throw new Error('Nama lengkap admin Wakur minimal 2 karakter.');
  }

  try {
    await setDoc(doc(db, 'wakur_admins', email), {
      email,
      fullName,
      note,
      addedBy: addedByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `wakur_admins/${email}`);
  }
}

export async function deleteWakurAdmin(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === WAKUR_EMAIL) {
    throw new Error('Super-Wakur Utama tidak dapat dihapus dari sistem.');
  }

  try {
    await deleteDoc(doc(db, 'wakur_admins', normalizedEmail));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `wakur_admins/${normalizedEmail}`);
  }
}

// --- School Subjects (Managed by Wakur) ---

const VALID_SUBJECT_CATEGORIES: SubjectCategory[] = [
  'Umum',
  'Kejuruan',
  'Muatan Lokal',
  'Lainnya',
];

export function subscribeToSubjects(
  onData: (subjects: SchoolSubject[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'subjects';
  const q = query(collection(db, path), where('schoolId', '==', SCHOOL_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SchoolSubject[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SchoolSubject, 'id'>),
      }));
      items.sort((a, b) => {
        const catDiff = a.category.localeCompare(b.category, 'id');
        if (catDiff !== 0) return catDiff;
        return a.name.localeCompare(b.name, 'id');
      });
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createSubject(
  input: NewSubjectInput,
  createdByUid: string
): Promise<string> {
  const name = input.name.trim().slice(0, 120);
  const code = input.code.trim().toUpperCase().slice(0, 30);
  const category = VALID_SUBJECT_CATEGORIES.includes(input.category)
    ? input.category
    : 'Lainnya';

  if (name.length < 2) {
    throw new Error('Nama mata pelajaran minimal 2 karakter.');
  }

  const subjectRef = doc(collection(db, 'subjects'));
  try {
    await setDoc(subjectRef, {
      schoolId: SCHOOL_ID,
      name,
      code,
      category,
      createdBy: createdByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return subjectRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `subjects/${subjectRef.id}`);
  }
}

export async function updateSubject(
  subjectId: string,
  input: NewSubjectInput
): Promise<void> {
  const name = input.name.trim().slice(0, 120);
  const code = input.code.trim().toUpperCase().slice(0, 30);
  const category = VALID_SUBJECT_CATEGORIES.includes(input.category)
    ? input.category
    : 'Lainnya';

  if (name.length < 2) {
    throw new Error('Nama mata pelajaran minimal 2 karakter.');
  }

  try {
    await updateDoc(doc(db, 'subjects', subjectId), {
      name,
      code,
      category,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `subjects/${subjectId}`);
  }
}

export async function deleteSubject(subjectId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `subjects/${subjectId}`);
  }
}

// --- CRUD Operations ---

export async function addWhitelistedTeacher(
  input: NewTeacherInput,
  createdByUid: string
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim().slice(0, 150);
  const nip = input.nip.trim().slice(0, 50);
  const normalizedSubjects = normalizeSubjectsList(input.subjects, input.subject);
  const subject = formatSubjectsSummary(normalizedSubjects, '');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Format alamat email guru tidak valid.');
  }
  if (fullName.length < 2) {
    throw new Error('Nama lengkap guru minimal 2 karakter.');
  }
  if (nip.length < 1) {
    throw new Error('NIP / NUPTK guru wajib diisi.');
  }
  if (normalizedSubjects.length === 0 || subject.length < 2) {
    throw new Error('Pilih atau isi minimal satu mata pelajaran.');
  }

  const teacherRef = doc(db, 'whitelisted_teachers', email);
  const statusRef = doc(db, 'whitelist_status', email);

  const batch = writeBatch(db);
  batch.set(teacherRef, {
    email,
    fullName,
    nip,
    subject,
    subjects: normalizedSubjects,
    isRegistered: false,
    uid: null,
    createdBy: createdByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(statusRef, {
    active: true,
    isRegistered: false,
    uid: null,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `whitelisted_teachers/${email}`);
  }
}

export async function updateTeacherSubjectsByWakur(
  email: string,
  selectedSubjects: string[],
  teacherUid?: string | null
): Promise<{ subject: string; subjects: string[] }> {
  const normalizedSubjects = normalizeSubjectsList(selectedSubjects);
  if (normalizedSubjects.length === 0) {
    throw new Error('Pilih minimal satu mata pelajaran.');
  }

  const subjectSummary = formatSubjectsSummary(normalizedSubjects, '');
  if (subjectSummary.length < 2) {
    throw new Error('Nama mata pelajaran minimal 2 karakter.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const teacherRef = doc(db, 'whitelisted_teachers', normalizedEmail);
  const batch = writeBatch(db);
  batch.update(teacherRef, {
    subject: subjectSummary,
    subjects: normalizedSubjects,
    updatedAt: serverTimestamp(),
  });

  if (teacherUid) {
    const userRef = doc(db, 'users', teacherUid);
    const userSnap = await getDoc(userRef).catch(() => null);
    if (userSnap && userSnap.exists()) {
      batch.update(userRef, {
        subject: subjectSummary,
        subjects: normalizedSubjects,
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
    return { subject: subjectSummary, subjects: normalizedSubjects };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `whitelisted_teachers/${normalizedEmail}`);
  }
}

export async function updateMyTeacherSubjects(
  uid: string,
  email: string,
  selectedSubjects: string[]
): Promise<{ subject: string; subjects: string[] }> {
  const normalizedSubjects = normalizeSubjectsList(selectedSubjects);
  if (normalizedSubjects.length === 0) {
    throw new Error('Pilih minimal satu mata pelajaran.');
  }

  const subjectSummary = formatSubjectsSummary(normalizedSubjects, '');
  if (subjectSummary.length < 2) {
    throw new Error('Nama mata pelajaran minimal 2 karakter.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), {
    subject: subjectSummary,
    subjects: normalizedSubjects,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'whitelisted_teachers', normalizedEmail), {
    subject: subjectSummary,
    subjects: normalizedSubjects,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { subject: subjectSummary, subjects: normalizedSubjects };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function deleteWhitelistedTeacher(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'whitelisted_teachers', normalizedEmail));
  batch.delete(doc(db, 'whitelist_status', normalizedEmail));

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `whitelisted_teachers/${normalizedEmail}`);
  }
}

export async function createTask(
  input: NewTaskInput,
  createdByUid: string
): Promise<string> {
  const title = input.title.trim().slice(0, 200);
  const description = input.description.trim().slice(0, 2000);
  const deadline = input.deadline.trim().slice(0, 32);

  if (title.length < 3) {
    throw new Error('Judul tugas minimal 3 karakter.');
  }
  if (!deadline) {
    throw new Error('Batas waktu (deadline) wajib ditentukan.');
  }

  const taskRef = doc(collection(db, 'tasks'));
  try {
    await setDoc(taskRef, {
      schoolId: SCHOOL_ID,
      title,
      description,
      deadline,
      driveFolderId: input.driveFolderId.slice(0, 256),
      driveFolderUrl: input.driveFolderUrl.slice(0, 512),
      createdBy: createdByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return taskRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tasks/${taskRef.id}`);
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
  }
}

export interface SubmitDeviceInput {
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
  isRevision: boolean;
}

export async function submitTeachingDevice(input: SubmitDeviceInput): Promise<void> {
  const submissionId = `${input.taskId}_${input.teacherUid}`;
  const submissionRef = doc(db, 'submissions', submissionId);

  const fileName = input.fileName.trim().slice(0, 300);
  const fileUrl = input.fileUrl.trim().slice(0, 1000);
  const driveFileId = input.driveFileId.trim().slice(0, 256);

  if (!fileName || fileUrl.length < 5) {
    throw new Error('Nama berkas dan tautan berkas wajib diisi.');
  }

  if (input.isRevision) {
    try {
      await updateDoc(submissionRef, {
        teacherSubject: input.teacherSubject.trim().slice(0, 500),
        fileName,
        fileUrl,
        driveFileId,
        submissionType: input.submissionType,
        status: 'Menunggu Verifikasi',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${submissionId}`);
    }
    return;
  }

  try {
    await setDoc(submissionRef, {
      taskId: input.taskId,
      taskTitle: input.taskTitle.slice(0, 200),
      teacherUid: input.teacherUid,
      teacherEmail: input.teacherEmail.trim().toLowerCase().slice(0, 254),
      teacherName: input.teacherName.trim().slice(0, 150),
      teacherNip: input.teacherNip.trim().slice(0, 50),
      teacherSubject: input.teacherSubject.trim().slice(0, 500),
      fileName,
      fileUrl,
      driveFileId,
      submissionType: input.submissionType,
      status: 'Menunggu Verifikasi',
      revisionNote: '',
      reviewedBy: '',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `submissions/${submissionId}`);
  }
}

export async function reviewSubmission(
  submissionId: string,
  status: SubmissionStatus,
  revisionNote: string,
  reviewerUid: string
): Promise<void> {
  const submissionRef = doc(db, 'submissions', submissionId);
  try {
    await updateDoc(submissionRef, {
      status,
      revisionNote: revisionNote.trim().slice(0, 1000),
      reviewedBy: reviewerUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `submissions/${submissionId}`);
  }
}
