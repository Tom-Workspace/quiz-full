'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileQuestion, 
  Award, 
  Clock, 
  Calendar,
  Download,
  Filter,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  LineChart,
  Activity,
  Target,
  Zap,
  BookOpen,
  GraduationCap,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw
} from 'lucide-react';
import { usersAPI, attemptsAPI, quizzesAPI } from '@/lib/api';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: {
    students: number;
    teachers: number;
    admins: number;
  };
  userGrowth: number;
}

interface QuizStats {
  totalQuizzes: number;
  activeQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  popularSubjects: Array<{
    subject: string;
    count: number;
    percentage: number;
  }>;
}

interface SystemMetrics {
  uptime: string;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  storageUsed: number;
  memoryUsage: number;
}

interface RecentActivity {
  id: string;
  type: 'quiz_created' | 'user_registered' | 'quiz_completed' | 'system_event';
  description: string;
  timestamp: string;
  user?: string;
  details?: string;
}

const AdminReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportType, setReportType] = useState<'overview' | 'users' | 'quizzes' | 'performance'>('overview');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadReportData();
    }
  }, [user, dateRange, reportType]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Users stats
      let totalUsers = 0;
      let students = 0;
      let teachers = 0;
      let admins = 0;
      try {
        const usersStatsRes = await usersAPI.getUserStats();
        const data = usersStatsRes.data.data;
        totalUsers = data.totalUsers || 0;
        const roleStats: Array<{ _id: string; count: number }> = data.roleStats || [];
        students = roleStats.find(r => r._id === 'student')?.count || 0;
        teachers = roleStats.find(r => r._id === 'teacher')?.count || 0;
        admins = roleStats.find(r => r._id === 'admin')?.count || 0;
      } catch (e) {
        // fallback values remain 0
      }

      // Online users
      let activeUsers = 0;
      try {
        const onlineRes = await usersAPI.getOnlineUsers();
        activeUsers = (onlineRes.data.data.users || []).length;
      } catch {}

      // Attempts stats
      let totalAttempts = 0;
      let averageScore = 0;
      let completionRate = 0;
      try {
        const attemptsStatsRes = await attemptsAPI.getStats();
        const s = attemptsStatsRes.data.data || {};
        totalAttempts = s.totalAttempts || 0;
        averageScore = Math.round((s.averagePercentage || 0) * 10) / 10;
        completionRate = s.completionRate || 0;
      } catch {}

      // Quizzes stats
      let totalQuizzes = 0;
      let activeQuizzes = 0;
      try {
        const q = await quizzesAPI.getAllStats();
        totalQuizzes = q.data.data?.totalQuizzes || 0;
        activeQuizzes = q.data.data?.activeQuizzes || 0;
      } catch {}

      setUserStats({
        totalUsers,
        activeUsers,
        newUsersThisMonth: 0, // TODO: backend support
        usersByRole: { students, teachers, admins },
        userGrowth: 0,
      });

      setQuizStats({
        totalQuizzes,
        activeQuizzes,
        totalAttempts,
        averageScore,
        completionRate,
        popularSubjects: [],
      });

      // Placeholder for recent activity until backend endpoint is available
      setRecentActivity([]);

      // System metrics placeholder
      setSystemMetrics({
        uptime: '—',
        responseTime: 0,
        errorRate: 0,
        activeConnections: activeUsers,
        storageUsed: 0,
        memoryUsage: 0,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      showNotification('خطأ في تحميل التقارير', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      // Generate report data based on current filters
      const reportData = {
        generated: new Date().toISOString(),
        dateRange,
        reportType,
        userStats,
        quizStats,
        systemMetrics,
        recentActivity
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_report_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في تصدير التقرير', 'error');
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz_created':
        return <FileQuestion className="h-4 w-4 text-blue-600" />;
      case 'user_registered':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'quiz_completed':
        return <Award className="h-4 w-4 text-purple-600" />;
      case 'system_event':
        return <Activity className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeIndicator = (value: number) => {
    if (value > 0) {
      return <ArrowUp className="h-4 w-4 text-green-600" />;
    } else if (value < 0) {
      return <ArrowDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-600" />;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التقارير والإحصائيات</h1>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => loadReportData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                تحديث
              </Button>
              <Button onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                تصدير التقرير
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">نوع التقرير</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
                  >
                    <option value="overview">نظرة عامة</option>
                    <option value="users">تقرير المستخدمين</option>
                    <option value="quizzes">تقرير الكويزات</option>
                    <option value="performance">تقرير الأداء</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">من تاريخ</label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.totalUsers.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    {getChangeIndicator(userStats?.userGrowth || 0)}
                    <span className="text-xs text-gray-600 dark:text-gray-400 mr-1">
                      {userStats?.userGrowth}% هذا الشهر
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الكويزات</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{quizStats?.totalQuizzes}</p>
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {quizStats?.activeQuizzes} نشط
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <FileQuestion className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المحاولات</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{quizStats?.totalAttempts.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-4 w-4 text-purple-600 mr-1" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {quizStats?.completionRate}% إكمال
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">متوسط النتائج</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{quizStats?.averageScore}%</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-4 w-4 text-orange-600 mr-1" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      جودة عالية
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Users Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                توزيع المستخدمين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm">الطلاب</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{userStats?.usersByRole.students}</p>
                    <p className="text-xs text-gray-500">
                      {((userStats?.usersByRole.students || 0) / (userStats?.totalUsers || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm">المعلمين</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{userStats?.usersByRole.teachers}</p>
                    <p className="text-xs text-gray-500">
                      {((userStats?.usersByRole.teachers || 0) / (userStats?.totalUsers || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-sm">المسؤولين</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{userStats?.usersByRole.admins}</p>
                    <p className="text-xs text-gray-500">
                      {((userStats?.usersByRole.admins || 0) / (userStats?.totalUsers || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                مقاييس النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{systemMetrics?.uptime}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">وقت التشغيل</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{systemMetrics?.responseTime}ms</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">زمن الاستجابة</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{systemMetrics?.storageUsed}%</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">مساحة التخزين</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{systemMetrics?.activeConnections}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">الاتصالات النشطة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Subjects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                المواد الأكثر شيوعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quizStats?.popularSubjects.map((subject, index) => (
                  <div key={subject.subject} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs font-semibold mr-2">
                        {index + 1}
                      </div>
                      <span className="text-sm">{subject.subject}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{subject.count}</p>
                      <p className="text-xs text-gray-500">{subject.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                النشاط الأخير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 space-x-reverse">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      {activity.user && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          بواسطة: {activity.user}
                        </p>
                      )}
                      {activity.details && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {activity.details}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
