import React from 'react';
import { ShoppingBag, Store, ShieldCheck, User, LogOut, LogIn, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface NavbarProps {
  onOpenAuth: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeTab, setActiveTab }) => {
  const { profile, signOut } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white/90 backdrop-blur-md px-6 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-8">
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center space-x-3 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-[#171717] block leading-tight">
                UrbanBasket
              </span>
              <span className="block text-[10px] text-[#6b7280] tracking-wider uppercase font-medium">
                Marketplace
              </span>
            </div>
          </button>

          {/* Role-Aware Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#171717] text-white'
                  : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
              }`}
            >
              Catalog
            </button>

            {/* Customer view */}
            {(!profile || profile.role === 'CUSTOMER') && (
              <>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="px-3.5 py-1.5 rounded-full transition text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa] flex items-center space-x-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Cart</span>
                  {totalItems > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#171717] text-white text-[10px] font-mono">
                      {totalItems}
                    </span>
                  )}
                </button>
                {profile && (
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-[#171717] text-white'
                        : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                    }`}
                  >
                    My Orders
                  </button>
                )}
              </>
            )}

            {/* Vendor view */}
            {profile?.role === 'VENDOR' && (
              <>
                <button
                  onClick={() => setActiveTab('vendor-dashboard')}
                  className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                    activeTab === 'vendor-dashboard'
                      ? 'bg-[#171717] text-white'
                      : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                  }`}
                >
                  Vendor Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('vendor-products')}
                  className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                    activeTab === 'vendor-products'
                      ? 'bg-[#171717] text-white'
                      : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                  }`}
                >
                  My Products
                </button>
                <button
                  onClick={() => setActiveTab('vendor-orders')}
                  className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                    activeTab === 'vendor-orders'
                      ? 'bg-[#171717] text-white'
                      : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                  }`}
                >
                  Store Orders
                </button>
              </>
            )}

            {/* Admin view */}
            {profile?.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-[#171717] text-white'
                      : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('admin-approvals')}
                  className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                    activeTab === 'admin-approvals'
                      ? 'bg-[#171717] text-white'
                      : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                  }`}
                >
                  Governance
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User / Auth Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Quick Cart Pill on Mobile */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="md:hidden p-2 rounded-full text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa] relative border border-[#e5e7eb]"
          >
            <ShoppingCart className="w-4 h-4" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#171717] text-white text-[10px] font-mono">
                {totalItems}
              </span>
            )}
          </button>

          {profile ? (
            <div className="flex items-center space-x-3">
              {/* Role Badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#e5e7eb] bg-[#fafafa] text-[#171717]">
                {profile.role === 'ADMIN' && <ShieldCheck className="w-3 h-3 mr-1 text-[#6b7280]" />}
                {profile.role === 'VENDOR' && <Store className="w-3 h-3 mr-1 text-[#6b7280]" />}
                {profile.role === 'CUSTOMER' && <ShoppingBag className="w-3 h-3 mr-1 text-[#6b7280]" />}
                {profile.role}
              </span>

              {/* User display */}
              <div className="hidden sm:block text-right">
                <div className="text-xs font-medium text-[#171717]">{profile.name}</div>
                <div className="text-[10px] text-[#6b7280] truncate max-w-[140px]">{profile.email}</div>
              </div>

              {/* Switch / Change Account */}
              <button
                onClick={onOpenAuth}
                title="Switch role / account"
                className="p-2 rounded-full text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa] transition text-xs border border-[#e5e7eb]"
              >
                <User className="w-3.5 h-3.5" />
              </button>

              {/* Sign Out */}
              <button
                onClick={signOut}
                title="Sign out"
                className="p-2 rounded-full text-[#6b7280] hover:text-[#dc2626] hover:bg-rose-50 transition border border-[#e5e7eb]"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center space-x-1.5 px-4 h-9 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Demo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
