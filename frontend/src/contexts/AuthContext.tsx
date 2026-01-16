'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, getStoredUser, getStoredToken, setAuthData, clearAuthData } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import socketService from '@/lib/socket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  isSocketConnected: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode; initialUser?: User | null }> = ({ children, initialUser = null }) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // If we received a user from SSR, hydrate immediately to avoid UI flicker
      if (initialUser) {
        try {
          const storedToken = getStoredToken();
          if (storedToken) {
            // Fetch full profile using the stored access token to replace minimal SSR user
            try {
              const response = await authAPI.getProfile();
              const fullUser = response.data.data.user;
              setUser(fullUser);
              // Token may have been refreshed by axios interceptor. Read the latest token.
              const effectiveToken = getStoredToken() || storedToken;
              setAuthData(fullUser, effectiveToken);
              const socket = socketService.connect(effectiveToken);
              socket.on('connect', () => setIsSocketConnected(true));
              socket.on('disconnect', () => setIsSocketConnected(false));
              socket.on('connect_error', () => setIsSocketConnected(false));
              setLoading(false);
            } catch (e) {
              // If profile fails, keep initialUser but continue
              console.warn('Profile fetch failed during SSR hydration');
            }
            // Loading state is set above after attempting profile + socket with effective token
          } else {
            // Background refresh to obtain access token using refresh cookie
            try {
              const res = await authAPI.refreshToken();
              const { accessToken } = res.data.data;
              // Fetch full profile to replace minimal SSR user
              const profile = await authAPI.getProfile();
              const fullUser = profile.data.data.user;
              setUser(fullUser);
              setAuthData(fullUser, accessToken);

              const socket = socketService.connect(accessToken);
              socket.on('connect', () => setIsSocketConnected(true));
              socket.on('disconnect', () => setIsSocketConnected(false));
              socket.on('connect_error', () => setIsSocketConnected(false));
              setLoading(false);
            } catch (e) {
              // Ignore refresh failures here; user will be asked to login when needed
              console.warn('Background token refresh failed during SSR hydration');
              setLoading(false);
            }
          }
        } catch (e) {
          // In case of unexpected errors, fallback to normal bootstrap
          setLoading(false);
        }
        return; // Do not proceed to localStorage bootstrap when SSR user is present
      }

      // Fallback: use localStorage data and verify via profile
      const storedUser = getStoredUser();
      const storedToken = getStoredToken();

      if (storedUser && storedToken) {
        try {
          // Verify token by fetching profile
          const response = await authAPI.getProfile();
          const userData = response.data.data.user;
          setUser(userData);
          // Token may have been refreshed behind the scenes by axios interceptor
          const effectiveToken = getStoredToken() || storedToken;
          setAuthData(userData, effectiveToken);
          // Connect to socket and monitor connection
          const socket = socketService.connect(effectiveToken);
          // Listen for socket connection events
          socket.on('connect', () => {
            setIsSocketConnected(true);
            console.log('Socket connected successfully');
          });
          socket.on('disconnect', () => {
            setIsSocketConnected(false);
            console.log('Socket disconnected');
          });
          socket.on('connect_error', (error: any) => {
            setIsSocketConnected(false);
            console.error('Socket connection error:', error);
          });
        } catch (error) {
          // Token is invalid, clear auth data
          clearAuthData();
          setUser(null);
        }
      }
      setLoading(false);
    };

    // Monitor browser online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    initAuth();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initialUser]);

  const login = async (phone: string, password: string) => {
    try {
      const response = await authAPI.login({ phone, password });
      const { user: userData, accessToken } = response.data.data;
      setUser(userData);
      setAuthData(userData, accessToken);
      // Connect to socket and monitor connection
      const socket = socketService.connect(accessToken);
      socket.on('connect', () => {
        setIsSocketConnected(true);
      });
      socket.on('disconnect', () => {
        setIsSocketConnected(false);
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: any) => {
    try {
      await authAPI.register(data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      clearAuthData();
      socketService.disconnect();
      setIsSocketConnected(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      setAuthData(updatedUser, getStoredToken() || '');
    }
  };

  const value = {
    user,
    loading,
    isOnline,
    isSocketConnected,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
