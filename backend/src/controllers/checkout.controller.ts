import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { CartService } from '../services/cart.service';
import { AppError } from '../middleware/errorHandler';
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  CouponType,
  Prisma,
} from '@prisma/client';

const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Delivery address is required'),
  couponCode: z.string().trim().toUpperCase().optional(),
});

export const checkout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to checkout.', 401, 'UNAUTHORIZED');
    }

    const { addressId, couponCode } = checkoutSchema.parse(req.body);

    // 1. Validate delivery address belongs to user
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== req.user.id) {
      throw new AppError('Invalid delivery address selected.', 400, 'INVALID_ADDRESS');
    }

    // 2. Fetch user's cart from Redis
    const cart = await CartService.getCart(req.user.id);
    if (!cart.items || cart.items.length === 0) {
      throw new AppError('Cannot checkout with an empty cart.', 400, 'CART_EMPTY');
    }

    // 3. Execute atomic order creation transaction
    const order = await prisma.$transaction(async (tx) => {
      let orderSubtotal = new Prisma.Decimal(0);
      let totalPlatformCommission = new Prisma.Decimal(0);

      const preparedItems = [];

      for (const cartItem of cart.items) {
        // Query live product with vendor commission rate
        const product = await tx.product.findUnique({
          where: { id: cartItem.productId },
          include: {
            vendor: { select: { id: true, status: true, commissionRate: true } },
          },
        });

        // ACCEPTANCE CRITERIA: Cart cannot contain unpublished products
        if (!product || product.status !== ProductStatus.PUBLISHED) {
          throw new AppError(
            `Product "${cartItem.name}" is no longer available for purchase.`,
            400,
            'PRODUCT_UNAVAILABLE'
          );
        }

        // ACCEPTANCE CRITERIA: Cart quantity cannot exceed stock
        if (product.stock < cartItem.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Only ${product.stock} left in stock.`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }

        const unitPrice = product.price;
        const quantity = cartItem.quantity;
        const itemSubtotal = unitPrice.mul(quantity);

        const commissionRate = product.vendor.commissionRate;
        const platformCommission = itemSubtotal.mul(commissionRate);
        const vendorPayout = itemSubtotal.sub(platformCommission);

        orderSubtotal = orderSubtotal.add(itemSubtotal);
        totalPlatformCommission = totalPlatformCommission.add(platformCommission);

        preparedItems.push({
          productId: product.id,
          vendorId: product.vendor.id,
          quantity,
          unitPrice,
          subtotal: itemSubtotal,
          vendorPayout,
          status: OrderStatus.PLACED,
        });
      }

      // 4. Coupon Validation & Calculation
      let discountAmount = new Prisma.Decimal(0);
      let matchedCoupon = null;

      if (couponCode) {
        matchedCoupon = await tx.coupon.findUnique({
          where: { code: couponCode },
        });

        if (!matchedCoupon || !matchedCoupon.isActive) {
          throw new AppError(`Coupon "${couponCode}" is invalid or inactive.`, 400, 'INVALID_COUPON');
        }

        const now = new Date();
        if (now < matchedCoupon.startsAt || now > matchedCoupon.expiresAt) {
          throw new AppError(`Coupon "${couponCode}" is expired.`, 400, 'COUPON_EXPIRED');
        }

        // ACCEPTANCE CRITERIA: Coupon cannot be used beyond limits
        if (matchedCoupon.usageLimit && matchedCoupon.usedCount >= matchedCoupon.usageLimit) {
          throw new AppError(`Coupon "${couponCode}" has reached its usage limit.`, 400, 'COUPON_LIMIT_REACHED');
        }

        if (orderSubtotal.lessThan(matchedCoupon.minimumAmount)) {
          throw new AppError(
            `Minimum subtotal of $${matchedCoupon.minimumAmount} required for coupon "${couponCode}".`,
            400,
            'MINIMUM_AMOUNT_NOT_MET'
          );
        }

        if (matchedCoupon.type === CouponType.PERCENTAGE) {
          discountAmount = orderSubtotal.mul(matchedCoupon.value).div(100);
          if (matchedCoupon.maximumDiscount && discountAmount.greaterThan(matchedCoupon.maximumDiscount)) {
            discountAmount = matchedCoupon.maximumDiscount;
          }
        } else {
          // FIXED discount
          discountAmount = Prisma.Decimal.min(orderSubtotal, matchedCoupon.value);
        }

        // Increment coupon used count
        await tx.coupon.update({
          where: { id: matchedCoupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const total = Prisma.Decimal.max(new Prisma.Decimal(0), orderSubtotal.sub(discountAmount));

      // 5. Create Order record in PLACED status
      const createdOrder = await tx.order.create({
        data: {
          customerId: req.user!.id,
          addressId: address.id,
          status: OrderStatus.PLACED,
          subtotal: orderSubtotal,
          discount: discountAmount,
          total,
          platformCommission: totalPlatformCommission,
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: preparedItems,
          },
          statusHistory: {
            create: [
              {
                status: OrderStatus.PLACED,
                changedBy: req.user!.id,
                note: 'Order created via checkout; pending payment confirmation.',
              },
            ],
          },
          couponUsages: matchedCoupon
            ? {
                create: {
                  couponId: matchedCoupon.id,
                  customerId: req.user!.id,
                  discountAmount,
                },
              }
            : undefined,
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
              vendor: { select: { id: true, storeName: true } },
            },
          },
        },
      });

      return createdOrder;
    });

    // 6. Clear user's Redis cart after successful checkout reservation
    await CartService.clearCart(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Ready for payment.',
      data: {
        orderId: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        total: Number(order.total),
        itemsCount: order.items.length,
        items: order.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          vendor: i.vendor.storeName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};
