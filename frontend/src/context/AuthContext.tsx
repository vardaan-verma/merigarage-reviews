import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AdminPermissionCode, RoleName, UpdateProfileRequest, UserDto } from '../api/types';

interface AuthContextType {
  user: UserDto | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGarageOwner: boolean;
  isVehicleOwner: boolean;
  login: (email: string, password: string, portal?: string) => Promise<UserDto>;
  loginWithGoogle: (credential: string, portal?: string, role?: string) => Promise<UserDto>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    registrationSource?: string;
    consentStatus?: string;
    role?: RoleName;
  }) => Promise<UserDto>;
  updateProfile: (data: UpdateProfileRequest) => Promise<UserDto>;
  uploadProfilePhoto: (file: File) => Promise<UserDto>;
  deleteProfilePhoto: () => Promise<UserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: RoleName) => boolean;
  hasPermission: (permission: AdminPermissionCode) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const currentUser = await api.auth.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = React.useCallback(async (email: string, password: string, portal?: string): Promise<UserDto> => {
    const loggedIn = await api.auth.login(email, password, portal);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const loginWithGoogle = React.useCallback(async (credential: string, portal?: string, role?: string): Promise<UserDto> => {
    const loggedIn = await api.auth.googleAuth(credential, portal, undefined, role);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = React.useCallback(async (data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    registrationSource?: string;
    consentStatus?: string;
    role?: RoleName;
  }): Promise<UserDto> => {
    const registered = await api.auth.register(data);
    return registered;
  }, []);

  const updateProfile = React.useCallback(async (data: UpdateProfileRequest): Promise<UserDto> => {
    const updated = await api.auth.updateProfile(data);
    setUser(updated);
    return updated;
  }, []);

  const uploadProfilePhoto = React.useCallback(async (file: File): Promise<UserDto> => {
    const updated = await api.auth.uploadProfilePhoto(file);
    setUser(updated);
    return updated;
  }, []);

  const deleteProfilePhoto = React.useCallback(async (): Promise<UserDto> => {
    const updated = await api.auth.deleteProfilePhoto();
    setUser(updated);
    return updated;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = React.useCallback(
    (role: RoleName): boolean => {
      return !!user?.roles?.includes(role);
    },
    [user?.roles]
  );

  const hasPermission = React.useCallback(
    (permission: AdminPermissionCode): boolean => {
      return !!user?.permissions?.includes(permission);
    },
    [user?.permissions]
  );

  const isAuthenticated = !!user;
  const isAdmin = hasRole('ROLE_ADMIN');
  const isGarageOwner = hasRole('ROLE_GARAGE_OWNER');
  const isVehicleOwner = hasRole('ROLE_USER') && !isGarageOwner;

  const contextValue = React.useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAuthenticated,
      isAdmin,
      isGarageOwner,
      isVehicleOwner,
      login,
      loginWithGoogle,
      register,
      updateProfile,
      uploadProfilePhoto,
      deleteProfilePhoto,
      logout,
      refreshUser,
      hasRole,
      hasPermission,
    }),
    [
      user,
      loading,
      isAuthenticated,
      isAdmin,
      isGarageOwner,
      isVehicleOwner,
      login,
      loginWithGoogle,
      register,
      updateProfile,
      uploadProfilePhoto,
      deleteProfilePhoto,
      logout,
      refreshUser,
      hasRole,
      hasPermission,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
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
