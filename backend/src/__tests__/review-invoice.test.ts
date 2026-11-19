import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import {
  Role,
  OrderStatus,
  PaymentStatus,
  ReviewStatus,
  CouponType,
  Prisma,
} from '@prisma/client';

describe('Phase 8: Reviews, Coupons, and Invoices', () => {
  const customerToken = 'demo-token-customer';
  const otherCustomerToken = 'demo-token-vendor'; // different user id
  const adminToken = 'demo-token-admin';

  const mockCustomer = {
    id: 'user-cust-001',
    supabaseUserId: 'supa-cust-001',
    name: 'Customer One',
    email: 'customer@urbanbasket.com',
    role: Role.CUSTOMER,
    vendorProfile: null,
  };

  const mockAdmin = {
    id: 'user-admin-001',
    supabaseUserId: 'supa-admin-001',
    name: 'Admin User',
    email: 'admin@urbanbasket.com',
    role: Role.ADMIN,
    vendorProfile: null,
  };

  const mockProduct = {
    id: 'prod-item-1',
    name: 'Ergonomic Desk Chair',
    slug: 'ergonomic-desk-chair',
    price: new Prisma.Decimal(250.00),
    stock: 15,
    averageRating: new Prisma.Decimal(0.00),
    reviewCount: 0,
    vendorId: 'vendor-1',
    vendor: { storeName: 'Comfort Living' },
  };

  const mockOrderItem = {
    id: 'order-item-1',
    orderId: 'order-1',
    productId: mockProduct.id,
    vendorId: 'vendor-1',
    quantity: 1,
    unitPrice: new Prisma.Decimal(250.00),
    subtotal: new Prisma.Decimal(250.00),
    vendorPayout: new Prisma.Decimal(225.00),
    status: OrderStatus.PLACED,
    order: {
      id: 'order-1',
      customerId: mockCustomer.id,
      status: OrderStatus.PLACED,
    },
    product: mockProduct,
    vendor: { storeName: 'Comfort Living' },
  };

  const mockDeliveredOrderItem = {
    ...mockOrderItem,
    id: 'order-item-delivered',
    status: OrderStatus.DELIVERED,
    order: {
      id: 'order-delivered-1',
      customerId: mockCustomer.id,
      status: OrderStatus.DELIVERED,
      subtotal: new Prisma.Decimal(250.00),
      discount: new Prisma.Decimal(0.00),
      total: new Prisma.Decimal(250.00),
      paymentStatus: PaymentStatus.COMPLETED,
      paymentProvider: 'STRIPE',
      paymentReference: 'pi_test_delivered',
      createdAt: new Date(),
      customer: mockCustomer,
      address: {
        name: 'Customer One',
        phone: '9876543210',
        line1: '123 Market St',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      },
      items: [mockOrderItem],
      couponUsages: [],
      payments: [],
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(prisma.profile, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where.email === 'admin@urbanbasket.com') return mockAdmin as any;
      return mockCustomer as any;
    });

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  // --------------------------------------------------------------------
  // Reviews & Verified Purchases
  // --------------------------------------------------------------------
  describe('Verified Purchase Reviews', () => {
    it('should reject review for items that are not yet delivered (400 ITEM_NOT_DELIVERED)', async () => {
      vi.spyOn(prisma.orderItem, 'findUnique').mockResolvedValue(mockOrderItem as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderItemId: mockOrderItem.id,
          rating: 5,
          comment: 'Fantastic build quality!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ITEM_NOT_DELIVERED');
    });

    it('should prevent reviewing someone else order item (403 FORBIDDEN)', async () => {
      vi.spyOn(prisma.orderItem, 'findUnique').mockResolvedValue({
        ...mockDeliveredOrderItem,
        order: { ...mockDeliveredOrderItem.order, customerId: 'different-customer-id' },
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderItemId: mockDeliveredOrderItem.id,
          rating: 4,
          comment: 'Great product.',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow customer to review a delivered purchased item', async () => {
      vi.spyOn(prisma.orderItem, 'findUnique').mockResolvedValue(mockDeliveredOrderItem as any);
      vi.spyOn(prisma.review, 'findUnique').mockResolvedValue(null); // No previous review
      vi.spyOn(prisma.review, 'create').mockResolvedValue({
        id: 'rev-1',
        customerId: mockCustomer.id,
        productId: mockProduct.id,
        orderItemId: mockDeliveredOrderItem.id,
        rating: 5,
        comment: 'Very comfortable and easy to assemble.',
        status: ReviewStatus.PENDING,
        createdAt: new Date(),
        product: mockProduct,
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderItemId: mockDeliveredOrderItem.id,
          rating: 5,
          comment: 'Very comfortable and easy to assemble.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.status).toBe(ReviewStatus.PENDING);
    });

    it('should prevent customer from submitting duplicate reviews for the same item (400 DUPLICATE_REVIEW)', async () => {
      vi.spyOn(prisma.orderItem, 'findUnique').mockResolvedValue(mockDeliveredOrderItem as any);
      // Mock existing review found
      vi.spyOn(prisma.review, 'findUnique').mockResolvedValue({
        id: 'rev-existing',
        orderItemId: mockDeliveredOrderItem.id,
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderItemId: mockDeliveredOrderItem.id,
          rating: 3,
          comment: 'Reviewing again.',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_REVIEW');
    });

    it('should recalculate product rating aggregates when admin approves a review', async () => {
      const mockReview = {
        id: 'rev-1',
        productId: mockProduct.id,
        status: ReviewStatus.PENDING,
      };

      vi.spyOn(prisma.review, 'findUnique').mockResolvedValue(mockReview as any);
      vi.spyOn(prisma.review, 'update').mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.APPROVED,
      } as any);

      // Simulate 2 approved reviews in database with ratings 5 and 4 (average: 4.5)
      vi.spyOn(prisma.review, 'findMany').mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
      ] as any);

      const productUpdateSpy = vi.spyOn(prisma.product, 'update').mockResolvedValue({} as any);

      const res = await request(app)
        .patch(`/api/v1/admin/reviews/${mockReview.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ReviewStatus.APPROVED });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.productRatingAggregates.averageRating).toBe(4.5);
      expect(res.body.data.productRatingAggregates.reviewCount).toBe(2);

      // ACCEPTANCE CRITERIA: Rating averages reflect approved reviews
      expect(productUpdateSpy).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
        data: {
          averageRating: new Prisma.Decimal(4.5),
          reviewCount: 2,
        },
      });
    });
  });

  // --------------------------------------------------------------------
  // Admin Coupon Management
  // --------------------------------------------------------------------
  describe('Admin Coupon Governance', () => {
    it('should forbid non-admin from creating or managing coupons (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          code: 'TESTCODE',
          type: CouponType.FIXED,
          value: 20,
          expiresAt: new Date(Date.now() + 100000).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin to create a new coupon with validation', async () => {
      vi.spyOn(prisma.coupon, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.coupon, 'create').mockResolvedValue({
        id: 'coup-new-1',
        code: 'SUMMER20',
        type: CouponType.PERCENTAGE,
        value: new Prisma.Decimal(20.00),
        minimumAmount: new Prisma.Decimal(50.00),
        maximumDiscount: new Prisma.Decimal(40.00),
        usageLimit: 100,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000),
        isActive: true,
      } as any);

      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'summer20', // Should be normalized uppercase
          type: CouponType.PERCENTAGE,
          value: 20,
          minimumAmount: 50,
          maximumDiscount: 40,
          usageLimit: 100,
          expiresAt: new Date(Date.now() + 1000000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('SUMMER20');
      expect(res.body.data.value).toBe(20);
    });

    it('should reject coupon with percentage value greater than 100 (400 INVALID_COUPON_VALUE)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'OVER100',
          type: CouponType.PERCENTAGE,
          value: 150, // Invalid percentage
          expiresAt: new Date(Date.now() + 1000000).toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_COUPON_VALUE');
    });

    it('should allow admin to update and deactivate coupons', async () => {
      const mockCoupon = {
        id: 'coup-1',
        code: 'SAVE15',
        type: CouponType.FIXED,
        value: new Prisma.Decimal(15.00),
        minimumAmount: new Prisma.Decimal(0.00),
        isActive: true,
        _count: { usages: 5 },
      };

      vi.spyOn(prisma.coupon, 'findUnique').mockResolvedValue(mockCoupon as any);
      vi.spyOn(prisma.coupon, 'update').mockResolvedValue({
        ...mockCoupon,
        isActive: false,
      } as any);

      const deleteRes = await request(app)
        .delete(`/api/v1/admin/coupons/${mockCoupon.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.message).toContain('was deactivated');
    });
  });

  // --------------------------------------------------------------------
  // Protected PDF Invoices
  // --------------------------------------------------------------------
  describe('Protected PDF Invoice Generation', () => {
    it('should reject unauthenticated request for order invoice (401 UNAUTHORIZED)', async () => {
      const res = await request(app).get('/api/v1/orders/any-order-id/invoice');
      expect(res.status).toBe(401);
    });

    it('should prevent unauthorized customer from downloading someone else invoice (403 FORBIDDEN)', async () => {
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
        id: 'order-123',
        customerId: 'someone-else-id',
        items: [],
      } as any);

      const res = await request(app)
        .get('/api/v1/orders/order-123/invoice')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should stream PDF tax invoice for authorized order customer', async () => {
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockDeliveredOrderItem.order as any);

      const res = await request(app)
        .get(`/api/v1/orders/${mockDeliveredOrderItem.order.id}/invoice`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain('UrbanBasket-Invoice');
      expect(res.body).toBeDefined();
    });
  });
});
