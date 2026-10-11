import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AdminPermissionCode, RoleName, UserDto } from '../api/types';

interface AuthContextType {
  user: UserDto | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGarageOwner: boolean;
  login: (email: string, password: string) => Promise<UserDto>;
  register: (data: { email: string; password: string; fullName: string; phoneNumber?: string }) => Promise<UserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: RoleName) => boolean;
  hasPermission: (permission: AdminPermissionCode) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await api.auth.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<UserDto> => {
    const loggedIn = await api.auth.login(email, password);
    setUser(loggedIn);
    return loggedIn;
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
  }): Promise<UserDto> => {
    const registered = await api.auth.register(data);
    // After registration, auto login or leave for manual login
    return registered;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  };

  const hasRole = (role: RoleName): boolean => {
    return !!user?.roles?.includes(role);
  };

  const hasPermission = (permission: AdminPermissionCode): boolean => {
    return !!user?.permissions?.includes(permission);
  };

  const isAuthenticated = !!user;
  const isAdmin = hasRole('ROLE_ADMIN');
  const isGarageOwner = hasRole('ROLE_GARAGE_OWNER');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        isGarageOwner,
        login,
        register,
        logout,
        refreshUser,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
