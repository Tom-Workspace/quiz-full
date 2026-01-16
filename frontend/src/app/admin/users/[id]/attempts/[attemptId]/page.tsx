import { Metadata } from 'next';
import AttemptDetailsClient from './AttemptDetailsClient';

export const metadata: Metadata = {
  title: 'تفاصيل المحاولة | لوحة الإدارة',
};

export default async function AttemptDetailsPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">تفاصيل المحاولة</h1>
          <p className="text-gray-600 dark:text-gray-300">تحليل شامل لإجابات الطالب والزمن والنتيجة</p>
        </div>
        <AttemptDetailsClient userId={id} attemptId={attemptId} />
      </div>
    </div>
  );
}
