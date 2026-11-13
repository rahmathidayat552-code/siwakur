import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
] as const;

export const SCHOOL_ID = 'smkn9-bulukumba' as const;

export const WAKUR_EMAIL = (
  import.meta.env.VITE_WAKUR_EMAIL || 'rahmathidayat552@guru.smk.belajar.id'
)
  .trim()
  .toLowerCase();

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory Google OAuth access token cache (never persisted to localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

export function setCachedGoogleAccessToken(token: string | null): void {
  cachedAccessToken = token;
  tokenListeners.forEach((listener) => listener(cachedAccessToken));
}

export function getCachedGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function subscribeGoogleAccessToken(listener: (token: string | null) => void): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

// Clear in-memory token automatically on sign-out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    setCachedGoogleAccessToken(null);
  }
});

// Validate Firestore connection on initial boot
async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Koneksi ke Cloud Firestore gagal. Periksa konfigurasi Firebase.');
    }
  }
}

void testConnection();
