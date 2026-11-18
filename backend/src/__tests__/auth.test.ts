import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { Role, VendorStatus } from '@prisma/client';

describe('Phase 3: Authentication and Role Guards', () => {
  const mockCustomer = {
    id: 'user-cust-123',
    supabaseUserId: 'supa-cust-123',
    name: 'Customer Test',
    email: 'customer-test@urbanbasket.com',
    role: Role.CUSTOMER,
    vendorProfile: null,
    addresses: [],
  };

  const mockVendor = {
    id: 'user-vend-123',
    supabaseUserId: 'supa-vend-123',
    name: 'Vendor Test',
    email: 'vendor-test@urbanbasket.com',
    role: Role.VENDOR,
    vendorProfile: {
      id: 'store-123',
      storeName: 'Test Store',
      status: VendorStatus.APPROVED,
    },
    addresses: [],
  };

  const mockAdmin = {
    id: 'user-admin-123',
    supabaseUserId: 'supa-admin-123',
    name: 'Admin Test',
    email: 'admin-test@urbanbasket.com',
    role: Role.ADMIN,
    vendorProfile: null,
    addresses: [],
  };

  it('should reject requests without Authorization header (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject malformed or non-Bearer tokens (401)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Basic invalid-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should allow customer to fetch profile via demo-token-customer', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockCustomer as any);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer demo-token-customer');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('CUSTOMER');
    expect(res.body.data.email).toBe(mockCustomer.email);
  });

  it('should prevent customer from accessing vendor-only route (403 FORBIDDEN)', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValueOnce(mockCustomer as any);

    const res = await request(app)
      .get('/api/v1/auth/vendor-only')
      .set('Authorization', 'Bearer demo-token-customer');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Insufficient permissions');
  });

  it('should prevent customer from accessing admin-only route (403 FORBIDDEN)', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValueOnce(mockCustomer as any);

    const res = await request(app)
      .get('/api/v1/auth/admin-only')
      .set('Authorization', 'Bearer demo-token-customer');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should allow vendor to access vendor-only route but forbid admin-only route', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValueOnce(mockVendor as any);

    const vendorRes = await request(app)
      .get('/api/v1/auth/vendor-only')
      .set('Authorization', 'Bearer demo-token-vendor');

    expect(vendorRes.status).toBe(200);
    expect(vendorRes.body.message).toBe('Vendor access authorized');

    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValueOnce(mockVendor as any);

    const adminRes = await request(app)
      .get('/api/v1/auth/admin-only')
      .set('Authorization', 'Bearer demo-token-vendor');

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error.code).toBe('FORBIDDEN');
  });

  it('should allow admin to access both admin-only and vendor-only routes', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValueOnce(mockAdmin as any);

    const adminRes = await request(app)
      .get('/api/v1/auth/admin-only')
      .set('Authorization', 'Bearer demo-token-admin');

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.message).toBe('Admin access authorized');

    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValueOnce(mockAdmin as any);

    const vendorRes = await request(app)
      .get('/api/v1/auth/vendor-only')
      .set('Authorization', 'Bearer demo-token-admin');

    expect(vendorRes.status).toBe(200);
    expect(vendorRes.body.message).toBe('Vendor access authorized');
  });

  it('should never allow privilege escalation via sync-profile body', async () => {
    vi.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockCustomer as any);
    vi.spyOn(prisma.profile, 'update').mockResolvedValue({
      ...mockCustomer,
      name: 'Updated Name',
      role: Role.CUSTOMER, // Role MUST remain unchanged
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/sync-profile')
      .set('Authorization', 'Bearer demo-token-customer')
      .send({
        name: 'Updated Name',
        role: 'ADMIN', // Malicious attempt to elevate role
      });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('CUSTOMER'); // Verified role is CUSTOMER, never elevated
  });
});
