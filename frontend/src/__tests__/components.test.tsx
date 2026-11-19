import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthModal } from '../components/auth/AuthModal';
import { ReviewModal } from '../components/reviews/ReviewModal';
import { AuthProvider } from '../context/AuthContext';

// Mock fetch globally for frontend component tests
beforeEach(() => {
  vi.restoreAllMocks();
  (globalThis as any).fetch = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/categories')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
            { id: 'cat-2', name: 'Home & Kitchen', slug: 'home-kitchen' },
          ],
        }),
      };
    }
    if (url.includes('/products')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        }),
      };
    }
    if (url.includes('/cart')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { items: [], subtotal: 0, total: 0 },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({ success: true, data: {} }),
    };
  });
});

describe('Phase 10: Frontend Component Tests', () => {
  describe('AuthModal Component', () => {
    it('should render 1-click test roles and form inputs', () => {
      render(
        <AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} />
        </AuthProvider>
      );

      expect(screen.getByText(/1-Click Quick Demo Evaluation/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Customer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Vendor/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
    });

    it('should toggle between Sign In and Registration forms', () => {
      render(
        <AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} />
        </AuthProvider>
      );

      const toggleBtn = screen.getByRole('button', { name: /Don't have an account\? Create one/i });
      fireEvent.click(toggleBtn);

      expect(screen.getByText(/Create Your Account/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/John Doe/i)).toBeInTheDocument();
    });
  });

  describe('ReviewModal Component', () => {
    it('should render product thumbnail and 5-star rating picker', () => {
      render(
        <AuthProvider>
          <ReviewModal
            isOpen={true}
            onClose={() => {}}
            orderItemId="item-123"
            productName="Noise Cancelling Headphones"
            productImage="https://example.com/test.jpg"
            onReviewSubmitted={() => {}}
          />
        </AuthProvider>
      );

      expect(screen.getByText(/Rate & Review Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Noise Cancelling Headphones/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/What did you like or dislike/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
    });

    it('should validate comment before submitting review', async () => {
      render(
        <AuthProvider>
          <ReviewModal
            isOpen={true}
            onClose={() => {}}
            orderItemId="item-123"
            productName="Noise Cancelling Headphones"
            onReviewSubmitted={() => {}}
          />
        </AuthProvider>
      );

      const submitBtn = screen.getByRole('button', { name: /Submit Review/i });
      fireEvent.click(submitBtn);

      // Comment is required
      expect(screen.getByPlaceholderText(/What did you like or dislike/i)).toBeRequired();
    });
  });
});
