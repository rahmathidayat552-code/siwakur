import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  getCachedGoogleAccessToken,
  subscribeGoogleAccessToken,
} from '@/src/services/firebase/firebaseConfig';
import {
  connectGoogleWorkspace,
  loginUser,
  loginWithGoogle,
  logoutUser,
  registerTeacher,
  resolveAuthenticatedProfile,
} from '@/src/services/firebase/authService';
import { UserProfile, UserRole } from '@/src/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  googleAccessToken: string | null;
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<UserProfile>;
  activateTeacherAccount: (email: string, password: string) => Promise<UserProfile>;
  signInWithGoogle: () => Promise<UserProfile>;
  connectGoogle: () => Promise<string>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() =>
    getCachedGoogleAccessToken()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Prevents onAuthStateChanged from racing with multi-step registration/login flows
  const manualAuthFlowRef = useRef(false);

  useEffect(() => {
    const unsubToken = subscribeGoogleAccessToken((token) => {
      setGoogleAccessToken(token);
    });

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (manualAuthFlowRef.current) {
        return;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        const resolved = await resolveAuthenticatedProfile(firebaseUser);
        setUser(firebaseUser);
        setProfile(resolved);
        setAuthError(null);
      } catch (err) {
        setUser(null);
        setProfile(null);
        setAuthError(err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubToken();
      unsubAuth();
    };
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    manualAuthFlowRef.current = true;
    setAuthError(null);
    try {
      const res = await loginUser(email, password);
      setUser(res.user);
      setProfile(res.profile);
      return res.profile;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk.';
      setAuthError(msg);
      throw err;
    } finally {
      manualAuthFlowRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const activateTeacherAccount = useCallback(async (email: string, password: string) => {
    manualAuthFlowRef.current = true;
    setAuthError(null);
    try {
      const res = await registerTeacher(email, password);
      setUser(res.user);
      setProfile(res.profile);
      return res.profile;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengaktivasi akun.';
      setAuthError(msg);
      throw err;
    } finally {
      manualAuthFlowRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    manualAuthFlowRef.current = true;
    setAuthError(null);
    try {
      const res = await loginWithGoogle();
      setUser(res.user);
      setProfile(res.profile);
      setGoogleAccessToken(getCachedGoogleAccessToken());
      return res.profile;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      setAuthError(msg);
      throw err;
    } finally {
      manualAuthFlowRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const connectGoogle = useCallback(async () => {
    const token = await connectGoogleWorkspace();
    setGoogleAccessToken(token);
    return token;
  }, []);

  const signOut = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
    setGoogleAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        googleAccessToken,
        isLoading,
        authError,
        clearAuthError,
        signInWithEmail,
        activateTeacherAccount,
        signInWithGoogle,
        connectGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
