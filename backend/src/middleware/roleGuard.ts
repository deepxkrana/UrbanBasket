import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler';
import { prisma } from '../config/db';

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Insufficient permissions. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

export const requireAdmin = requireRole(Role.ADMIN);
export const requireVendor = requireRole(Role.VENDOR, Role.ADMIN);
export const requireCustomer = requireRole(Role.CUSTOMER, Role.VENDOR, Role.ADMIN);

/**
 * Ensures that a vendor user only accesses or modifies their own products.
 * Admins bypass this check.
 */
export const requireProductOwnership = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    // Admins have overarching permissions
    if (req.user.role === Role.ADMIN) {
      return next();
    }

    if (req.user.role !== Role.VENDOR || !req.user.vendorProfileId) {
      throw new AppError('Only registered vendors can manage products.', 403, 'FORBIDDEN');
    }

    const productId = req.params.id || req.params.productId;
    if (!productId) {
      return next();
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true },
    });

    if (!product) {
      throw new AppError('Product not found.', 404, 'NOT_FOUND');
    }

    if (product.vendorId !== req.user.vendorProfileId) {
      throw new AppError('Forbidden: You can only modify your own products.', 403, 'FORBIDDEN');
    }

    next();
  } catch (err) {
    next(err);
  }
};
