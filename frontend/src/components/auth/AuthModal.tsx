import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ShieldCheck, Store, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail, signInWithOAuth, switchDemoRole } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      if (isRegister) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'vendor' | 'customer') => {
    setLoading(true);
    setAuthError(null);
    try {
      await switchDemoRole(role);
      onClose();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Demo switch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-xl text-[#171717]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-[#6b7280] hover:text-[#171717] rounded-full hover:bg-[#fafafa] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-[#171717]">
            {isRegister ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-[#6b7280] mt-1">
            {isRegister
              ? 'Join UrbanBasket as a customer to browse and purchase'
              : 'Sign in with your email or social accounts'}
          </p>
        </div>

        {/* 1-Click Demo Evaluation Roles */}
        <div className="mb-6 p-3 rounded-lg bg-[#fafafa] border border-[#e5e7eb]">
          <span className="text-[10px] font-medium tracking-wider text-[#6b7280] uppercase block text-center mb-2">
            1-Click Quick Demo Evaluation
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('customer')}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-[#e5e7eb] hover:border-[#171717] transition text-xs cursor-pointer shadow-xs group"
            >
              <ShoppingBag className="w-4 h-4 text-[#6b7280] group-hover:text-[#171717] mb-1" />
              <span className="text-[11px] font-medium text-[#171717]">Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('vendor')}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-[#e5e7eb] hover:border-[#171717] transition text-xs cursor-pointer shadow-xs group"
            >
              <Store className="w-4 h-4 text-[#6b7280] group-hover:text-[#171717] mb-1" />
              <span className="text-[11px] font-medium text-[#171717]">Vendor</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-[#e5e7eb] hover:border-[#171717] transition text-xs cursor-pointer shadow-xs group"
            >
              <ShieldCheck className="w-4 h-4 text-[#6b7280] group-hover:text-[#171717] mb-1" />
              <span className="text-[11px] font-medium text-[#171717]">Admin</span>
            </button>
          </div>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-[#9ca3af]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e7eb] rounded-full text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#9ca3af]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e7eb] rounded-full text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#9ca3af]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e7eb] rounded-full text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* OAuth Buttons */}
        <div className="mt-5 pt-5 border-t border-[#e5e7eb]">
          <button
            type="button"
            onClick={() => signInWithOAuth('google')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border border-[#e5e7eb] bg-white hover:bg-[#fafafa] text-xs font-medium text-[#171717] transition text-center shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setAuthError(null);
            }}
            className="text-xs text-[#6b7280] hover:text-[#171717] transition cursor-pointer font-medium"
          >
            {isRegister
              ? 'Already have an account? Sign In'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
