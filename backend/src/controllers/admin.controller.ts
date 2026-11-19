import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { VendorStatus, Role, PaymentStatus, ProductStatus } from '@prisma/client';

const vendorStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
});

const userRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']),
});

export const getAdminVendors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const statusQuery = req.query.status as VendorStatus | undefined;

    const vendors = await prisma.vendorProfile.findMany({
      where: statusQuery ? { status: statusQuery } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: { products: true, orderItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: vendors,
    });
  } catch (err) {
    next(err);
  }
};

export const updateVendorStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = vendorStatusSchema.parse(req.body);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new AppError('Vendor store not found.', 404, 'NOT_FOUND');
    }

    const updated = await prisma.vendorProfile.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(200).json({
      success: true,
      message: `Vendor status updated to ${status}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = userRoleSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new AppError('User profile not found.', 404, 'NOT_FOUND');
    }

    const updated = await prisma.profile.update({
      where: { id },
      data: { role },
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Platform analytics for Admin Dashboard
 * ACCEPTANCE CRITERIA:
 * 1. Analytics counts match database records.
 * 2. Commission is separate from vendor payout.
 * 3. Admin-only analytics routes are protected.
 */
export const getAdminAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Financial metrics (completed orders)
    const completedOrders = await prisma.order.findMany({
      where: { paymentStatus: PaymentStatus.COMPLETED },
      select: {
        total: true,
        platformCommission: true,
        subtotal: true,
        discount: true,
        createdAt: true,
      },
    });

    const grossRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const platformCommission = completedOrders.reduce((sum, o) => sum + Number(o.platformCommission), 0);
    const vendorPayouts = grossRevenue - platformCommission;

    // 2. Orders Volume & Status Breakdown
    const [allOrdersCount, statusGroups] = await Promise.all([
      prisma.order.count(),
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const ordersByStatus: Record<string, number> = {
      PLACED: 0,
      PACKED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };
    statusGroups.forEach((g) => {
      ordersByStatus[g.status] = g._count.id;
    });

    // 3. User & Catalog Growth Counts
    const [customerCount, vendorCounts, productCount] = await Promise.all([
      prisma.profile.count({ where: { role: Role.CUSTOMER } }),
      prisma.vendorProfile.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
    ]);

    const vendorsByStatus = {
      APPROVED: 0,
      PENDING: 0,
      REJECTED: 0,
      SUSPENDED: 0,
      TOTAL: 0,
    };
    vendorCounts.forEach((v) => {
      vendorsByStatus[v.status] = v._count.id;
      vendorsByStatus.TOTAL += v._count.id;
    });

    // 4. Top Performing Products
    const topOrderItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    });

    const topProductIds = topOrderItems.map((i) => i.productId);
    const topProductsDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, slug: true, price: true },
    });

    const topProducts = topOrderItems.map((item) => {
      const prod = topProductsDetails.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        name: prod?.name || 'Unknown Product',
        slug: prod?.slug || '',
        unitsSold: item._sum.quantity || 0,
        revenue: Number(item._sum.subtotal || 0),
      };
    });

    // 5. Top Vendors by Sales Volume
    const topVendorItems = await prisma.orderItem.groupBy({
      by: ['vendorId'],
      _sum: { subtotal: true, vendorPayout: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    });

    const topVendorIds = topVendorItems.map((v) => v.vendorId);
    const topVendorsDetails = await prisma.vendorProfile.findMany({
      where: { id: { in: topVendorIds } },
      select: { id: true, storeName: true, storeSlug: true },
    });

    const topVendors = topVendorItems.map((item) => {
      const vend = topVendorsDetails.find((v) => v.id === item.vendorId);
      return {
        vendorId: item.vendorId,
        storeName: vend?.storeName || 'Unknown Store',
        storeSlug: vend?.storeSlug || '',
        totalSales: Number(item._sum.subtotal || 0),
        netPayout: Number(item._sum.vendorPayout || 0),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        financials: {
          grossRevenue: Number(grossRevenue.toFixed(2)),
          platformCommission: Number(platformCommission.toFixed(2)),
          vendorPayouts: Number(vendorPayouts.toFixed(2)),
        },
        orders: {
          total: allOrdersCount,
          byStatus: ordersByStatus,
        },
        growth: {
          totalCustomers: customerCount,
          vendors: vendorsByStatus,
          publishedProducts: productCount,
        },
        topProducts,
        topVendors,
      },
    });
  } catch (err) {
    next(err);
  }
};
