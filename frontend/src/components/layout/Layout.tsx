'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const pathname = usePathname();
  
  // Don't show navbar on admin pages since they have their own layout
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <div className={"min-h-screen transition-all duration-300 bg-gray-50 dark:bg-gray-900"}>
      {user && !isAdminPage && <Navbar />}
      <main className={user && !isAdminPage ? 'pt-16' : ''}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
