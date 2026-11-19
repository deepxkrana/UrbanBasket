import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  Package,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AnalyticsData {
  financials: {
    grossRevenue: number;
    platformCommission: number;
    vendorPayouts: number;
  };
  orders: {
    total: number;
    byStatus: {
      PLACED: number;
      PACKED: number;
      SHIPPED: number;
      DELIVERED: number;
      CANCELLED: number;
      REFUNDED: number;
    };
  };
  growth: {
    totalCustomers: number;
    vendors: {
      APPROVED: number;
      PENDING: number;
      REJECTED: number;
      SUSPENDED: number;
      TOTAL: number;
    };
    publishedProducts: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    slug: string;
    unitsSold: number;
    revenue: number;
  }>;
  topVendors: Array<{
    vendorId: string;
    storeName: string;
    storeSlug: string;
    totalSales: number;
    netPayout: number;
  }>;
}

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
  system?: {
    heapUsedMb: number;
    rssMb: number;
  };
}

export const AdminAnalyticsView: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const rootUrl = apiUrl.replace('/api/v1', '/api');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, healthRes] = await Promise.all([
        fetch(`${apiUrl}/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${rootUrl}/health`),
      ]);

      const analyticsJson = await analyticsRes.json();
      if (!analyticsRes.ok) {
        throw new Error(analyticsJson.error?.message || 'Failed to fetch analytics');
      }
      setData(analyticsJson.data);

      if (healthRes.ok) {
        const healthJson = await healthRes.json();
        setHealth(healthJson);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAnalytics();
  }, [token]);

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m ${Math.floor(seconds % 60)}s`;
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Aggregating platform sales, commission, and merchant telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error || 'Unable to load analytics'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Live Health Indicator */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Phase 9: Real-Time Marketplace Analytics Active
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Platform Financials & Growth</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ledger audit reconciling customer gross volume, platform commission, and merchant payouts.
          </p>
        </div>

        {/* System Health Pill */}
        {health && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">SYSTEM OK</span>
            </div>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">Uptime: {formatUptime(health.uptime)}</span>
            {health.system && (
              <>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">Heap: {health.system.heapUsedMb}MB</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Gross Merchandise Volume</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            ${data.financials.grossRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            Total settled customer orders
          </div>
        </div>

        {/* Platform Commission */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-slate-900 space-y-2">
          <div className="flex items-center justify-between text-purple-300 text-xs font-medium">
            <span>Platform Commission</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300">
            ${data.financials.platformCommission.toFixed(2)}
          </div>
          <div className="text-[11px] text-purple-400/80">
            Retained platform revenue
          </div>
        </div>

        {/* Vendor Payouts */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Merchant Net Payouts</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-400">
            ${data.financials.vendorPayouts.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            Disbursable to merchants
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Orders Volume</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{data.orders.total}</div>
          <div className="text-[11px] text-slate-400">
            {data.orders.byStatus.DELIVERED} orders delivered
          </div>
        </div>
      </div>

      {/* Platform Growth Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Registered Customers</div>
            <div className="text-xl font-bold text-white">{data.growth.totalCustomers}</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Approved Merchants</div>
            <div className="text-xl font-bold text-white">
              {data.growth.vendors.APPROVED} <span className="text-xs text-slate-500 font-normal">({data.growth.vendors.PENDING} pending)</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Catalog Products</div>
            <div className="text-xl font-bold text-white">{data.growth.publishedProducts}</div>
          </div>
        </div>
      </div>

      {/* Orders Lifecycle Status Breakdown Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Order Lifecycle Status Distribution</h3>
          <span className="text-xs text-slate-400 font-mono">
            {data.orders.total} Total Orders
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Placed', count: data.orders.byStatus.PLACED, color: 'text-amber-400', bg: 'bg-amber-400' },
            { label: 'Packed', count: data.orders.byStatus.PACKED, color: 'text-sky-400', bg: 'bg-sky-400' },
            { label: 'Shipped', count: data.orders.byStatus.SHIPPED, color: 'text-indigo-400', bg: 'bg-indigo-400' },
            { label: 'Delivered', count: data.orders.byStatus.DELIVERED, color: 'text-emerald-400', bg: 'bg-emerald-400' },
            { label: 'Cancelled', count: data.orders.byStatus.CANCELLED, color: 'text-rose-400', bg: 'bg-rose-400' },
            { label: 'Refunded', count: data.orders.byStatus.REFUNDED, color: 'text-purple-400', bg: 'bg-purple-400' },
          ].map((status) => (
            <div key={status.label} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
              <span className={`text-xl font-black ${status.color}`}>{status.count}</span>
              <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                {status.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products & Top Vendors Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Top Performing Products</span>
          </h3>

          {data.topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No product orders recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {data.topProducts.map((p, idx) => (
                <div key={p.productId} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">${p.revenue.toFixed(2)}</div>
                    <div className="text-[11px] text-slate-500">{p.unitsSold} units sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-purple-400" />
            <span>Top Performing Merchants</span>
          </h3>

          {data.topVendors.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No merchant orders recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {data.topVendors.map((v, idx) => (
                <div key={v.vendorId} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200">{v.storeName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">${v.totalSales.toFixed(2)}</div>
                    <div className="text-[11px] text-emerald-400">Net payout: ${v.netPayout.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
