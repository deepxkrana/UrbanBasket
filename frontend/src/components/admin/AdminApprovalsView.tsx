import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Store,
  Clock,
  Star,
  Tag,
  Plus,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface VendorItem {
  id: string;
  storeName: string;
  storeSlug: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  commissionRate: number;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  _count: {
    products: number;
  };
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  };
}

interface CouponItem {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minimumAmount: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  totalUsages: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

export const AdminApprovalsView: React.FC = () => {
  const { token } = useAuth();
  const [currentTab, setCurrentTab] = useState<'VENDORS' | 'REVIEWS' | 'COUPONS'>('VENDORS');

  // Vendor State
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');

  // Review State
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewFilter, setReviewFilter] = useState<string>('ALL');

  // Coupon State
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState<boolean>(false);
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState<number>(15);
  const [newCouponMin, setNewCouponMin] = useState<number>(50);
  const [newCouponMaxDisc, setNewCouponMaxDisc] = useState<number>(30);
  const [newCouponLimit, setNewCouponLimit] = useState<number>(100);
  const [newCouponDays, setNewCouponDays] = useState<number>(30);

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  // ------------------------------------------------------------------
  // Data Fetching
  // ------------------------------------------------------------------
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const url = vendorFilter === 'ALL' ? `${apiUrl}/admin/vendors` : `${apiUrl}/admin/vendors?status=${vendorFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setVendors(json.data);
    } catch (err) {
      console.warn('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const url = reviewFilter === 'ALL' ? `${apiUrl}/admin/reviews` : `${apiUrl}/admin/reviews?status=${reviewFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setReviews(json.data);
    } catch (err) {
      console.warn('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setCoupons(json.data);
    } catch (err) {
      console.warn('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'VENDORS') fetchVendors();
    if (currentTab === 'REVIEWS') fetchReviews();
    if (currentTab === 'COUPONS') fetchCoupons();
  }, [currentTab, vendorFilter, reviewFilter, token]);

  // ------------------------------------------------------------------
  // Vendor Actions
  // ------------------------------------------------------------------
  const handleUpdateVendorStatus = async (vendorId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    try {
      const res = await fetch(`${apiUrl}/admin/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage(json.message || `Vendor marked as ${status}`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchVendors();
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // ------------------------------------------------------------------
  // Review Actions
  // ------------------------------------------------------------------
  const handleModerateReview = async (reviewId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`${apiUrl}/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage(json.message || `Review marked as ${status}`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchReviews();
      }
    } catch (err) {
      console.error('Review moderation error:', err);
    }
  };

  // ------------------------------------------------------------------
  // Coupon Actions
  // ------------------------------------------------------------------
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const expiresAt = new Date(Date.now() + newCouponDays * 86400000).toISOString();
      const res = await fetch(`${apiUrl}/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          type: newCouponType,
          value: newCouponValue,
          minimumAmount: newCouponMin,
          maximumDiscount: newCouponType === 'PERCENTAGE' ? newCouponMaxDisc : undefined,
          usageLimit: newCouponLimit,
          expiresAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create coupon');
      }
      setIsCreatingCoupon(false);
      setNewCouponCode('');
      setActionMessage(`Coupon ${json.data.code} created successfully.`);
      setTimeout(() => setActionMessage(null), 3000);
      fetchCoupons();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating coupon');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Are you sure you want to delete or deactivate this coupon?')) return;
    try {
      const res = await fetch(`${apiUrl}/admin/coupons/${couponId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage(json.message);
        setTimeout(() => setActionMessage(null), 3000);
        fetchCoupons();
      }
    } catch (err) {
      console.error('Delete coupon error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Header */}
      <div className="p-6 rounded-lg bg-white border border-[#e5e7eb] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-normal text-[#171717] tracking-tight">Platform Governance Portal</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Admin controls for vendor approvals, review moderation, and platform coupon management.
            </p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-[#fafafa] border border-[#e5e7eb] rounded-full text-xs">
          <button
            onClick={() => setCurrentTab('VENDORS')}
            className={`px-3.5 py-1.5 rounded-full transition font-medium flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'VENDORS' ? 'bg-[#171717] text-white' : 'text-[#6b7280] hover:text-[#171717]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Vendors</span>
          </button>
          <button
            onClick={() => setCurrentTab('REVIEWS')}
            className={`px-3.5 py-1.5 rounded-full transition font-medium flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'REVIEWS' ? 'bg-[#171717] text-white' : 'text-[#6b7280] hover:text-[#171717]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Reviews</span>
          </button>
          <button
            onClick={() => setCurrentTab('COUPONS')}
            className={`px-3.5 py-1.5 rounded-full transition font-medium flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'COUPONS' ? 'bg-[#171717] text-white' : 'text-[#6b7280] hover:text-[#171717]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Coupons</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#171717] flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* VENDOR APPROVALS TAB */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === 'VENDORS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">
              Merchant Applications
            </span>
            <div className="flex items-center space-x-1 p-1 bg-[#fafafa] border border-[#e5e7eb] rounded-full text-xs">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setVendorFilter(f)}
                  className={`px-3 py-1 rounded-full transition font-medium cursor-pointer ${
                    vendorFilter === f ? 'bg-[#171717] text-white' : 'text-[#6b7280] hover:text-[#171717]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-xs">
            {loading ? (
              <div className="py-16 text-center text-[#6b7280] text-xs">
                <div className="w-6 h-6 rounded-full border-2 border-[#171717] border-t-transparent animate-spin mx-auto mb-2" />
                Loading vendor records...
              </div>
            ) : vendors.length === 0 ? (
              <div className="py-16 text-center text-[#6b7280]">
                <Store className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#171717]">No applications found in this category</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {vendors.map((v) => (
                  <div
                    key={v.id}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#fafafa] transition"
                  >
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-[#171717] text-base">{v.storeName}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                            v.status === 'APPROVED'
                              ? 'bg-[#fafafa] text-[#171717] border border-[#e5e7eb]'
                              : v.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-[#dc2626] border border-rose-200'
                          }`}
                        >
                          {v.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1 text-[#171717]" />}
                          {v.status === 'PENDING' && <Clock className="w-3 h-3 mr-1 text-amber-600" />}
                          {v.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1 text-[#dc2626]" />}
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6b7280] mt-1 max-w-xl">
                        {v.description || 'No description provided.'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-[#6b7280] mt-2 font-mono">
                        <span>Merchant: {v.user.name} ({v.user.email})</span>
                        <span>&bull;</span>
                        <span>Products: {v._count.products}</span>
                        <span>&bull;</span>
                        <span>Commission: {Math.round(v.commissionRate * 100)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {v.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleUpdateVendorStatus(v.id, 'APPROVED')}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#171717] hover:bg-black text-white text-xs font-medium transition shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}
                      {v.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleUpdateVendorStatus(v.id, 'REJECTED')}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-rose-50 text-[#dc2626] border border-[#e5e7eb] text-xs font-medium transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REVIEW MODERATION TAB */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === 'REVIEWS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">
              Customer Purchase Reviews
            </span>
            <div className="flex items-center space-x-1 p-1 bg-[#fafafa] border border-[#e5e7eb] rounded-full text-xs">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setReviewFilter(f)}
                  className={`px-3 py-1 rounded-full transition font-medium cursor-pointer ${
                    reviewFilter === f ? 'bg-[#171717] text-white' : 'text-[#6b7280] hover:text-[#171717]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-xs">
            {loading ? (
              <div className="py-16 text-center text-[#6b7280] text-xs">
                <div className="w-6 h-6 rounded-full border-2 border-[#171717] border-t-transparent animate-spin mx-auto mb-2" />
                Loading customer reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-16 text-center text-[#6b7280]">
                <Star className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#171717]">No reviews found matching this filter</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#fafafa] transition"
                  >
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[#e5e7eb]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium text-[#171717] text-xs">{r.product.name}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium uppercase border border-[#e5e7eb] ${
                            r.status === 'APPROVED'
                              ? 'bg-[#fafafa] text-[#171717]'
                              : r.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-[#dc2626]'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6b7280] italic">"{r.comment}"</p>
                      <div className="text-[11px] text-[#9ca3af] font-mono">
                        By {r.customer.name} ({r.customer.email}) • {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {r.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleModerateReview(r.id, 'APPROVED')}
                          className="px-3.5 py-1.5 rounded-full bg-[#171717] hover:bg-black text-white text-xs font-medium transition shadow-xs cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {r.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleModerateReview(r.id, 'REJECTED')}
                          className="px-3.5 py-1.5 rounded-full bg-white hover:bg-rose-50 text-[#dc2626] border border-[#e5e7eb] text-xs font-medium transition cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* COUPON GOVERNANCE TAB */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === 'COUPONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">
              Platform Discount Coupons
            </span>
            <button
              onClick={() => setIsCreatingCoupon(!isCreatingCoupon)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#171717] hover:bg-black text-white text-xs font-medium transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingCoupon ? 'Cancel' : 'Create New Coupon'}</span>
            </button>
          </div>

          {/* New Coupon Form */}
          {isCreatingCoupon && (
            <form
              onSubmit={handleCreateCoupon}
              className="p-6 rounded-lg bg-[#fafafa] border border-[#e5e7eb] space-y-4 animate-in fade-in"
            >
              <h3 className="text-sm font-semibold text-[#171717]">Create Marketplace Coupon</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-[#171717] font-medium block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FLASH50"
                    required
                    className="w-full rounded-lg bg-white border border-[#e5e7eb] p-2.5 text-[#171717] font-mono uppercase focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div>
                  <label className="text-[#171717] font-medium block mb-1">Discount Type</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                    className="w-full rounded-lg bg-white border border-[#e5e7eb] p-2.5 text-[#171717] focus:outline-none focus:border-[#171717] cursor-pointer"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#171717] font-medium block mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    max={newCouponType === 'PERCENTAGE' ? '100' : '1000'}
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    required
                    className="w-full rounded-lg bg-white border border-[#e5e7eb] p-2.5 text-[#171717] focus:outline-none focus:border-[#171717] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#171717] font-medium block mb-1">Minimum Subtotal ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(Number(e.target.value))}
                    className="w-full rounded-lg bg-white border border-[#e5e7eb] p-2.5 text-[#171717] focus:outline-none focus:border-[#171717] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#171717] font-medium block mb-1">Max Discount Cap ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={newCouponMaxDisc}
                    onChange={(e) => setNewCouponMaxDisc(Number(e.target.value))}
                    placeholder="Optional for %"
                    className="w-full rounded-lg bg-white border border-[#e5e7eb] p-2.5 text-[#171717] focus:outline-none focus:border-[#171717] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#171717] font-medium block mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={newCouponLimit}
                    onChange={(e) => setNewCouponLimit(Number(e.target.value))}
                    className="w-full rounded-lg bg-white border border-[#e5e7eb] p-2.5 text-[#171717] focus:outline-none focus:border-[#171717] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#171717] font-medium block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newCouponDays}
                    onChange={(e) => setNewCouponDays(Number(e.target.value))}
                    className="w-full rounded-lg bg-white border border-[#e5e7eb] p-2.5 text-[#171717] focus:outline-none focus:border-[#171717] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingCoupon(false)}
                  className="px-4 py-2 rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] hover:text-[#171717] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs shadow-xs transition cursor-pointer"
                >
                  Publish Coupon
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-xs">
            {loading ? (
              <div className="py-16 text-center text-[#6b7280] text-xs">
                <div className="w-6 h-6 rounded-full border-2 border-[#171717] border-t-transparent animate-spin mx-auto mb-2" />
                Loading coupons...
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-16 text-center text-[#6b7280]">
                <Tag className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#171717]">No coupons active on platform</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#fafafa] transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm text-[#171717] bg-[#fafafa] px-2.5 py-0.5 rounded-md border border-[#e5e7eb]">
                          {c.code}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#e5e7eb] ${
                            c.isActive
                              ? 'bg-[#fafafa] text-[#171717]'
                              : 'bg-white text-[#6b7280]'
                          }`}
                        >
                          {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="text-xs text-[#6b7280]">
                        {c.type === 'PERCENTAGE' ? `${c.value}% discount` : `$${c.value} flat discount`}
                        {c.minimumAmount > 0 && ` on orders over $${c.minimumAmount}`}
                        {c.maximumDiscount && ` (max $${c.maximumDiscount})`}
                      </div>

                      <div className="text-[11px] text-[#9ca3af] font-mono">
                        Redeemed: {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit} max` : 'times (unlimited)'} •
                        Expires: {new Date(c.expiresAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="p-2 rounded-full text-[#6b7280] hover:text-[#dc2626] hover:bg-rose-50 border border-transparent hover:border-rose-100 text-xs transition cursor-pointer"
                        title="Delete or deactivate coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
