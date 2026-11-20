import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { AuthenticatedUser } from '../types/express';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
  exp?: number;
  role?: string;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing or invalid format. Expected Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Token is missing from Authorization header.', 401, 'UNAUTHORIZED');
    }

    let decoded: SupabaseJwtPayload;

    // In dev or test mode, check for predefined demo tokens first
    if (env.NODE_ENV !== 'production' && token.startsWith('demo-token-')) {
      const demoRole = token.replace('demo-token-', ''); // 'admin', 'vendor', 'customer'
      const emailMap: Record<string, string> = {
        admin: 'admin@urbanbasket.com',
        vendor: 'technest@urbanbasket.com',
        customer: 'customer@urbanbasket.com',
      };
      const email = emailMap[demoRole];
      if (email) {
        const profile = await prisma.profile.findUnique({
          where: { email },
          include: { vendorProfile: true },
        });

        if (profile) {
          req.user = {
            id: profile.id,
            supabaseUserId: profile.supabaseUserId,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            vendorProfileId: profile.vendorProfile?.id,
          };
          return next();
        }
      }
    }

    // Check if token matches a live Neon Auth session in neon_auth.session
    try {
      const neonSessions = await prisma.$queryRaw<
        Array<{ id: string; userId: string; expiresAt: Date; email: string; name: string }>
      >`
        SELECT s.id, s."userId", s."expiresAt", u.email, u.name
        FROM neon_auth.session s
        JOIN neon_auth.user u ON s."userId" = u.id
        WHERE s.token = ${token} AND s."expiresAt" > NOW()
        LIMIT 1
      `;

      if (neonSessions && neonSessions.length > 0) {
        const neonUser = neonSessions[0];
        let profile = await prisma.profile.findFirst({
          where: {
            OR: [
              { supabaseUserId: neonUser.userId },
              { email: neonUser.email },
            ],
          },
          include: { vendorProfile: true },
        });

        if (!profile) {
          profile = await prisma.profile.create({
            data: {
              supabaseUserId: neonUser.userId,
              email: neonUser.email,
              name: neonUser.name || neonUser.email.split('@')[0],
              role: 'CUSTOMER',
            },
            include: { vendorProfile: true },
          });
        }

        req.user = {
          id: profile.id,
          supabaseUserId: profile.supabaseUserId,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          vendorProfileId: profile.vendorProfile?.id,
        };
        return next();
      }
    } catch {
      // Fall through to JWT verification if neon_auth schema is not present (e.g. in mock tests)
    }

    // Verify JWT cryptographic signature
    if (env.SUPABASE_JWT_SECRET) {
      try {
        decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as SupabaseJwtPayload;
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'TokenExpiredError') {
          throw new AppError('Authentication token has expired. Please refresh your session.', 401, 'TOKEN_EXPIRED');
        }
        throw new AppError('Invalid authentication token signature.', 401, 'INVALID_TOKEN');
      }
    } else {
      // Development fallback if JWT secret is not configured
      decoded = jwt.decode(token) as SupabaseJwtPayload;
      if (!decoded || !decoded.sub) {
        throw new AppError('Malformed authentication token.', 401, 'INVALID_TOKEN');
      }
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new AppError('Authentication token has expired.', 401, 'TOKEN_EXPIRED');
      }
    }

    const supabaseUserId = decoded.sub;

    // Fetch user profile from PostgreSQL
    let profile = await prisma.profile.findUnique({
      where: { supabaseUserId },
      include: { vendorProfile: true },
    });

    // Auto-create initial customer profile if not yet created in PostgreSQL
    if (!profile && decoded.email) {
      const name = decoded.user_metadata?.name || decoded.user_metadata?.full_name || decoded.email.split('@')[0];
      profile = await prisma.profile.create({
        data: {
          supabaseUserId,
          email: decoded.email,
          name,
          role: 'CUSTOMER', // Default role is ALWAYS CUSTOMER. Never accept role from token or client.
        },
        include: { vendorProfile: true },
      });
    }

    if (!profile) {
      throw new AppError('User profile not found. Please sync your account.', 401, 'PROFILE_NOT_FOUND');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: profile.id,
      supabaseUserId: profile.supabaseUserId,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      vendorProfileId: profile.vendorProfile?.id,
    };

    req.user = authenticatedUser;
    next();
  } catch (err) {
    next(err);
  }
};
