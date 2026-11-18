import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { RoleGuard } from './components/auth/RoleGuard';
import { VendorOnboardModal } from './components/vendor/VendorOnboardModal';
import { VendorProductsView } from './components/vendor/VendorProductsView';
import { AdminApprovalsView } from './components/admin/AdminApprovalsView';
import { CheckCircle2, Store, ShoppingBag, ArrowRight } from 'lucide-react';

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('catalog');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isOnboardOpen, setIsOnboardOpen] = useState<boolean>(false);
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <VendorOnboardModal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        onSuccess={() => setActiveTab('vendor-dashboard')}
      />

      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        {/* CATALOG / HOME VIEW */}
        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/20 p-8 md:p-12 shadow-2xl">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-4">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Phase 4: Vendor Onboarding & Product CRUD Active
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
                  Multi-Vendor Marketplace Infrastructure
                </h1>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
                  Experience seamless multi-vendor commerce. Approved vendors can manage products, upload images, and control stock. Admins oversee store approvals and governance.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    <span>Switch Role / Test Accounts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {profile?.role === 'CUSTOMER' && !profile.vendor && (
                    <button
                      onClick={() => setIsOnboardOpen(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-xs transition"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Become a Vendor</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Navigation Cards */}
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
                <h3 className="font-bold text-white text-base mb-1">Customer Experience</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Browse verified merchant goods, manage cart, redeem promotional coupons, and place split orders.
                </p>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {profile?.role === 'CUSTOMER' ? '● Active Session' : 'Ready for Phase 5 Catalog'}
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
                <h3 className="font-bold text-white text-base mb-1">Vendor Store Management</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Add products, set stock & pricing, manage image galleries, and track store inventory.
                </p>
                <span className="text-[11px] font-semibold text-teal-400">
                  {profile?.role === 'VENDOR' ? '● Active Storefront' : 'Open Vendor Portal'}
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
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-1">Admin Approvals & Governance</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Review applicant stores, grant publishing privileges, and manage marketplace commissions.
                </p>
                <span className="text-[11px] font-semibold text-purple-400">
                  {profile?.role === 'ADMIN' ? '● Active Admin' : 'Open Approvals Portal'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VENDOR DASHBOARD / PRODUCTS VIEW */}
        {(activeTab === 'vendor-dashboard' || activeTab === 'vendor-products') && (
          <RoleGuard allowedRoles={['VENDOR', 'ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <VendorProductsView />
          </RoleGuard>
        )}

        {/* ADMIN DASHBOARD / APPROVALS VIEW */}
        {(activeTab === 'admin-dashboard' || activeTab === 'admin-approvals') && (
          <RoleGuard allowedRoles={['ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <AdminApprovalsView />
          </RoleGuard>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-6 text-center text-xs text-slate-500">
        UrbanBasket &bull; Multi-Vendor E-Commerce Platform &bull; Phase 4 Complete
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
