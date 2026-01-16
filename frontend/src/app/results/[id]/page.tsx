'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { attemptsAPI } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Info } from 'lucide-react';

interface AttemptAnswer {
  questionId: string;
  answer: any;
  isCorrect: boolean;
  points: number;
  timeSpent: number;
}

interface AttemptQuizQuestion {
  _id: string;
  content: string;
  answerType: string;
  options?: Array<{ _id: string; text?: string; imageUrl?: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  correctBoolean?: boolean;
  points: number;
}

interface AttemptData {
  _id: string;
  quiz: {
    _id: string;
    title: string;
    description?: string;
    questions: AttemptQuizQuestion[];
  };
  student?: { _id: string; name: string };
  status: string;
  score: number;
  totalPoints: number;
  percentage?: number;
  timeSpent: number;
  startedAt: string;
  completedAt?: string;
  answers: AttemptAnswer[];
  cheatLogs?: Array<{ message: string; timestamp: string }>;
}

const ResultDetailsPage: React.FC = () => {
  const { user } = useAuth();
  const params = useParams();
  const attemptId = params.id as string;
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      let res;
      if (user?.role === 'teacher' || user?.role === 'admin') {
        res = await attemptsAPI.getAttemptDetails(attemptId);
      } else {
        res = await attemptsAPI.getMyAttemptDetails(attemptId);
      }
      const data = res.data.data?.attempt || res.data.data;
      setAttempt(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'تعذر تحميل تفاصيل النتيجة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (attemptId && user) load(); }, [attemptId, user]);

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

  if (!attempt) return null;

  const percent = Math.round(attempt.percentage ?? (attempt.totalPoints ? (attempt.score / attempt.totalPoints) * 100 : 0));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">نتيجة: {attempt.quiz?.title || '—'}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">بدأ: {formatDate(attempt.startedAt)} • انتهى: {attempt.completedAt ? formatDate(attempt.completedAt) : '—'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-bold">{percent}%</div>
            <div className="px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 font-bold">{attempt.score}/{attempt.totalPoints}</div>
            <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold flex items-center gap-2"><Clock className="h-4 w-4" /> {formatDuration(attempt.timeSpent)}</div>
          </div>
        </div>

        {/* Cheat logs */}
        {attempt.cheatLogs && attempt.cheatLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>تحذيرات السلوك</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {attempt.cheatLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Info className="h-4 w-4 text-yellow-500" />
                    <span>{formatDate(log.timestamp)} — {log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question by question */}
        <Card>
          <CardHeader>
            <CardTitle>تحليل الأسئلة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attempt.quiz?.questions?.map((q, idx) => {
                const ans = attempt.answers?.find(a => String(a.questionId) === String(q._id));
                const correctText = q.answerType === 'text-answer' ? q.correctAnswer : q.answerType === 'true-false' ? (q.correctBoolean ? 'صحيح' : 'خطأ') : undefined;
                return (
                  <div key={q._id} className="p-4 border rounded-lg dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white mb-1">س{idx + 1}. {q.content}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">الدرجة: {q.points}</div>
                      </div>
                      <div>
                        {ans?.isCorrect ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-sm"><CheckCircle className="h-4 w-4 ml-1" /> صحيح</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm"><XCircle className="h-4 w-4 ml-1" /> خطأ</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="mb-1">الوقت المستغرق: {formatDuration(ans?.timeSpent || 0)}</div>
                      {correctText && (
                        <div className="mb-1">الإجابة الصحيحة: {correctText}</div>
                      )}
                      {q.options && q.options.length > 0 && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map((op) => (
                            <div key={op._id} className={`p-2 border rounded ${op.isCorrect ? 'border-green-300 bg-green-50 dark:bg-green-900/30' : 'dark:border-gray-700'}`}>
                              {op.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultDetailsPage;
