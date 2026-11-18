import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, AlertCircle, CheckCircle2, Clock, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CreateProductModal } from './CreateProductModal';

interface ProductImage {
  id: string;
  publicUrl: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  stock: number;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'OUT_OF_STOCK';
  category: {
    name: string;
  };
  images: ProductImage[];
}

export const VendorProductsView: React.FC = () => {
  const { token, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const vendorStatus = profile?.vendor?.status || 'PENDING';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/vendors/me/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch vendor products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/vendors/me/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setActionMessage('Product deleted successfully');
        setTimeout(() => setActionMessage(null), 3000);
        fetchProducts();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CreateProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProductCreated={() => {
          setActionMessage('Product created successfully');
          setTimeout(() => setActionMessage(null), 3000);
          fetchProducts();
        }}
      />

      {/* Store Status Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white">
                {profile?.vendor?.storeName || 'Merchant Storefront'}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  vendorStatus === 'APPROVED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : vendorStatus === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {vendorStatus === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {vendorStatus === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                {vendorStatus === 'REJECTED' && <AlertCircle className="w-3 h-3 mr-1" />}
                {vendorStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Slug: <span className="font-mono text-slate-300">/{profile?.vendor?.storeSlug || 'store'}</span> &bull; Platform Commission:{' '}
              {Math.round((profile?.vendor?.commissionRate || 0.1) * 100)}%
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {actionMessage}
        </div>
      )}

      {/* Product List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
            <Package className="w-4 h-4 text-teal-400" />
            <span>Product Inventory ({products.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto mb-2"></div>
            Loading inventory items...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No products added yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Click &quot;Add Product&quot; to publish or draft your first marketplace listing.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.images[0]?.publicUrl ? (
                      <img
                        src={p.images[0].publicUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          p.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-lg">
                      {p.description}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1.5 font-mono">
                      <span>Category: {p.category.name}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-400 font-semibold">${Number(p.price).toFixed(2)}</span>
                      <span>&bull;</span>
                      <span className={p.stock > 0 ? 'text-slate-300' : 'text-red-400 font-bold'}>
                        Stock: {p.stock}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Delete product"
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
  );
};
