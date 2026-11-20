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
    <div className="sticky top-0 z-40">
      {/* Top Announcement Bar */}
      <div className="bg-[#171717] text-white text-[11px] py-1.5 px-6 font-normal tracking-wide">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="hidden sm:block text-neutral-400">
            Handcrafted goods & electronics from verified independent merchants
          </div>
          <div className="mx-auto sm:mx-0 font-medium text-white">
            Free shipping on orders over $75 &bull; 30-day returns
          </div>
          <button
            onClick={onOpenAuth}
            className="text-[10px] text-neutral-400 hover:text-white underline underline-offset-2 transition cursor-pointer hidden md:block"
          >
            Demo Accounts
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="border-b border-[#e5e7eb] bg-white/95 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => setActiveTab('catalog')}
              className="flex items-center space-x-2.5 text-left focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-[#171717] block leading-tight">
                  UrbanBasket
                </span>
                <span className="block text-[10px] text-[#6b7280] tracking-wider uppercase font-medium">
                  Store
                </span>
              </div>
            </button>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 text-xs font-medium">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-[#171717] text-white'
                    : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                }`}
              >
                Shop All
              </button>

              {/* Customer view */}
              {(!profile || profile.role === 'CUSTOMER') && profile && (
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
                    Merchant Hub
                  </button>
                  <button
                    onClick={() => setActiveTab('vendor-products')}
                    className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                      activeTab === 'vendor-products'
                        ? 'bg-[#171717] text-white'
                        : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                    }`}
                  >
                    Inventory
                  </button>
                  <button
                    onClick={() => setActiveTab('vendor-orders')}
                    className={`px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                      activeTab === 'vendor-orders'
                        ? 'bg-[#171717] text-white'
                        : 'text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa]'
                    }`}
                  >
                    Fulfillment
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

          {/* User / Cart Actions */}
          <div className="flex items-center space-x-3">
            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-[#e5e7eb] bg-white hover:bg-[#fafafa] text-xs font-medium text-[#171717] transition cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#6b7280]" />
              <span className="hidden sm:inline">Bag</span>
              {totalItems > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#171717] text-white text-[10px] font-mono font-medium">
                  {totalItems}
                </span>
              )}
            </button>

            {profile ? (
              <div className="flex items-center space-x-2.5">
                {/* Role indicator badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-[#e5e7eb] bg-[#fafafa] text-[#171717]">
                  {profile.role === 'ADMIN' && <ShieldCheck className="w-3 h-3 mr-1 text-[#6b7280]" />}
                  {profile.role === 'VENDOR' && <Store className="w-3 h-3 mr-1 text-[#6b7280]" />}
                  {profile.role === 'CUSTOMER' && <ShoppingBag className="w-3 h-3 mr-1 text-[#6b7280]" />}
                  {profile.role}
                </span>

                {/* Name */}
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-medium text-[#171717]">{profile.name}</div>
                </div>

                {/* Account modal trigger */}
                <button
                  onClick={onOpenAuth}
                  title="Account Settings"
                  className="p-2 rounded-full text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa] transition text-xs border border-[#e5e7eb] cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                </button>

                {/* Sign Out */}
                <button
                  onClick={signOut}
                  title="Sign out"
                  className="p-2 rounded-full text-[#6b7280] hover:text-[#dc2626] hover:bg-rose-50 transition border border-[#e5e7eb] cursor-pointer"
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
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};
