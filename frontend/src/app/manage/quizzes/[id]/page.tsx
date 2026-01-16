'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { quizzesAPI, attemptsAPI } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { 
  ArrowLeft,
  Edit, 
  Trash2, 
  Eye, 
  BarChart3, 
  Settings,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  BookOpen,
  Target,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  questions: any[];
  settings: {
    duration: number;
    startDate: string;
    endDate: string;
    maxAttempts: number;
    showResults: boolean;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
  };
  createdBy: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QuizStats {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number; // percentage 0-100
  averageTime: number; // seconds
  participants: number; // unique students
  passRate: number; // percentage
}

interface Attempt {
  _id: string;
  student?: { _id: string; name: string };
  quiz: string;
  answers: any[];
  score: number;
  totalPoints: number;
  percentage?: number;
  startedAt: string;
  completedAt: string | null;
  timeSpent: number;
  isCompleted: boolean;
}

export default function QuizManagePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Quiz>>({});

  useEffect(() => {
    if (id) {
      fetchQuizData();
    }
  }, [id]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch quiz details
      const quizResponse = await quizzesAPI.getById(id as string);
      const quizData = quizResponse.data.data.quiz;
      setQuiz(quizData);
      setFormData(quizData);

      // Fetch quiz statistics
      const statsResponse = await quizzesAPI.getStats(id as string);
      const data = statsResponse.data.data || {};
      const s = data.stats || {};
      const mapped: QuizStats = {
        totalAttempts: s.totalAttempts || 0,
        completedAttempts: s.completedAttempts || 0,
        averageScore: s.averagePercentage || 0,
        averageTime: s.averageTimeSpent || 0,
        participants: data.uniqueStudents || 0,
        passRate: s.totalAttempts ? Math.round(((s.completedAttempts || 0) / s.totalAttempts) * 1000) / 10 : 0,
      };
      setStats(mapped);

      // Fetch quiz attempts
      const attemptsResponse = await attemptsAPI.getQuizAttempts(id as string);
      setAttempts(attemptsResponse.data.data.attempts || []);

    } catch (error: any) {
      console.error('Error fetching quiz data:', error);
      setError(error.response?.data?.message || 'Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuiz = async () => {
    try {
      await quizzesAPI.update(id as string, formData);
      setEditMode(false);
      await fetchQuizData();
      // Show success notification
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update quiz');
    }
  };

  const handleDeleteQuiz = async () => {
    if (window.confirm('هل أنت متأكد من حذف هذا الكويز؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      try {
        await quizzesAPI.delete(id as string);
        router.push('/manage/quizzes');
      } catch (error: any) {
        setError(error.response?.data?.message || 'Failed to delete quiz');
      }
    }
  };

  const toggleQuizStatus = async () => {
    try {
      await quizzesAPI.update(id as string, { isActive: !quiz?.isActive });
      await fetchQuizData();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update quiz status');
    }
  };

  const exportResults = () => {
    try {
      const rows = attempts.map(a => ({
        الطالب: a.student?.name || '',
        الدرجة: a.score,
        'النقاط الكلية': a.totalPoints,
        النسبة: (a.percentage ?? (a.totalPoints ? (a.score / a.totalPoints) * 100 : 0)).toFixed(1) + '%',
        'الوقت المستغرق': formatDuration(a.timeSpent),
        'تاريخ البدء': formatDate(a.startedAt),
        'تاريخ الإكمال': a.completedAt ? formatDate(a.completedAt) : '-'
      }));
      if (rows.length === 0) return;
      const header = Object.keys(rows[0]).join(',');
      const csv = [header, ...rows.map(r => Object.values(r).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `quiz_${id}_attempts_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (e) {
      console.error('Export error', e);
    }
  };

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600 dark:text-gray-400">هذه الصفحة مخصصة للمعلمين والمسؤولين فقط</p>
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

  if (error && !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">خطأ في تحميل البيانات</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchQuizData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? CheckCircle : XCircle;
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'
    } py-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <Link href="/manage/quizzes">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  العودة
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{quiz?.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{quiz?.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quiz?.isActive || false)}`}>
                {quiz?.isActive ? 'نشط' : 'غير نشط'}
              </div>
              
              <Button onClick={toggleQuizStatus} variant="outline">
                {quiz?.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
              </Button>
              
              <Button onClick={() => setEditMode(!editMode)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                {editMode ? 'إلغاء التعديل' : 'تعديل'}
              </Button>
              
              <Button onClick={handleDeleteQuiz} variant="outline" className="text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                حذف
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">المشاركون</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.participants}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">المحاولات</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAttempts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">متوسط الدرجة</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number.isFinite(stats.averageScore) ? stats.averageScore.toFixed(1) : '0.0'}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">متوسط الوقت</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.averageTime || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-teal-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">معدل النجاح</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number.isFinite(stats.passRate) ? stats.passRate.toFixed(1) : '0.0'}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 rtl:space-x-reverse">
              {[
                { id: 'overview', label: 'نظرة عامة', icon: BookOpen },
                { id: 'attempts', label: 'المحاولات', icon: Users },
                { id: 'settings', label: 'الإعدادات', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && quiz && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الكويز</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        عنوان الكويز
                      </label>
                      <Input
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الوصف
                      </label>
                      <textarea
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <Button onClick={handleUpdateQuiz}>
                        حفظ التغييرات
                      </Button>
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        إلغاء
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">عدد الأسئلة:</span>
                      <span className="font-medium">{quiz.questions?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">المدة:</span>
                      <span className="font-medium">{formatDuration(quiz.settings?.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">تاريخ البداية:</span>
                      <span className="font-medium">{formatDate(quiz.settings?.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">تاريخ النهاية:</span>
                      <span className="font-medium">{formatDate(quiz.settings?.endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">الحد الأقصى للمحاولات:</span>
                      <span className="font-medium">{quiz.settings?.maxAttempts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">إنشئ بواسطة:</span>
                      <span className="font-medium">{quiz.createdBy?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">تاريخ الإنشاء:</span>
                      <span className="font-medium">{formatDate(quiz.createdAt)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إعدادات الكويز</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">عشوائية الأسئلة:</span>
                  <span className={`font-medium ${quiz.settings?.randomizeQuestions ? 'text-green-600' : 'text-red-600'}`}>
                    {quiz.settings?.randomizeQuestions ? 'مفعل' : 'معطل'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">عشوائية الخيارات:</span>
                  <span className={`font-medium ${quiz.settings?.randomizeOptions ? 'text-green-600' : 'text-red-600'}`}>
                    {quiz.settings?.randomizeOptions ? 'مفعل' : 'معطل'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">عرض النتائج:</span>
                  <span className={`font-medium ${quiz.settings?.showResults ? 'text-green-600' : 'text-red-600'}`}>
                    {quiz.settings?.showResults ? 'مفعل' : 'معطل'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'attempts' && (
          <Card>
            <CardHeader>
              <CardTitle>محاولات الطلاب</CardTitle>
            </CardHeader>
            <CardContent>
              {attempts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          اسم الطالب
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الدرجة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الوقت المستغرق
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          تاريخ المحاولة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {attempts.map((attempt) => (
                        <tr key={attempt._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {attempt.student?.name || 'غير معروف'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {attempt.isCompleted ? `${attempt.score}/${attempt.totalPoints} (${(attempt.percentage ?? (attempt.totalPoints ? (attempt.score / attempt.totalPoints) * 100 : 0)).toFixed(1)}%)` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {attempt.isCompleted ? formatDuration(attempt.timeSpent) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {formatDate(attempt.startedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              attempt.isCompleted 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {attempt.isCompleted ? 'مكتمل' : 'قيد التقدم'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">لا توجد محاولات حتى الآن</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && quiz && (
          <Card>
            <CardHeader>
              <CardTitle>إعدادات متقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">إجراءات الكويز</h3>
                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <Link href={`/quizzes/${quiz._id}?preview=1`}>
                      <Button variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        معاينة الكويز
                      </Button>
                    </Link>
                    
                    <Button variant="outline" onClick={exportResults}>
                      <Download className="h-4 w-4 mr-2" />
                      تصدير النتائج
                    </Button>
                    
                    <Link href="/admin/reports">
                      <Button variant="outline">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        تقرير مفصل
                      </Button>
                    </Link>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">معلومات النظام</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">معرف الكويز:</span>
                      <span className="font-mono text-sm">{quiz._id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">آخر تحديث:</span>
                      <span className="text-sm">{formatDate(quiz.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
