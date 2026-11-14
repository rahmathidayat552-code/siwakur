import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, FolderKanban, GraduationCap, KeyRound, Lock, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';

type AuthTab = 'login' | 'activate';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    role,
    authError,
    clearAuthError,
    signInWithEmail,
    activateTeacherAccount,
    signInWithGoogle,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (user && role) {
      navigate(role === 'wakur' ? '/wakur' : '/guru', { replace: true });
    }
  }, [user, role, navigate]);

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setLocalError(null);
    clearAuthError();
    setPassword('');
    setConfirmPassword('');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim()) {
      setLocalError('Alamat email wajib diisi.');
      return;
    }
    if (!password) {
      setLocalError('Kata sandi wajib diisi.');
      return;
    }

    if (activeTab === 'activate') {
      if (password.length < 6) {
        setLocalError('Kata sandi baru minimal harus 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Konfirmasi kata sandi tidak cocok.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const profile =
        activeTab === 'login'
          ? await signInWithEmail(email, password)
          : await activateTeacherAccount(email, password);
      navigate(profile.role === 'wakur' ? '/wakur' : '/guru', { replace: true });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Proses autentikasi gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    try {
      const profile = await signInWithGoogle();
      navigate(profile.role === 'wakur' ? '/wakur' : '/guru', { replace: true });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Gagal masuk dengan Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-stretch lg:grid-cols-12">
        {/* Left Institutional Showcase Panel */}
        <section className="flex flex-col justify-between border-b border-slate-200 bg-slate-900 p-8 text-white lg:col-span-6 lg:border-b-0 lg:border-r lg:p-12">
          <div>
            <div className="flex items-center gap-3">
              {!logoError ? (
                <img
                  src="https://i.ibb.co.com/KzNRm82R/icon-192x192.png"
                  alt="Logo SIWAKUR SMKN 9 Bulukumba"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-0.5"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">SIWAKUR</h1>
                <p className="text-xs text-slate-300">SMKN 9 Bulukumba</p>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-white text-balance sm:text-3xl">
                Sistem Informasi Wakil Kurikulum &amp; Pengumpulan Perangkat Ajar
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300">
                Portal terintegrasi untuk administrasi kurikulum SMKN 9 Bulukumba. Kelola tugas perangkat ajar, arsip otomatis Google Drive, verifikasi dokumen guru, dan ekspor rekap langsung ke Google Sheets.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-800 pt-6 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
              <div>
                <p className="text-xs font-semibold text-white">Folder Otomatis Google Drive</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Penamaan file terstruktur per tugas, nama guru, dan mapel.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
              <div>
                <p className="text-xs font-semibold text-white">Verifikasi &amp; Whitelist Terkontrol</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Hanya guru terdaftar SMKN 9 Bulukumba yang dapat mengaktivasi akun.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Authentication Form Panel */}
        <section className="flex flex-col justify-center bg-white p-6 sm:p-10 lg:col-span-6 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-wide text-teal-700">
                SIWAKUR · SMKN 9 BULUKUMBA
              </p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                {activeTab === 'login' ? 'Masuk ke Portal Kurikulum' : 'Aktivasi Akun Guru'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                {activeTab === 'login'
                  ? 'Gunakan akun Google atau email yang telah diaktivasi.'
                  : 'Masukkan email yang telah didaftarkan oleh Wakasek Kurikulum dan buat kata sandi baru.'}
              </p>
            </div>

            {/* 2 Tabs: Masuk (Login) & Aktivasi Akun Guru */}
            <div
              className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
              role="tablist"
              aria-label="Mode Autentikasi"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'login'}
                onClick={() => handleTabChange('login')}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk (Login)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'activate'}
                onClick={() => handleTabChange('activate')}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'activate'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktivasi Akun Guru
              </button>
            </div>

            {displayedError && (
              <div
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span className="leading-snug">{displayedError}</span>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Alamat Email Sekolah / Pribadi
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@guru.smk.belajar.id"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  {activeTab === 'login' ? 'Kata Sandi' : 'Kata Sandi Baru'}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      activeTab === 'login' ? 'Masukkan kata sandi' : 'Minimal 6 karakter'
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {activeTab === 'activate' && (
                <div>
                  <label
                    htmlFor="auth-confirm-password"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Memproses...'
                  : activeTab === 'login'
                  ? 'Masuk dengan Email'
                  : 'Aktivasi Akun Guru'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-500">atau masuk cepat &amp; hubungkan Drive</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google</span>
              </div>
            </button>

            <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
              SMKN 9 Bulukumba · Sistem Informasi Wakil Kurikulum. Jika email Anda belum terdaftar, hubungi Wakasek Kurikulum untuk pendaftaran whitelist.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
