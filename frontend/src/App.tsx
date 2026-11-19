import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { RoleGuard } from './components/auth/RoleGuard';
import { VendorOnboardModal } from './components/vendor/VendorOnboardModal';
import { VendorProductsView } from './components/vendor/VendorProductsView';
import { AdminApprovalsView } from './components/admin/AdminApprovalsView';
import { CatalogView } from './components/catalog/CatalogView';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutModal } from './components/cart/CheckoutModal';
import { CustomerOrdersView } from './components/orders/CustomerOrdersView';
import { VendorOrdersView } from './components/vendor/VendorOrdersView';
import { CheckCircle2, Store, ArrowRight } from 'lucide-react';

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('catalog');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isOnboardOpen, setIsOnboardOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
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

      <CartDrawer
        onOpenCheckout={() => setIsCheckoutOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(orderId) => {
          console.log('Order placed successfully:', orderId);
        }}
      />

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* HERO BANNER (Shown across Catalog) */}
        {activeTab === 'catalog' && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/20 p-8 md:p-10 shadow-2xl">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Phase 7: Payments, Webhooks & Order Lifecycle Active
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
                Shop Verified Multi-Vendor Goods
              </h1>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed mb-6">
                Atomic checkout with test Stripe / Razorpay payments, signed webhooks, split commission payouts, and step-by-step merchant order fulfillment.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  <span>Switch Role / Test Accounts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {profile?.role === 'CUSTOMER' && !profile.vendor && (
                  <button
                    onClick={() => setIsOnboardOpen(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-xs transition"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Become a Vendor</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CATALOG VIEW */}
        {activeTab === 'catalog' && <CatalogView />}

        {/* CUSTOMER ORDERS VIEW */}
        {activeTab === 'orders' && (
          <RoleGuard allowedRoles={['CUSTOMER', 'VENDOR', 'ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <CustomerOrdersView />
          </RoleGuard>
        )}

        {/* VENDOR DASHBOARD / PRODUCTS VIEW */}
        {(activeTab === 'vendor-dashboard' || activeTab === 'vendor-products') && (
          <RoleGuard allowedRoles={['VENDOR', 'ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <VendorProductsView />
          </RoleGuard>
        )}

        {/* VENDOR ORDERS FULFILLMENT VIEW */}
        {activeTab === 'vendor-orders' && (
          <RoleGuard allowedRoles={['VENDOR', 'ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <VendorOrdersView />
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
        UrbanBasket &bull; Multi-Vendor E-Commerce Platform &bull; Phase 7 Payments & Order Lifecycle Complete
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <MainView />
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
