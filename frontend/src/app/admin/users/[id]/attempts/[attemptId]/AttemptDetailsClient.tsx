"use client";

import React, { useEffect, useState } from 'react';
import { attemptsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatDate, formatDuration } from '@/lib/utils';
import { CheckCircle, XCircle, RefreshCw, Timer, BookOpen } from 'lucide-react';

interface Props { userId: string; attemptId: string }

export default function AttemptDetailsClient({ userId, attemptId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await attemptsAPI.getAttemptDetails(attemptId);
      setAttempt(res.data.data.attempt);
    } catch (e: any) {
      setError(e.response?.data?.message || 'فشل تحميل تفاصيل المحاولة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [attemptId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
        <div className="flex items-center text-red-700 dark:text-red-300"><XCircle className="h-5 w-5 mr-2" />{error}</div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />إعادة المحاولة</Button>
      </div>
    );
  }

  if (!attempt) return null;

  const percentage = attempt.percentage ?? (attempt.totalPoints ? Math.round((attempt.score / attempt.totalPoints) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-300" /></div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">الكويز</p>
                <p className="font-semibold text-gray-900 dark:text-white">{attempt.quiz?.title || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">النتيجة</p>
              <p className="font-semibold text-gray-900 dark:text-white">{attempt.score} / {attempt.totalPoints}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">النسبة</p>
              <p className="font-semibold text-gray-900 dark:text-white">{percentage}%</p>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">الوقت المستغرق</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDuration(attempt.timeSpent || 0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions analysis */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل الإجابات</CardTitle>
        </CardHeader>
        <CardContent>
          {attempt.quiz?.questions?.length ? (
            <div className="space-y-4">
              {attempt.quiz.questions.map((q: any, idx: number) => {
                const answer = attempt.answers?.find((a: any) => String(a.questionId) === String(q._id));
                const isCorrect = answer?.isCorrect;
                const options = q.options || [];
                let answerText = '';
                if (q.answerType === 'single-choice' || q.answerType === 'image-selection') {
                  const selected = options.find((opt: any) => String(opt._id) === String(answer?.answer));
                  answerText = selected?.text || '—';
                } else if (q.answerType === 'multiple-choice') {
                  const selectedIds = Array.isArray(answer?.answer) ? answer.answer : [];
                  answerText = options
                    .filter((opt: any) => selectedIds.includes(String(opt._id)))
                    .map((opt: any) => opt.text)
                    .join('، ');
                } else {
                  answerText = answer?.answer ?? '—';
                }
                return (
                  <div key={q._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <h4 className="font-medium text-gray-900 dark:text-white">سؤال {idx + 1}</h4>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{q.text}</p>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">إجابتك:</span> {answerText || '—'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-right ml-4">
                        <div>الدرجة: {answer?.points ?? 0}</div>
                        <div>الزمن: {formatDuration(answer?.timeSpent || 0)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد أسئلة متاحة</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
