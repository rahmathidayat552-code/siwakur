import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Memuat modul SIWAKUR SMKN 9 Bulukumba...',
}) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
        <p className="text-sm font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
};
