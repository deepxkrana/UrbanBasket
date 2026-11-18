import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { Role, VendorStatus, ProductStatus } from '@prisma/client';

describe('Phase 4: Vendor Onboarding and Product CRUD', () => {
  const mockApprovedVendor = {
    id: 'user-approved-vend',
    supabaseUserId: 'supa-vend-appr',
    name: 'TechNest Owner',
    email: 'technest@urbanbasket.com',
    role: Role.VENDOR,
    vendorProfile: {
      id: 'vendor-store-001',
      storeName: 'TechNest Electronics',
      status: VendorStatus.APPROVED,
    },
    addresses: [],
  };

  const mockPendingVendor = {
    id: 'user-pending-vend',
    supabaseUserId: 'supa-vend-pend',
    name: 'Pending Owner',
    email: 'artisan@urbanbasket.com',
    role: Role.VENDOR,
    vendorProfile: {
      id: 'vendor-store-002',
      storeName: 'Pending Store',
      status: VendorStatus.PENDING,
    },
    addresses: [],
  };

  const mockAdmin = {
    id: 'user-admin',
    supabaseUserId: 'supa-admin-001',
    name: 'Admin',
    email: 'admin@urbanbasket.com',
    role: Role.ADMIN,
    vendorProfile: null,
    addresses: [],
  };

  it('should allow customer to submit vendor onboarding application in PENDING status', async () => {
    const mockCustomer = {
      id: 'user-cust-new',
      supabaseUserId: 'supa-cust-new',
      name: 'Applicant',
      email: 'applicant@urbanbasket.com',
      role: Role.CUSTOMER,
      vendorProfile: null,
      addresses: [],
    };

    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockCustomer as any);
    vi.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma, '$transaction').mockResolvedValue({
      id: 'new-vendor-id',
      userId: mockCustomer.id,
      storeName: 'Handmade Crafts',
      storeSlug: 'handmade-crafts-1234',
      status: VendorStatus.PENDING,
      commissionRate: 0.1,
    } as any);

    const res = await request(app)
      .post('/api/v1/vendors/onboard')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        storeName: 'Handmade Crafts',
        description: 'Quality handcrafted goods',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('should prevent pending vendors from publishing products directly (403 VENDOR_NOT_APPROVED)', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockPendingVendor as any);
    vi.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue(mockPendingVendor.vendorProfile as any);

    const res = await request(app)
      .post('/api/v1/vendors/me/products')
      .set('Authorization', 'Bearer demo-token-vendor')
      .send({
        name: 'Unapproved Item',
        description: 'Should not be allowed to publish',
        price: 49.99,
        stock: 10,
        categoryId: 'a0000000-0000-0000-0000-000000000001',
        status: ProductStatus.PUBLISHED, // Attempting to publish while PENDING
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VENDOR_NOT_APPROVED');
  });

  it('should allow pending vendors to create products in DRAFT status', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockPendingVendor as any);
    vi.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue(mockPendingVendor.vendorProfile as any);
    vi.spyOn(prisma.product, 'create').mockResolvedValue({
      id: 'prod-draft-1',
      name: 'Draft Item',
      status: ProductStatus.DRAFT,
      stock: 10,
      price: 49.99,
    } as any);

    const res = await request(app)
      .post('/api/v1/vendors/me/products')
      .set('Authorization', 'Bearer demo-token-vendor')
      .send({
        name: 'Draft Item',
        description: 'Safe draft item for pending vendor',
        price: 49.99,
        stock: 10,
        categoryId: 'a0000000-0000-0000-0000-000000000001',
        status: ProductStatus.DRAFT,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('should reject negative stock values (400 VALIDATION_ERROR)', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockApprovedVendor as any);
    vi.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue(mockApprovedVendor.vendorProfile as any);

    const res = await request(app)
      .post('/api/v1/vendors/me/products')
      .set('Authorization', 'Bearer demo-token-vendor')
      .send({
        name: 'Negative Stock Item',
        description: 'Testing stock validation constraints',
        price: 25.00,
        stock: -5, // Invalid negative stock
        categoryId: 'a0000000-0000-0000-0000-000000000001',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Stock cannot be negative');
  });

  it('should prevent vendor from modifying another vendor product (403 FORBIDDEN)', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockApprovedVendor as any);
    // Product belongs to a DIFFERENT vendor store ('vendor-store-999')
    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 'prod-other-vendor',
      vendorId: 'vendor-store-999',
    } as any);

    const res = await request(app)
      .patch('/api/v1/vendors/me/products/prod-other-vendor')
      .set('Authorization', 'Bearer demo-token-vendor')
      .send({
        name: 'Hijacked Product Name',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('You can only modify your own products');
  });

  it('should allow admin to approve a pending vendor', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockAdmin as any);
    vi.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue({
      id: 'vendor-store-002',
      status: VendorStatus.PENDING,
    } as any);
    vi.spyOn(prisma.vendorProfile, 'update').mockResolvedValue({
      id: 'vendor-store-002',
      status: VendorStatus.APPROVED,
    } as any);

    const res = await request(app)
      .patch('/api/v1/admin/vendors/vendor-store-002/status')
      .set('Authorization', 'Bearer demo-token-admin')
      .send({
        status: 'APPROVED',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('should prevent non-admin from accessing admin vendor approval route (403 FORBIDDEN)', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockApprovedVendor as any);

    const res = await request(app)
      .patch('/api/v1/admin/vendors/vendor-store-002/status')
      .set('Authorization', 'Bearer demo-token-vendor')
      .send({
        status: 'APPROVED',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
