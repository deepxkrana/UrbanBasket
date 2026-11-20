import React, { useState, useEffect } from 'react';
import { X, MapPin, CheckCircle2, ShieldCheck, Plus, Sparkles, Store, ShoppingBag, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface OrderConfirmation {
  orderId: string;
  status: string;
  total: number;
  itemsCount: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { token, profile } = useAuth();
  const { items, subtotal, discount, finalTotal, appliedCoupon, refreshCart } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // New address form state
  const [addrName, setAddrName] = useState(profile?.name || '');
  const [addrPhone, setAddrPhone] = useState('+91 98765 43210');
  const [addrLine1, setAddrLine1] = useState('Flat 402, Green Meadows');
  const [addrCity, setAddrCity] = useState('Bengaluru');
  const [addrState, setAddrState] = useState('Karnataka');
  const [addrPostalCode, setAddrPostalCode] = useState('560038');

  const [loading, setLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  useEffect(() => {
    if (isOpen && token) {
      fetchAddresses();
      setConfirmation(null);
      setPaymentSuccess(false);
      setError(null);
    }
  }, [isOpen, token]);

  const handleSimulatePayment = async () => {
    if (!confirmation) return;
    setPaymentProcessing(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: confirmation.orderId,
          status: 'COMPLETED',
          providerPaymentId: `test_pay_${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Payment simulation failed');
      }
      setPaymentSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing test payment');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setAddresses(json.data);
        const def = json.data.find((a: Address) => a.isDefault) || json.data[0];
        setSelectedAddressId(def.id);
      } else {
        setIsAddingAddress(true);
      }
    } catch (err) {
      console.warn('Failed to load addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: addrName,
          phone: addrPhone,
          line1: addrLine1,
          city: addrCity,
          state: addrState,
          postalCode: addrPostalCode,
          isDefault: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to save address');
      }
      setIsAddingAddress(false);
      await fetchAddresses();
      setSelectedAddressId(json.data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating address');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select or add a delivery address.');
      return;
    }

    setOrderSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${getApiUrl()}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          couponCode: appliedCoupon?.code,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Checkout failed');
      }

      setConfirmation({
        orderId: json.data.orderId,
        status: json.data.status,
        total: json.data.total,
        itemsCount: json.data.itemsCount,
      });

      await refreshCart();
      onOrderSuccess(json.data.orderId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-xl text-[#171717] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6b7280] hover:text-[#171717] rounded-full hover:bg-[#fafafa] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {confirmation ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-[#fafafa] border border-[#e5e7eb] text-[#171717]">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-semibold text-[#171717]">
              {paymentSuccess ? 'Payment Confirmed & Settled' : 'Order Placed (Payment Pending)'}
            </h2>

            <div className="p-4 rounded-lg bg-[#fafafa] border border-[#e5e7eb] max-w-md mx-auto text-left space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Order Reference:</span>
                <span className="text-[#171717] font-semibold">{confirmation.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Lifecycle Status:</span>
                <span className="text-[#171717] uppercase font-semibold">{confirmation.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Payment Status:</span>
                <span className={`font-semibold ${paymentSuccess ? 'text-[#171717]' : 'text-amber-600'}`}>
                  {paymentSuccess ? 'COMPLETED (PAID)' : 'PENDING SETTLEMENT'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Total Items:</span>
                <span className="text-[#171717]">{confirmation.itemsCount}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#e5e7eb] font-semibold text-sm">
                <span className="text-[#6b7280] font-sans">Total Amount:</span>
                <span className="text-[#171717]">${confirmation.total.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <p className="text-xs text-[#dc2626] max-w-sm mx-auto">{error}</p>
            )}

            {!paymentSuccess ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                  Simulate instant test payment with Stripe / Razorpay webhook to decrement stock and initialize vendor commission payouts.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={paymentProcessing}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs uppercase tracking-wider transition shadow-xs cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{paymentProcessing ? 'Processing Payment...' : 'Simulate Card Payment (Test Mode)'}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full bg-white border border-[#e5e7eb] hover:bg-[#fafafa] text-[#171717] font-medium text-xs transition cursor-pointer"
                  >
                    Pay Later
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-[#171717] font-medium">
                  ✓ Inventory updated atomically. Split commission payouts allocated for merchants.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs uppercase tracking-wider transition cursor-pointer shadow-xs"
                >
                  Close & View Catalog
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-xs font-medium text-[#171717] mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Step 1: Order Confirmation</span>
              </div>
              <h2 className="text-xl font-semibold text-[#171717] tracking-tight">Marketplace Checkout</h2>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs">
                {error}
              </div>
            )}

            {/* Delivery Address Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#171717] flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#171717]" />
                  <span>Delivery Address</span>
                </h3>
                {!isAddingAddress && (
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="text-xs text-[#171717] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {isAddingAddress ? (
                <form onSubmit={handleCreateAddress} className="p-4 rounded-lg bg-[#fafafa] border border-[#e5e7eb] space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={addrName}
                      onChange={(e) => setAddrName(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Phone Number"
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
                    />
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Address Line 1 (Street, Apartment, Suite)"
                    value={addrLine1}
                    onChange={(e) => setAddrLine1(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={addrState}
                      onChange={(e) => setAddrState(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Postal Code"
                      value={addrPostalCode}
                      onChange={(e) => setAddrPostalCode(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="px-3 py-1.5 rounded-full border border-[#e5e7eb] bg-white text-xs text-[#6b7280] hover:text-[#171717] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 rounded-full bg-[#171717] hover:bg-black text-xs text-white font-medium cursor-pointer"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-3.5 rounded-lg border transition cursor-pointer text-xs ${
                        selectedAddressId === addr.id
                          ? 'bg-[#fafafa] border-[#171717] ring-1 ring-[#171717]'
                          : 'bg-white border-[#e5e7eb] hover:border-[#9ca3af]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-[#171717]">{addr.name}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] text-[#6b7280] bg-white border border-[#e5e7eb] px-2 py-0.5 rounded-full font-medium uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[#6b7280] truncate">{addr.line1}</p>
                      <p className="text-[#6b7280]">
                        {addr.city}, {addr.state} {addr.postalCode}
                      </p>
                      <p className="text-[#9ca3af] font-mono mt-1">{addr.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split Order Items Summary */}
            <div className="space-y-3 pt-3 border-t border-[#e5e7eb]">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#171717] flex items-center space-x-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#171717]" />
                <span>Order Items ({items.length})</span>
              </h3>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {items.map((i) => (
                  <div
                    key={i.productId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-md bg-white border border-[#e5e7eb] overflow-hidden flex-shrink-0">
                        {i.image && (
                          <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-[#171717] truncate max-w-[200px]">{i.name}</div>
                        <div className="text-[10px] text-[#6b7280] flex items-center space-x-1">
                          <Store className="w-3 h-3 text-[#6b7280]" />
                          <span>{i.vendor.storeName}</span>
                          <span>&bull;</span>
                          <span>Qty: {i.quantity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="font-mono font-medium text-[#171717]">${i.itemSubtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Calculations */}
            <div className="p-4 rounded-lg bg-[#fafafa] border border-[#e5e7eb] space-y-2 text-xs text-[#6b7280] font-mono">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#171717]">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#171717]">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-[#171717] pt-2 border-t border-[#e5e7eb]">
                <span className="font-sans">Total Order Value</span>
                <span className="text-base font-mono">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={handlePlaceOrder}
              disabled={orderSubmitting || items.length === 0}
              className="w-full py-3.5 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs uppercase tracking-wider transition shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{orderSubmitting ? 'Placing Order...' : 'Place Test-Mode Order'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
