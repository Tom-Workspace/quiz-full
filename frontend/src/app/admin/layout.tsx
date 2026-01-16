'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard,
  Users,
  FileQuestion,
  Bell,
  Settings,
  LogOut,
  Sun,
  Moon,
  Shield,
  BarChart3,
  UserCog,
  FileText,
  Activity,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for auth to resolve
    if (!user) return;   // Middleware already guards access; don't client-redirect to login
    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const navigationItems = [
    {
      name: 'لوحة التحكم',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      description: 'نظرة عامة على النظام'
    },
    {
      name: 'إدارة المستخدمين',
      href: '/admin/users',
      icon: Users,
      description: 'إدارة الطلاب والمعلمين والمسؤولين'
    },
    {
      name: 'إدارة الكويزات',
      href: '/admin/quizzes',
      icon: FileQuestion,
      description: 'إشراف على جميع الكويزات'
    },
    {
      name: 'نظام الإشعارات',
      href: '/admin/notifications',
      icon: Bell,
      description: 'إرسال وإدارة الإشعارات'
    },
    {
      name: 'التقارير والإحصائيات',
      href: '/admin/reports',
      icon: BarChart3,
      description: 'تقارير مفصلة وإحصائيات'
    },
    {
      name: 'إعدادات النظام',
      href: '/admin/settings',
      icon: Settings,
      description: 'إعدادات المنصة العامة'
    }
  ];

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 w-screen flex flex-col lg:flex-row`}>
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      } lg:translate-x-0 w-[20%]`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="mr-3">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">لوحة الإدارة</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">نظام إدارة المنصة</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Admin Info */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 ">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <div className="mr-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">مسؤول النظام</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center p-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <Icon className={`h-5 w-5 ml-3 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isActive ? 'text-white' : ''}`}>
                      {item.name}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.description}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-white" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <Button
              onClick={toggleTheme}
              variant="outline"
              className="w-full justify-start text-amber-50 hover:bg-gradient-to-r dark:from-gray-700 dark:to-blue-800 hover:from-blue-600 hover:to-purple-600 hover:text-white transition-all duration-300"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 ml-3 " />
                  الوضع النهاري
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 ml-3 " />
                  الوضع الليلي
                </>
              )}
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="danger"
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 ml-3" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-[80%] ">
        {/* Page content */}
        <main className="min-h-screen ">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
