import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string; // Internal Profile ID (UUID)
  supabaseUserId: string; // Supabase UID (sub)
  email: string;
  name: string;
  role: Role;
  vendorProfileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
