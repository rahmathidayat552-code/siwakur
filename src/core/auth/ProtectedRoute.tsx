import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoadingScreen } from '@/src/core/layout/LoadingScreen';
import { UserRole } from '@/src/types';

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole, children }) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Memverifikasi sesi SIWAKUR..." />;
  }

  if (!user || !role) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to={role === 'wakur' ? '/wakur' : '/guru'} replace />;
  }

  return <>{children}</>;
};
