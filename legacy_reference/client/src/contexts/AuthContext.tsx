import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';

export interface User {
  id: string;
  username: string;
  email: string | null;
  roleId: string;
  roleName: string;
  permissions: string[];
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check current auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v2/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    try {
      const response = await apiRequest('POST', '/api/v2/auth/login', { username, password });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Invalidate all queries on login to refresh data
        queryClient.invalidateQueries();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await apiRequest('POST', '/api/v2/auth/logout');
      setUser(null);
      // Clear all cached data on logout
      queryClient.clear();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  function hasPermission(permission: string): boolean {
    if (!user) return false;
    return user.permissions.includes(permission);
  }

  function hasAnyPermission(permissions: string[]): boolean {
    if (!user) return false;
    return permissions.some(p => user.permissions.includes(p));
  }

  function hasAllPermissions(permissions: string[]): boolean {
    if (!user) return false;
    return permissions.every(p => user.permissions.includes(p));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
