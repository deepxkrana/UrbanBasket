import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  OrderStatus,
  ReviewStatus,
  Prisma,
} from '@prisma/client';

const createReviewSchema = z.object({
  orderItemId: z.string().min(1, 'Order item ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().trim().min(3, 'Comment must be at least 3 characters').max(2000, 'Comment is too long'),
});

const moderateReviewSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
});

/**
 * Recalculate product averageRating and reviewCount based strictly on APPROVED reviews
 */
export const recalculateProductRating = async (
  productId: string,
  tx: any = prisma
): Promise<{ averageRating: number; reviewCount: number }> => {
  const approvedReviews = await tx.review.findMany({
    where: { productId, status: ReviewStatus.APPROVED },
    select: { rating: true },
  });

  const reviewCount = approvedReviews.length;
  const averageRating = reviewCount > 0
    ? approvedReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount
    : 0;

  const roundedAverage = Number(averageRating.toFixed(2));

  await tx.product.update({
    where: { id: productId },
    data: {
      averageRating: new Prisma.Decimal(roundedAverage),
      reviewCount,
    },
  });

  return { averageRating: roundedAverage, reviewCount };
};

/**
 * Customer submits a review for a delivered purchased item
 * ACCEPTANCE CRITERIA:
 * 1. A customer can review only purchased, delivered items.
 * 2. A customer cannot submit duplicate reviews.
 */
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { orderItemId, rating, comment } = createReviewSchema.parse(req.body);

    // 1. Fetch order item with parent order
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, customerId: true, status: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!orderItem) {
      throw new AppError('Order item not found.', 404, 'ORDER_ITEM_NOT_FOUND');
    }

    // Must be purchased by this customer
    if (orderItem.order.customerId !== req.user.id) {
      throw new AppError('You can only review items from your own purchases.', 403, 'FORBIDDEN');
    }

    // ACCEPTANCE CRITERIA: A customer can review only purchased, delivered items.
    const isDelivered =
      orderItem.order.status === OrderStatus.DELIVERED ||
      orderItem.status === OrderStatus.DELIVERED;

    if (!isDelivered) {
      throw new AppError(
        'Reviews can only be submitted for delivered, purchased items.',
        400,
        'ITEM_NOT_DELIVERED'
      );
    }

    // ACCEPTANCE CRITERIA: A customer cannot submit duplicate reviews.
    const existingReview = await prisma.review.findUnique({
      where: { orderItemId: orderItem.id },
    });

    if (existingReview) {
      throw new AppError(
        'You have already submitted a review for this purchase item.',
        400,
        'DUPLICATE_REVIEW'
      );
    }

    // Create review in PENDING status for moderation
    const review = await prisma.review.create({
      data: {
        customerId: req.user.id,
        productId: orderItem.productId,
        orderItemId: orderItem.id,
        rating,
        comment,
        status: ReviewStatus.PENDING,
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will appear publicly once approved.',
      data: {
        id: review.id,
        productId: review.productId,
        productName: review.product.name,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: review.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Customer fetches delivered purchased items eligible for review
 */
export const getEligibleItemsForReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          customerId: req.user.id,
          status: OrderStatus.DELIVERED,
        },
        review: null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              select: { publicUrl: true },
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
        },
        vendor: { select: { id: true, storeName: true } },
      },
      orderBy: { id: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: items.map((i) => ({
        orderItemId: i.id,
        orderId: i.orderId,
        productId: i.productId,
        name: i.product.name,
        slug: i.product.slug,
        image: i.product.images[0]?.publicUrl || null,
        vendorName: i.vendor.storeName,
        unitPrice: Number(i.unitPrice),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// Admin Review Moderation Handlers
// ----------------------------------------------------------------------

/**
 * Admin: List reviews for moderation
 */
export const getAdminReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as ReviewStatus | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ReviewWhereInput = {};
    if (status && Object.values(ReviewStatus).includes(status)) {
      whereClause.status = status;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.review.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        customer: {
          id: r.customer.id,
          name: r.customer.name,
          email: r.customer.email,
        },
        product: {
          id: r.product.id,
          name: r.product.name,
          slug: r.product.slug,
        },
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

/**
 * Admin: Moderate review (APPROVE or REJECT) and recalculate product ratings
 * ACCEPTANCE CRITERIA: Rating averages reflect approved reviews.
 */
export const moderateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = moderateReviewSchema.parse(req.body);

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update review status
      const updatedReview = await tx.review.update({
        where: { id: review.id },
        data: { status },
      });

      // 2. Recalculate product rating aggregates
      const aggregates = await recalculateProductRating(review.productId, tx);

      return {
        review: updatedReview,
        aggregates,
      };
    });

    res.status(200).json({
      success: true,
      message: `Review has been successfully marked as ${status}. Product ratings updated.`,
      data: {
        id: result.review.id,
        status: result.review.status,
        productRatingAggregates: result.aggregates,
      },
    });
  } catch (err) {
    next(err);
  }
};
