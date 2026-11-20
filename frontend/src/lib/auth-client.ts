import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL:
    import.meta.env.VITE_NEON_AUTH_URL ||
    'https://ep-shiny-bonus-bi8xa84c.neonauth.c-5.ap-southeast-1.aws.neon.tech/neondb/auth',
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
