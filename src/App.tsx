import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/core/auth/AuthContext';
import { AuthPage } from '@/src/core/auth/AuthPage';
import { ProtectedRoute } from '@/src/core/auth/ProtectedRoute';
import { LoadingScreen } from '@/src/core/layout/LoadingScreen';

// Route-Based Lazy Loading untuk modul terisolasi
const WakurModule = lazy(() => import('@/src/modules/wakur/WakurModule'));
const GuruModule = lazy(() => import('@/src/modules/guru/GuruModule'));

const RootRedirect: React.FC = () => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Memeriksa sesi autentikasi..." />;
  }

  if (!user || !role) {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to={role === 'wakur' ? '/wakur' : '/guru'} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/wakur/*"
              element={
                <ProtectedRoute allowedRole="wakur">
                  <WakurModule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guru/*"
              element={
                <ProtectedRoute allowedRole="guru">
                  <GuruModule />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
