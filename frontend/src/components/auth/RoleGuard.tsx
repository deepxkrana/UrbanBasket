import React from 'react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { ShieldAlert, LogIn } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onOpenAuth?: () => void;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, onOpenAuth }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-3"></div>
        Checking role authorization...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center mb-4">
          <LogIn className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Authentication Required</h3>
        <p className="text-xs text-slate-400 mb-6">
          You must be logged in to view this section. Please sign in or use one of the 1-click evaluation accounts.
        </p>
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition"
          >
            Sign In / Switch Role
          </button>
        )}
      </div>
    );
  }

  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-red-500/20 rounded-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Access Denied (403 Forbidden)</h3>
        <p className="text-xs text-slate-400 mb-2">
          Your current account role is <span className="font-semibold text-slate-200">[{profile.role}]</span>.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          This area requires one of the following permissions:{' '}
          <span className="font-medium text-emerald-400">{allowedRoles.join(', ')}</span>.
        </p>
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
          >
            Switch to an Authorized Demo Account
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
