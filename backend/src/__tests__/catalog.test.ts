import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import { RedisService } from '../services/redis.service';
import { ProductStatus } from '@prisma/client';

describe('Phase 5: Catalog, Search, and Product Details', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockProduct = {
    id: 'prod-001',
    name: 'Wireless ANC Headphones',
    slug: 'wireless-anc-headphones',
    description: 'High-fidelity audio with active noise canceling',
    price: 179.99,
    stock: 25,
    status: ProductStatus.PUBLISHED,
    averageRating: 4.8,
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    vendor: { id: 'vend-1', storeName: 'TechStore', storeSlug: 'techstore' },
    images: [{ id: 'img-1', publicUrl: 'https://example.com/img.jpg', position: 0 }],
    reviews: [],
  };

  it('should list only PUBLISHED products for public catalog', async () => {
    vi.spyOn(RedisService, 'getCache').mockResolvedValue(null);
    const countSpy = vi.spyOn(prisma.product, 'count').mockResolvedValue(1);
    const findSpy = vi.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProduct as any]);

    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    // Verify Prisma query strictly filters status: PUBLISHED
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ProductStatus.PUBLISHED }),
      })
    );
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ProductStatus.PUBLISHED }),
      })
    );
  });

  it('should support compound filters: keyword, category, price, and stock', async () => {
    vi.spyOn(RedisService, 'getCache').mockResolvedValue(null);
    const findSpy = vi.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProduct as any]);
    vi.spyOn(prisma.product, 'count').mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/products')
      .query({
        q: 'headphones',
        category: 'electronics',
        minPrice: '100',
        maxPrice: '200',
        inStock: 'true',
        sort: 'price',
        order: 'asc',
      });

    expect(res.status).toBe(200);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ProductStatus.PUBLISHED,
          OR: [
            { name: { contains: 'headphones', mode: 'insensitive' } },
            { description: { contains: 'headphones', mode: 'insensitive' } },
          ],
          stock: { gt: 0 },
        }),
        orderBy: { price: 'asc' },
      })
    );
  });

  it('should return consistent pagination metadata', async () => {
    vi.spyOn(RedisService, 'getCache').mockResolvedValue(null);
    vi.spyOn(prisma.product, 'count').mockResolvedValue(25);
    vi.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProduct as any]);

    const res = await request(app)
      .get('/api/v1/products')
      .query({ page: '2', pageSize: '10' });

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      total: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('should fetch product details by slug', async () => {
    vi.spyOn(RedisService, 'getCache').mockResolvedValue(null);
    vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(mockProduct as any);

    const res = await request(app).get('/api/v1/products/wireless-anc-headphones');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('wireless-anc-headphones');
    expect(res.body.data.vendor.storeName).toBe('TechStore');
  });

  it('should return 404 for non-existent product slug', async () => {
    vi.spyOn(RedisService, 'getCache').mockResolvedValue(null);
    vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(null);

    const res = await request(app).get('/api/v1/products/unknown-product-slug');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should serve cached results when available in Redis', async () => {
    const cachedData = {
      products: [mockProduct],
      pagination: {
        total: 1,
        page: 1,
        pageSize: 12,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    vi.spyOn(RedisService, 'getCache').mockResolvedValue(cachedData);

    const res = await request(app).get('/api/v1/products?q=cached');

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('prod-001');
  });
});
