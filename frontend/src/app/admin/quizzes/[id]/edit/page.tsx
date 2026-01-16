'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { quizzesAPI } from '@/lib/api';
import QuizBuilder from '@/components/admin/QuizBuilder';

const AdminEditQuizPage: React.FC = () => {
  const { user } = useAuth();
  const params = useParams();
  const id = params.id as string;
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await quizzesAPI.getById(id, { includeQuestions: true });
        setQuiz(res.data.data?.quiz || res.data.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'تعذر تحميل الكويز');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600 dark:text-gray-300">هذه الصفحة مخصصة للمسؤولين والمعلمين فقط</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">خطأ</h1>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <QuizBuilder mode="edit" quizId={id} initialQuiz={quiz} />
      </div>
    </div>
  );
};

export default AdminEditQuizPage;
