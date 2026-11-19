import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CouponType } from '@prisma/client';

const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').trim().toUpperCase(),
  subtotal: z.number().positive('Subtotal must be positive'),
});

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  type: CouponType;
  value: number;
  discountAmount: number;
  finalTotal: number;
  minimumAmount: number;
  maximumDiscount: number | null;
}

export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, subtotal } = validateCouponSchema.parse(req.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      throw new AppError(`Coupon code "${code}" is invalid or inactive.`, 400, 'INVALID_COUPON');
    }

    const now = new Date();
    if (now < coupon.startsAt) {
      throw new AppError(`Coupon "${code}" has not started yet.`, 400, 'COUPON_NOT_STARTED');
    }

    if (now > coupon.expiresAt) {
      throw new AppError(`Coupon "${code}" has expired.`, 400, 'COUPON_EXPIRED');
    }

    // ACCEPTANCE CRITERIA: Coupon cannot be used beyond limits.
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(
        `Coupon "${code}" has reached its maximum usage limit.`,
        400,
        'COUPON_LIMIT_REACHED'
      );
    }

    const minAmount = Number(coupon.minimumAmount);
    if (subtotal < minAmount) {
      throw new AppError(
        `Order subtotal must be at least $${minAmount.toFixed(2)} to use coupon "${code}".`,
        400,
        'MINIMUM_AMOUNT_NOT_MET'
      );
    }

    // Server-side discount calculation
    let discountAmount = 0;
    const couponValue = Number(coupon.value);

    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = (subtotal * couponValue) / 100;
      if (coupon.maximumDiscount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maximumDiscount));
      }
    } else {
      // FIXED discount
      discountAmount = Math.min(subtotal, couponValue);
    }

    discountAmount = parseFloat(discountAmount.toFixed(2));
    const finalTotal = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));

    const result: CouponValidationResult = {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: couponValue,
      discountAmount,
      finalTotal,
      minimumAmount: minAmount,
      maximumDiscount: coupon.maximumDiscount ? Number(coupon.maximumDiscount) : null,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
