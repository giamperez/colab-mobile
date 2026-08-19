import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth.api';
import { authEvents } from '../api/authEvents';
import type { User } from '../types';

interface AuthCredentials {
  email?: string;
  password?: string;
  dni?: string;
  pin?: string;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  changePin: (data: { current_pin: string; new_pin: string }) => Promise<void>;
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
        const storedUser = await AsyncStorage.getItem('user');
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
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

  const login = async (credentials: AuthCredentials) => {
    const { data } = await authApi.login(credentials);
    const { access_token, user: loggedUser } = data;

    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(loggedUser));

    setToken(access_token);
    setUser(loggedUser);
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

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, changePin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
