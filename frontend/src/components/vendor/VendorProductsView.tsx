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
    <div className="space-y-6">
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
      <div className="p-6 rounded-lg bg-white border border-[#e5e7eb] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-[#171717]">
                {profile?.vendor?.storeName || 'Merchant Storefront'}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                  vendorStatus === 'APPROVED'
                    ? 'bg-[#fafafa] text-[#171717] border border-[#e5e7eb]'
                    : vendorStatus === 'PENDING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-[#dc2626] border border-rose-200'
                }`}
              >
                {vendorStatus === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1 text-[#171717]" />}
                {vendorStatus === 'PENDING' && <Clock className="w-3 h-3 mr-1 text-amber-600" />}
                {vendorStatus === 'REJECTED' && <AlertCircle className="w-3 h-3 mr-1 text-[#dc2626]" />}
                {vendorStatus}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Slug: <span className="font-mono text-[#171717]">/{profile?.vendor?.storeSlug || 'store'}</span> &bull; Platform Commission:{' '}
              {Math.round((profile?.vendor?.commissionRate || 0.1) * 100)}%
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] text-xs">
          {actionMessage}
        </div>
      )}

      {/* Product List */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#171717]">
            <Package className="w-4 h-4 text-[#6b7280]" />
            <span>Product Inventory ({products.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#6b7280] text-xs">
            <div className="w-6 h-6 rounded-full border-2 border-[#171717] border-t-transparent animate-spin mx-auto mb-2"></div>
            Loading inventory items...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-[#6b7280]">
            <Package className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#171717]">No products added yet</p>
            <p className="text-xs text-[#6b7280] mt-1 max-w-xs mx-auto">
              Click &quot;Add Product&quot; to publish or draft your first marketplace listing.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#fafafa] transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-lg bg-[#fafafa] border border-[#e5e7eb] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.images[0]?.publicUrl ? (
                      <img
                        src={p.images[0].publicUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-[#9ca3af]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-[#171717] text-sm">{p.name}</h4>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          p.status === 'PUBLISHED'
                            ? 'bg-[#fafafa] text-[#171717] border border-[#e5e7eb]'
                            : 'bg-white text-[#6b7280] border border-[#e5e7eb]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-1 max-w-lg">
                      {p.description}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-[#6b7280] mt-1.5 font-mono">
                      <span>Category: {p.category.name}</span>
                      <span>&bull;</span>
                      <span className="text-[#171717] font-semibold">${Number(p.price).toFixed(2)}</span>
                      <span>&bull;</span>
                      <span className={p.stock > 0 ? 'text-[#6b7280]' : 'text-[#dc2626] font-semibold'}>
                        Stock: {p.stock}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-full text-[#6b7280] hover:text-[#dc2626] hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
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
