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
          className: 'bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold',
        };
      case 'PACKED':
        return {
          target: 'SHIPPED',
          label: 'Ship Order',
          icon: Truck,
          className: 'bg-indigo-500 hover:bg-indigo-600 text-white font-bold',
        };
      case 'SHIPPED':
        return {
          target: 'DELIVERED',
          label: 'Mark Delivered',
          icon: CheckCircle,
          className: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold',
        };
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Placed
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Package className="w-3 h-3" /> Packed
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Vendor Order Fulfillment</h2>
          <p className="text-sm text-slate-400">
            Fulfill store orders, manage packaging and dispatch, and track your split commission payouts.
          </p>
        </div>
        <button
          onClick={fetchVendorOrders}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
        >
          {loading ? 'Refreshing...' : 'Refresh Orders'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading store orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900/50 border border-slate-800/80 p-8">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Orders Assigned Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
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
                className="rounded-3xl bg-slate-900 border border-slate-800/80 p-5 md:p-6 transition hover:border-slate-700 space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">Order #{order.id.slice(0, 8)}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.orderStatus)}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Payment: {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Financial payout banner */}
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Your Net Payout:</div>
                    <div className="text-xl font-black text-emerald-400">
                      ${order.vendorPayoutTotal.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Subtotal: ${order.vendorSubtotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Customer and shipping details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/40">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200">{order.customer.name}</div>
                      <div className="text-slate-500">{order.customer.email}</div>
                    </div>
                  </div>

                  {order.shippingAddress && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="text-slate-300">
                        <div>{order.shippingAddress.line1}</div>
                        <div className="text-slate-500">
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
                      className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{item.name}</p>
                          <p className="text-slate-400 text-[11px]">
                            Qty: <strong className="text-slate-200">{item.quantity}</strong> × ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-slate-200">${item.subtotal.toFixed(2)}</div>
                        <div className="text-[11px] text-emerald-400 font-medium">
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
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition shadow-md ${nextAction.className}`}
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
