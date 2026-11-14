import {
  createUserWithEmailAndPassword,
  deleteUser,
  linkWithPopup,
  reauthenticateWithPopup,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  setCachedGoogleAccessToken,
  getCachedGoogleAccessToken,
  WAKUR_EMAIL,
} from './firebaseConfig';
import { OperationType, handleFirestoreError } from './firestoreService';
import { UserProfile, UserRole } from '@/src/types';

export interface AuthResult {
  user: User;
  role: UserRole;
  profile: UserProfile;
}

function mapFirebaseAuthError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email atau kata sandi tidak sesuai.';
      case 'auth/email-already-in-use':
        return 'Email ini sudah memiliki akun aktif. Silakan masuk melalui tab Masuk (Login).';
      case 'auth/weak-password':
        return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      case 'auth/invalid-email':
        return 'Format alamat email tidak valid.';
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.';
      case 'auth/popup-closed-by-user':
        return 'Jendela masuk Google ditutup sebelum proses selesai.';
      case 'auth/popup-blocked':
        return 'Popup Google diblokir oleh browser. Izinkan popup untuk melanjutkan.';
      case 'auth/operation-not-allowed':
        return 'Metode login Email/Password belum diaktifkan di Firebase Console. Silakan aktifkan Email/Password atau gunakan tombol Masuk dengan Google.';
      case 'auth/unauthorized-domain':
        return `Domain "${typeof window !== 'undefined' ? window.location.hostname : ''}" belum diizinkan pada proyek Firebase "${auth.app.options.projectId || 'gen-lang-client-0204854375'}". Tambahkan domain tersebut di Firebase Console → Authentication → Settings → Authorized domains.`;
      default:
        break;
    }
  }
  if (error instanceof Error) {
    const raw = error.message;
    if (raw.startsWith('{') && raw.includes('operationType')) {
      try {
        const parsed = JSON.parse(raw) as { error?: string; path?: string };
        if (parsed.error && parsed.error.includes('Missing or insufficient permissions')) {
          if (parsed.path && parsed.path.startsWith('whitelisted_teachers/')) {
            return 'Akses ditolak: Email Anda belum didaftarkan oleh Wakasek Kurikulum SMKN 9 Bulukumba, atau belum memiliki hak akses Wakur.';
          }
          return 'Akses database ditolak oleh aturan keamanan Firestore. Pastikan email Anda sudah terdaftar dan terverifikasi.';
        }
      } catch {
        // Fallback ke pesan error standar
      }
    }
    return raw;
  }
  return 'Terjadi kesalahan autentikasi.';
}

