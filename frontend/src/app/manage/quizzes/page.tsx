'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { quizzesAPI } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { 
  BookOpen, 
  Users, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3, 
  Search,
  Filter,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import Input from '@/components/ui/Input';

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
  totalAttempts?: number;
  completedAttempts?: number;
  averageScore?: number;
}

const QuizManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'attempts'>('date');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      loadQuizzes();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortQuizzes();
  }, [quizzes, searchTerm, statusFilter, sortBy]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (user?.role === 'teacher') {
        params.createdBy = user._id;
      }
      
      const response = await quizzesAPI.getAll(params);
      setQuizzes(response.data.data.quizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortQuizzes = () => {
    let filtered = [...quizzes];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    const now = new Date();
    filtered = filtered.filter(quiz => {
      const startDate = new Date(quiz.settings.startDate);
      const endDate = new Date(quiz.settings.endDate);
      
      switch (statusFilter) {
        case 'active':
          return quiz.isActive && now >= startDate && now <= endDate;
        case 'inactive':
          return !quiz.isActive;
        case 'expired':
          return now > endDate;
        default:
          return true;
      }
    });

    // Sort quizzes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'attempts':
          return (b.totalAttempts || 0) - (a.totalAttempts || 0);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredQuizzes(filtered);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكويز؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    setDeleteLoading(quizId);
    try {
      await quizzesAPI.delete(quizId);
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg z-50';
      successDiv.textContent = 'تم حذف الكويز بنجاح!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error: any) {
      alert(error.response?.data?.message || 'حدث خطأ في حذف الكويز');
    } finally {
      setDeleteLoading(null);
    }
  };

  const getQuizStatus = (quiz: Quiz) => {
    const now = new Date();
    const startDate = new Date(quiz.settings.startDate);
    const endDate = new Date(quiz.settings.endDate);

    if (!quiz.isActive) {
      return { status: 'inactive', label: 'غير نشط', color: 'text-gray-600 bg-gray-100' };
    } else if (now < startDate) {
      return { status: 'upcoming', label: 'قريباً', color: 'text-blue-600 bg-blue-100' };
    } else if (now > endDate) {
      return { status: 'expired', label: 'منتهي', color: 'text-red-600 bg-red-100' };
    } else {
      return { status: 'active', label: 'نشط', color: 'text-green-600 bg-green-100' };
    }
  };

  const calculateStats = () => {
    const activeQuizzes = quizzes.filter(q => {
      const now = new Date();
      const startDate = new Date(q.settings.startDate);
      const endDate = new Date(q.settings.endDate);
      return q.isActive && now >= startDate && now <= endDate;
    }).length;

    const totalAttempts = quizzes.reduce((sum, q) => sum + (q.totalAttempts || 0), 0);
    const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0);

    return {
      totalQuizzes: quizzes.length,
      activeQuizzes,
      totalAttempts,
      totalQuestions
    };
  };

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600">هذه الصفحة مخصصة للمعلمين والمسؤولين فقط</p>
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

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">إدارة الكويزات</h1>
            <Link href="/admin/quizzes/new">
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                إنشاء كويز جديد
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">إجمالي الكويزات</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">الكويزات النشطة</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">إجمالي المحاولات</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">إجمالي الأسئلة</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="البحث عن كويز..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'primary' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  size="sm"
                >
                  الكل
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'primary' : 'outline'}
                  onClick={() => setStatusFilter('active')}
                  size="sm"
                >
                  النشطة
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'primary' : 'outline'}
                  onClick={() => setStatusFilter('inactive')}
                  size="sm"
                >
                  غير النشطة
                </Button>
                <Button
                  variant={statusFilter === 'expired' ? 'primary' : 'outline'}
                  onClick={() => setStatusFilter('expired')}
                  size="sm"
                >
                  المنتهية
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">ترتيب:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="date">التاريخ</option>
                  <option value="title">العنوان</option>
                  <option value="attempts">المحاولات</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes List */}
        {filteredQuizzes.length > 0 ? (
          <div className="space-y-6">
            {filteredQuizzes.map((quiz, index) => {
              const status = getQuizStatus(quiz);
              return (
                <Card 
                  key={quiz._id} 
                  className="hover:shadow-lg transition-shadow duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {quiz.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {quiz.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{quiz.questions.length} سؤال</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(quiz.settings.duration)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{quiz.totalAttempts || 0} محاولة</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>ينتهي: {formatDate(quiz.settings.endDate)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/manage/quizzes/${quiz._id}/stats`}>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            الإحصائيات
                          </Button>
                        </Link>
                        
                        <Link href={`/manage/quizzes/${quiz._id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            عرض
                          </Button>
                        </Link>
                        
                        <Link href={`/manage/quizzes/${quiz._id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            تعديل
                          </Button>
                        </Link>
                        
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteQuiz(quiz._id)}
                          loading={deleteLoading === quiz._id}
                          disabled={deleteLoading === quiz._id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد كويزات</h3>
            <p className="text-gray-600 mb-4">لم تقم بإنشاء أي كويز بعد</p>
            <Link href="/admin/quizzes/new">
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                إنشاء كويز جديد
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizManagementPage;
