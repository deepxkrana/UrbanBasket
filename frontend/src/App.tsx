import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { RoleGuard } from './components/auth/RoleGuard';
import { VendorOnboardModal } from './components/vendor/VendorOnboardModal';
import { VendorProductsView } from './components/vendor/VendorProductsView';
import { AdminApprovalsView } from './components/admin/AdminApprovalsView';
import { AdminAnalyticsView } from './components/admin/AdminAnalyticsView';
import { CatalogView } from './components/catalog/CatalogView';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutModal } from './components/cart/CheckoutModal';
import { CustomerOrdersView } from './components/orders/CustomerOrdersView';
import { VendorOrdersView } from './components/vendor/VendorOrdersView';
import { ArrowRight, Store } from 'lucide-react';

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('catalog');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isOnboardOpen, setIsOnboardOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717] flex flex-col justify-between selection:bg-[#171717] selection:text-white">
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

      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full space-y-12">
        {/* HERO BANNER (Shown across Catalog) */}
        {activeTab === 'catalog' && (
          <div className="relative overflow-hidden rounded-2xl bg-white border border-[#e5e7eb] p-8 md:p-12 shadow-xs">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-xs font-medium text-[#171717] mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#171717]"></span>
                <span>Multi-Vendor Commerce Platform</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-normal tracking-tighter text-[#171717] leading-[1.12] mb-4">
                Curated goods, directly from independent merchants.
              </h1>
              <p className="text-[#6b7280] text-sm md:text-base leading-relaxed mb-8 max-w-2xl">
                Atomic multitenant ordering, split merchant payouts, verified buyer reviews, and real-time ledger auditing built on modern infrastructure.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 h-10 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs"
                >
                  <span>Switch Role / Test Accounts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {profile?.role === 'CUSTOMER' && !profile.vendor && (
                  <button
                    onClick={() => setIsOnboardOpen(true)}
                    className="inline-flex items-center space-x-2 px-5 h-10 rounded-full bg-white hover:bg-[#fafafa] text-[#171717] border border-[#e5e7eb] font-medium text-xs transition"
                  >
                    <Store className="w-3.5 h-3.5 text-[#6b7280]" />
                    <span>Become a Merchant</span>
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

        {/* ADMIN ANALYTICS DASHBOARD */}
        {activeTab === 'admin-dashboard' && (
          <RoleGuard allowedRoles={['ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <AdminAnalyticsView />
          </RoleGuard>
        )}

        {/* ADMIN GOVERNANCE & APPROVALS VIEW */}
        {activeTab === 'admin-approvals' && (
          <RoleGuard allowedRoles={['ADMIN']} onOpenAuth={() => setIsAuthOpen(true)}>
            <AdminApprovalsView />
          </RoleGuard>
        )}
      </main>

      <footer className="border-t border-[#e5e7eb] bg-white px-6 py-6 text-xs text-[#6b7280]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#171717]">UrbanBasket</span>
            <span>&bull;</span>
            <span>Multi-Vendor Marketplace</span>
          </div>
          <div className="text-[#9ca3af]">
            Atomic Transactions &bull; Neon Auth &bull; Real-Time Analytics
          </div>
        </div>
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
