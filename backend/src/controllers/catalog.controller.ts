import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { RedisService } from '../services/redis.service';
import { ProductStatus, ReviewStatus, Prisma } from '@prisma/client';

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      q,
      category,
      vendor,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort = 'createdAt',
      order = 'desc',
      page = '1',
      pageSize = '12',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(pageSize as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Cache key hash based on exact query parameters
    const queryHash = crypto
      .createHash('md5')
      .update(JSON.stringify(req.query))
      .digest('hex');
    const cacheKey = `products:search:${queryHash}`;

    // Try Redis cache first
    const cached = await RedisService.getCache<any>(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        cached: true,
        data: cached.products,
        pagination: cached.pagination,
      });
      return;
    }

    // Build Prisma query filter
    // CRITICAL ACCEPTANCE CRITERIA: Public users cannot see unpublished products.
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PUBLISHED,
    };

    // Keyword search on name and description
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchTerm = q.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Category filter by slug or ID
    if (category && typeof category === 'string') {
      where.category = {
        OR: [{ slug: category }, { id: category }],
      };
    }

    // Vendor filter by slug or ID
    if (vendor && typeof vendor === 'string') {
      where.vendor = {
        OR: [{ storeSlug: vendor }, { id: vendor }],
      };
    }

    // Price range filters
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price.gte = new Prisma.Decimal(parseFloat(minPrice as string));
      }
      if (maxPrice) {
        where.price.lte = new Prisma.Decimal(parseFloat(maxPrice as string));
      }
    }

    // Minimum rating filter
    if (minRating) {
      where.averageRating = {
        gte: new Prisma.Decimal(parseFloat(minRating as string)),
      };
    }

    // Stock availability filter
    if (inStock === 'true' || inStock === '1') {
      where.stock = {
        gt: 0,
      };
    }

    // Sorting order
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    const sortOrder = (order as string).toLowerCase() === 'asc' ? 'asc' : 'desc';

    switch (sort) {
      case 'price':
        orderBy = { price: sortOrder };
        break;
      case 'rating':
        orderBy = { averageRating: sortOrder };
        break;
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: sortOrder };
        break;
    }

    // Execute queries in parallel
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, storeName: true, storeSlug: true } },
          images: {
            orderBy: { position: 'asc' },
            take: 2,
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const pagination = {
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    };

    const payload = { products, pagination };

    // Cache search results in Redis with 2-minute TTL
    await RedisService.setCache(cacheKey, payload, 120);

    res.status(200).json({
      success: true,
      cached: false,
      data: products,
      pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getProductBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const cacheKey = `product:${slug}`;

    // Try Redis cache first
    const cached = await RedisService.getCache<any>(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        cached: true,
        data: cached,
      });
      return;
    }

    // Lookup product by slug or ID
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        status: ProductStatus.PUBLISHED, // Only published products are visible to public catalog
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
            description: true,
            status: true,
          },
        },
        images: {
          orderBy: { position: 'asc' },
        },
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found or currently unavailable.', 404, 'NOT_FOUND');
    }

    // Cache product detail in Redis with 5-minute TTL
    await RedisService.setCache(cacheKey, product, 300);

    res.status(200).json({
      success: true,
      cached: false,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const getProductReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: productId } = req.params;
    const { page = '1', pageSize = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(pageSize as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, reviews] = await Promise.all([
      prisma.review.count({
        where: { productId, status: ReviewStatus.APPROVED },
      }),
      prisma.review.findMany({
        where: { productId, status: ReviewStatus.APPROVED },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};
