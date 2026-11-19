import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  CreditCard,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ReviewModal } from '../reviews/ReviewModal';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  image: string | null;
  vendorName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: string;
}

interface Order {
  id: string;
  status: 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentProvider?: string;
  paymentReference?: string;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  shippingAddress?: {
    name: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  itemsCount: number;
  items: OrderItem[];
}

export const CustomerOrdersView: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    orderItemId: string;
    productName: string;
    productImage?: string | null;
  } | null>(null);

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoice(orderId);
    try {
      const res = await fetch(`${getApiUrl()}/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to download tax invoice');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UrbanBasket-Invoice-${orderId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error downloading invoice');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch orders');
      }
      setOrders(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching order history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handlePayOrder = async (orderId: string) => {
    setActionLoading(orderId);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          status: 'COMPLETED',
          providerPaymentId: `test_pay_${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Payment simulation failed');
      }
      await fetchOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setActionLoading(orderId);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to cancel order');
      }
      await fetchOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cancelling order');
    } finally {
      setActionLoading(null);
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

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Payment Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Payment Failed
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Refunded
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">My Orders</h2>
          <p className="text-sm text-slate-400">Track shipments, view split payments, and manage order lifecycles.</p>
        </div>
        <button
          onClick={fetchOrders}
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
          <p className="text-sm">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900/50 border border-slate-800/80 p-8">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Orders Placed Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Explore the catalog and checkout products to see your live order status here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const canCancel = order.status === 'PLACED' || order.status === 'PACKED';

            return (
              <div
                key={order.id}
                className="rounded-3xl bg-slate-900 border border-slate-800/80 p-5 md:p-6 transition hover:border-slate-700 space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8)}</span>
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
                      {getStatusBadge(order.status)}
                      {getPaymentBadge(order.paymentStatus)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-white">${order.total.toFixed(2)}</div>
                    <div className="text-xs text-slate-400">{order.items.length} items</div>
                  </div>
                </div>

                {/* Items summary */}
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
                            alt={item.productName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{item.productName}</p>
                          <p className="text-slate-400 text-[11px]">
                            Sold by <span className="text-slate-300 font-medium">{item.vendorName}</span> • Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {order.status === 'DELIVERED' && (
                          <button
                            onClick={() =>
                              setReviewTarget({
                                orderItemId: item.id,
                                productName: item.productName,
                                productImage: item.image,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-semibold transition"
                          >
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>Review</span>
                          </button>
                        )}
                        <div className="text-right font-medium text-slate-200">
                          ${item.subtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping address & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-400">
                    {order.shippingAddress && (
                      <span>
                        Deliver to: <strong className="text-slate-200">{order.shippingAddress.name}</strong>,{' '}
                        {order.shippingAddress.city}, {order.shippingAddress.state}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {order.paymentStatus === 'PENDING' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handlePayOrder(order.id)}
                        disabled={actionLoading === order.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-md shadow-emerald-500/10"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{actionLoading === order.id ? 'Processing...' : 'Pay Now (Test Mode)'}</span>
                      </button>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={actionLoading === order.id}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition"
                      >
                        Cancel Order
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      disabled={downloadingInvoice === order.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition shadow-sm"
                      title="Download Tax Invoice (PDF)"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{downloadingInvoice === order.id ? 'Generating...' : 'Invoice'}</span>
                    </button>

                    <button
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Financial Breakdown & Payment Reference */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-950/40 p-4 rounded-2xl">
                    <div className="space-y-1">
                      <div className="text-slate-400 font-sans font-semibold mb-1">Financial Breakdown:</div>
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span>${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Coupon Discount:</span>
                        <span>-${order.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                        <span>Total Paid:</span>
                        <span>${order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-400 font-sans font-semibold mb-1">Payment & Security:</div>
                      <div className="flex justify-between text-slate-400">
                        <span>Provider:</span>
                        <span className="uppercase text-slate-200">{order.paymentProvider || 'Stripe Test'}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Payment Reference:</span>
                        <span className="text-slate-200 truncate max-w-[150px]">
                          {order.paymentReference || 'Pending Confirmation'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Updated:</span>
                        <span>{new Date(order.updatedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          isOpen={true}
          onClose={() => setReviewTarget(null)}
          orderItemId={reviewTarget.orderItemId}
          productName={reviewTarget.productName}
          productImage={reviewTarget.productImage}
          onReviewSubmitted={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};
