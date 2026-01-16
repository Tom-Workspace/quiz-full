'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { attemptsAPI } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import Link from 'next/link';
import { CheckCircle, Clock, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';

interface Attempt {
  _id: string;
  quiz: { _id: string; title: string };
  score: number;
  totalPoints: number;
  percentage?: number;
  timeSpent: number;
  completedAt?: string;
  status: string;
}

export default function ResultsPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await attemptsAPI.getUserAttempts({ limit: 20, sort: '-completedAt' });
      setAttempts(res.data.data.attempts || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'فشل تحميل النتائج');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">نتائج الاختبارات</h1>
            <p className="text-gray-600 dark:text-gray-400">عرض جميع محاولاتك السابقة</p>
          </div>
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />تحديث</Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>المحاولات</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length ? (
              <div className="space-y-3">
                {attempts.map(a => (
                  <div key={a._id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {a.quiz?.title || 'كويز محذوف'}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                        {a.status === 'completed' ? 'مكتمل' : 'جاري'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center"><BarChart3 className="h-4 w-4 mr-1 text-blue-600" />{Math.round(a.percentage ?? (a.totalPoints ? (a.score / a.totalPoints) * 100 : 0))}%</div>
                        <div className="flex items-center"><Clock className="h-4 w-4 mr-1 text-blue-600" />{formatDuration(a.timeSpent)}</div>
                        <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-1 text-green-600" />{a.score}/{a.totalPoints}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>{a.completedAt ? formatDate(a.completedAt) : '-'}</div>
                        {a._id && (
                          <Link href={`/results/${a._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            التفاصيل
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد محاولات</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
