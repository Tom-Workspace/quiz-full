'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usersAPI, attemptsAPI } from '@/lib/api';
import { formatDate, formatPercentage } from '@/lib/utils';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  Filter,
  Trophy,
  Clock,
  BookOpen,
  Phone,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import socketService from '@/lib/socket';

interface Student {
  _id: string;
  name: string;
  phone: string;
  age: number;
  fatherPhone: string;
  role: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  approvedAt?: string;
  lastSeen?: string;
  stats?: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    bestScore: number;
  };
}

const StudentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'blocked'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'score' | 'attempts'>('date');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      loadStudents();
      loadPendingStudents();
      
      // Set up real-time updates
      socketService.on('user_registered', handleNewUserRegistration);
      socketService.on('user_status_changed', handleUserStatusChange);
      
      return () => {
        socketService.off('user_registered', handleNewUserRegistration);
        socketService.off('user_status_changed', handleUserStatusChange);
      };
    }
  }, [user]);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchTerm, statusFilter, sortBy]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll({ role: 'student', includeStats: true });
      const studentsData = response.data.data.users;
      
      // Load stats for each student
      const studentsWithStats = await Promise.all(
        studentsData.map(async (student: Student) => {
          try {
            const attemptsResponse = await attemptsAPI.getUserAttempts({ userId: student._id });
            const attempts = attemptsResponse.data.data.attempts;
            
            const completedAttempts = attempts.filter((a: any) => a.status === 'completed');
            const averageScore = completedAttempts.length > 0
              ? completedAttempts.reduce((sum: number, a: any) => sum + a.percentage, 0) / completedAttempts.length
              : 0;
            const bestScore = completedAttempts.length > 0
              ? Math.max(...completedAttempts.map((a: any) => a.percentage))
              : 0;
            
            return {
              ...student,
              stats: {
                totalAttempts: attempts.length,
                completedAttempts: completedAttempts.length,
                averageScore,
                bestScore
              }
            };
          } catch (error) {
            return { ...student, stats: { totalAttempts: 0, completedAttempts: 0, averageScore: 0, bestScore: 0 } };
          }
        })
      );
      
      setStudents(studentsWithStats);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingStudents = async () => {
    try {
      const response = await usersAPI.getPendingApprovals();
      setPendingStudents(response.data.data.users);
    } catch (error) {
      console.error('Error loading pending students:', error);
    }
  };

  const handleNewUserRegistration = (data: any) => {
    if (data.user.role === 'student') {
      setPendingStudents(prev => [data.user, ...prev]);
      
      // Show notification
      const notificationDiv = document.createElement('div');
      notificationDiv.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg z-50';
      notificationDiv.textContent = `طالب جديد يحتاج للموافقة: ${data.user.name}`;
      document.body.appendChild(notificationDiv);
      
      setTimeout(() => {
        document.body.removeChild(notificationDiv);
      }, 5000);
    }
  };

  const handleUserStatusChange = (data: any) => {
    if (data.user.role === 'student') {
      setStudents(prev => prev.map(s => s._id === data.user._id ? { ...s, ...data.user } : s));
      setPendingStudents(prev => prev.filter(s => s._id !== data.user._id));
    }
  };

  const filterAndSortStudents = () => {
    let filtered = [...students];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm)
      );
    }

    // Apply status filter
    filtered = filtered.filter(student => {
      switch (statusFilter) {
        case 'approved':
          return student.isApproved && student.isActive;
        case 'pending':
          return !student.isApproved;
        case 'blocked':
          return !student.isActive;
        default:
          return true;
      }
    });

    // Sort students
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'score':
          return (b.stats?.averageScore || 0) - (a.stats?.averageScore || 0);
        case 'attempts':
          return (b.stats?.totalAttempts || 0) - (a.stats?.totalAttempts || 0);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredStudents(filtered);
  };

  const handleApproveStudent = async (studentId: string) => {
    setActionLoading(studentId);
    try {
      await usersAPI.updateApproval(studentId, true);
      
      // Update local state
      setPendingStudents(prev => prev.filter(s => s._id !== studentId));
      setStudents(prev => prev.map(s => 
        s._id === studentId ? { ...s, isApproved: true, approvedAt: new Date().toISOString() } : s
      ));
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg z-50';
      successDiv.textContent = 'تم قبول الطالب بنجاح!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error: any) {
      alert(error.response?.data?.message || 'حدث خطأ في قبول الطالب');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectStudent = async (studentId: string) => {
    if (!confirm('هل أنت متأكد من رفض هذا الطالب؟')) return;
    
    setActionLoading(studentId);
    try {
      await usersAPI.updateApproval(studentId, false);
      
      // Update local state
      setPendingStudents(prev => prev.filter(s => s._id !== studentId));
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg z-50';
      successDiv.textContent = 'تم رفض الطالب!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error: any) {
      alert(error.response?.data?.message || 'حدث خطأ في رفض الطالب');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockStudent = async (studentId: string, isBlocked: boolean) => {
    const action = isBlocked ? 'حظر' : 'إلغاء حظر';
    if (!confirm(`هل أنت متأكد من ${action} هذا الطالب؟`)) return;
    
    setActionLoading(studentId);
    try {
      // This would require an API endpoint to block/unblock users
      // await usersAPI.updateStatus(studentId, !isBlocked);
      
      // Update local state (simulate for now)
      setStudents(prev => prev.map(s => 
        s._id === studentId ? { ...s, isActive: !isBlocked } : s
      ));
      
    } catch (error: any) {
      alert(error.response?.data?.message || `حدث خطأ في ${action} الطالب`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (student: Student) => {
    if (!student.isApproved) return 'text-yellow-600 bg-yellow-100';
    if (!student.isActive) return 'text-red-600 bg-red-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusLabel = (student: Student) => {
    if (!student.isApproved) return 'في انتظار الموافقة';
    if (!student.isActive) return 'محظور';
    return 'نشط';
  };

  const calculateOverallStats = () => {
    const approvedStudents = students.filter(s => s.isApproved);
    const activeStudents = students.filter(s => s.isApproved && s.isActive);
    const totalAttempts = students.reduce((sum, s) => sum + (s.stats?.totalAttempts || 0), 0);
    const averageScore = students.length > 0
      ? students.reduce((sum, s) => sum + (s.stats?.averageScore || 0), 0) / students.length
      : 0;

    return {
      totalStudents: students.length,
      approvedStudents: approvedStudents.length,
      activeStudents: activeStudents.length,
      pendingStudents: pendingStudents.length,
      totalAttempts,
      averageScore
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

  const stats = calculateOverallStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">إدارة الطلاب</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">إجمالي الطلاب</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">المعتمدين</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.approvedStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">في الانتظار</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">المحاولات</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">متوسط الدرجات</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(stats.averageScore)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-medium text-gray-600">النشطين</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingStudents.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>طلبات الموافقة ({pendingStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingStudents.map((student) => (
                  <div key={student._id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{student.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {student.phone}
                        </span>
                        <span>العمر: {student.age}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(student.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        رقم ولي الأمر: {student.fatherPhone}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproveStudent(student._id)}
                        loading={actionLoading === student._id}
                        disabled={actionLoading === student._id}
                        size="sm"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        قبول
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleRejectStudent(student._id)}
                        loading={actionLoading === student._id}
                        disabled={actionLoading === student._id}
                        size="sm"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="البحث بالاسم أو رقم الهاتف..."
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
                variant={statusFilter === 'approved' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('approved')}
                size="sm"
              >
                المعتمدين
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('pending')}
                size="sm"
              >
                في الانتظار
              </Button>
              <Button
                variant={statusFilter === 'blocked' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('blocked')}
                size="sm"
              >
                المحظورين
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
                <option value="name">الاسم</option>
                <option value="score">الدرجة</option>
                <option value="attempts">المحاولات</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students List */}
        {filteredStudents.length > 0 ? (
          <div className="space-y-6">
            {filteredStudents.map((student, index) => (
              <Card 
                key={student._id} 
                className="hover:shadow-lg transition-shadow duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {student.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student)}`}>
                          {getStatusLabel(student)}
                        </span>
                        {student.lastSeen && (
                          <span className="text-xs text-gray-500">
                            آخر ظهور: {formatDate(student.lastSeen)}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{student.phone}</span>
                        </div>
                        <div>العمر: {student.age} سنة</div>
                        <div>رقم ولي الأمر: {student.fatherPhone}</div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>انضم في: {formatDate(student.createdAt)}</span>
                        </div>
                      </div>

                      {student.stats && (
                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{student.stats.totalAttempts} محاولة</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>{student.stats.completedAttempts} مكتملة</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>المتوسط: {formatPercentage(student.stats.averageScore)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            <span>الأفضل: {formatPercentage(student.stats.bestScore)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        عرض التفاصيل
                      </Button>
                      
                      {student.isApproved && (
                        <Button
                          variant={student.isActive ? "danger" : "primary"}
                          size="sm"
                          onClick={() => handleBlockStudent(student._id, student.isActive)}
                          loading={actionLoading === student._id}
                          disabled={actionLoading === student._id}
                        >
                          {student.isActive ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              حظر
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              إلغاء الحظر
                            </>
                          )}
                        </Button>
                      )}
                      
                      {!student.isApproved && (
                        <Button
                          onClick={() => handleApproveStudent(student._id)}
                          loading={actionLoading === student._id}
                          disabled={actionLoading === student._id}
                          size="sm"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          قبول
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد طلاب</h3>
            <p className="text-gray-600">لا يوجد طلاب يطابقون معايير البحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagementPage;
