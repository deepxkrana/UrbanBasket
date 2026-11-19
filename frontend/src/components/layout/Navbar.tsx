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
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center space-x-3 text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                UrbanBasket
              </span>
              <span className="block text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase font-medium">
                Multi-Vendor
              </span>
            </div>
          </button>

          {/* Role-Aware Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'catalog'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Catalog
            </button>

            {/* Customer view */}
            {(!profile || profile.role === 'CUSTOMER') && (
              <>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="px-3 py-1.5 rounded-lg transition text-slate-400 hover:text-white hover:bg-slate-900 flex items-center space-x-1.5"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Cart</span>
                  {totalItems > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold">
                      {totalItems}
                    </span>
                  )}
                </button>
                {profile && (
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === 'orders'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
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
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'vendor-dashboard'
                      ? 'bg-slate-800 text-teal-400'
                      : 'text-slate-400 hover:text-teal-300 hover:bg-slate-900'
                  }`}
                >
                  Vendor Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('vendor-products')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'vendor-products'
                      ? 'bg-slate-800 text-teal-400'
                      : 'text-slate-400 hover:text-teal-300 hover:bg-slate-900'
                  }`}
                >
                  My Products
                </button>
                <button
                  onClick={() => setActiveTab('vendor-orders')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'vendor-orders'
                      ? 'bg-slate-800 text-teal-400'
                      : 'text-slate-400 hover:text-teal-300 hover:bg-slate-900'
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
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-slate-800 text-purple-400'
                      : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
                  }`}
                >
                  Admin Portal
                </button>
                <button
                  onClick={() => setActiveTab('admin-approvals')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'admin-approvals'
                      ? 'bg-slate-800 text-purple-400'
                      : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
                  }`}
                >
                  Vendor Approvals
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
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold">
                {totalItems}
              </span>
            )}
          </button>

          {profile ? (
            <div className="flex items-center space-x-3">
              {/* Role Badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  profile.role === 'ADMIN'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : profile.role === 'VENDOR'
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {profile.role === 'ADMIN' && <ShieldCheck className="w-3 h-3 mr-1" />}
                {profile.role === 'VENDOR' && <Store className="w-3 h-3 mr-1" />}
                {profile.role === 'CUSTOMER' && <ShoppingBag className="w-3 h-3 mr-1" />}
                {profile.role}
              </span>

              {/* User display */}
              <div className="hidden sm:block text-right">
                <div className="text-xs font-medium text-slate-200">{profile.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{profile.email}</div>
              </div>

              {/* Switch / Change Account */}
              <button
                onClick={onOpenAuth}
                title="Switch role / account"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center"
              >
                <User className="w-4 h-4" />
              </button>

              {/* Sign Out */}
              <button
                onClick={signOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-500/20"
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
