import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { RedisService } from '../services/redis.service';
import { StorageService } from '../services/storage.service';
import { VendorStatus, ProductStatus, Role, Prisma, PaymentStatus } from '@prisma/client';

const onboardSchema = z.object({
  storeName: z.string().min(3, 'Store name must be at least 3 characters').max(50),
  description: z.string().optional(),
});

const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be greater than zero'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  categoryId: z.string().min(1, 'Valid Category ID is required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'OUT_OF_STOCK']).default('DRAFT'),
  imageUrl: z.string().url().optional(),
  imageAlt: z.string().optional(),
});

const updateProductSchema = productSchema.partial();

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .concat(`-${Date.now().toString().slice(-4)}`);
};

export const onboardVendor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { storeName, description } = onboardSchema.parse(req.body);

    const existingVendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (existingVendor) {
      throw new AppError('You have already applied or registered as a vendor.', 400, 'VENDOR_EXISTS');
    }

    const storeSlug = generateSlug(storeName);

    const vendorProfile = await prisma.$transaction(async (tx) => {
      // 1. Create vendor store in PENDING state
      const created = await tx.vendorProfile.create({
        data: {
          userId: req.user!.id,
          storeName,
          storeSlug,
          description: description || null,
          status: VendorStatus.PENDING,
          commissionRate: new Prisma.Decimal(0.10),
        },
      });

      // 2. Set profile role to VENDOR
      await tx.profile.update({
        where: { id: req.user!.id },
        data: { role: Role.VENDOR },
      });

      return created;
    });

    res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully. Pending admin review.',
      data: vendorProfile,
    });
  } catch (err) {
    next(err);
  }
};

export const getVendorMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: {
            products: true,
            orderItems: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new AppError('Vendor store not found.', 404, 'NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (err) {
    next(err);
  }
};

