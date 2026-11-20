import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

interface CartDrawerProps {
  onOpenCheckout: () => void;
  onOpenAuth: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout, onOpenAuth }) => {
  const {
    items,
    totalItems,
    subtotal,
    discount,
    finalTotal,
    appliedCoupon,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const { profile } = useAuth();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : 'Coupon could not be applied');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleProceed = () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setIsCartOpen(false);
    onOpenCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#e5e7eb] text-[#171717] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#171717]">Your Shopping Cart</h2>
                <p className="text-xs text-[#6b7280]">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} ready for checkout
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[#6b7280] hover:text-[#171717] rounded-full hover:bg-[#fafafa] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {items.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-[#9ca3af] mx-auto" />
                <h3 className="text-sm font-semibold text-[#171717]">Your Cart is Empty</h3>
                <p className="text-xs text-[#6b7280] max-w-xs mx-auto">
                  Explore verified merchant products in the catalog and add items to your cart.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3.5 rounded-lg bg-[#fafafa] border border-[#e5e7eb] flex items-center space-x-3 shadow-xs"
                >
                  <div className="w-16 h-16 rounded-md bg-white border border-[#e5e7eb] overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9ca3af] text-xs">
                        Item
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-[#6b7280] font-medium uppercase tracking-wider block truncate">
                      {item.vendor.storeName}
                    </span>
                    <h4 className="text-xs font-medium text-[#171717] truncate mb-0.5">{item.name}</h4>
                    <div className="text-xs font-semibold font-mono text-[#171717] mb-2">
                      ${item.price.toFixed(2)}
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center rounded-full border border-[#e5e7eb] bg-white p-0.5 text-xs">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[#6b7280] hover:text-[#171717] disabled:opacity-30 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-medium font-mono text-xs text-[#171717]">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[#6b7280] hover:text-[#171717] disabled:opacity-30 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-[#9ca3af] hover:text-[#dc2626] transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-semibold font-mono text-[#171717]">
                      ${item.itemSubtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Summary */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#e5e7eb] bg-white space-y-4">
              {/* Coupon Form */}
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="p-2.5 rounded-lg bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-between text-xs text-[#171717]">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#171717]" />
                      <span>
                        Coupon <span className="font-mono font-semibold">{appliedCoupon.code}</span> applied: -$
                        {appliedCoupon.discountAmount.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs text-[#6b7280] hover:text-[#dc2626] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#9ca3af]" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon (e.g. WELCOME10)"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#e5e7eb] rounded-full text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 py-2 bg-[#171717] hover:bg-black text-xs font-medium text-white rounded-full transition disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      Apply
                    </button>
                  </form>
                )}

                {couponError && (
                  <div className="text-[11px] text-[#dc2626] flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-1.5 text-xs text-[#6b7280] pt-2 border-t border-[#e5e7eb]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#171717]">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#171717]">
                    <span>Discount</span>
                    <span className="font-mono">-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-[#171717] pt-2 border-t border-[#e5e7eb]">
                  <span>Total Amount</span>
                  <span className="font-mono text-[#171717] text-base">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleProceed}
                className="w-full py-3 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{profile ? 'Proceed to Checkout' : 'Sign In to Checkout'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
