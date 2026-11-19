import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image: string | null;
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
  };
  itemSubtotal: number;
}

export interface AppliedCoupon {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  discountAmount: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  discount: number;
  finalTotal: number;
  appliedCoupon: AppliedCoupon | null;
  loading: boolean;
  error: string | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  const fetchCart = useCallback(async () => {
    if (!token) {
      setItems([]);
      setTotalItems(0);
      setSubtotal(0);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${getApiUrl()}/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setTotalItems(json.data.totalItems || 0);
        setSubtotal(json.data.subtotal || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, profile]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!token) {
      throw new Error('Please sign in to add items to your cart.');
    }
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to add item to cart');
      }
      setItems(json.data.items);
      setTotalItems(json.data.totalItems);
      setSubtotal(json.data.subtotal);
      setIsCartOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding to cart';
      setError(msg);
      throw err;
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/cart/items/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update quantity');
      }
      setItems(json.data.items);
      setTotalItems(json.data.totalItems);
      setSubtotal(json.data.subtotal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating quantity';
      setError(msg);
      throw err;
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/cart/items/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotalItems(json.data.totalItems);
        setSubtotal(json.data.subtotal);
      }
    } catch (err) {
      console.warn('Remove item failed:', err);
    }
  };

  const clearCart = async () => {
    if (!token) return;
    try {
      await fetch(`${getApiUrl()}/cart`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItems([]);
      setTotalItems(0);
      setSubtotal(0);
      setAppliedCoupon(null);
    } catch (err) {
      console.warn('Clear cart failed:', err);
    }
  };

  const applyCoupon = async (code: string) => {
    if (!token) {
      throw new Error('Please sign in to apply promotional coupons.');
    }
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, subtotal }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Invalid coupon code');
      }
      setAppliedCoupon({
        code: json.data.code,
        type: json.data.type,
        value: json.data.value,
        discountAmount: json.data.discountAmount,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply coupon';
      setError(msg);
      throw err;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setError(null);
  };

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = parseFloat(Math.max(0, subtotal - discount).toFixed(2));

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        discount,
        finalTotal,
        appliedCoupon,
        loading,
        error,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
