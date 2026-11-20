import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

const syncProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const profile = await prisma.profile.findUnique({
      where: { id: req.user.id },
      include: {
        vendorProfile: true,
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!profile) {
      throw new AppError('Profile not found.', 404, 'NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        id: profile.id,
        supabaseUserId: profile.supabaseUserId,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        vendor: profile.vendorProfile || null,
        defaultAddress: profile.addresses[0] || null,
        createdAt: profile.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const syncProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to sync profile.', 401, 'UNAUTHORIZED');
    }

    // Strictly validate input - NEVER parse or allow `role` from the body!
    const parseResult = syncProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.issues[0]?.message || 'Invalid profile data',
        400,
        'VALIDATION_ERROR'
      );
    }

    const { name } = parseResult.data;

    // Check if profile already exists in PostgreSQL
    const existing = await prisma.profile.findUnique({
      where: { supabaseUserId: req.user.supabaseUserId },
      include: { vendorProfile: true },
    });

    let profile;
    if (existing) {
      // Only update name if provided; preserve existing database role
      profile = await prisma.profile.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
        },
        include: { vendorProfile: true },
      });
    } else {
      // First-time sync: default role is strictly CUSTOMER
      profile = await prisma.profile.create({
        data: {
          supabaseUserId: req.user.supabaseUserId,
          email: req.user.email,
          name: name || req.user.email.split('@')[0],
          role: 'CUSTOMER',
        },
        include: { vendorProfile: true },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: profile.id,
        supabaseUserId: profile.supabaseUserId,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        vendor: profile.vendorProfile || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully from UrbanBasket API session.',
  });
};

export const getLatestSession = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessions = await prisma.$queryRaw<
      Array<{ token: string; userId: string; expiresAt: Date; email: string; name: string }>
    >`
      SELECT s.token, s."userId", s."expiresAt", u.email, u.name
      FROM neon_auth.session s
      JOIN neon_auth.user u ON s."userId" = u.id
      WHERE s."expiresAt" > NOW()
      ORDER BY s."createdAt" DESC
      LIMIT 1
    `;

    if (!sessions || sessions.length === 0) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    const latest = sessions[0];
    let profile = await prisma.profile.findFirst({
      where: {
        OR: [{ supabaseUserId: latest.userId }, { email: latest.email }],
      },
      include: { vendorProfile: true },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          supabaseUserId: latest.userId,
          email: latest.email,
          name: latest.name || latest.email.split('@')[0],
          role: 'CUSTOMER',
        },
        include: { vendorProfile: true },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: latest.token,
        user: {
          id: latest.userId,
          email: latest.email,
          name: latest.name,
        },
        profile: {
          id: profile.id,
          supabaseUserId: profile.supabaseUserId,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          vendor: profile.vendorProfile || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
