import React, { useState, useEffect } from 'react';
import { X, Star, Store, ShieldCheck, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

interface ProductImage {
  id: string;
  publicUrl: string;
  altText?: string;
  position: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customer: {
    name: string;
  };
}

export interface DetailedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  stock: number;
  averageRating: string | number;
  reviewCount: number;
  category: {
    name: string;
  };
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
    description?: string;
  };
  images: ProductImage[];
  reviews?: Review[];
}

interface ProductDetailModalProps {
  slug: string | null;
  onClose: () => void;
  onAddToCart?: (product: DetailedProduct, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  slug,
  onClose,
  onAddToCart,
}) => {
  const [product, setProduct] = useState<DetailedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchProductDetails(slug);
      setActiveImageIndex(0);
      setQuantity(1);
      setAddedNotice(false);
    }
  }, [slug]);

  const fetchProductDetails = async (productSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiUrl}/products/${productSlug}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Product not found');
      }
      setProduct(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  if (!slug) return null;

  const handleAddToCart = () => {
    if (!product) return;
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-400 font-medium">Loading product specifications...</p>
          </div>
        ) : error || !product ? (
          <div className="py-20 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Item Unavailable</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {error || 'This product is no longer available in the public catalog.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product Gallery */}
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative shadow-inner">
                  {product.images[activeImageIndex] ? (
                    <img
                      src={product.images[activeImageIndex].publicUrl}
                      alt={product.images[activeImageIndex].altText || product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      No Image Available
                    </div>
                  )}

                  {product.stock > 0 ? (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                      In Stock ({product.stock})
                    </span>
                  ) : (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500/20 text-red-400 border border-red-500/30 backdrop-blur-md">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {product.images.map((img, idx) => (
                      <button
                        key={img.id || idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                          activeImageIndex === idx
                            ? 'border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img.publicUrl}
                          alt={img.altText || ''}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Information */}
              <div className="flex flex-col justify-between space-y-6">
                <div>
                  {/* Category & Store badge */}
                  <div className="flex items-center space-x-2 text-xs mb-2">
                    <span className="text-emerald-400 font-semibold tracking-wide uppercase text-[11px]">
                      {product.category.name}
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <div className="flex items-center space-x-1 text-slate-400">
                      <Store className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-slate-300 font-medium">{product.vendor.storeName}</span>
                    </div>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug mb-3">
                    {product.name}
                  </h1>

                  {/* Rating summary */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(Number(product.averageRating))
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">
                      {Number(product.averageRating).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({product.reviewCount} customer {product.reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-3xl font-black text-white mb-6 font-mono">
                    ${Number(product.price).toFixed(2)}
                  </div>

                  {/* Description */}
                  <div className="prose prose-invert text-xs md:text-sm text-slate-300 leading-relaxed mb-6">
                    <p>{product.description}</p>
                  </div>
                </div>

                {/* Purchase Controls */}
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1 || product.stock === 0}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition font-bold"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm font-semibold text-white">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        disabled={quantity >= product.stock || product.stock === 0}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition font-bold"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock === 0}
                      className="flex-1 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                    </button>
                  </div>

                  {addedNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Added {quantity} unit(s) of this item to your cart!</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-2">
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verified Marketplace Merchant</span>
                    </span>
                    <span>&bull;</span>
                    <span>Secure Encrypted Checkout</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Reviews Section */}
            {product.reviews && product.reviews.length > 0 && (
              <div className="pt-8 border-t border-slate-800">
                <h3 className="text-base font-bold text-white mb-4">
                  Verified Buyer Reviews ({product.reviews.length})
                </h3>
                <div className="space-y-3">
                  {product.reviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-200">{r.customer.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                            Verified Purchase
                          </span>
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-3 h-3 ${
                                idx < r.rating ? 'fill-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
