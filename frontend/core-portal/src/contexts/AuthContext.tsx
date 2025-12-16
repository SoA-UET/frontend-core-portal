import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials } from '../types';
import { authService } from '../services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    try {
      const storedUser = authService.getCurrentUser && authService.getCurrentUser();
      if (storedUser && authService.isAuthenticated && authService.isAuthenticated()) {
        setUser(storedUser);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    console.log('[AuthContext] login response:', response);

    if (response.status === 'success') {
      // Normalize admin response to user object
      let user: User;
      if (response.admin) {
        // Backend returns admin object, map to User
        user = {
          id: response.admin.employee_id,
          email: credentials.username, // use login username as email
          full_name: response.admin.full_name,
          role: response.admin.role,
          permissions: [], // will be loaded from token or separate call if needed
          is_active: response.admin.status === 'ACTIVE',
          created_at: new Date().toISOString(),
        };
      } else if (response.user) {
        user = response.user;
      } else {
        throw new Error('Invalid response: missing user or admin data');
      }

      authService.setAuthData(response.access_token, user);
      setUser(user);
      console.log('[AuthContext] user set:', user);
    } else {
      console.warn('[AuthContext] login failed, response:', response);
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
