import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { InvoiceService } from '../services/invoice.service';
import {
  OrderStatus,
  PaymentStatus,
  Role,
} from '@prisma/client';

const ALLOWED_VENDOR_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
});

// ----------------------------------------------------------------------
// Customer Order Handlers
// ----------------------------------------------------------------------

/**
 * List all orders for the authenticated customer
 */
export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          address: true,
          items: {
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
          },
        },
      }),
      prisma.order.count({ where: { customerId: req.user.id } }),
    ]);

    res.status(200).json({
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentProvider: o.paymentProvider,
        paymentReference: o.paymentReference,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        total: Number(o.total),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        shippingAddress: o.address,
        itemsCount: o.items.length,
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.product.name,
          productSlug: i.product.slug,
          image: i.product.images[0]?.publicUrl || null,
          vendorName: i.vendor.storeName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
          status: i.status,
        })),
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
 * Get detailed view of an order
 */
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        address: true,
        items: {
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
            vendor: { select: { id: true, storeName: true, storeSlug: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    // Role check: customer must own the order unless admin
    if (order.customerId !== req.user.id && req.user.role !== Role.ADMIN) {
      throw new AppError('Unauthorized access to this order.', 403, 'FORBIDDEN');
    }

    res.status(200).json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentProvider: order.paymentProvider,
        paymentReference: order.paymentReference,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        total: Number(order.total),
        platformCommission: req.user.role === Role.ADMIN ? Number(order.platformCommission) : undefined,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        shippingAddress: order.address,
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.product.name,
          productSlug: i.product.slug,
          image: i.product.images[0]?.publicUrl || null,
          vendorName: i.vendor.storeName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
          status: i.status,
        })),
        statusHistory: order.statusHistory.map((h) => ({
          id: h.id,
          status: h.status,
          note: h.note,
          changedBy: h.changedBy,
          createdAt: h.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download authorized PDF tax invoice for order
 * ACCEPTANCE CRITERIA: Invoice URLs and access are protected.
 */
export const getOrderInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    await InvoiceService.generateOrderInvoice(id, req.user.id, req.user.role, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Customer cancel order before shipment
 */
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    if (order.customerId !== req.user.id && req.user.role !== Role.ADMIN) {
      throw new AppError('Unauthorized access to this order.', 403, 'FORBIDDEN');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError('Order is already cancelled.', 400, 'ORDER_ALREADY_CANCELLED');
    }

    // ACCEPTANCE CRITERIA: Customers cannot change order status arbitrarily.
    // Allowed to cancel only if PLACED or PACKED.
    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      throw new AppError(
        'Orders that have already shipped or delivered cannot be cancelled.',
        400,
        'CANNOT_CANCEL_ORDER'
      );
    }

    // Atomically cancel order, items, and restore stock if already paid
    const updated = await prisma.$transaction(async (tx) => {
      // If payment was completed, restore stock
      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: order.paymentStatus === PaymentStatus.COMPLETED
            ? PaymentStatus.REFUNDED
            : order.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CANCELLED,
          changedBy: req.user!.id,
          note: 'Order cancelled by customer. Stock restored.',
        },
      });

      return updatedOrder;
    });

    res.status(200).json({
      success: true,
      message: 'Order has been successfully cancelled.',
      data: {
        id: updated.id,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// Vendor Order Handlers
// ----------------------------------------------------------------------

/**
 * List all orders containing items belonging to the authenticated vendor
 */
export const getVendorOrders = async (
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
      throw new AppError('Vendor profile not found.', 404, 'VENDOR_PROFILE_NOT_FOUND');
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    // Find orders that contain at least one item from this vendor
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          items: {
            some: { vendorId: vendor.id },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          address: true,
          items: {
            where: { vendorId: vendor.id },
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
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          items: {
            some: { vendorId: vendor.id },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: orders.map((o) => {
        const vendorSubtotal = o.items.reduce((acc, i) => acc + Number(i.subtotal), 0);
        const vendorPayoutTotal = o.items.reduce((acc, i) => acc + Number(i.vendorPayout), 0);

        return {
          id: o.id,
          orderStatus: o.status,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt,
          customer: {
            name: o.customer.name,
            email: o.customer.email,
          },
          shippingAddress: o.address,
          vendorSubtotal,
          vendorPayoutTotal,
          items: o.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            name: i.product.name,
            slug: i.product.slug,
            image: i.product.images[0]?.publicUrl || null,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            subtotal: Number(i.subtotal),
            vendorPayout: Number(i.vendorPayout),
            status: i.status,
          })),
        };
      }),
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
 * Update vendor order fulfillment status with state machine enforcement
 */
export const updateVendorOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { status: nextStatus, note } = updateStatusSchema.parse(req.body);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      throw new AppError('Vendor profile not found.', 404, 'VENDOR_PROFILE_NOT_FOUND');
    }

    // Verify order contains items from this vendor
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    const vendorItems = order.items.filter((i) => i.vendorId === vendor.id);
    if (vendorItems.length === 0) {
      throw new AppError('Unauthorized: Order does not contain items from your store.', 403, 'FORBIDDEN');
    }

    // Current status determination
    const currentStatus = order.status;

    // ACCEPTANCE CRITERIA: Vendor status updates follow allowed transitions.
    // Allowed: PLACED -> PACKED -> SHIPPED -> DELIVERED
    const allowed = ALLOWED_VENDOR_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        `Invalid status transition from "${currentStatus}" to "${nextStatus}". Allowed transitions: ${
          allowed.length > 0 ? allowed.join(', ') : 'None (Terminal Status)'
        }.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Atomic update of items and order
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update this vendor's item statuses
      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          vendorId: vendor.id,
        },
        data: {
          status: nextStatus,
        },
      });

      // 2. Fetch all updated items for this order
      const allItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      // If all items share this status or single vendor, elevate main order status
      const allMatching = allItems.every((item) => item.status === nextStatus);
      let updatedOrderStatus = order.status;

      if (allMatching) {
        const updated = await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus },
        });
        updatedOrderStatus = updated.status;
      }

      // 3. Log status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: nextStatus,
          changedBy: req.user!.id,
          note: note || `Status updated to ${nextStatus} by vendor "${vendor.storeName}".`,
        },
      });

      return {
        orderId: order.id,
        orderStatus: updatedOrderStatus,
        vendorItemsUpdated: vendorItems.length,
        newStatus: nextStatus,
      };
    });

    res.status(200).json({
      success: true,
      message: `Order status successfully updated to ${nextStatus}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
