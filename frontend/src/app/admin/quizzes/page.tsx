'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { quizzesAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { 
  FileQuestion, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Eye, 
  Trash2, 
  Copy,
  Download,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Activity
} from 'lucide-react';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  totalQuestions: number;
  totalPoints: number;
  isActive: boolean;
  isPublished: boolean;
  createdBy: {
    _id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
  attemptsCount?: number;
  averageScore?: number;
  passRate?: number;
  settings: {
    allowReview: boolean;
    showResults: boolean;
    shuffleQuestions: boolean;
    timeLimit: number;
  };
}

interface QuizStats {
  totalQuizzes: number;
  activeQuizzes: number;
  draftQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  topPerformingQuiz?: Quiz;
}

const AdminQuizManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'published'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadQuizzes();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    filterQuizzes();
  }, [quizzes, searchTerm, statusFilter, difficultyFilter, subjectFilter]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const response = await quizzesAPI.getAll();
      const quizzesData = response.data.data.quizzes || response.data.data || [];
      setQuizzes(quizzesData);
      
      // Extract unique subjects
      const uniqueSubjects = [...new Set(quizzesData.map((quiz: Quiz) => quiz.subject).filter(Boolean))];
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      showNotification('خطأ في تحميل الكويزات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // This would typically come from a dedicated stats API endpoint
      // For now, we'll calculate from the quizzes data
      // const statsResponse = await quizzesAPI.getStats();
    } catch (error) {
      console.error('Error loading quiz stats:', error);
    }
  };

  const calculateStats = (): QuizStats => {
    const totalQuizzes = quizzes.length;
    const activeQuizzes = quizzes.filter(q => q.isActive && q.isPublished).length;
    const draftQuizzes = quizzes.filter(q => !q.isPublished).length;
    const totalAttempts = quizzes.reduce((sum, q) => sum + (q.attemptsCount || 0), 0);
    const averageScore = quizzes.length > 0 ? 
      quizzes.reduce((sum, q) => sum + (q.averageScore || 0), 0) / quizzes.length : 0;
    const topPerformingQuiz = quizzes.reduce((top, current) => 
      (current.averageScore || 0) > (top?.averageScore || 0) ? current : top, quizzes[0]);

    return {
      totalQuizzes,
      activeQuizzes,
      draftQuizzes,
      totalAttempts,
      averageScore,
      topPerformingQuiz
    };
  };

  const filterQuizzes = () => {
    let filtered = [...quizzes];

    if (searchTerm) {
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quiz.createdBy?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(quiz => {
        switch (statusFilter) {
          case 'active':
            return quiz.isActive && quiz.isPublished;
          case 'draft':
            return !quiz.isPublished;
          case 'published':
            return quiz.isPublished;
          default:
            return true;
        }
      });
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(quiz => quiz.difficulty === difficultyFilter);
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(quiz => quiz.subject === subjectFilter);
    }

    setFilteredQuizzes(filtered);
  };

  const handleToggleStatus = async (quizId: string, currentStatus: boolean) => {
    setActionLoading(quizId);
    try {
      await quizzesAPI.update(quizId, { isActive: !currentStatus });
      setQuizzes(prev => prev.map(q => 
        q._id === quizId ? { ...q, isActive: !currentStatus } : q
      ));
      showNotification(
        !currentStatus ? 'تم تنشيط الكويز' : 'تم إيقاف الكويز', 
        'success'
      );
    } catch (error) {
      showNotification('خطأ في تحديث حالة الكويز', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكويز؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    setActionLoading(quizId);
    try {
      await quizzesAPI.delete(quizId);
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      showNotification('تم حذف الكويز بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في حذف الكويز', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloneQuiz = async (quizId: string) => {
    setActionLoading(quizId);
    try {
      const response = await quizzesAPI.clone(quizId);
      await loadQuizzes(); // Reload to get the new quiz
      showNotification('تم نسخ الكويز بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في نسخ الكويز', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const exportQuizzes = async () => {
    try {
      const dataToExport = filteredQuizzes.map(quiz => ({
        العنوان: quiz.title,
        الوصف: quiz.description,
        المادة: quiz.subject,
        الصعوبة: getDifficultyLabel(quiz.difficulty),
        'عدد الأسئلة': quiz.totalQuestions,
        'النقاط الكلية': quiz.totalPoints,
        'المدة (دقيقة)': quiz.duration,
        الحالة: getStatusLabel(quiz),
        'أنشئ بواسطة': quiz.createdBy?.name || 'غير معروف',
        'تاريخ الإنشاء': formatDate(quiz.createdAt),
        'عدد المحاولات': quiz.attemptsCount || 0,
        'متوسط النتيجة': quiz.averageScore?.toFixed(1) || 'غير متاح'
      }));

      const csv = [
        Object.keys(dataToExport[0]).join(','),
        ...dataToExport.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `quizzes_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      showNotification('خطأ في تصدير البيانات', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const div = document.createElement('div');
    div.className = `fixed top-4 right-4 px-4 py-3 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-100 border border-green-200 text-green-700' 
      : 'bg-red-100 border border-red-200 text-red-700'
    }`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 3000);
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case 'medium': return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
      case 'hard': return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      default: return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'سهل';
      case 'medium': return 'متوسط';
      case 'hard': return 'صعب';
      default: return 'غير محدد';
    }
  };

  const getStatusIcon = (quiz: Quiz) => {
    if (!quiz.isPublished) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    if (!quiz.isActive) return <XCircle className="h-4 w-4 text-red-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusLabel = (quiz: Quiz) => {
    if (!quiz.isPublished) return 'مسودة';
    if (!quiz.isActive) return 'معطل';
    return 'نشط';
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600 dark:text-gray-300">هذه الصفحة مخصصة للمسؤولين فقط</p>
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

  const currentStats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الكويزات</h1>
            <div className="flex gap-3">
              <Button variant="outline" onClick={exportQuizzes}>
                <Download className="h-4 w-4 mr-2" />
                تصدير البيانات
              </Button>
              <Button onClick={() => window.location.href = '/admin/quizzes/new'}>
                <Plus className="h-4 w-4 mr-2" />
                إنشاء كويز جديد
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FileQuestion className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">إجمالي الكويزات</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{currentStats.totalQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">الكويزات النشطة</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{currentStats.activeQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Edit className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">المسودات</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{currentStats.draftQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">إجمالي المحاولات</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{currentStats.totalAttempts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">متوسط النتائج</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{currentStats.averageScore.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="البحث في العنوان، الوصف، المادة، أو المنشئ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="active">النشطة</option>
                  <option value="published">المنشورة</option>
                  <option value="draft">المسودات</option>
                </select>

                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع المستويات</option>
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                </select>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع المواد</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quizzes List */}
        {filteredQuizzes.length > 0 ? (
          <div className="space-y-4">
            {filteredQuizzes.map((quiz, index) => (
              <Card 
                key={quiz._id}
                className="hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusIcon(quiz)}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {quiz.title}
                        </h3>
                        <div className="flex items-center gap-1">
                          {getDifficultyIcon(quiz.difficulty)}
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {getDifficultyLabel(quiz.difficulty)}
                          </span>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {quiz.subject}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {quiz.description}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <FileQuestion className="h-4 w-4" />
                          <span>{quiz.totalQuestions} سؤال</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          <span>{quiz.totalPoints} نقطة</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{quiz.duration} دقيقة</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{quiz.attemptsCount || 0} محاولة</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{quiz.averageScore?.toFixed(1) || 'N/A'}% متوسط</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          بواسطة: {quiz.createdBy?.name || 'غير معروف'}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        أنشئ: {formatDate(quiz.createdAt)} • آخر تحديث: {formatDate(quiz.updatedAt)}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/manage/quizzes/${quiz._id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        عرض
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/manage/quizzes/${quiz._id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        تعديل
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCloneQuiz(quiz._id)}
                        loading={actionLoading === quiz._id}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        نسخ
                      </Button>
                      
                      <Button
                        variant={quiz.isActive ? "danger" : "primary"}
                        size="sm"
                        onClick={() => handleToggleStatus(quiz._id, quiz.isActive)}
                        loading={actionLoading === quiz._id}
                      >
                        {quiz.isActive ? (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            إيقاف
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            تنشيط
                          </>
                        )}
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteQuiz(quiz._id)}
                        loading={actionLoading === quiz._id}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileQuestion className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا يوجد كويزات</h3>
            <p className="text-gray-600 dark:text-gray-300">لا يوجد كويزات تطابق معايير البحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuizManagementPage;
