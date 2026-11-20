import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const { token, profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApproved = profile?.vendor?.status === 'APPROVED';

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
      const res = await fetch(`${apiUrl}/categories`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setCategories(json.data);
        setCategoryId(json.data[0].id);
      }
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
      const res = await fetch(`${apiUrl}/vendors/me/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          stock: parseInt(stock, 10),
          categoryId,
          status,
          imageUrl: imageUrl || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create product');
      }

      onProductCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-xl text-[#171717] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-[#6b7280] hover:text-[#171717] rounded-full hover:bg-[#fafafa] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold tracking-tight text-[#171717] mb-1">Add New Product</h2>
        <p className="text-xs text-[#6b7280] mb-6">
          Publish or draft a new item for your merchant storefront.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs">
            {error}
          </div>
        )}

        {!isApproved && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-semibold block">Store Pending Approval</span>
              You can draft products now, but products can only be marked as{' '}
              <span className="font-mono font-bold">PUBLISHED</span> once an admin approves your store.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ergonomic Bluetooth Mouse"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] transition cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                disabled={!isApproved}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] transition disabled:opacity-50 cursor-pointer"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED" disabled={!isApproved}>
                  Published {isApproved ? '' : '(Requires Approval)'}
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Price ($ USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="49.99"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Available Stock</label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="25"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">Product Description</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlight key specs, features, dimensions, and warranty info..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">Image URL (Public CDN / Unsplash)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Creating Product...' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
