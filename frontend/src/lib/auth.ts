export interface User {
  _id: string;
  name: string;
  phone: string;
  age: number;
  fatherPhone?: string;
  role: 'student' | 'teacher' | 'admin';
  isApproved: boolean;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

export const setAuthData = (user: User, token: string) => {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('accessToken', token);
};

export const clearAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
};

export const isAuthenticated = (): boolean => {
  return !!(getStoredUser() && getStoredToken());
};

export const hasRole = (user: User | null, roles: string[]): boolean => {
  return user ? roles.includes(user.role) : false;
};

export const isApproved = (user: User | null): boolean => {
  return user ? user.isApproved || user.role === 'admin' : false;
};

