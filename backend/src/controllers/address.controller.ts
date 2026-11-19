import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

const addressSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  line1: z.string().min(5, 'Address line 1 must be at least 5 characters'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().default('India'),
  isDefault: z.boolean().default(false),
});

export const getAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (err) {
    next(err);
  }
};

export const createAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const validated = addressSchema.parse(req.body);

    const address = await prisma.$transaction(async (tx) => {
      // If setting this address as default, unset other default addresses for user
      if (validated.isDefault) {
        await tx.address.updateMany({
          where: { userId: req.user!.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Check if user has any existing addresses; if none, make this default
      const existingCount = await tx.address.count({
        where: { userId: req.user!.id },
      });

      return tx.address.create({
        data: {
          userId: req.user!.id,
          name: validated.name,
          phone: validated.phone,
          line1: validated.line1,
          line2: validated.line2 || null,
          city: validated.city,
          state: validated.state,
          postalCode: validated.postalCode,
          country: validated.country,
          isDefault: existingCount === 0 ? true : validated.isDefault,
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Delivery address created successfully.',
      data: address,
    });
  } catch (err) {
    next(err);
  }
};
