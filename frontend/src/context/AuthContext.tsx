import React, { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';

export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export interface VendorProfile {
  id: string;
  storeName: string;
  storeSlug: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  commissionRate: number;
}

export interface UserProfile {
  id: string;
  supabaseUserId: string;
  email: string;
  name: string;
  role: UserRole;
  vendor?: VendorProfile | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithOAuth: (provider: 'google') => Promise<void>;
  switchDemoRole: (role: 'admin' | 'vendor' | 'customer') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
  };

  const fetchCurrentProfile = async (authToken: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if OAuth redirect passed token in URL search or hash
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const redirectToken =
        urlParams.get('token') ||
        urlParams.get('session_token') ||
        urlParams.get('access_token') ||
        hashParams.get('token') ||
        hashParams.get('access_token');

      if (redirectToken) {
        localStorage.setItem('urbanbasket_session_token', redirectToken);
        localStorage.removeItem('urbanbasket_demo_role');
        localStorage.removeItem('urbanbasket_explicit_logout');
        localStorage.removeItem('urbanbasket_pending_oauth');
        // Clean up URL query parameters cleanly without reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const isPendingOAuth = localStorage.getItem('urbanbasket_pending_oauth') === 'google';
      const isExplicitLogout = localStorage.getItem('urbanbasket_explicit_logout') === 'true';

      // 2. If user just returned from Google OAuth, or hasn't explicitly logged out and has no stored token, check backend latest session
      if (isPendingOAuth || (!isExplicitLogout && !localStorage.getItem('urbanbasket_session_token') && !localStorage.getItem('urbanbasket_demo_role'))) {
        let attempts = isPendingOAuth ? 3 : 1;
        while (attempts > 0) {
          try {
            const res = await fetch(`${getApiBaseUrl()}/auth/latest-session`);
            if (res.ok) {
              const json = await res.json();
              if (json.success && json.data?.token) {
                const { token: sessionToken, user: sUser, profile: sProfile } = json.data;
                setToken(sessionToken);
                localStorage.setItem('urbanbasket_session_token', sessionToken);
                localStorage.removeItem('urbanbasket_demo_role');
                localStorage.removeItem('urbanbasket_pending_oauth');
                localStorage.removeItem('urbanbasket_explicit_logout');
                setUser(sUser);
                setProfile(sProfile);
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.warn('Could not fetch latest session from backend:', err);
          }
          attempts--;
          if (attempts > 0) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
        localStorage.removeItem('urbanbasket_pending_oauth');
      }

      // 3. Check for stored session token in localStorage
      const storedToken = localStorage.getItem('urbanbasket_session_token');
      if (storedToken && !storedToken.startsWith('demo-token-')) {
        setToken(storedToken);
        const p = await fetchCurrentProfile(storedToken);
        if (p) {
          setProfile(p);
          setUser({ id: p.supabaseUserId, email: p.email, name: p.name });
          setLoading(false);
          return;
        } else {
          localStorage.removeItem('urbanbasket_session_token');
          setToken(null);
        }
      }

      // 4. Check live Better Auth / Neon Auth session (same-origin or unblocked cookie environments)
      try {
        const { data } = await authClient.getSession();
        if (data?.session && data?.user) {
          const sessionToken = data.session.token;
          setToken(sessionToken);
          localStorage.setItem('urbanbasket_session_token', sessionToken);
          localStorage.removeItem('urbanbasket_demo_role');
          localStorage.removeItem('urbanbasket_explicit_logout');

          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            image: data.user.image,
          };
          setUser(authUser);

          // Immediate optimistic profile from session so UI changes instantly
          const immediateProfile: UserProfile = {
            id: data.user.id,
            supabaseUserId: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email.split('@')[0],
            role: 'CUSTOMER',
          };
          setProfile(immediateProfile);
          setLoading(false);

          // Background sync with backend for full vendor metadata
          fetchCurrentProfile(sessionToken).then((backendProfile) => {
            if (backendProfile) {
              setProfile(backendProfile);
            }
          });
          return;
        }
      } catch (err) {
        console.warn('Neon Auth getSession check skipped:', err);
      }

      // 5. Fallback: check for stored demo role evaluation
      const storedDemoRole = localStorage.getItem('urbanbasket_demo_role');
      if (storedDemoRole) {
        await switchDemoRole(storedDemoRole as 'admin' | 'vendor' | 'customer');
        return;
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    localStorage.removeItem('urbanbasket_demo_role');
    localStorage.removeItem('urbanbasket_explicit_logout');
    localStorage.removeItem('urbanbasket_pending_oauth');
    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });

      if (res.error) {
        throw new Error(res.error.message || 'Login failed');
      }

      if (res.data) {
        const authToken = (res.data as any).token || (res.data as any).session?.token;
        if (authToken) {
          setToken(authToken);
          localStorage.setItem('urbanbasket_session_token', authToken);
        }
        if (res.data.user) {
          setUser({
            id: res.data.user.id,
            email: res.data.user.email,
            name: res.data.user.name,
            image: res.data.user.image,
          });

          // Immediate fallback profile
          const initialProfile: UserProfile = {
            id: res.data.user.id,
            supabaseUserId: res.data.user.id,
            email: res.data.user.email,
            name: res.data.user.name || res.data.user.email.split('@')[0],
            role: 'CUSTOMER',
          };
          setProfile(initialProfile);

          if (authToken) {
            const p = await fetchCurrentProfile(authToken);
            if (p) setProfile(p);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    setError(null);
    setLoading(true);
    localStorage.removeItem('urbanbasket_demo_role');
    localStorage.removeItem('urbanbasket_explicit_logout');
    localStorage.removeItem('urbanbasket_pending_oauth');
    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (res.error) {
        throw new Error(res.error.message || 'Registration failed');
      }

      if (res.data) {
        const authToken = (res.data as any).token || (res.data as any).session?.token;
        if (authToken) {
          setToken(authToken);
          localStorage.setItem('urbanbasket_session_token', authToken);
        }
        if (res.data.user) {
          setUser({
            id: res.data.user.id,
            email: res.data.user.email,
            name: res.data.user.name,
            image: res.data.user.image,
          });

          const initialProfile: UserProfile = {
            id: res.data.user.id,
            supabaseUserId: res.data.user.id,
            email: res.data.user.email,
            name: res.data.user.name || res.data.user.email.split('@')[0],
            role: 'CUSTOMER',
          };
          setProfile(initialProfile);

          if (authToken) {
            const p = await fetchCurrentProfile(authToken);
            if (p) setProfile(p);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google') => {
    setError(null);
    localStorage.removeItem('urbanbasket_demo_role');
    localStorage.removeItem('urbanbasket_explicit_logout');
    localStorage.setItem('urbanbasket_pending_oauth', provider);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      });
    } catch (err: unknown) {
      localStorage.removeItem('urbanbasket_pending_oauth');
      const msg = err instanceof Error ? err.message : 'OAuth sign in failed';
      setError(msg);
      throw err;
    }
  };

  const switchDemoRole = async (role: 'admin' | 'vendor' | 'customer') => {
    setLoading(true);
    setError(null);
    localStorage.removeItem('urbanbasket_explicit_logout');
    localStorage.removeItem('urbanbasket_pending_oauth');
    try {
      const demoToken = `demo-token-${role}`;
      localStorage.setItem('urbanbasket_demo_role', role);
      setToken(demoToken);

      const profileData = await fetchCurrentProfile(demoToken);
      if (profileData) {
        setProfile(profileData);
        setUser({
          id: profileData.supabaseUserId,
          email: profileData.email,
          name: profileData.name,
        });
      } else {
        const mockMap: Record<string, UserProfile> = {
          admin: {
            id: 'demo-admin-id',
            supabaseUserId: 'supa-admin-001',
            email: 'admin@urbanbasket.com',
            name: 'Super Admin',
            role: 'ADMIN',
          },
          vendor: {
            id: 'demo-vendor-id',
            supabaseUserId: 'supa-vendor-001',
            email: 'technest@urbanbasket.com',
            name: 'Alex Rivera (TechNest)',
            role: 'VENDOR',
            vendor: {
              id: 'vendor-store-001',
              storeName: 'TechNest Electronics',
              storeSlug: 'technest-electronics',
              status: 'APPROVED',
              commissionRate: 0.1,
            },
          },
          customer: {
            id: 'demo-customer-id',
            supabaseUserId: 'supa-customer-001',
            email: 'customer@urbanbasket.com',
            name: 'Priya Patel',
            role: 'CUSTOMER',
          },
        };
        setProfile(mockMap[role]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo role switch failed');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('urbanbasket_demo_role');
    localStorage.removeItem('urbanbasket_session_token');
    localStorage.removeItem('urbanbasket_pending_oauth');
    localStorage.setItem('urbanbasket_explicit_logout', 'true');
    try {
      await authClient.signOut();
    } catch {
      // Ignored if session already invalidated
    }
    setUser(null);
    setProfile(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    if (token) {
      const p = await fetchCurrentProfile(token);
      if (p) setProfile(p);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        error,
        signInWithEmail,
        signUpWithEmail,
        signInWithOAuth,
        switchDemoRole,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
