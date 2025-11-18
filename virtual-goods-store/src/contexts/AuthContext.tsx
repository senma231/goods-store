import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth as authApi } from '@/lib/api';

interface User {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const { user } = await authApi.getUser();
          setUser(user);
          setIsAdmin(user.role === 'admin');
        }
      } catch (error) {
        console.error('加载用户失败:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  async function signIn(email: string, password: string) {
    const { user } = await authApi.signIn(email, password);
    setUser(user);
    setIsAdmin(user.role === 'admin');
  }

  async function signUp(email: string, password: string, fullName?: string) {
    const { user } = await authApi.signUp(email, password, fullName);
    setUser(user);
    setIsAdmin(user.role === 'admin');
  }

  async function signOut() {
    await authApi.signOut();
    setUser(null);
    setIsAdmin(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内使用');
  }
  return context;
}
