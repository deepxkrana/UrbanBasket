import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { CartService } from '../services/cart.service';
import { Role, ProductStatus, CouponType, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

describe('Phase 6: Cart and Checkout Workflows', () => {
  const mockCustomer = {
    id: 'user-cust-001',
    supabaseUserId: 'supa-cust-001',
    name: 'Customer One',
    email: 'customer@urbanbasket.com',
    role: Role.CUSTOMER,
    vendorProfile: null,
    addresses: [],
  };

  const mockProduct = {
    id: 'prod-item-1',
    name: 'Wireless Headphones',
    slug: 'wireless-headphones',
    price: new Prisma.Decimal(100.00),
    stock: 5,
    status: ProductStatus.PUBLISHED,
    vendorId: 'vendor-1',
    vendor: {
      id: 'vendor-1',
      storeName: 'TechStore',
      storeSlug: 'techstore',
      status: 'APPROVED',
      commissionRate: new Prisma.Decimal(0.10),
    },
    images: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockCustomer as any);
  });

  it('should reject adding item to cart when quantity exceeds available stock (400 STOCK_LIMIT_EXCEEDED)', async () => {
    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);

    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        productId: mockProduct.id,
        quantity: 10, // Stock is only 5
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('STOCK_LIMIT_EXCEEDED');
    expect(res.body.error.message).toContain('Current available stock is 5');
  });

  it('should prevent adding unpublished products to cart (404 PRODUCT_UNAVAILABLE)', async () => {
    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      ...mockProduct,
      status: ProductStatus.DRAFT, // Not published
    } as any);

    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        productId: mockProduct.id,
        quantity: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_UNAVAILABLE');
  });

  it('should calculate coupon discount accurately and reject when minimum subtotal is not met', async () => {
    const mockCoupon = {
      id: 'coupon-1',
      code: 'FLAT25',
      type: CouponType.FIXED,
      value: new Prisma.Decimal(25.00),
      minimumAmount: new Prisma.Decimal(100.00),
      usageLimit: 10,
      usedCount: 0,
      startsAt: new Date(Date.now() - 10000),
      expiresAt: new Date(Date.now() + 1000000),
      isActive: true,
    };

    vi.spyOn(prisma.coupon, 'findUnique').mockResolvedValue(mockCoupon as any);

    // 1. Subtotal < minimumAmount ($50 < $100) -> 400
    const failRes = await request(app)
      .post('/api/v1/coupons/validate')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        code: 'FLAT25',
        subtotal: 50,
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error.code).toBe('MINIMUM_AMOUNT_NOT_MET');

    // 2. Subtotal >= minimumAmount ($150 >= $100) -> 200
    const successRes = await request(app)
      .post('/api/v1/coupons/validate')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        code: 'FLAT25',
        subtotal: 150,
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.data.discountAmount).toBe(25);
    expect(successRes.body.data.finalTotal).toBe(125);
  });

  it('should reject coupon when usage limit has been reached', async () => {
    vi.spyOn(prisma.coupon, 'findUnique').mockResolvedValue({
      id: 'coupon-limit',
      code: 'EXHAUSTED',
      type: CouponType.PERCENTAGE,
      value: new Prisma.Decimal(10.00),
      minimumAmount: new Prisma.Decimal(10.00),
      usageLimit: 5,
      usedCount: 5, // Limit reached
      startsAt: new Date(Date.now() - 10000),
      expiresAt: new Date(Date.now() + 1000000),
      isActive: true,
    } as any);

    const res = await request(app)
      .post('/api/v1/coupons/validate')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        code: 'EXHAUSTED',
        subtotal: 100,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COUPON_LIMIT_REACHED');
  });

  it('should prevent checkout on empty cart (400 CART_EMPTY)', async () => {
    vi.spyOn(prisma.address, 'findUnique').mockResolvedValue({
      id: 'addr-1',
      userId: mockCustomer.id,
    } as any);

    vi.spyOn(CartService, 'getCart').mockResolvedValue({
      items: [],
      totalItems: 0,
      subtotal: 0,
    });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        addressId: 'addr-1',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });

  it('should create order atomically with split payouts, platform commission, and clear cart', async () => {
    vi.spyOn(prisma.address, 'findUnique').mockResolvedValue({
      id: 'addr-1',
      userId: mockCustomer.id,
    } as any);

    vi.spyOn(CartService, 'getCart').mockResolvedValue({
      items: [
        {
          productId: mockProduct.id,
          quantity: 2,
          name: mockProduct.name,
          slug: mockProduct.slug,
          price: 100.0,
          stock: 5,
          image: null,
          vendor: mockProduct.vendor,
          itemSubtotal: 200.0,
        },
      ],
      totalItems: 2,
      subtotal: 200.0,
    });

    const clearCartSpy = vi.spyOn(CartService, 'clearCart').mockResolvedValue();

    // Mock prisma.$transaction to simulate the checkout creation
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const mockTx = {
        product: {
          findUnique: vi.fn().mockResolvedValue(mockProduct),
        },
        coupon: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        order: {
          create: vi.fn().mockResolvedValue({
            id: 'ord-test-12345',
            customerId: mockCustomer.id,
            addressId: 'addr-1',
            status: OrderStatus.PLACED,
            subtotal: new Prisma.Decimal(200.00),
            discount: new Prisma.Decimal(0.00),
            total: new Prisma.Decimal(200.00),
            platformCommission: new Prisma.Decimal(20.00), // 10% of 200
            paymentStatus: PaymentStatus.PENDING,
            items: [
              {
                id: 'item-1',
                productId: mockProduct.id,
                quantity: 2,
                unitPrice: new Prisma.Decimal(100.00),
                subtotal: new Prisma.Decimal(200.00),
                vendorPayout: new Prisma.Decimal(180.00), // 200 - 20
                product: { name: mockProduct.name, slug: mockProduct.slug },
                vendor: { storeName: mockProduct.vendor.storeName },
              },
            ],
          }),
        },
      };
      return callback(mockTx);
    });

    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        addressId: 'addr-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBe('ord-test-12345');
    expect(res.body.data.total).toBe(200);
    expect(res.body.data.items[0].vendor).toBe('TechStore');
    expect(clearCartSpy).toHaveBeenCalledWith(mockCustomer.id);
  });
});
