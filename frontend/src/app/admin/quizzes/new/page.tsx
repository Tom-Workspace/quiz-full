'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import QuizBuilder from '@/components/admin/QuizBuilder';

const AdminNewQuizPage: React.FC = () => {
  const { user } = useAuth();

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <QuizBuilder mode="create" />
      </div>
    </div>
  );
};

export default AdminNewQuizPage;
