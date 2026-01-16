'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import { LogOut, User, Bell, Sun, Moon, BellDot } from 'lucide-react';
import { notificationsAPI } from '@/lib/api';
import socketService from '@/lib/socket';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      // Load initial unread count
      loadUnreadCount();

      // Listen for new notifications
      socketService.on('new_notification', () => {
        loadUnreadCount();
      });

      return () => {
        socketService.off('new_notification');
      };
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    router.push('/notifications');
  };

  if (!user) {
    return null;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'teacher':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'student':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مسؤول';
      case 'teacher':
        return 'معلم';
      case 'student':
        return 'طالب';
      default:
        return role;
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 dark-transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">منصة الكويزات</h1>
            </Link>
            
            <div className="hidden md:ml-6 md:flex md:space-x-8 md:space-x-reverse">
              <Link
                href="/dashboard"
                className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium dark-transition"
              >
                الرئيسية
              </Link>
              
              {user.role === 'student' && (
                <>
                  <Link
                    href="/quizzes"
                    className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium dark-transition"
                  >
                    الكويزات
                  </Link>
                  <Link
                    href="/results"
                    className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium dark-transition"
                  >
                    النتائج
                  </Link>
                </>
              )}
              
              {(user.role === 'teacher' || user.role === 'admin') && (
                <>
                  <Link
                    href="/manage/quizzes"
                    className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium dark-transition"
                  >
                    إدارة الكويزات
                  </Link>
                  <Link
                    href="/manage/students"
                    className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium dark-transition"
                  >
                    إدارة الطلاب
                  </Link>
                </>
              )}
              
              {user.role === 'admin' && (
                <Link
                  href="/admin/users"
                  className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium dark-transition"
                >
                  إدارة المستخدمين
                </Link>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 dark-transition"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <button 
              onClick={handleNotificationClick}
              className="relative p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 dark-transition"
              aria-label="Notifications"
            >
              {unreadCount > 0 ? (
                <BellDot className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Info */}
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 dark-transition">{user.name}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)} dark-transition`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Link href="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
