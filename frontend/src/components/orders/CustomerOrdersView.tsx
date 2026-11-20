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

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';

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

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#171717] border border-[#e5e7eb]">
            <CheckCircle className="w-3 h-3 text-[#171717]" /> Paid
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Payment Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-[#dc2626] border border-rose-200">
            <XCircle className="w-3 h-3" /> Payment Failed
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#6b7280] border border-[#e5e7eb]">
            Refunded
          </span>
        );
      default:
        return <span className="text-xs text-[#6b7280]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-[#171717]">My Orders</h2>
          <p className="text-xs text-[#6b7280]">Track shipments, view invoices, and manage order lifecycles.</p>
        </div>
        <button
          onClick={fetchOrders}
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
          <p className="text-xs">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center rounded-lg bg-white border border-[#e5e7eb] p-8 shadow-xs">
          <Package className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#171717] mb-1">No Orders Placed Yet</h3>
          <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
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
                className="rounded-lg bg-white border border-[#e5e7eb] p-5 md:p-6 transition hover:border-[#171717] space-y-4 shadow-xs"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e5e7eb]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#6b7280]">#{order.id.slice(0, 8)}</span>
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
                      {getStatusBadge(order.status)}
                      {getPaymentBadge(order.paymentStatus)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-semibold font-mono text-[#171717]">${order.total.toFixed(2)}</div>
                    <div className="text-xs text-[#6b7280]">{order.items.length} items</div>
                  </div>
                </div>

                {/* Items summary */}
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
                            alt={item.productName}
                            className="w-10 h-10 rounded-md object-cover border border-[#e5e7eb] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-white border border-[#e5e7eb] flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-[#9ca3af]" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-medium text-[#171717] truncate">{item.productName}</p>
                          <p className="text-[#6b7280] text-[11px]">
                            Sold by <span className="text-[#171717] font-medium">{item.vendorName}</span> • Qty: {item.quantity}
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
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-[#fafafa] text-[#171717] border border-[#e5e7eb] text-[11px] font-medium transition cursor-pointer shadow-xs"
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>Review</span>
                          </button>
                        )}
                        <div className="text-right font-medium font-mono text-[#171717]">
                          ${item.subtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping address & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-[#6b7280]">
                    {order.shippingAddress && (
                      <span>
                        Deliver to: <strong className="text-[#171717] font-medium">{order.shippingAddress.name}</strong>,{' '}
                        {order.shippingAddress.city}, {order.shippingAddress.state}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {order.paymentStatus === 'PENDING' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handlePayOrder(order.id)}
                        disabled={actionLoading === order.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#171717] hover:bg-black text-white text-xs font-medium transition shadow-xs cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{actionLoading === order.id ? 'Processing...' : 'Pay Now'}</span>
                      </button>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={actionLoading === order.id}
                        className="px-3 py-1.5 rounded-full bg-white hover:bg-rose-50 text-[#dc2626] border border-[#e5e7eb] text-xs font-medium transition cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      disabled={downloadingInvoice === order.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#fafafa] text-[#171717] border border-[#e5e7eb] text-xs font-medium transition shadow-xs cursor-pointer"
                      title="Download Tax Invoice (PDF)"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#6b7280]" />
                      <span>{downloadingInvoice === order.id ? 'Generating...' : 'Invoice'}</span>
                    </button>

                    <button
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-1.5 rounded-full text-[#6b7280] hover:text-[#171717] hover:bg-[#fafafa] border border-[#e5e7eb] transition cursor-pointer"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Financial Breakdown & Payment Reference */}
                {isExpanded && (
                  <div className="pt-4 border-t border-[#e5e7eb] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-[#fafafa] p-4 rounded-lg">
                    <div className="space-y-1">
                      <div className="text-[#171717] font-sans font-medium mb-1">Financial Breakdown:</div>
                      <div className="flex justify-between text-[#6b7280]">
                        <span>Subtotal:</span>
                        <span className="text-[#171717]">${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#171717]">
                        <span>Coupon Discount:</span>
                        <span>-${order.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#171717] font-semibold pt-1 border-t border-[#e5e7eb]">
                        <span>Total Paid:</span>
                        <span>${order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[#171717] font-sans font-medium mb-1">Payment & Security:</div>
                      <div className="flex justify-between text-[#6b7280]">
                        <span>Provider:</span>
                        <span className="uppercase text-[#171717]">{order.paymentProvider || 'Stripe Test'}</span>
                      </div>
                      <div className="flex justify-between text-[#6b7280]">
                        <span>Payment Reference:</span>
                        <span className="text-[#171717] truncate max-w-[150px]">
                          {order.paymentReference || 'Pending Confirmation'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#6b7280]">
                        <span>Updated:</span>
                        <span className="text-[#171717]">{new Date(order.updatedAt).toLocaleTimeString()}</span>
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
