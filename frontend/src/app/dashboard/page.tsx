'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { quizzesAPI, attemptsAPI } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar,
  Users,
  CheckCircle,
  Play,
  BarChart3,
  Award,
  Star,
  Zap,
  ArrowRight,
  Timer,
  Brain,
  RefreshCw,
  AlertCircle
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
  };
  createdBy: {
    name: string;
  };
  isActive: boolean;
}

interface Attempt {
  _id: string;
  quiz: { _id: string; title: string };
  score: number;
  totalPoints: number;
  percentage?: number;
  timeSpent: number;
  completedAt: string;
  isCompleted: boolean;
}

interface UserStats {
  totalAttempts: number;
  completedQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  bestScore: number;
  rank: number;
  streakDays: number;
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalAttempts: 0,
    completedQuizzes: 0,
    averageScore: 0,
    totalTimeSpent: 0,
    bestScore: 0,
    rank: 0,
    streakDays: 0
  });
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Wait until auth state is resolved to avoid flicker
    if (authLoading) return;
    if (!user) return; // Middleware handles redirects; just wait for hydration

    // Redirect admins to their dedicated dashboard
    if (user.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    fetchDashboardData();
    setGreeting(getTimeBasedGreeting());
  }, [user, authLoading, router]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      setError('');

      // Fetch available quizzes
      const quizzesResponse = await quizzesAPI.getAll({ 
        activeOnly: true,
        limit: 6 
      });
      setAvailableQuizzes(quizzesResponse.data.data.quizzes || []);

      // Fetch recent attempts
      const attemptsResponse = await attemptsAPI.getUserAttempts({ 
        limit: 5,
        sort: '-completedAt'
      });
      setRecentAttempts(attemptsResponse.data.data.attempts || []);

      // Calculate user statistics
      calculateUserStats(attemptsResponse.data.data.attempts || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setDataLoading(false);
    }
  };

  const calculateUserStats = (attempts: Attempt[]) => {
    const completedAttempts = attempts.filter(attempt => attempt.isCompleted);
    const totalAttempts = attempts.length;
    const completedQuizzes = completedAttempts.length;

    const averageScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.percentage ?? (a.totalPoints ? (a.score / a.totalPoints) * 100 : 0)), 0) / completedAttempts.length
      : 0;
    const totalTimeSpent = completedAttempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0);
    const bestScore = completedAttempts.length > 0
      ? Math.max(...completedAttempts.map(a => a.percentage ?? (a.totalPoints ? (a.score / a.totalPoints) * 100 : 0)))
      : 0;

    setUserStats({
      totalAttempts,
      completedQuizzes,
      averageScore,
      totalTimeSpent,
      bestScore,
      rank: Math.floor(Math.random() * 100) + 1,
      streakDays: Math.floor(Math.random() * 30) + 1
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return Trophy;
    if (score >= 70) return Award;
    if (score >= 50) return Star;
    return Target;
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return { label: 'ممتاز', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    if (score >= 70) return { label: 'جيد جداً', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    if (score >= 50) return { label: 'جيد', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    return { label: 'يحتاج تحسين', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-900`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 transform hover:scale-[1.01] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {greeting}، {user.name}! 👋
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  مرحباً بك في منصة الكويزات - جاهز لبدء رحلة التعلم اليوم؟
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {userStats.streakDays}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">أيام متتالية</div>
                </div>
                <Zap className="h-8 w-8 text-yellow-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
              <Button 
                onClick={fetchDashboardData} 
                variant="outline" 
                className="mr-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                إعادة المحاولة
              </Button>
            </div>
          </div>
        )}

        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <></>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">الكويزات المكتملة</p>
                  <p className="text-3xl font-bold">{userStats.completedQuizzes}</p>
                </div>
                <Trophy className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">متوسط الدرجات</p>
                  <p className="text-3xl font-bold">{userStats.averageScore.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">أفضل درجة</p>
                  <p className="text-3xl font-bold">{userStats.bestScore.toFixed(1)}%</p>
                </div>
                <Award className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white transform hover:scale-105 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">الوقت المستغرق</p>
                  <p className="text-3xl font-bold">{formatDuration(userStats.totalTimeSpent)}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Quizzes */}
          <div className="lg:col-span-2">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Brain className="h-6 w-6 text-blue-600 mr-2" />
                    الكويزات المتاحة
                  </div>
                  <Link href="/quizzes">
                    <Button variant="outline" size="sm">
                      عرض الكل
                      <ArrowRight className="h-4 w-4 mr-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableQuizzes.length > 0 ? (
                  <div className="space-y-4">
                    {availableQuizzes.map((quiz) => (
                      <div
                        key={quiz._id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group hover:shadow-md"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {quiz.title}
                          </h3>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full">
                              متاح
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                          {quiz.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <BookOpen className="h-4 w-4 mr-1" />
                              {quiz.questions?.length || 0} سؤال
                            </div>
                            <div className="flex items-center">
                              <Timer className="h-4 w-4 mr-1" />
                              {formatDuration(quiz.settings?.duration)}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {quiz.createdBy?.name}
                            </div>
                          </div>
                          
                          <Link href={`/quizzes/${quiz._id}`}>
                            <Button className="group-hover:scale-105 transition-transform">
                              <Play className="h-4 w-4 mr-2" />
                              ابدأ الآن
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لا توجد كويزات متاحة حالياً</p>
                    <Button onClick={fetchDashboardData} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      تحديث
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-6 w-6 text-purple-600 mr-2" />
                  نظرة على الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-3">
                      <span className="text-xl font-bold">{userStats.averageScore.toFixed(0)}%</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">متوسط الدرجات</p>
                  </div>
                  
                  <div className="space-y-2">
                    {userStats.averageScore > 0 && (
                      <div className={`px-3 py-1 rounded-full text-sm font-medium text-center ${getPerformanceBadge(userStats.averageScore).color}`}>
                        {getPerformanceBadge(userStats.averageScore).label}
                      </div>
                    )}
                    
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(userStats.averageScore, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Attempts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                    المحاولات الأخيرة
                  </div>
                  <Link href="/results">
                    <Button variant="outline" size="sm">
                      عرض الكل
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAttempts.length > 0 ? (
                  <div className="space-y-3">
                    {recentAttempts.slice(0, 3).map((attempt) => {
                      const scorePercentage = attempt.percentage ?? (attempt.totalPoints ? (attempt.score / attempt.totalPoints) * 100 : 0);
                      const ScoreIcon = getScoreIcon(scorePercentage);
                      
                      return (
                        <div key={attempt._id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {attempt.quiz?.title || 'كويز محذوف'}
                            </h4>
                            <ScoreIcon className={`h-4 w-4 ${getScoreColor(scorePercentage)}`} />
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span className={`font-semibold ${getScoreColor(scorePercentage)}`}>
                              {scorePercentage.toFixed(1)}%
                            </span>
                            <span>{formatDate(attempt.completedAt)}</span>
                          </div>
                          
                          <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full transition-all duration-500 ${
                                scorePercentage >= 70 ? 'bg-green-500' : 
                                scorePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${scorePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد محاولات بعد</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">ابدأ أول كويز لك الآن!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-6 w-6 text-yellow-600 mr-2" />
                  إجراءات سريعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/quizzes" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      تصفح الكويزات
                    </Button>
                  </Link>
                  
                  <Link href="/results" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      عرض النتائج
                    </Button>
                  </Link>
                  
                  <Link href="/profile" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      الملف الشخصي
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
