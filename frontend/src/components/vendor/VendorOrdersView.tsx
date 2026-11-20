import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  User,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface VendorOrderItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  vendorPayout: number;
  status: string;
}

interface VendorOrder {
  id: string;
  orderStatus: 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  customer: {
    name: string;
    email: string;
  };
  shippingAddress?: {
    name: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  vendorSubtotal: number;
  vendorPayoutTotal: number;
  items: VendorOrderItem[];
}

export const VendorOrdersView: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  const fetchVendorOrders = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/vendors/me/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch vendor orders');
      }
      setOrders(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorOrders();
  }, [token]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setActionLoading(orderId);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/vendors/me/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: nextStatus,
          note: `Fulfillment advanced to ${nextStatus} by vendor`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update order status');
      }

      await fetchVendorOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error advancing order fulfillment');
    } finally {
      setActionLoading(null);
    }
  };

  const getNextStatusAction = (status: string) => {
    switch (status) {
      case 'PLACED':
        return {
          target: 'PACKED',
          label: 'Pack Order',
          icon: Package,
          className: 'bg-[#171717] hover:bg-black text-white font-medium',
        };
      case 'PACKED':
        return {
          target: 'SHIPPED',
          label: 'Ship Order',
          icon: Truck,
          className: 'bg-[#171717] hover:bg-black text-white font-medium',
        };
      case 'SHIPPED':
        return {
          target: 'DELIVERED',
          label: 'Mark Delivered',
          icon: CheckCircle,
          className: 'bg-[#171717] hover:bg-black text-white font-medium',
        };
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#171717] border border-[#e5e7eb]">
            <Clock className="w-3 h-3 text-[#6b7280]" /> Placed
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#171717] border border-[#e5e7eb]">
            <Package className="w-3 h-3 text-[#6b7280]" /> Packed
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#171717] border border-[#e5e7eb]">
            <Truck className="w-3 h-3 text-[#6b7280]" /> Shipped
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#171717] border border-[#e5e7eb]">
            <CheckCircle className="w-3 h-3 text-[#171717]" /> Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-[#dc2626] border border-rose-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#6b7280] border border-[#e5e7eb]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-[#171717]">Store Order Fulfillment</h2>
          <p className="text-xs text-[#6b7280]">
            Fulfill store orders, manage packaging and dispatch, and track your split commission payouts.
          </p>
        </div>
        <button
          onClick={fetchVendorOrders}
          disabled={loading}
          className="px-4 py-2 rounded-full bg-white border border-[#e5e7eb] text-[#171717] hover:bg-[#fafafa] text-xs font-medium transition cursor-pointer shadow-xs"
        >
          {loading ? 'Refreshing...' : 'Refresh Orders'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="py-16 text-center text-[#6b7280]">
          <div className="w-7 h-7 border-2 border-[#171717] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading store orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center rounded-lg bg-white border border-[#e5e7eb] p-8 shadow-xs">
          <Package className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#171717] mb-1">No Orders Assigned Yet</h3>
          <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
            When customers purchase products listed by your store, they will appear here for packing and dispatch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const nextAction = getNextStatusAction(order.orderStatus);

            return (
              <div
                key={order.id}
                className="rounded-lg bg-white border border-[#e5e7eb] p-5 md:p-6 transition hover:border-[#171717] space-y-4 shadow-xs"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e5e7eb]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#6b7280]">Order #{order.id.slice(0, 8)}</span>
                      <span className="text-xs text-[#e5e7eb]">•</span>
                      <span className="text-xs text-[#6b7280]">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.orderStatus)}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#171717] border border-[#e5e7eb]">
                        Payment: {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Financial payout banner */}
                  <div className="text-right">
                    <div className="text-xs text-[#6b7280]">Your Net Payout:</div>
                    <div className="text-base font-semibold font-mono text-[#171717]">
                      ${order.vendorPayoutTotal.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-[#9ca3af] font-mono">
                      Subtotal: ${order.vendorSubtotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Customer and shipping details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#fafafa] p-3.5 rounded-lg border border-[#e5e7eb]">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-[#6b7280] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-[#171717]">{order.customer.name}</div>
                      <div className="text-[#6b7280]">{order.customer.email}</div>
                    </div>
                  </div>

                  {order.shippingAddress && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#6b7280] mt-0.5 flex-shrink-0" />
                      <div className="text-[#171717]">
                        <div>{order.shippingAddress.line1}</div>
                        <div className="text-[#6b7280]">
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items from this vendor */}
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-md object-cover border border-[#e5e7eb] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-white border border-[#e5e7eb] flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-[#9ca3af]" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-medium text-[#171717] truncate">{item.name}</p>
                          <p className="text-[#6b7280] text-[11px]">
                            Qty: <strong className="text-[#171717] font-medium">{item.quantity}</strong> × ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-medium font-mono text-[#171717]">${item.subtotal.toFixed(2)}</div>
                        <div className="text-[11px] text-[#6b7280] font-mono">
                          Payout: ${item.vendorPayout.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fulfillment action button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  {nextAction && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, nextAction.target)}
                      disabled={actionLoading === order.id}
                      className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs transition shadow-xs cursor-pointer ${nextAction.className}`}
                    >
                      <nextAction.icon className="w-4 h-4" />
                      <span>
                        {actionLoading === order.id ? 'Advancing...' : nextAction.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
