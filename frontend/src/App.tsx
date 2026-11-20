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
import { ArrowRight, Store, Truck, ShieldCheck, RefreshCw, Lock, ShoppingBag } from 'lucide-react';

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('catalog');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isOnboardOpen, setIsOnboardOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const { profile } = useAuth();

  const scrollToCatalog = () => {
    setActiveTab('catalog');
    const el = document.getElementById('catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl bg-white border border-[#e5e7eb] p-8 md:p-14 shadow-xs">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-xs font-medium text-[#171717] mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#171717]"></span>
                  <span>Handcrafted & Curated Essentials</span>
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-normal tracking-tighter text-[#171717] leading-[1.08] mb-5">
                  Thoughtfully designed for everyday living.
                </h1>
                <p className="text-[#6b7280] text-sm md:text-base leading-relaxed mb-8 max-w-2xl">
                  Discover verified independent merchants, artisanal homeware, acoustic audio gear, and contemporary lifestyle collections delivered directly to you.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={scrollToCatalog}
                    className="inline-flex items-center space-x-2 px-6 h-10 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs cursor-pointer"
                  >
                    <span>Shop All Products</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {(!profile || (profile.role === 'CUSTOMER' && !profile.vendor)) && (
                    <button
                      onClick={() => (profile ? setIsOnboardOpen(true) : setIsAuthOpen(true))}
                      className="inline-flex items-center space-x-2 px-5 h-10 rounded-full bg-white hover:bg-[#fafafa] text-[#171717] border border-[#e5e7eb] font-medium text-xs transition cursor-pointer"
                    >
                      <Store className="w-3.5 h-3.5 text-[#6b7280]" />
                      <span>Sell on UrbanBasket</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Value Proposition & Trust Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white border border-[#e5e7eb] shadow-xs flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center text-[#171717] flex-shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#171717]">Free Shipping</h4>
                  <p className="text-[11px] text-[#6b7280]">On all orders over $75</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white border border-[#e5e7eb] shadow-xs flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center text-[#171717] flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#171717]">Verified Merchants</h4>
                  <p className="text-[11px] text-[#6b7280]">100% vetted sellers</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white border border-[#e5e7eb] shadow-xs flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center text-[#171717] flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#171717]">Secure Payments</h4>
                  <p className="text-[11px] text-[#6b7280]">Encrypted transactions</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white border border-[#e5e7eb] shadow-xs flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center text-[#171717] flex-shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#171717]">30-Day Returns</h4>
                  <p className="text-[11px] text-[#6b7280]">Hassle-free guarantee</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div id="catalog-section">
            <CatalogView />
          </div>
        )}

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

      {/* Real Multi-Column E-Commerce Footer */}
      <footer className="border-t border-[#e5e7eb] bg-white pt-12 pb-8 text-xs text-[#6b7280]">
        <div className="max-w-6xl mx-auto px-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md bg-[#171717] flex items-center justify-center text-white">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sm text-[#171717]">UrbanBasket</span>
              </div>
              <p className="text-xs text-[#6b7280] leading-relaxed">
                A modern multi-vendor marketplace connecting discerning shoppers with verified makers, independent brands, and artisan merchants.
              </p>
            </div>

            {/* Col 2 */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">Shop & Explore</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setActiveTab('catalog')} className="hover:text-[#171717] transition cursor-pointer">All Products</button></li>
                <li><button onClick={() => setActiveTab('catalog')} className="hover:text-[#171717] transition cursor-pointer">Electronics & Audio</button></li>
                <li><button onClick={() => setActiveTab('catalog')} className="hover:text-[#171717] transition cursor-pointer">Home & Living</button></li>
                <li><button onClick={() => setActiveTab('catalog')} className="hover:text-[#171717] transition cursor-pointer">Featured Merchants</button></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">Customer Care</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="hover:text-[#171717] cursor-pointer">Shipping & Delivery</span></li>
                <li><span className="hover:text-[#171717] cursor-pointer">30-Day Returns Policy</span></li>
                <li><button onClick={() => setActiveTab('orders')} className="hover:text-[#171717] transition cursor-pointer">Track My Order</button></li>
                <li><span className="hover:text-[#171717] cursor-pointer">Help & FAQs</span></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">Merchant Program</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => (profile ? setIsOnboardOpen(true) : setIsAuthOpen(true))}
                    className="hover:text-[#171717] transition cursor-pointer"
                  >
                    Sell on UrbanBasket
                  </button>
                </li>
                <li><span className="hover:text-[#171717] cursor-pointer">Merchant Standards</span></li>
                <li><span className="hover:text-[#171717] cursor-pointer">Payouts & Commission (10%)</span></li>
                <li><button onClick={() => setIsAuthOpen(true)} className="hover:text-[#171717] transition cursor-pointer">Demo Login</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#e5e7eb] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#9ca3af]">
            <div>
              &copy; {new Date().getFullYear()} UrbanBasket Marketplace Inc. All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
              <span className="hover:text-[#6b7280] cursor-pointer">Privacy Policy</span>
              <span>&bull;</span>
              <span className="hover:text-[#6b7280] cursor-pointer">Terms of Service</span>
              <span>&bull;</span>
              <span className="hover:text-[#6b7280] cursor-pointer">Cookie Preferences</span>
            </div>
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
