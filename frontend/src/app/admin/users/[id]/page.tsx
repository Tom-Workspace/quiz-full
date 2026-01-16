import { Metadata } from 'next';
import UserProfileClient from './UserProfileClient';

export const metadata: Metadata = {
  title: 'ملف المستخدم | لوحة الإدارة',
};

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ملف المستخدم</h1>
          <p className="text-gray-600 dark:text-gray-300">عرض كل بيانات المستخدم ومحاولاته وإحصاءاته</p>
        </div>

        {/* Client-side data fetcher to use accessToken from localStorage */}
        <UserProfileClient userId={id} />
      </div>
    </div>
  );
}
