import React, { useState } from 'react';
import {
  CheckCircle2,
  GraduationCap,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/core/auth/AuthContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  roleLabel: string;
  navItems: NavItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  roleLabel,
  navItems,
  activeTab,
  onSelectTab,
  headerAction,
  children,
}) => {
  const { profile, googleAccessToken, connectGoogle, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const activeNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  const handleConnectGoogle = async () => {
    setConnectError(null);
    setIsConnectingGoogle(true);
    try {
      await connectGoogle();
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : 'Gagal menghubungkan akun Google.'
      );
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col justify-between bg-slate-900 text-slate-100">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src="https://i.ibb.co.com/KzNRm82R/icon-192x192.png"
                alt="Logo SIWAKUR SMKN 9 Bulukumba"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                SIWAKUR
              </p>
              <p className="truncate text-xs text-slate-400">SMKN 9 Bulukumba</p>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-4 pt-5 pb-2">
          <p className="px-2 text-xs font-semibold text-slate-400">{roleLabel}</p>
        </div>

        <nav className="space-y-1 px-3" aria-label="Navigasi Modul">
          {navItems.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 rounded-lg border border-slate-800 bg-slate-800/60 p-3">
          <p className="truncate text-sm font-semibold text-white">
            {profile?.fullName || 'Pengguna'}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{profile?.email}</p>
          {profile?.subject && (
            <p className="mt-1 truncate text-xs text-slate-300">{profile.subject}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white whitespace-nowrap"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{renderSidebarContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-50 w-72 max-w-[80vw]">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden font-medium text-slate-500 sm:inline whitespace-nowrap">
                {roleLabel}
              </span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-semibold text-slate-900">
                {activeNav?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {googleAccessToken ? (
              <div className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 sm:flex whitespace-nowrap shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Drive &amp; Sheets Terhubung</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <span>
                  {isConnectingGoogle ? 'Menghubungkan...' : 'Hubungkan Google Drive'}
                </span>
              </button>
            )}
            {headerAction}
          </div>
        </header>

        {connectError && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 sm:mx-6 lg:mx-8">
            {connectError}
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
