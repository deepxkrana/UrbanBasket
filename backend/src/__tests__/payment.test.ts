import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import {
  Role,
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  Prisma,
} from '@prisma/client';

describe('Phase 7: Payments and Order Lifecycle', () => {
  const customerToken = 'demo-token-customer';
  const vendorToken = 'demo-token-vendor';

  const mockCustomer = {
    id: 'cust-uuid-1',
    supabaseUserId: 'supa-cust-1',
    name: 'Demo Customer',
    email: 'customer@urbanbasket.com',
    role: Role.CUSTOMER,
    vendorProfile: null,
  };

  const mockVendorProfile = {
    id: 'vendor-uuid-1',
    userId: 'vendor-user-uuid-1',
    storeName: 'Urban Tech Store',
    storeSlug: 'urban-tech-store',
    status: 'APPROVED',
    commissionRate: new Prisma.Decimal(0.10),
  };

  const mockVendorUser = {
    id: 'vendor-user-uuid-1',
    supabaseUserId: 'supa-vendor-1',
    name: 'Demo Vendor Owner',
    email: 'technest@urbanbasket.com',
    role: Role.VENDOR,
    vendorProfile: mockVendorProfile,
  };

  const mockOrderItem = {
    id: 'item-uuid-1',
    orderId: 'order-uuid-1',
    productId: 'prod-uuid-1',
    vendorId: mockVendorProfile.id,
    quantity: 2,
    unitPrice: new Prisma.Decimal(50.00),
    subtotal: new Prisma.Decimal(100.00),
    vendorPayout: new Prisma.Decimal(90.00),
    status: OrderStatus.PLACED,
    product: {
      id: 'prod-uuid-1',
      name: 'Noise Cancelling Headphones',
      slug: 'noise-cancelling-headphones',
      price: new Prisma.Decimal(50.00),
      stock: 20,
      images: [{ publicUrl: 'https://example.com/item.jpg' }],
    },
    vendor: {
      id: mockVendorProfile.id,
      storeName: 'Urban Tech Store',
      storeSlug: 'urban-tech-store',
    },
  };

  const mockOrder = {
    id: 'order-uuid-1',
    customerId: mockCustomer.id,
    addressId: 'addr-uuid-1',
    status: OrderStatus.PLACED,
    subtotal: new Prisma.Decimal(100.00),
    discount: new Prisma.Decimal(0.00),
    total: new Prisma.Decimal(100.00),
    platformCommission: new Prisma.Decimal(10.00),
    paymentStatus: PaymentStatus.PENDING,
    paymentProvider: null,
    paymentReference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: mockCustomer,
    address: {
      id: 'addr-uuid-1',
      name: 'Demo Customer',
      phone: '9876543210',
      line1: '123 Market St',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
    },
    items: [mockOrderItem],
    statusHistory: [],
    payments: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    // Default profile mocking based on email or id
    vi.spyOn(prisma.profile, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where.email === 'technest@urbanbasket.com' || args.where.id === mockVendorUser.id) {
        return mockVendorUser as any;
      }
      return mockCustomer as any;
    });

    vi.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue(mockVendorProfile as any);

    // Mock prisma.$transaction to pass through callback with mock prisma
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return callback(prisma);
    });

    // Default spies for database mutation operations
    vi.spyOn(prisma.product, 'update').mockResolvedValue({} as any);
    vi.spyOn(prisma.order, 'update').mockResolvedValue(mockOrder as any);
    vi.spyOn(prisma.payment, 'upsert').mockResolvedValue({} as any);
    vi.spyOn(prisma.vendorPayout, 'upsert').mockResolvedValue({} as any);
    vi.spyOn(prisma.orderStatusHistory, 'create').mockResolvedValue({} as any);
    vi.spyOn(prisma.orderItem, 'updateMany').mockResolvedValue({ count: 1 } as any);
  });

  it('should reject webhook requests without a signature (400 INVALID_WEBHOOK_SIGNATURE)', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .send({ orderId: mockOrder.id, status: 'COMPLETED' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('should allow customer to create payment intent for their order', async () => {
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
    vi.spyOn(prisma.order, 'update').mockResolvedValue({
      ...mockOrder,
      paymentProvider: PaymentProvider.STRIPE,
      paymentReference: 'pi_test_mock',
    } as any);

    const res = await request(app)
      .post('/api/v1/payments/create-intent')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId: mockOrder.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBe(mockOrder.id);
    expect(res.body.data.amount).toBe(100);
    expect(res.body.data.clientSecret).toBeDefined();
  });

  it('should prevent another user from creating payment intent for someone else order (403 FORBIDDEN)', async () => {
    // Order belongs to mockCustomer.id, but request is sent with vendor token
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);

    const res = await request(app)
      .post('/api/v1/payments/create-intent')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ orderId: mockOrder.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should atomically process payment callback: reduce stock and create payouts', async () => {
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      ...mockOrder,
      paymentStatus: PaymentStatus.PENDING,
    } as any);

    const productUpdateSpy = vi.spyOn(prisma.product, 'update').mockResolvedValue({} as any);
    const orderUpdateSpy = vi.spyOn(prisma.order, 'update').mockResolvedValue({} as any);
    const payoutUpsertSpy = vi.spyOn(prisma.vendorPayout, 'upsert').mockResolvedValue({} as any);
    const historySpy = vi.spyOn(prisma.orderStatusHistory, 'create').mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('stripe-signature', 'valid_test_signature')
      .send({
        orderId: mockOrder.id,
        providerPaymentId: 'pi_test_123',
        status: 'COMPLETED',
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.idempotent).toBe(false);

    // ACCEPTANCE CRITERIA: Successful payments reduce stock exactly once
    expect(productUpdateSpy).toHaveBeenCalledWith({
      where: { id: mockOrderItem.productId },
      data: { stock: { decrement: mockOrderItem.quantity } },
    });

    // Order status updated
    expect(orderUpdateSpy).toHaveBeenCalledWith({
      where: { id: mockOrder.id },
      data: expect.objectContaining({
        paymentStatus: PaymentStatus.COMPLETED,
        paymentReference: 'pi_test_123',
      }),
    });

    // Payout record created with correct split vendor payout amount
    expect(payoutUpsertSpy).toHaveBeenCalledWith({
      where: { orderItemId: mockOrderItem.id },
      create: {
        vendorId: mockOrderItem.vendorId,
        orderItemId: mockOrderItem.id,
        amount: mockOrderItem.vendorPayout,
        status: 'PENDING',
      },
      update: {
        amount: mockOrderItem.vendorPayout,
      },
    });

    // Status history recorded
    expect(historySpy).toHaveBeenCalled();
  });

  it('should handle duplicate webhooks idempotently without reducing stock a second time', async () => {
    // Order already marked COMPLETED
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      ...mockOrder,
      paymentStatus: PaymentStatus.COMPLETED,
    } as any);

    const productUpdateSpy = vi.spyOn(prisma.product, 'update');
    const orderUpdateSpy = vi.spyOn(prisma.order, 'update');

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('stripe-signature', 'valid_test_signature')
      .send({
        orderId: mockOrder.id,
        providerPaymentId: 'pi_test_123',
        status: 'COMPLETED',
      });

    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);

    // Product stock was NOT decremented again
    expect(productUpdateSpy).not.toHaveBeenCalled();
    expect(orderUpdateSpy).not.toHaveBeenCalled();
  });

  it('should not reduce stock when payment fails', async () => {
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      ...mockOrder,
      paymentStatus: PaymentStatus.PENDING,
    } as any);

    const productUpdateSpy = vi.spyOn(prisma.product, 'update');
    const orderUpdateSpy = vi.spyOn(prisma.order, 'update').mockResolvedValue({} as any);
    const paymentUpsertSpy = vi.spyOn(prisma.payment, 'upsert').mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('stripe-signature', 'valid_test_signature')
      .send({
        orderId: mockOrder.id,
        providerPaymentId: 'pi_failed_123',
        status: 'FAILED',
      });

    expect(res.status).toBe(200);

    // ACCEPTANCE CRITERIA: Failed payments do not reduce stock
    expect(productUpdateSpy).not.toHaveBeenCalled();
    expect(orderUpdateSpy).toHaveBeenCalledWith({
      where: { id: mockOrder.id },
      data: expect.objectContaining({
        paymentStatus: PaymentStatus.FAILED,
      }),
    });
    expect(paymentUpsertSpy).toHaveBeenCalled();
  });

  it('should allow customer to fetch order history and single order details', async () => {
    vi.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as any);
    vi.spyOn(prisma.order, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);

    const listRes = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.pagination).toBeDefined();

    const detailRes = await request(app)
      .get(`/api/v1/orders/${mockOrder.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.id).toBe(mockOrder.id);
    expect(detailRes.body.data.total).toBe(100);
    expect(detailRes.body.data.items.length).toBe(1);
  });

  it('should enforce allowed vendor order status transitions: PLACED -> PACKED -> SHIPPED -> DELIVERED', async () => {
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
    vi.spyOn(prisma.orderItem, 'updateMany').mockResolvedValue({ count: 1 } as any);
    vi.spyOn(prisma.orderItem, 'findMany').mockResolvedValue([{ ...mockOrderItem, status: OrderStatus.PACKED }] as any);
    vi.spyOn(prisma.order, 'update').mockResolvedValue({ ...mockOrder, status: OrderStatus.PACKED } as any);
    vi.spyOn(prisma.orderStatusHistory, 'create').mockResolvedValue({} as any);

    // 1. Invalid jump: PLACED -> DELIVERED should fail
    const invalidRes = await request(app)
      .patch(`/api/v1/vendors/me/orders/${mockOrder.id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: OrderStatus.DELIVERED });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    // 2. Valid transition: PLACED -> PACKED
    const validRes = await request(app)
      .patch(`/api/v1/vendors/me/orders/${mockOrder.id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: OrderStatus.PACKED, note: 'Items packed in warehouse' });

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.newStatus).toBe(OrderStatus.PACKED);

    // 3. For an order already DELIVERED, any transition must fail
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.DELIVERED,
    } as any);

    const terminalRes = await request(app)
      .patch(`/api/v1/vendors/me/orders/${mockOrder.id}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status: OrderStatus.SHIPPED });

    expect(terminalRes.status).toBe(400);
    expect(terminalRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should prevent customer from modifying order status directly or cancelling delivered orders', async () => {
    // 1. Delivered order cannot be cancelled by customer
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.DELIVERED,
    } as any);

    const cancelRes = await request(app)
      .patch(`/api/v1/orders/${mockOrder.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.error.code).toBe('CANNOT_CANCEL_ORDER');

    // 2. Customer cannot update status through vendor route (403 FORBIDDEN via requireVendor)
    const vendorRouteRes = await request(app)
      .patch(`/api/v1/vendors/me/orders/${mockOrder.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: OrderStatus.DELIVERED });

    expect(vendorRouteRes.status).toBe(403);
    expect(vendorRouteRes.body.error.code).toBe('FORBIDDEN');
  });
});