async function ensureUserProfile(
  user: User,
  fallbackInfo?: { fullName?: string; nip?: string; subject?: string }
): Promise<UserProfile> {
  const email = (user.email || '').trim().toLowerCase();
  const isSuperWakur = email === WAKUR_EMAIL;

  let dynamicWakurData: { fullName?: string; note?: string } | null = null;
  if (!isSuperWakur && user.emailVerified) {
    try {
      const wakurAdminSnap = await getDoc(doc(db, 'wakur_admins', email));
      if (wakurAdminSnap.exists()) {
        dynamicWakurData = wakurAdminSnap.data() as { fullName?: string; note?: string };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `wakur_admins/${email}`);
    }
  }

  const isWakurAccount = isSuperWakur || Boolean(dynamicWakurData);

  const userRef = doc(db, 'users', user.uid);
  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
  }

  if (isWakurAccount) {
    if (!user.emailVerified) {
      throw new Error(
        'Akun Wakasek Kurikulum memerlukan email terverifikasi. Silakan gunakan tombol "Sign in with Google" atau verifikasi email Anda.'
      );
    }

    if (userSnap && userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      if (data.role !== 'wakur') {
        try {
          await updateDoc(userRef, {
            role: 'wakur',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
      return {
        ...data,
        role: 'wakur',
      };
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      email,
      fullName: (
        dynamicWakurData?.fullName ||
        user.displayName ||
        fallbackInfo?.fullName ||
        'Wakasek Kurikulum'
      ).slice(0, 150),
      nip: (fallbackInfo?.nip || '-').slice(0, 50),
      subject: (
        dynamicWakurData?.note || 'Wakil Kepala Sekolah Bidang Kurikulum'
      ).slice(0, 150),
      role: 'wakur',
    };

    try {
      await setDoc(userRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }
    return newProfile;
  }

  // Teacher flow: verify whitelist entry
  const whitelistRef = doc(db, 'whitelisted_teachers', email);
  let whitelistSnap;
  try {
    whitelistSnap = await getDoc(whitelistRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `whitelisted_teachers/${email}`);
  }

  if (!whitelistSnap || !whitelistSnap.exists()) {
    await signOut(auth);
    setCachedGoogleAccessToken(null);
    throw new Error(
      `Email (${email}) belum didaftarkan oleh Wakasek Kurikulum SMKN 9 Bulukumba. Jika Anda mencoba masuk sebagai Wakasek Kurikulum, gunakan email resmi Wakur (${WAKUR_EMAIL}).`
    );
  }

  const teacherData = whitelistSnap.data();
  if (!teacherData.isRegistered || teacherData.uid !== user.uid) {
    if (teacherData.isRegistered && teacherData.uid && teacherData.uid !== user.uid) {
      await signOut(auth);
      setCachedGoogleAccessToken(null);
      throw new Error('Email ini sudah ditautkan ke akun lain. Hubungi Wakasek Kurikulum.');
    }

    const statusRef = doc(db, 'whitelist_status', email);
    const batch = writeBatch(db);
    batch.update(whitelistRef, {
      isRegistered: true,
      uid: user.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(statusRef, {
      isRegistered: true,
      uid: user.uid,
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `whitelisted_teachers/${email}`);
    }
  }

  const teacherProfile: UserProfile = {
    uid: user.uid,
    email,
    fullName: String(teacherData.fullName || user.displayName || 'Guru SMKN 9 Bulukumba').slice(0, 150),
    nip: String(teacherData.nip || '-').slice(0, 50),
    subject: String(teacherData.subject || '-').slice(0, 150),
    role: 'guru',
  };

  if (userSnap && userSnap.exists()) {
    const existingData = userSnap.data() as UserProfile;
    if (existingData.role !== 'guru') {
      try {
        await updateDoc(userRef, {
          role: 'guru',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    return {
      ...existingData,
      role: 'guru',
    };
  }

  try {
    await setDoc(userRef, {
      ...teacherProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
  }

  return teacherProfile;
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const profile = await ensureUserProfile(credential.user);
    return {
      user: credential.user,
      role: profile.role,
      profile,
    };
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function registerTeacher(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Masukkan alamat email yang valid.');
  }
  if (password.length < 6) {
    throw new Error('Kata sandi baru minimal harus 6 karakter.');
  }

  // Aturan Wakur: Email cocok dengan VITE_WAKUR_EMAIL otomatis mendapat role 'wakur' tanpa whitelist
  if (normalizedEmail === WAKUR_EMAIL) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await sendEmailVerification(credential.user);
      if (!credential.user.emailVerified) {
        await signOut(auth);
        throw new Error(
          'Akun Wakasek Kurikulum berhasil dibuat. Tautan verifikasi telah dikirim ke email Anda, atau Anda dapat langsung masuk melalui tombol "Sign in with Google".'
        );
      }
      const profile = await ensureUserProfile(credential.user);
      return {
        user: credential.user,
        role: 'wakur',
        profile,
      };
    } catch (error) {
      throw new Error(mapFirebaseAuthError(error));
    }
  }

  // Langkah 1: Cek status whitelist non-PII terlebih dahulu agar tidak membuat akun yatim
  const statusRef = doc(db, 'whitelist_status', normalizedEmail);
  let statusSnap;
  try {
    statusSnap = await getDoc(statusRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `whitelist_status/${normalizedEmail}`);
  }

  if (!statusSnap || !statusSnap.exists() || !statusSnap.data().active) {
    throw new Error('Email belum didaftarkan oleh Wakasek Kurikulum SMKN 9 Bulukumba');
  }

  if (statusSnap.data().isRegistered) {
    throw new Error('Akun guru ini sudah diaktivasi. Silakan masuk melalui tab Masuk (Login).');
  }

  // Langkah 2: Buat akun di Firebase Auth
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }

  // Langkah 3: Verifikasi dokumen lengkap di koleksi whitelisted_teachers dengan ID email.toLowerCase()
  const whitelistRef = doc(db, 'whitelisted_teachers', normalizedEmail);
  let whitelistSnap;
  try {
    whitelistSnap = await getDoc(whitelistRef);
  } catch (err) {
    await deleteUser(credential.user).catch(() => undefined);
    handleFirestoreError(err, OperationType.GET, `whitelisted_teachers/${normalizedEmail}`);
  }

  if (!whitelistSnap || !whitelistSnap.exists()) {
    await deleteUser(credential.user).catch(() => undefined);
    throw new Error('Email belum didaftarkan oleh Wakasek Kurikulum SMKN 9 Bulukumba');
  }

  const teacherData = whitelistSnap.data();

  // Langkah 4: Update isRegistered: true beserta uid-nya di whitelisted_teachers dan whitelist_status
  const batch = writeBatch(db);
  batch.update(whitelistRef, {
    isRegistered: true,
    uid: credential.user.uid,
    updatedAt: serverTimestamp(),
  });
  batch.update(statusRef, {
    isRegistered: true,
    uid: credential.user.uid,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    await deleteUser(credential.user).catch(() => undefined);
    handleFirestoreError(err, OperationType.UPDATE, `whitelisted_teachers/${normalizedEmail}`);
  }

  // Langkah 5: Simpan profil user ke koleksi users/{uid}
  const profile: UserProfile = {
    uid: credential.user.uid,
    email: normalizedEmail,
    fullName: String(teacherData.fullName || 'Guru SMKN 9 Bulukumba').slice(0, 150),
    nip: String(teacherData.nip || '-').slice(0, 50),
    subject: String(teacherData.subject || '-').slice(0, 150),
    role: 'guru',
  };

  try {
    await setDoc(doc(db, 'users', credential.user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${credential.user.uid}`);
  }

  return {
    user: credential.user,
    role: 'guru',
    profile,
  };
}

export async function loginWithGoogle(): Promise<AuthResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedGoogleAccessToken(credential.accessToken);
    }
    const profile = await ensureUserProfile(result.user);
    return {
      user: result.user,
      role: profile.role,
      profile,
    };
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function connectGoogleWorkspace(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Anda harus masuk terlebih dahulu.');
  }

  const hasGoogleProvider = currentUser.providerData.some(
    (p) => p.providerId === 'google.com'
  );

  try {
    const result = hasGoogleProvider
      ? await reauthenticateWithPopup(currentUser, googleProvider)
      : await linkWithPopup(currentUser, googleProvider);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Drive dan Sheets.');
    }
    setCachedGoogleAccessToken(credential.accessToken);
    return credential.accessToken;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'auth/credential-already-in-use'
    ) {
      throw new Error(
        'Akun Google tersebut sudah tertaut dengan pengguna lain. Gunakan tombol Masuk dengan Google untuk akun tersebut.'
      );
    }
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function resolveAuthenticatedProfile(user: User): Promise<UserProfile> {
  return ensureUserProfile(user);
}

export async function logoutUser(): Promise<void> {
  setCachedGoogleAccessToken(null);
  await signOut(auth);
}

export function getGoogleAccessToken(): string | null {
  return getCachedGoogleAccessToken();
}
