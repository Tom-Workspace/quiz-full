import { redirect } from 'next/navigation';
import { getInitialUserFromCookie } from '@/lib/server-auth';

export default async function HomePage() {
  const user = await getInitialUserFromCookie();
  if (!user) {
    redirect('/auth/login');
  }
  if (user.role === 'admin') {
    redirect('/admin/dashboard');
  }
  redirect('/dashboard');
}
