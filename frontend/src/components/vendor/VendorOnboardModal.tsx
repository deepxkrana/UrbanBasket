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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-xl text-[#171717]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-[#6b7280] hover:text-[#171717] rounded-full hover:bg-[#fafafa] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-[#171717] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-[#171717]">Application Received</h3>
            <p className="text-xs text-[#6b7280] max-w-xs mx-auto">
              Your store application has been registered in <span className="text-[#171717] font-semibold">PENDING</span> status. An administrator will review your application shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-10 h-10 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-[#171717] mx-auto flex items-center justify-center mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-[#171717]">Open Your Merchant Store</h2>
              <p className="text-xs text-[#6b7280] mt-1">
                Reach thousands of buyers on UrbanBasket. Standard platform fee: 10%.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">Store / Brand Name</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. EcoCraft Essentials"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">Store Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your products, specialty, and source materials..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
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
