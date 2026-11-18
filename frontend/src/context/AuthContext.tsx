import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  };

  const syncBackendProfile = async (authToken: string, nameHint?: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/sync-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: nameHint }),
      });

      if (!res.ok) {
        throw new Error('Failed to synchronize profile with backend');
      }

      const json = await res.json();
      return json.data;
    } catch (err) {
      console.error('Error syncing profile with backend API:', err);
      return null;
    }
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

    // 2. Listen to Supabase Auth state changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSession = async (session: Session | null) => {
    if (session?.user && session?.access_token) {
      setUser(session.user);
      setToken(session.access_token);
      const name = session.user.user_metadata?.name || session.user.email?.split('@')[0];
      const synced = await syncBackendProfile(session.access_token, name);
      setProfile(synced);
    } else {
      setUser(null);
      setToken(null);
      setProfile(null);
    }
    setLoading(false);
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      if (data.session) {
        await handleSession(data.session);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (authError) throw authError;
      if (data.session) {
        await handleSession(data.session);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OAuth sign in failed');
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
          app_metadata: {},
          user_metadata: { name: profileData.name },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User);
      } else {
        // Fallback demo mock if backend database is cold
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
    await supabase.auth.signOut();
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
