import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Store, Clock } from 'lucide-react';
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

export const AdminApprovalsView: React.FC = () => {
  const { token } = useAuth();
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const url = filter === 'ALL' ? `${apiUrl}/admin/vendors` : `${apiUrl}/admin/vendors?status=${filter}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setVendors(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [filter, token]);

  const handleUpdateStatus = async (vendorId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/admin/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Merchant Applications & Approvals</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review store credentials and grant product publishing privileges.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                filter === f ? 'bg-purple-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {actionMessage}
        </div>
      )}

      {/* Vendors Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-2"></div>
            Loading vendor records...
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Store className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No applications found in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-white text-base">{v.storeName}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        v.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : v.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {v.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {v.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                      {v.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                      {v.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    {v.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 mt-2 font-mono">
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
                      onClick={() => handleUpdateStatus(v.id, 'APPROVED')}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  {v.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleUpdateStatus(v.id, 'REJECTED')}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition"
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
  );
};
