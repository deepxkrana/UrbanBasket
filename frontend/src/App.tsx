import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { RoleGuard } from './components/auth/RoleGuard';
import { CheckCircle2, ShieldCheck, Store, ShoppingBag, ArrowRight } from 'lucide-react';

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('catalog');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        {/* CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/20 p-8 md:p-12 shadow-2xl">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-4">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Phase 3: Auth & RBAC Active
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
                  Multi-Vendor Marketplace Infrastructure
                </h1>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
                  Experience seamless role-based authentication powered by Supabase Auth and Express RBAC guards. Switch between Customer, Vendor, and Admin roles instantly.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    <span>Switch Role / Test Accounts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Role Demo Status Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setActiveTab('catalog')}
                className={`p-6 rounded-2xl border transition cursor-pointer ${
                  profile?.role === 'CUSTOMER'
                    ? 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-1">Customer Role</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Can browse products, manage cart items, apply discount coupons, and complete test-mode checkout.
                </p>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {profile?.role === 'CUSTOMER' ? '● Active Session' : 'Click to preview'}
                </span>
              </div>

              <div
                onClick={() => setActiveTab('vendor-dashboard')}
                className={`p-6 rounded-2xl border transition cursor-pointer ${
                  profile?.role === 'VENDOR'
                    ? 'bg-slate-900 border-teal-500/50 shadow-lg shadow-teal-500/5'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-1">Vendor Role</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Manage store profile, add and publish inventory, manage product galleries, and fulfill store orders.
                </p>
                <span className="text-[11px] font-semibold text-teal-400">
                  {profile?.role === 'VENDOR' ? '● Active Session' : 'Requires Vendor Access'}
                </span>
              </div>

              <div
                onClick={() => setActiveTab('admin-dashboard')}
                className={`p-6 rounded-2xl border transition cursor-pointer ${
                  profile?.role === 'ADMIN'
                    ? 'bg-slate-900 border-purple-500/50 shadow-lg shadow-purple-500/5'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-1">Admin Role</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Approve/reject vendor registrations, moderate customer reviews, manage coupon rules, and view platform metrics.
                </p>
                <span className="text-[11px] font-semibold text-purple-400">
                  {profile?.role === 'ADMIN' ? '● Active Session' : 'Requires Admin Access'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VENDOR DASHBOARD VIEW (Protected) */}
        {activeTab === 'vendor-dashboard' && (
          <RoleGuard allowedRoles={['VENDOR', 'ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-2xl bg-slate-900 border border-teal-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Vendor Portal</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Store:{' '}
                      <span className="text-teal-400 font-semibold">
                        {profile?.vendor?.storeName || 'TechNest Electronics'}
                      </span>{' '}
                      &bull; Status:{' '}
                      <span className="text-emerald-400 font-medium">
                        {profile?.vendor?.status || 'APPROVED'}
                      </span>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    Vendor Verified
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Ready for Phase 4: Vendor Onboarding and Product CRUD workflows.
                </p>
              </div>
            </div>
          </RoleGuard>
        )}

        {/* ADMIN DASHBOARD VIEW (Protected) */}
        {activeTab === 'admin-dashboard' && (
          <RoleGuard allowedRoles={['ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-2xl bg-slate-900 border border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Administrator Portal</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Platform Governance & Vendor Approvals
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Admin Authority
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Protected by Express `requireAdmin` middleware. Customers and standard vendors cannot access these endpoints.
                </p>
              </div>
            </div>
          </RoleGuard>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-6 text-center text-xs text-slate-500">
        UrbanBasket &bull; Multi-Vendor E-Commerce Platform &bull; Phase 3 Complete
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainView />
    </AuthProvider>
  );
};

export default App;
