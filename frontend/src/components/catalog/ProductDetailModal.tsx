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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-xl text-[#171717] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6b7280] hover:text-[#171717] rounded-full hover:bg-[#fafafa] transition z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-7 h-7 rounded-full border-2 border-[#171717] border-t-transparent animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-[#6b7280] font-medium">Loading product specifications...</p>
          </div>
        ) : error || !product ? (
          <div className="py-20 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-[#6b7280] mx-auto" />
            <h3 className="text-base font-semibold text-[#171717]">Item Unavailable</h3>
            <p className="text-xs text-[#6b7280] max-w-xs mx-auto">
              {error || 'This product is no longer available in the public catalog.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product Gallery */}
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-xl bg-[#fafafa] border border-[#e5e7eb] overflow-hidden relative">
                  {product.images[activeImageIndex] ? (
                    <img
                      src={product.images[activeImageIndex].publicUrl}
                      alt={product.images[activeImageIndex].altText || product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#9ca3af] text-sm">
                      No Image Available
                    </div>
                  )}

                  {product.stock > 0 ? (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase bg-white border border-[#e5e7eb] text-[#171717] shadow-xs">
                      In Stock ({product.stock})
                    </span>
                  ) : (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase bg-[#171717] text-white">
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
                        className={`w-14 h-14 rounded-lg overflow-hidden border transition cursor-pointer flex-shrink-0 ${
                          activeImageIndex === idx
                            ? 'border-[#171717] ring-1 ring-[#171717]'
                            : 'border-[#e5e7eb] opacity-60 hover:opacity-100'
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
                    <span className="text-[#171717] font-medium uppercase tracking-wider text-[10px]">
                      {product.category.name}
                    </span>
                    <span className="text-[#e5e7eb]">&bull;</span>
                    <div className="flex items-center space-x-1 text-[#6b7280]">
                      <Store className="w-3.5 h-3.5 text-[#6b7280]" />
                      <span className="text-[#171717] font-medium">{product.vendor.storeName}</span>
                    </div>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-normal text-[#171717] tracking-tight leading-snug mb-3">
                    {product.name}
                  </h1>

                  {/* Rating summary */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.round(Number(product.averageRating))
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-[#e5e7eb]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-[#171717]">
                      {Number(product.averageRating).toFixed(1)}
                    </span>
                    <span className="text-xs text-[#6b7280]">
                      ({product.reviewCount} customer {product.reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-2xl md:text-3xl font-semibold text-[#171717] mb-6 font-mono">
                    ${Number(product.price).toFixed(2)}
                  </div>

                  {/* Description */}
                  <div className="text-xs md:text-sm text-[#6b7280] leading-relaxed mb-6">
                    <p>{product.description}</p>
                  </div>
                </div>

                {/* Purchase Controls */}
                <div className="pt-6 border-t border-[#e5e7eb] space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center rounded-full border border-[#e5e7eb] bg-[#fafafa] p-1">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1 || product.stock === 0}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b7280] hover:text-[#171717] hover:bg-white disabled:opacity-30 transition font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-xs font-semibold text-[#171717] font-mono">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        disabled={quantity >= product.stock || product.stock === 0}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b7280] hover:text-[#171717] hover:bg-white disabled:opacity-30 transition font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock === 0}
                      className="flex-1 py-3 px-6 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs uppercase tracking-wider transition shadow-xs disabled:opacity-40 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                    </button>
                  </div>

                  {addedNotice && (
                    <div className="p-3 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-[#171717] text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#171717] flex-shrink-0" />
                      <span>Added {quantity} unit(s) of this item to your cart!</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-[11px] text-[#6b7280] pt-1">
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#171717]" />
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
              <div className="pt-8 border-t border-[#e5e7eb]">
                <h3 className="text-sm font-semibold text-[#171717] mb-4">
                  Verified Buyer Reviews ({product.reviews.length})
                </h3>
                <div className="space-y-3">
                  {product.reviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-lg bg-[#fafafa] border border-[#e5e7eb]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-[#171717]">{r.customer.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#e5e7eb] text-[#6b7280] font-medium">
                            Verified Purchase
                          </span>
                        </div>
                        <div className="flex text-amber-500">
                          {[...Array(5)].map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-3 h-3 ${
                                idx < r.rating ? 'fill-amber-400 text-amber-400' : 'text-[#e5e7eb]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[#6b7280]">{r.comment}</p>
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
