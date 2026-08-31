import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth.api';
import { authEvents } from '../api/authEvents';
import type { User } from '../types';

interface AuthCredentials {
  email: string;
  password?: string;
  pin?: string;
  dni?: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  nombre: string;
  companyNombre: string;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: number) => Promise<void>;
  updateProfile: (data: { nombre?: string; email?: string; password?: string; newPassword?: string }) => Promise<void>;
  changePin: (data: { current_pin: string; new_pin: string }) => Promise<void>;
  isAdmin: boolean;
  isJefe: boolean;
  isSuperAdmin: boolean;
  isColaborador: boolean;
  canManageUsers: boolean;
  canManageGroups: boolean;
  canForceDelete: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUserRaw = await AsyncStorage.getItem('user');
        const storedUser: User | null = storedUserRaw ? JSON.parse(storedUserRaw) : null;
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(storedUser);

        // Re-sync from the backend so membership changes (a new workspace, a role
        // change made elsewhere) show up on next app open without forcing a logout.
        if (storedToken) {
          try {
            const { data: userData } = await authApi.me();
            const freshUser = buildUserFromMe(userData, storedUser?.companyId ?? undefined);
            await AsyncStorage.setItem('user', JSON.stringify(freshUser));
            setUser(freshUser);
          } catch {
            // Offline or token expired — keep the cached user, let API calls fail normally.
          }
        }
      } catch (e) {
        console.error('Error loading stored auth:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredAuth();

    return authEvents.onForceLogout(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  // Builds the local User from a /auth/me response, which includes ALL of the
  // user's active memberships (a user can belong to more than one company).
  // `userData.activeCompanyId` is the backend's persisted "last active company"
  // for this user — the source of truth, kept in sync across devices/platforms
  // by switchCompany(). `preferredCompanyId` (the locally cached companyId) is
  // only a fallback for older backends that don't send activeCompanyId yet.
  const buildUserFromMe = (userData: any, preferredCompanyId?: number | null): User => {
    const memberships = userData.memberships || [];
    const activeMembership =
      memberships.find((m: any) => m.company?.id === userData.activeCompanyId) ||
      (preferredCompanyId != null && memberships.find((m: any) => m.company?.id === preferredCompanyId)) ||
      memberships.find((m: any) => m.status === 'ACTIVA') ||
      memberships[0];

    return {
      ...userData,
      id: userData.id,
      nombre: userData.nombre || userData.name || 'Usuario',
      name: userData.nombre || userData.name || 'Usuario',
      dni: userData.dni,
      email: userData.email || '',
      rol: (activeMembership?.rol || 'INVITADO') as any,
      role: activeMembership?.rol || 'invitado',
      isActive: userData.is_active ?? userData.isActive ?? true,
      emoji: userData.emoji || '👤',
      whatsapp: userData.whatsapp,
      group_id: userData.group_id ?? userData.groupId ?? null,
      group_name: userData.group_name ?? null,
      companyId: activeMembership?.company?.id ?? null,
      companyName: activeMembership?.company?.nombre || '',
      companyPlan: activeMembership?.company?.plan || 'TRIAL',
      companyPlanVencimiento: activeMembership?.company?.planVencimiento || null,
      companies: memberships.map((m: any) => ({
        id: m.company.id,
        nombre: m.company.nombre,
        rol: m.rol,
      })),
    };
  };

  const persistUser = async (userToSave: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(userToSave));
    setUser(userToSave);
  };

  const persistToken = async (access_token: string) => {
    await AsyncStorage.setItem('token', access_token);
    setToken(access_token);
  };

  const login = async (credentials: AuthCredentials) => {
    const { data } = await authApi.login(credentials);
    await persistToken(data.access_token);
    const { data: userData } = await authApi.me();
    await persistUser(buildUserFromMe(userData));
  };

  const register = async (credentials: RegisterCredentials) => {
    const { data } = await authApi.register({
      nombre: credentials.nombre,
      email: credentials.email,
      password: credentials.password,
      companyNombre: credentials.companyNombre,
    });
    await persistToken(data.access_token);
    const { data: userData } = await authApi.me();
    await persistUser(buildUserFromMe(userData));
  };

  const switchCompany = async (companyId: number) => {
    const { data } = await authApi.switchCompany(companyId);
    await persistToken(data.access_token);
    const { data: userData } = await authApi.me();
    await persistUser(buildUserFromMe(userData, companyId));
  };

  const updateProfile = async (data: { nombre?: string; email?: string; password?: string; newPassword?: string }) => {
    if (user) {
      const updated = { ...user, nombre: data.nombre || user.nombre, email: data.email || user.email };
      await AsyncStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const changePin = async (data: { current_pin: string; new_pin: string }) => {
    await authApi.changePin(data);
  };

  const roleStr = String(user?.role || user?.rol || 'usuario').toLowerCase();
  const isSuperAdmin = roleStr === 'superadmin';
  const isAdmin = isSuperAdmin || roleStr === 'admin';
  const isJefe = isAdmin || roleStr === 'jefe';
  const isColaborador = !isAdmin && !isJefe;

  const canManageUsers = isAdmin;
  const canManageGroups = isAdmin;
  const canForceDelete = isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        switchCompany,
        updateProfile,
        changePin,
        isAdmin,
        isJefe,
        isSuperAdmin,
        isColaborador,
        canManageUsers,
        canManageGroups,
        canForceDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
