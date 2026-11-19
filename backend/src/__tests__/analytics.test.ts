import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import {
  Role,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  Prisma,
} from '@prisma/client';

describe('Phase 9: Admin Analytics and Monitoring', () => {
  const customerToken = 'demo-token-customer';
  const vendorToken = 'demo-token-vendor';
  const adminToken = 'demo-token-admin';

  const mockCustomer = {
    id: 'user-cust-001',
    name: 'Customer One',
    email: 'customer@urbanbasket.com',
    role: Role.CUSTOMER,
    vendorProfile: null,
  };

  const mockVendorProfile = {
    id: 'vendor-prof-001',
    userId: 'user-vend-001',
    storeName: 'Tech Nest',
    storeSlug: 'tech-nest',
    status: 'APPROVED',
    commissionRate: new Prisma.Decimal(0.10),
  };

  const mockVendorUser = {
    id: 'user-vend-001',
    name: 'Vendor One',
    email: 'technest@urbanbasket.com',
    role: Role.VENDOR,
    vendorProfile: mockVendorProfile,
  };

  const mockAdmin = {
    id: 'user-admin-001',
    name: 'Admin One',
    email: 'admin@urbanbasket.com',
    role: Role.ADMIN,
    vendorProfile: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(prisma.profile, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where.email === 'admin@urbanbasket.com') return mockAdmin as any;
      if (args.where.email === 'technest@urbanbasket.com' || args.where.id === mockVendorUser.id) {
        return mockVendorUser as any;
      }
      return mockCustomer as any;
    });

    vi.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue(mockVendorProfile as any);
  });

  describe('Admin Analytics Security Guards', () => {
    it('should reject unauthenticated request for admin analytics (401 UNAUTHORIZED)', async () => {
      const res = await request(app).get('/api/v1/admin/analytics');
      expect(res.status).toBe(401);
    });

    it('should prevent customer from accessing admin analytics (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should prevent vendor from accessing admin analytics (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Admin Analytics Calculations & Ledger Verification', () => {
    it('should accurately calculate gross revenue, separate commission, and vendor payouts', async () => {
      // Mock completed orders: Total $1000, Commission $100 -> Payouts $900
      vi.spyOn(prisma.order, 'findMany').mockResolvedValue([
        {
          total: new Prisma.Decimal(600.00),
          platformCommission: new Prisma.Decimal(60.00),
          subtotal: new Prisma.Decimal(600.00),
          discount: new Prisma.Decimal(0.00),
          createdAt: new Date(),
        },
        {
          total: new Prisma.Decimal(400.00),
          platformCommission: new Prisma.Decimal(40.00),
          subtotal: new Prisma.Decimal(400.00),
          discount: new Prisma.Decimal(0.00),
          createdAt: new Date(),
        },
      ] as any);

      vi.spyOn(prisma.order, 'count').mockResolvedValue(10);
      vi.spyOn(prisma.order, 'groupBy').mockResolvedValue([
        { status: OrderStatus.PLACED, _count: { id: 3 } },
        { status: OrderStatus.DELIVERED, _count: { id: 7 } },
      ] as any);

      vi.spyOn(prisma.profile, 'count').mockResolvedValue(25); // Customers
      vi.spyOn(prisma.vendorProfile, 'groupBy').mockResolvedValue([
        { status: 'APPROVED', _count: { id: 4 } },
        { status: 'PENDING', _count: { id: 1 } },
      ] as any);
      vi.spyOn(prisma.product, 'count').mockResolvedValue(42);

      // Top order items
      vi.spyOn(prisma.orderItem, 'groupBy').mockImplementation(async (args: any) => {
        if (args.by.includes('productId')) {
          return [
            {
              productId: 'prod-1',
              _sum: { quantity: 15, subtotal: new Prisma.Decimal(750) },
            },
          ] as any;
        }
        return [
          {
            vendorId: 'vendor-prof-001',
            _sum: {
              subtotal: new Prisma.Decimal(1000),
              vendorPayout: new Prisma.Decimal(900),
            },
          },
        ] as any;
      });

      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Mechanical Keyboard',
          slug: 'mechanical-keyboard',
          price: new Prisma.Decimal(50),
        },
      ] as any);

      vi.spyOn(prisma.vendorProfile, 'findMany').mockResolvedValue([
        {
          id: 'vendor-prof-001',
          storeName: 'Tech Nest',
          storeSlug: 'tech-nest',
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { financials, orders, growth, topProducts, topVendors } = res.body.data;

      // ACCEPTANCE CRITERIA: Commission is separate from vendor payout
      expect(financials.grossRevenue).toBe(1000);
      expect(financials.platformCommission).toBe(100);
      expect(financials.vendorPayouts).toBe(900);
      expect(financials.platformCommission + financials.vendorPayouts).toBe(financials.grossRevenue);

      // ACCEPTANCE CRITERIA: Analytics counts match database records
      expect(orders.total).toBe(10);
      expect(orders.byStatus.PLACED).toBe(3);
      expect(orders.byStatus.DELIVERED).toBe(7);

      expect(growth.totalCustomers).toBe(25);
      expect(growth.vendors.TOTAL).toBe(5);
      expect(growth.vendors.APPROVED).toBe(4);
      expect(growth.publishedProducts).toBe(42);

      expect(topProducts.length).toBe(1);
      expect(topProducts[0].name).toBe('Mechanical Keyboard');
      expect(topProducts[0].unitsSold).toBe(15);

      expect(topVendors.length).toBe(1);
      expect(topVendors[0].storeName).toBe('Tech Nest');
    });
  });

  describe('Vendor Analytics', () => {
    it('should return store-specific sales, payouts, and status distribution for vendor', async () => {
      vi.spyOn(prisma.orderItem, 'findMany').mockImplementation(async (args: any) => {
        if (args.select?.status) {
          return [
            { status: OrderStatus.PLACED },
            { status: OrderStatus.DELIVERED },
          ] as any;
        }
        return [
          {
            productId: 'p-1',
            quantity: 2,
            subtotal: new Prisma.Decimal(100),
            vendorPayout: new Prisma.Decimal(90),
            product: { id: 'p-1', name: 'USB-C Cable', slug: 'usb-c-cable' },
          },
        ] as any;
      });

      const res = await request(app)
        .get('/api/v1/vendors/me/analytics')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.storeName).toBe('Tech Nest');
      expect(res.body.data.financials.totalRevenue).toBe(100);
      expect(res.body.data.financials.netPayout).toBe(90);
      expect(res.body.data.financials.platformCommissionPaid).toBe(10);
      expect(res.body.data.financials.totalItemsSold).toBe(2);
      expect(res.body.data.topProducts.length).toBe(1);
    });

    it('should forbid customer from accessing vendor analytics (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/v1/vendors/me/analytics')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Health and Uptime Monitoring Endpoint', () => {
    it('should maintain available health check for Uptime monitoring (200 status ok)', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('UrbanBasket API');
      expect(res.body.uptime).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.system).toBeDefined();
    });
  });
});
