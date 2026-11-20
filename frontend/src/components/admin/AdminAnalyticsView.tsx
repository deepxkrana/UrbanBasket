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
      <div className="py-24 text-center text-[#6b7280]">
        <div className="w-7 h-7 rounded-full border-2 border-[#171717] border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium">Aggregating platform sales, commission, and merchant telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error || 'Unable to load analytics'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Health Indicator */}
      <div className="p-6 rounded-lg bg-white border border-[#e5e7eb] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-xs font-medium text-[#171717] mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Platform Telemetry</span>
          </div>
          <h2 className="text-2xl font-normal text-[#171717] tracking-tight">Platform Financials & Growth</h2>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Real-time ledger audit reconciling customer gross volume, platform commission, and merchant payouts.
          </p>
        </div>

        {/* System Health Pill */}
        {health && (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#171717]">
              <span className="w-2 h-2 rounded-full bg-[#171717]" />
              <span className="font-semibold">SYSTEM OK</span>
            </div>
            <span className="text-[#e5e7eb]">|</span>
            <span className="text-[#6b7280]">Uptime: {formatUptime(health.uptime)}</span>
            {health.system && (
              <>
                <span className="text-[#e5e7eb]">|</span>
                <span className="text-[#6b7280]">Heap: {health.system.heapUsedMb}MB</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-lg bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-[#6b7280] text-xs font-medium">
            <span>Gross Merchandise Volume</span>
            <div className="p-1.5 rounded-md bg-[#fafafa] border border-[#e5e7eb] text-[#171717]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold font-mono text-[#171717]">
            ${data.financials.grossRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#6b7280]">
            Total settled customer orders
          </div>
        </div>

        {/* Platform Commission */}
        <div className="p-5 rounded-lg bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-[#6b7280] text-xs font-medium">
            <span>Platform Commission</span>
            <div className="p-1.5 rounded-md bg-[#fafafa] border border-[#e5e7eb] text-[#171717]">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold font-mono text-[#171717]">
            ${data.financials.platformCommission.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#6b7280]">
            Retained platform revenue
          </div>
        </div>

        {/* Vendor Payouts */}
        <div className="p-5 rounded-lg bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-[#6b7280] text-xs font-medium">
            <span>Merchant Net Payouts</span>
            <div className="p-1.5 rounded-md bg-[#fafafa] border border-[#e5e7eb] text-[#171717]">
              <Store className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold font-mono text-[#171717]">
            ${data.financials.vendorPayouts.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#6b7280]">
            Disbursable to merchants
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-lg bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-[#6b7280] text-xs font-medium">
            <span>Total Orders Volume</span>
            <div className="p-1.5 rounded-md bg-[#fafafa] border border-[#e5e7eb] text-[#171717]">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold font-mono text-[#171717]">{data.orders.total}</div>
          <div className="text-[11px] text-[#6b7280]">
            {data.orders.byStatus.DELIVERED} orders delivered
          </div>
        </div>
      </div>

      {/* Platform Growth Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg bg-white border border-[#e5e7eb] flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6b7280] font-medium">Registered Customers</div>
            <div className="text-lg font-semibold text-[#171717]">{data.growth.totalCustomers}</div>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-[#e5e7eb] flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6b7280] font-medium">Approved Merchants</div>
            <div className="text-lg font-semibold text-[#171717]">
              {data.growth.vendors.APPROVED} <span className="text-xs text-[#6b7280] font-normal">({data.growth.vendors.PENDING} pending)</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-[#e5e7eb] flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6b7280] font-medium">Active Catalog Products</div>
            <div className="text-lg font-semibold text-[#171717]">{data.growth.publishedProducts}</div>
          </div>
        </div>
      </div>

      {/* Orders Lifecycle Status Breakdown Bar */}
      <div className="p-6 rounded-lg bg-white border border-[#e5e7eb] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#171717]">Order Lifecycle Distribution</h3>
          <span className="text-xs text-[#6b7280] font-mono">
            {data.orders.total} Total Orders
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Placed', count: data.orders.byStatus.PLACED },
            { label: 'Packed', count: data.orders.byStatus.PACKED },
            { label: 'Shipped', count: data.orders.byStatus.SHIPPED },
            { label: 'Delivered', count: data.orders.byStatus.DELIVERED },
            { label: 'Cancelled', count: data.orders.byStatus.CANCELLED },
            { label: 'Refunded', count: data.orders.byStatus.REFUNDED },
          ].map((status) => (
            <div key={status.label} className="p-3 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-center">
              <span className="text-xl font-semibold font-mono text-[#171717]">{status.count}</span>
              <span className="block text-[11px] text-[#6b7280] uppercase tracking-wider font-medium mt-0.5">
                {status.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products & Top Vendors Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="p-6 rounded-lg bg-white border border-[#e5e7eb] space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-[#171717] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#6b7280]" />
            <span>Top Performing Products</span>
          </h3>

          {data.topProducts.length === 0 ? (
            <p className="text-xs text-[#6b7280] py-6 text-center">No product orders recorded yet.</p>
          ) : (
            <div className="divide-y divide-[#e5e7eb]">
              {data.topProducts.map((p, idx) => (
                <div key={p.productId} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-[#171717] font-semibold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-[#171717]">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold font-mono text-[#171717]">${p.revenue.toFixed(2)}</div>
                    <div className="text-[11px] text-[#6b7280]">{p.unitsSold} units sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="p-6 rounded-lg bg-white border border-[#e5e7eb] space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-[#171717] flex items-center gap-2">
            <Store className="w-4 h-4 text-[#6b7280]" />
            <span>Top Performing Merchants</span>
          </h3>

          {data.topVendors.length === 0 ? (
            <p className="text-xs text-[#6b7280] py-6 text-center">No merchant orders recorded yet.</p>
          ) : (
            <div className="divide-y divide-[#e5e7eb]">
              {data.topVendors.map((v, idx) => (
                <div key={v.vendorId} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-[#171717] font-semibold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-[#171717]">{v.storeName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold font-mono text-[#171717]">${v.totalSales.toFixed(2)}</div>
                    <div className="text-[11px] text-[#6b7280]">Net payout: ${v.netPayout.toFixed(2)}</div>
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
