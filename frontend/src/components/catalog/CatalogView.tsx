import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Star, Store, Package, RotateCcw, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import { ProductDetailModal, DetailedProduct } from './ProductDetailModal';
import { useCart } from '../../context/CartContext';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  stock: number;
  averageRating: string | number;
  reviewCount: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
  };
  images: {
    id: string;
    publicUrl: string;
    altText?: string;
  }[];
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const CatalogView: React.FC = () => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch Categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch Products on any filter change
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, minPrice, maxPrice, minRating, inStockOnly, sortField, sortOrder, page]);

  const fetchCategories = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
      const res = await fetch(`${apiUrl}/categories`);
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
      const params = new URLSearchParams();

      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (minRating) params.append('minRating', minRating);
      if (inStockOnly) params.append('inStock', 'true');
      params.append('sort', sortField);
      params.append('order', sortOrder);
      params.append('page', page.toString());
      params.append('pageSize', '12');

      const res = await fetch(`${apiUrl}/products?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setProducts(json.data);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch catalog products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);
    setSortField('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const handleQuickAdd = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setAddingId(productId);
    try {
      await addToCart(productId, 1);
      setTimeout(() => setAddingId(null), 1200);
    } catch (err) {
      console.warn('Failed to quick add:', err);
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <ProductDetailModal
        slug={selectedProductSlug}
        onClose={() => setSelectedProductSlug(null)}
        onAddToCart={async (p: DetailedProduct, quantity: number) => {
          try {
            await addToCart(p.id, quantity);
          } catch (err) {
            console.warn('Failed to add to cart:', err);
          }
        }}
      />

      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-2.5 w-4 h-4 text-[#9ca3af]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, brands, materials..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#e5e7eb] rounded-full text-xs md:text-sm text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717] transition shadow-xs"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {/* Sorting */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#6b7280] font-medium">Sort by:</span>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortField(f);
                setSortOrder(o as 'asc' | 'desc');
                setPage(1);
              }}
              className="bg-white border border-[#e5e7eb] text-xs text-[#171717] py-2 px-3.5 rounded-full focus:outline-none focus:border-[#171717] transition shadow-xs cursor-pointer"
            >
              <option value="createdAt-desc">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Highest Rated</option>
              <option value="name-asc">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setPage(1);
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#171717] text-white shadow-xs'
              : 'bg-white border border-[#e5e7eb] text-[#6b7280] hover:text-[#171717] hover:border-[#9ca3af]'
          }`}
        >
          All Departments
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCategory(c.slug);
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === c.slug
                ? 'bg-[#171717] text-white shadow-xs'
                : 'bg-white border border-[#e5e7eb] text-[#6b7280] hover:text-[#171717] hover:border-[#9ca3af]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Main Content: Sidebar Filters + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6 bg-white border border-[#e5e7eb] rounded-lg p-5 h-fit shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb]">
            <div className="flex items-center space-x-2 text-xs font-medium uppercase tracking-wider text-[#171717]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#171717]" />
              <span>Filters</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#6b7280] hover:text-[#171717] flex items-center space-x-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-2">Price Range ($)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
              />
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-xs text-[#171717] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#171717]"
              />
            </div>
          </div>

          {/* Customer Rating Filter */}
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-2">Customer Rating</label>
            <div className="space-y-1">
              {[4, 3, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setMinRating(minRating === r.toString() ? '' : r.toString());
                    setPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition cursor-pointer ${
                    minRating === r.toString()
                      ? 'bg-[#fafafa] text-[#171717] font-medium border border-[#e5e7eb]'
                      : 'text-[#6b7280] hover:bg-[#fafafa] hover:text-[#171717]'
                  }`}
                >
                  <div className="flex items-center space-x-1 text-amber-500">
                    {[...Array(5)].map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-3.5 h-3.5 ${
                          idx < r ? 'fill-amber-400 text-amber-400' : 'text-[#e5e7eb]'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] text-[#6b7280] ml-1.5">& Up</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* In Stock Only */}
          <div className="pt-3 border-t border-[#e5e7eb]">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded border-[#e5e7eb] text-[#171717] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#171717]"
              />
              <span className="text-xs text-[#171717] font-medium">In Stock Only</span>
            </label>
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-white border border-[#e5e7eb] p-4 space-y-3 animate-pulse shadow-xs"
                >
                  <div className="w-full aspect-square rounded-md bg-[#fafafa]"></div>
                  <div className="h-4 bg-[#f3f4f6] rounded w-3/4"></div>
                  <div className="h-3 bg-[#f3f4f6] rounded w-1/2"></div>
                  <div className="h-5 bg-[#f3f4f6] rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center bg-white border border-[#e5e7eb] rounded-lg shadow-xs">
              <Package className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[#171717] mb-1">No products match your criteria</h3>
              <p className="text-xs text-[#6b7280] max-w-xs mx-auto mb-4">
                Try adjusting your search keywords, price filters, or category selection.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-full bg-[#171717] hover:bg-black text-xs font-medium text-white transition shadow-xs cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p) => {
                const isAdding = addingId === p.id;
                const isLowStock = p.stock > 0 && p.stock <= 5;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProductSlug(p.slug)}
                    className="group rounded-lg bg-white border border-[#e5e7eb] hover:border-[#171717] p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-sm relative"
                  >
                    <div>
                      {/* Image */}
                      <div className="w-full aspect-square rounded-md bg-[#fafafa] overflow-hidden relative mb-3 border border-[#f3f4f6]">
                        {p.images[0]?.publicUrl ? (
                          <img
                            src={p.images[0].publicUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#9ca3af]">
                            <Package className="w-8 h-8" />
                          </div>
                        )}

                        {/* Stock badge */}
                        {p.stock === 0 ? (
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#171717] text-white">
                            Sold Out
                          </span>
                        ) : isLowStock ? (
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Only {p.stock} left
                          </span>
                        ) : null}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-[11px] text-[#6b7280] mb-1">
                        <span className="font-medium text-[#171717] uppercase tracking-wide text-[10px]">
                          {p.category.name}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Store className="w-3 h-3 text-[#6b7280]" />
                          <span className="truncate max-w-[90px]">{p.vendor.storeName}</span>
                        </div>
                      </div>

                      {/* Product Title */}
                      <h3 className="font-medium text-[#171717] text-sm tracking-tight line-clamp-1 mb-1.5 group-hover:underline">
                        {p.name}
                      </h3>

                      {/* Rating */}
                      <div className="flex items-center space-x-1.5 mb-3">
                        <div className="flex text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-[#171717]">
                          {Number(p.averageRating).toFixed(1)}
                        </span>
                        <span className="text-[11px] text-[#9ca3af]">
                          ({p.reviewCount})
                        </span>
                      </div>
                    </div>

                    {/* Price & Quick Add */}
                    <div className="pt-3 border-t border-[#e5e7eb] flex items-center justify-between">
                      <span className="text-base font-semibold text-[#171717] font-mono">
                        ${Number(p.price).toFixed(2)}
                      </span>

                      {p.stock > 0 ? (
                        <button
                          onClick={(e) => handleQuickAdd(e, p.id)}
                          disabled={isAdding}
                          className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-[#171717] text-white hover:bg-black transition cursor-pointer shadow-xs"
                        >
                          {isAdding ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[#9ca3af] px-2 py-1">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-[#e5e7eb]">
              <span className="text-xs text-[#6b7280]">
                Page <span className="text-[#171717] font-medium">{pagination.page}</span> of{' '}
                <span className="text-[#171717] font-medium">{pagination.totalPages}</span> ({pagination.total} products)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-1.5 rounded-full border border-[#e5e7eb] bg-white text-xs font-medium text-[#171717] hover:bg-[#fafafa] disabled:opacity-40 transition flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={!pagination.hasNext}
                  className="px-4 py-1.5 rounded-full border border-[#e5e7eb] bg-white text-xs font-medium text-[#171717] hover:bg-[#fafafa] disabled:opacity-40 transition flex items-center space-x-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