export const updateVendorMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { storeName, description } = onboardSchema.partial().parse(req.body);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      throw new AppError('Vendor profile not found.', 404, 'NOT_FOUND');
    }

    const updated = await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        storeName: storeName || vendor.storeName,
        description: description !== undefined ? description : vendor.description,
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const getVendorProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.vendorProfileId) {
      throw new AppError('Vendor store required to view products.', 403, 'FORBIDDEN');
    }

    const products = await prisma.product.findMany({
      where: { vendorId: req.user.vendorProfileId },
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } },
        _count: { select: { reviews: true, orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.vendorProfileId) {
      throw new AppError('Only registered vendors can create products.', 403, 'FORBIDDEN');
    }

    const validated = productSchema.parse(req.body);

    // Fetch vendor status
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: req.user.vendorProfileId },
      select: { status: true },
    });

    if (!vendor) {
      throw new AppError('Vendor store not found.', 404, 'NOT_FOUND');
    }

    // ACCEPTANCE CRITERIA: Only approved vendors can publish products.
    if (validated.status === ProductStatus.PUBLISHED && vendor.status !== VendorStatus.APPROVED) {
      throw new AppError(
        'Only approved vendors can publish products. Please save as DRAFT until your vendor status is approved.',
        403,
        'VENDOR_NOT_APPROVED'
      );
    }

    const slug = generateSlug(validated.name);

    const product = await prisma.product.create({
      data: {
        vendorId: req.user.vendorProfileId,
        categoryId: validated.categoryId,
        name: validated.name,
        slug,
        description: validated.description,
        price: new Prisma.Decimal(validated.price),
        stock: validated.stock,
        status: validated.status as ProductStatus,
        images: validated.imageUrl
          ? {
              create: [
                {
                  storagePath: `products/${slug}-1.jpg`,
                  publicUrl: validated.imageUrl,
                  altText: validated.imageAlt || validated.name,
                  position: 0,
                },
              ],
            }
          : undefined,
      },
      include: {
        category: true,
        images: true,
      },
    });

    // Invalidate Redis product & search cache
    await RedisService.invalidateProductCache(product.id);

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = updateProductSchema.parse(req.body);

    // Fetch existing product
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { vendor: { select: { status: true } } },
    });

    if (!existing) {
      throw new AppError('Product not found.', 404, 'NOT_FOUND');
    }

    // ACCEPTANCE CRITERIA: Only approved vendors can publish products
    if (validated.status === ProductStatus.PUBLISHED && existing.vendor.status !== VendorStatus.APPROVED) {
      throw new AppError(
        'Cannot publish product: Vendor account is not approved by administrator.',
        403,
        'VENDOR_NOT_APPROVED'
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name || existing.name,
        description: validated.description || existing.description,
        price: validated.price ? new Prisma.Decimal(validated.price) : existing.price,
        stock: validated.stock !== undefined ? validated.stock : existing.stock,
        categoryId: validated.categoryId || existing.categoryId,
        status: (validated.status as ProductStatus) || existing.status,
      },
      include: {
        category: true,
        images: true,
      },
    });

    // Invalidate Redis cache
    await RedisService.invalidateProductCache(id);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new AppError('Product not found.', 404, 'NOT_FOUND');
    }

    // Clean up storage images
    for (const image of product.images) {
      await StorageService.deleteImage(image.storagePath);
    }

    // Delete product from database
    await prisma.product.delete({
      where: { id },
    });

    // Invalidate Redis cache
    await RedisService.invalidateProductCache(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const addProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: productId } = req.params;
    const { publicUrl, altText, position, mimeType } = req.body;

    const count = await prisma.productImage.count({
      where: { productId },
    });

    if (count >= 5) {
      throw new AppError('Maximum of 5 images allowed per product.', 400, 'IMAGE_LIMIT_REACHED');
    }

    const upload = await StorageService.uploadImage(productId, {
      publicUrl,
      mimeType: mimeType || 'image/jpeg',
      altText,
      position: position || count,
    });

    const image = await prisma.productImage.create({
      data: {
        productId,
        storagePath: upload.storagePath,
        publicUrl: upload.publicUrl,
        altText: altText || null,
        position: position || count,
      },
    });

    await RedisService.invalidateProductCache(productId);

    res.status(201).json({
      success: true,
      data: image,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { imageId, id: productId } = req.params;

    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.productId !== productId) {
      throw new AppError('Image not found.', 404, 'NOT_FOUND');
    }

    await StorageService.deleteImage(image.storagePath);

    await prisma.productImage.delete({
      where: { id: imageId },
    });

    await RedisService.invalidateProductCache(productId);

    res.status(200).json({
      success: true,
      message: 'Product image removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Store sales and payout analytics for Vendor Dashboard
 */
export const getVendorAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      throw new AppError('Vendor profile not found.', 404, 'NOT_FOUND');
    }

    // Completed order items for this vendor
    const items = await prisma.orderItem.findMany({
      where: {
        vendorId: vendor.id,
        order: { paymentStatus: PaymentStatus.COMPLETED },
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    const totalRevenue = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
    const netPayout = items.reduce((sum, i) => sum + Number(i.vendorPayout), 0);
    const platformCommissionPaid = totalRevenue - netPayout;
    const totalItemsSold = items.reduce((sum, i) => sum + i.quantity, 0);

    // Order status distribution
    const statusCounts: Record<string, number> = {
      PLACED: 0,
      PACKED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    const allVendorItems = await prisma.orderItem.findMany({
      where: { vendorId: vendor.id },
      select: { status: true },
    });

    allVendorItems.forEach((i) => {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
    });

    // Top products
    const productSalesMap: Record<string, { name: string; slug: string; units: number; revenue: number }> = {};
    items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.product.name,
          slug: item.product.slug,
          units: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].units += item.quantity;
      productSalesMap[item.productId].revenue += Number(item.subtotal);
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        storeName: vendor.storeName,
        commissionRate: Number(vendor.commissionRate),
        financials: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          netPayout: Number(netPayout.toFixed(2)),
          platformCommissionPaid: Number(platformCommissionPaid.toFixed(2)),
          totalItemsSold,
        },
        ordersByStatus: statusCounts,
        topProducts,
      },
    });
  } catch (err) {
    next(err);
  }
};
