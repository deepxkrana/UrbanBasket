import React, { useState } from 'react';
import { X, Store, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface VendorOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VendorOnboardModal: React.FC<VendorOnboardModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { token, refreshProfile } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/vendors/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeName, description }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to submit vendor application');
      }

      setSubmitted(true);
      await refreshProfile();
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Application submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Application Received!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your store application has been registered in <span className="text-amber-400 font-semibold">PENDING</span> status. An administrator will review your application shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center mb-3">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Open Your Merchant Store</h2>
              <p className="text-xs text-slate-400 mt-1">
                Reach thousands of buyers on UrbanBasket. Standard platform fee: 10%.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Store / Brand Name</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. EcoCraft Essentials"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Store Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your products, specialty, and source materials..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Submitting Application...' : 'Apply for Vendor Account'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
