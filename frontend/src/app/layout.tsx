import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Layout from '@/components/layout/Layout';
import { getInitialUserFromCookie } from '@/lib/server-auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'منصة الكويزات التعليمية',
  description: 'منصة شاملة لإدارة الكويزات والاختبارات التعليمية',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getInitialUserFromCookie();

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider initialUser={initialUser}>
            <Layout>
              {children}
            </Layout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
