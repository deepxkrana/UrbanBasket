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
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
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
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
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
    // 1. Check for stored demo token session
    const storedDemoRole = localStorage.getItem('urbanbasket_demo_role');
    if (storedDemoRole) {
      switchDemoRole(storedDemoRole as 'admin' | 'vendor' | 'customer');
      return;
    }

    // 2. Check for stored session token
    const storedToken = localStorage.getItem('urbanbasket_session_token');
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentProfile(storedToken).then((p) => {
        if (p) {
          setProfile(p);
          setUser({ id: p.supabaseUserId, email: p.email, name: p.name });
        } else {
          localStorage.removeItem('urbanbasket_session_token');
          setToken(null);
        }
        setLoading(false);
      });
      return;
    }

    // 3. Check live Neon Auth session via Better Auth client
    authClient
      .getSession()
      .then(({ data }) => {
        if (data?.session && data?.user) {
          const sessionToken = data.session.token;
          setToken(sessionToken);
          localStorage.setItem('urbanbasket_session_token', sessionToken);
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            image: data.user.image,
          });
          fetchCurrentProfile(sessionToken).then((p) => {
            setProfile(p);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
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
          const p = await fetchCurrentProfile(authToken);
          setProfile(p);
        }
        if (res.data.user) {
          setUser({
            id: res.data.user.id,
            email: res.data.user.email,
            name: res.data.user.name,
            image: res.data.user.image,
          });
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
          const p = await fetchCurrentProfile(authToken);
          setProfile(p);
        }
        if (res.data.user) {
          setUser({
            id: res.data.user.id,
            email: res.data.user.email,
            name: res.data.user.name,
            image: res.data.user.image,
          });
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

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OAuth sign in failed';
      setError(msg);
      throw err;
    }
  };

  const switchDemoRole = async (role: 'admin' | 'vendor' | 'customer') => {
    setLoading(true);
    setError(null);
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
