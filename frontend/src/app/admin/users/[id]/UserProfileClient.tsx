"use client";

import React, { useEffect, useState } from 'react';
import { usersAPI, attemptsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatDate, formatDuration } from '@/lib/utils';
import { User, getStoredToken } from '@/lib/auth';
import { Award, BarChart3, BookOpen, CheckCircle, Clock, RefreshCw, Target, UserCircle, XCircle, Shield, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Props { userId: string }

interface Attempt {
  _id: string;
  quiz: { _id: string; title: string };
  score: number;
  totalPoints: number;
  percentage: number;
  timeSpent: number;
  completedAt?: string;
  status: string;
}

export default function UserProfileClient({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      // Ensure token exists to call admin endpoints
      if (!getStoredToken()) {
        setError('غير مصرح. يرجى تسجيل الدخول مرة أخرى');
        return;
      }

      const [userRes, attemptsRes] = await Promise.all([
        usersAPI.getById(userId),
        attemptsAPI.getStudentAttempts(userId, { limit: 10, sort: '-createdAt' })
      ]);

      setUser(userRes.data.data.user);
      setStats(userRes.data.data.stats);
      setAttempts(attemptsRes.data.data.attempts || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'فشل تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const div = document.createElement('div');
    div.className = `fixed top-4 right-4 px-4 py-3 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-100 border border-green-200 text-green-700' 
      : 'bg-red-100 border border-red-200 text-red-700'
    }`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 3000);
  };

  const handleApprove = async () => {
    if (!user) return;
    try {
      await usersAPI.updateApproval(user._id, true);
      setUser({ ...user, isApproved: true } as any);
      showToast('تم اعتماد المستخدم');
    } catch (e) {
      showToast('فشل اعتماد المستخدم', 'error');
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    try {
      await usersAPI.updateStatus(user._id, !(user as any).isActive);
      setUser({ ...user, isActive: !(user as any).isActive } as any);
      showToast('تم تحديث حالة الحساب');
    } catch (e) {
      showToast('فشل تحديث الحالة', 'error');
    }
  };

  const handleChangeRole = async (role: 'student' | 'teacher' | 'admin') => {
    if (!user) return;
    try {
      await usersAPI.updateRole(user._id, role);
      setUser({ ...user, role } as any);
      showToast('تم تحديث الدور');
    } catch (e) {
      showToast('فشل تحديث الدور', 'error');
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await usersAPI.deleteUser(user._id);
      showToast('تم حذف المستخدم');
      window.location.href = '/admin/users';
    } catch (e) {
      showToast('فشل حذف المستخدم', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-red-700 dark:text-red-300">
            <XCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <UserCircle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{user.phone} • الدور: {user.role}</p>
            </div>
          </div>

          {/* Admin actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!(user as any).isApproved && (
              <Button size="sm" onClick={handleApprove}>
                <Shield className="h-4 w-4 mr-2" /> اعتماد
              </Button>
            )}

            <select
              className="px-2 py-1 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm"
              value={user.role}
              onChange={e => handleChangeRole(e.target.value as any)}
            >
              <option value="student">طالب</option>
              <option value="teacher">معلم</option>
              <option value="admin">مسؤول</option>
            </select>

            <Button variant="outline" size="sm" onClick={handleToggleActive}>
              {(user as any).isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
            </Button>

            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> حذف المستخدم
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المحاولات</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalAttempts || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">متوسط النتيجة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(stats?.averagePercentage || 0)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">أفضل نتيجة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(stats?.bestPercentage || 0)}%</p>
              </div>
              <Award className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
            آخر المحاولات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length ? (
            <div className="space-y-3">
              {attempts.map(a => (
                <div key={a._id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {a.quiz?.title || 'كويز محذوف'}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                      {a.status === 'completed' ? 'مكتمل' : 'جاري' }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-1 text-green-600" />{Math.round(a.percentage || (a.totalPoints ? (a.score / a.totalPoints) * 100 : 0))}%</div>
                      <div className="flex items-center"><Clock className="h-4 w-4 mr-1 text-blue-600" />{formatDuration(a.timeSpent)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>{a.completedAt ? formatDate(a.completedAt) : '-'}</div>
                      {a._id && (
                        <Link href={`/admin/users/${userId}/attempts/${a._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          تفاصيل
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              لا توجد محاولات حديثة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
