'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usersAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Crown, 
  GraduationCap,
  UserCheck,
  Search,
  Eye,
  MoreVertical,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Shield,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  phone: string;
  age: number;
  fatherPhone?: string;
  role: 'student' | 'teacher' | 'admin';
  isApproved: boolean;
  isActive: boolean;
  isOnline?: boolean;
  createdAt: string;
  lastSeen?: string;
}

const AdminUserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'online'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('خطأ في تحميل المستخدمين', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => {
        switch (statusFilter) {
          case 'approved': return u.isApproved;
          case 'pending': return !u.isApproved;
          case 'online': return u.isOnline;
          default: return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await usersAPI.updateApproval(userId, true);
      setUsers(prev => prev.map(u => 
        u._id === userId ? { ...u, isApproved: true } : u
      ));
      showNotification('تم قبول المستخدم بنجاح', 'success');
    } catch (error: any) {
      showNotification('حدث خطأ في قبول المستخدم', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const exportUsers = async () => {
    try {
      const csvData = filteredUsers.map(u => ({
        الاسم: u.name,
        الهاتف: u.phone,
        العمر: u.age,
        الدور: getRoleLabel(u.role),
        الحالة: u.isApproved ? 'معتمد' : 'في الانتظار',
        'تاريخ التسجيل': formatDate(u.createdAt),
        'آخر ظهور': u.lastSeen ? formatDate(u.lastSeen) : 'لم يسجل دخول'
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      showNotification('تم تصدير قائمة المستخدمين', 'success');
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-5 w-5 text-purple-600" />;
      case 'teacher': return <GraduationCap className="h-5 w-5 text-blue-600" />;
      default: return <Users className="h-5 w-5 text-green-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مسؤول';
      case 'teacher': return 'معلم';
      default: return 'طالب';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'teacher': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    }
  };

  const calculateStats = () => {
    const totalUsers = users.length;
    const students = users.filter(u => u.role === 'student').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const approvedUsers = users.filter(u => u.isApproved).length;
    const pendingApprovals = users.filter(u => !u.isApproved).length;
    const onlineUsers = users.filter(u => u.isOnline).length;

    return { totalUsers, students, teachers, admins, approvedUsers, pendingApprovals, onlineUsers };
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

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => loadUsers()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                تحديث
              </Button>
              <Button variant="outline" onClick={exportUsers}>
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                إضافة مستخدم
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="mr-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">إجمالي المستخدمين</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="mr-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">الطلاب</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.students}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div className="mr-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">المعلمين</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.teachers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div className="mr-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">المسؤولين</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.admins}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="mr-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">المعتمدين</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.approvedUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="mr-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">في الانتظار</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.pendingApprovals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div className="mr-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">متصل الآن</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.onlineUsers}</p>
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
                    placeholder="البحث بالاسم أو رقم الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع الأدوار</option>
                  <option value="student">الطلاب</option>
                  <option value="teacher">المعلمين</option>
                  <option value="admin">المسؤولين</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="approved">المعتمدين</option>
                  <option value="pending">في الانتظار</option>
                  <option value="online">متصل الآن</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredUsers.map((userItem, index) => (
              <Card 
                key={userItem._id}
                className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  {/* User Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="relative">
                        <div className={`p-3 rounded-full bg-gradient-to-r ${
                          userItem.role === 'admin' ? 'from-purple-500 to-purple-600' :
                          userItem.role === 'teacher' ? 'from-blue-500 to-indigo-600' :
                          'from-green-500 to-green-600'
                        }`}>
                          {getRoleIcon(userItem.role)}
                        </div>
                        {userItem.isOnline && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {userItem.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userItem.role)}`}>
                            {getRoleLabel(userItem.role)}
                          </span>
                          {userItem.isOnline ? (
                            <Wifi className="h-4 w-4 text-green-500" title="متصل الآن" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-gray-400" title="غير متصل" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!userItem.isApproved && (
                      <div className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                        في الانتظار
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{userItem.phone}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>العمر: {userItem.age} سنة</span>
                    </div>
                    
                    {userItem.fatherPhone && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>ولي الأمر: {userItem.fatherPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="border-t dark:border-gray-700 pt-4 mb-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>انضم: {formatDate(userItem.createdAt)}</div>
                      {userItem.lastSeen && (
                        <div>آخر ظهور: {formatDate(userItem.lastSeen)}</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/admin/users/${userItem._id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" />
                        عرض الملف
                      </Button>
                    </Link>
                    
                    {!userItem.isApproved && (
                      <Button
                        onClick={() => handleApproveUser(userItem._id)}
                        loading={actionLoading === userItem._id}
                        size="sm"
                        className="flex-1"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        قبول
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا يوجد مستخدمين</h3>
            <p className="text-gray-600 dark:text-gray-400">لا يوجد مستخدمين يطابقون معايير البحث المحددة</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagementPage;
