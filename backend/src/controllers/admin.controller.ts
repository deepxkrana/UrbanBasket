import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { VendorStatus, Role } from '@prisma/client';

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
