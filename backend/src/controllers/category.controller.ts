import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};
