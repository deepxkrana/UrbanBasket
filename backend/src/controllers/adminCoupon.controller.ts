import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CouponType, Prisma } from '@prisma/client';

const createCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Code must be at least 3 characters')
    .max(30, 'Code too long')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  type: z.nativeEnum(CouponType),
  value: z.number().positive('Coupon value must be positive'),
  minimumAmount: z.number().min(0).default(0),
  maximumDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
  isActive: z.boolean().default(true),
});

const updateCouponSchema = z.object({
  value: z.number().positive().optional(),
  minimumAmount: z.number().min(0).optional(),
  maximumDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const getAdminCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { usages: true } },
        },
      }),
      prisma.coupon.count(),
    ]);

    res.status(200).json({
      success: true,
      data: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: Number(c.value),
        minimumAmount: Number(c.minimumAmount),
        maximumDiscount: c.maximumDiscount ? Number(c.maximumDiscount) : null,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        totalUsages: c._count.usages,
        startsAt: c.startsAt,
        expiresAt: c.expiresAt,
        isActive: c.isActive,
        createdAt: c.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createAdminCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createCouponSchema.parse(req.body);

    // Percentage coupons cannot exceed 100%
    if (data.type === CouponType.PERCENTAGE && data.value > 100) {
      throw new AppError('Percentage coupon value cannot exceed 100%.', 400, 'INVALID_COUPON_VALUE');
    }

    const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    const expiresAt = new Date(data.expiresAt);

    if (expiresAt <= startsAt) {
      throw new AppError('Expiration date must be after startsAt date.', 400, 'INVALID_EXPIRATION_DATE');
    }

    // Check unique code
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new AppError(`Coupon code "${data.code}" already exists.`, 400, 'COUPON_ALREADY_EXISTS');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: new Prisma.Decimal(data.value),
        minimumAmount: new Prisma.Decimal(data.minimumAmount),
        maximumDiscount: data.maximumDiscount ? new Prisma.Decimal(data.maximumDiscount) : null,
        usageLimit: data.usageLimit,
        startsAt,
        expiresAt,
        isActive: data.isActive,
      },
    });

    res.status(201).json({
      success: true,
      message: `Coupon "${coupon.code}" created successfully.`,
      data: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minimumAmount: Number(coupon.minimumAmount),
        maximumDiscount: coupon.maximumDiscount ? Number(coupon.maximumDiscount) : null,
        usageLimit: coupon.usageLimit,
        startsAt: coupon.startsAt,
        expiresAt: coupon.expiresAt,
        isActive: coupon.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateCouponSchema.parse(req.body);

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Coupon not found.', 404, 'COUPON_NOT_FOUND');
    }

    if (existing.type === CouponType.PERCENTAGE && data.value && data.value > 100) {
      throw new AppError('Percentage coupon value cannot exceed 100%.', 400, 'INVALID_COUPON_VALUE');
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        value: data.value ? new Prisma.Decimal(data.value) : undefined,
        minimumAmount: data.minimumAmount !== undefined ? new Prisma.Decimal(data.minimumAmount) : undefined,
        maximumDiscount: data.maximumDiscount === null
          ? null
          : data.maximumDiscount
            ? new Prisma.Decimal(data.maximumDiscount)
            : undefined,
        usageLimit: data.usageLimit === null ? null : data.usageLimit,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: `Coupon "${updated.code}" updated successfully.`,
      data: {
        id: updated.id,
        code: updated.code,
        type: updated.type,
        value: Number(updated.value),
        minimumAmount: Number(updated.minimumAmount),
        maximumDiscount: updated.maximumDiscount ? Number(updated.maximumDiscount) : null,
        usageLimit: updated.usageLimit,
        isActive: updated.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAdminCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { usages: true } } },
    });

    if (!existing) {
      throw new AppError('Coupon not found.', 404, 'COUPON_NOT_FOUND');
    }

    // If coupon has been used in orders, soft delete by marking inactive to preserve historical order integrity
    if (existing._count.usages > 0) {
      const updated = await prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(200).json({
        success: true,
        message: `Coupon "${updated.code}" has recorded order usages and was deactivated.`,
      });
      return;
    }

    await prisma.coupon.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Coupon "${existing.code}" deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};
