import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Star, Store, Package, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductDetailModal, DetailedProduct } from './ProductDetailModal';

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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <ProductDetailModal
        slug={selectedProductSlug}
        onClose={() => setSelectedProductSlug(null)}
        onAddToCart={(p: DetailedProduct) => {
          console.log('Product added to session cart:', p.name);
        }}
      />

      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search electronics, lifestyle, kitchen..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {/* Sorting */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Sort by:</span>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortField(f);
                setSortOrder(o as 'asc' | 'desc');
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:border-emerald-500 transition"
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
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            selectedCategory === 'all'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === c.slug
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Main Content: Sidebar Filters + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filters</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-slate-500 hover:text-emerald-400 flex items-center space-x-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Price Range ($)</label>
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
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Customer Rating Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Customer Rating</label>
            <div className="space-y-1.5">
              {[4, 3, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setMinRating(minRating === r.toString() ? '' : r.toString());
                    setPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                    minRating === r.toString()
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-center space-x-1 text-amber-400">
                    {[...Array(5)].map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-3.5 h-3.5 ${
                          idx < r ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] text-slate-300 ml-1.5">& Up</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* In Stock Only */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-300 font-medium">In Stock Only</span>
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
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 animate-pulse"
                >
                  <div className="w-full aspect-square rounded-xl bg-slate-800/60"></div>
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
                  <div className="h-5 bg-slate-800/80 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No products match your criteria</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                Try adjusting your search keywords, price filters, or category selection.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductSlug(p.slug)}
                  className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:shadow-emerald-500/5"
                >
                  <div>
                    {/* Image */}
                    <div className="w-full aspect-square rounded-xl bg-slate-950 overflow-hidden relative mb-3">
                      {p.images[0]?.publicUrl ? (
                        <img
                          src={p.images[0].publicUrl}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <Package className="w-8 h-8" />
                        </div>
                      )}

                      {/* Stock badge */}
                      {p.stock === 0 && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/80 text-white backdrop-blur-sm">
                          Sold Out
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-emerald-400 uppercase tracking-wide">
                        {p.category.name}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Store className="w-3 h-3 text-teal-400" />
                        <span className="truncate max-w-[90px]">{p.vendor.storeName}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-sm tracking-tight line-clamp-1 mb-1.5 group-hover:text-emerald-400 transition-colors">
                      {p.name}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center space-x-1.5 mb-3">
                      <div className="flex text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200">
                        {Number(p.averageRating).toFixed(1)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({p.reviewCount})
                      </span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-lg font-black text-white font-mono">
                      ${Number(p.price).toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 group-hover:underline">
                      View Item &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Showing Page <span className="text-white font-bold">{pagination.page}</span> of{' '}
                <span className="text-white font-bold">{pagination.totalPages}</span> ({pagination.total} products)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition flex items-center space-x-1"
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
