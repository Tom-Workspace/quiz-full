'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { notificationsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { 
  Bell, 
  Plus, 
  Send,
  Search,
  Edit,
  Eye,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Calendar,
  Filter,
  Download,
  MessageSquare,
  Zap,
  Target,
  Settings
} from 'lucide-react';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  recipients: 'all' | 'students' | 'teachers' | 'admins';
  isActive: boolean;
  scheduledAt?: string;
  sentAt?: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  recipientCount?: number;
  readCount?: number;
}

interface NotificationStats {
  totalNotifications: number;
  activeNotifications: number;
  sentNotifications: number;
  scheduledNotifications: number;
  totalRecipients: number;
  totalReads: number;
}

const AdminNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as Notification['type'],
    recipients: 'all' as Notification['recipients'],
    scheduledAt: ''
  });
  const [editForm, setEditForm] = useState({
    title: '',
    message: '',
    type: 'info' as Notification['type'],
    recipients: 'all' as Notification['recipients'],
    isActive: true as boolean
  });

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, typeFilter, recipientFilter, statusFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll();
      
      console.log('API Response:', response);
      
      // Handle paginated response structure from backend
      let notificationsData = [];
      if (response.data?.success && response.data?.data?.notifications) {
        notificationsData = response.data.data.notifications;
      } else if (response.data?.data?.notifications) {
        notificationsData = response.data.data.notifications;
      } else if (Array.isArray(response.data?.data)) {
        notificationsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        notificationsData = response.data;
      }
      
      console.log('Parsed notifications data:', notificationsData);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      console.log('Error details:', error.response);
      setNotifications([]);
      showNotification(`خطأ في تحميل الإشعارات: ${error?.response?.status || error?.message || 'غير معروف'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    if (searchTerm) {
      filtered = filtered.filter(notif => 
        notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(notif => notif.type === typeFilter);
    }

    if (recipientFilter !== 'all') {
      filtered = filtered.filter(notif => notif.recipients === recipientFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(notif => {
        switch (statusFilter) {
          case 'sent': return notif.sentAt;
          case 'scheduled': return notif.scheduledAt && !notif.sentAt;
          case 'active': return notif.isActive;
          case 'inactive': return !notif.isActive;
          default: return true;
        }
      });
    }

    setFilteredNotifications(filtered);
  };

  const handleCreateNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    try {
      setActionLoading('create');
      
      // Convert recipients string to array for backend validation
      const recipientsArr = newNotification.recipients === 'all' ? ['all'] : [newNotification.recipients];
      const notificationData = {
        ...newNotification,
        recipients: recipientsArr,
        isActive: false as boolean
      } as any;
      
      await notificationsAPI.create(notificationData);
      await loadNotifications();
      setShowCreateModal(false);
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        recipients: 'all',
        scheduledAt: ''
      });
      showNotification('تم إنشاء الإشعار بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في إنشاء الإشعار', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNotification = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await notificationsAPI.send(notificationId);
      await loadNotifications();
      showNotification('تم إرسال الإشعار بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في إرسال الإشعار', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await notificationsAPI.delete(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      showNotification('تم حذف الإشعار بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في حذف الإشعار', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openViewModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowViewModal(true);
  };

  const openEditModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setEditForm({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      recipients: notification.recipients,
      isActive: notification.isActive
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedNotification) return;
    try {
      setActionLoading('edit');
      const payload = {
        title: editForm.title,
        message: editForm.message,
        type: editForm.type,
        isActive: editForm.isActive,
        recipients: [editForm.recipients]
      } as any;
      await notificationsAPI.update(selectedNotification._id, payload);
      await loadNotifications();
      setShowEditModal(false);
      showNotification('تم حفظ التعديلات', 'success');
    } catch (e) {
      showNotification('فشل حفظ التعديلات', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const calculateStats = (): NotificationStats => {
    return {
      totalNotifications: notifications.length,
      activeNotifications: notifications.filter(n => n.isActive).length,
      sentNotifications: notifications.filter(n => n.sentAt).length,
      scheduledNotifications: notifications.filter(n => n.scheduledAt && !n.sentAt).length,
      totalRecipients: notifications.reduce((sum, n) => sum + (n.recipientCount || 0), 0),
      totalReads: notifications.reduce((sum, n) => sum + (n.readCount || 0), 0)
    };
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'announcement': return <Zap className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'success': return 'نجاح';
      case 'warning': return 'تحذير';
      case 'error': return 'خطأ';
      case 'announcement': return 'إعلان';
      default: return 'معلومات';
    }
  };

  const getRecipientsLabel = (recipients: string) => {
    switch (recipients) {
      case 'students': return 'الطلاب';
      case 'teachers': return 'المعلمين';
      case 'admins': return 'المسؤولين';
      default: return 'الجميع';
    }
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
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">نظام الإشعارات</h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إنشاء إشعار جديد
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Bell className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">إجمالي الإشعارات</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalNotifications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Send className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">المرسلة</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.sentNotifications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">المجدولة</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.scheduledNotifications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">النشطة</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeNotifications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">المستلمين</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalRecipients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                    <Eye className="h-5 w-5 text-teal-600 dark:text-teal-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">المقروءة</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalReads}</p>
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
                    placeholder="البحث في العنوان أو المحتوى..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="info">معلومات</option>
                  <option value="success">نجاح</option>
                  <option value="warning">تحذير</option>
                  <option value="error">خطأ</option>
                  <option value="announcement">إعلان</option>
                </select>

                <select
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع المستلمين</option>
                  <option value="students">الطلاب</option>
                  <option value="teachers">المعلمين</option>
                  <option value="admins">المسؤولين</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="sent">مرسلة</option>
                  <option value="scheduled">مجدولة</option>
                  <option value="active">نشطة</option>
                  <option value="inactive">غير نشطة</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-4">
            {filteredNotifications.map((notification, index) => (
              <Card 
                key={notification._id}
                className="hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getTypeIcon(notification.type)}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                          {getRecipientsLabel(notification.recipients)}
                        </span>
                        {notification.isActive && (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                            نشط
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>المنشئ: {notification.createdBy?.name || 'غير محدد'}</div>
                        <div>تاريخ الإنشاء: {formatDate(notification.createdAt)}</div>
                        {notification.sentAt && (
                          <div>تاريخ الإرسال: {formatDate(notification.sentAt)}</div>
                        )}
                        {notification.scheduledAt && !notification.sentAt && (
                          <div>مجدول لـ: {formatDate(notification.scheduledAt)}</div>
                        )}
                        {notification.recipientCount && (
                          <div>المستلمين: {notification.recipientCount}</div>
                        )}
                        {notification.readCount && (
                          <div>المقروءة: {notification.readCount}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openViewModal(notification)}>
                        <Eye className="h-4 w-4 mr-1" />
                        عرض
                      </Button>
                      
                      <Button variant="outline" size="sm" onClick={() => openEditModal(notification)}>
                        <Edit className="h-4 w-4 mr-1" />
                        تعديل
                      </Button>

                      {!notification.sentAt && (
                        <Button 
                          size="sm"
                          onClick={() => handleSendNotification(notification._id)}
                          loading={actionLoading === notification._id}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          إرسال
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteNotification(notification._id)}
                        loading={actionLoading === notification._id}
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
            <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا يوجد إشعارات</h3>
            <p className="text-gray-600 dark:text-gray-300">لا يوجد إشعارات تطابق معايير البحث</p>
          </div>
        )}

        {/* Create Notification Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <CardTitle>إنشاء إشعار جديد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">العنوان</label>
                  <Input
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                    placeholder="عنوان الإشعار"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">الرسالة</label>
                  <textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                    placeholder="محتوى الإشعار"
                    className="w-full p-2 border rounded-md h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">النوع</label>
                    <select
                      value={newNotification.type}
                      onChange={(e) => setNewNotification({...newNotification, type: e.target.value as any})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="info">معلومات</option>
                      <option value="success">نجاح</option>
                      <option value="warning">تحذير</option>
                      <option value="error">خطأ</option>
                      <option value="announcement">إعلان</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">المستلمين</label>
                    <select
                      value={newNotification.recipients}
                      onChange={(e) => setNewNotification({...newNotification, recipients: e.target.value as any})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="all">الجميع</option>
                      <option value="students">الطلاب</option>
                      <option value="teachers">المعلمين</option>
                      <option value="admins">المسؤولين</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">التوقيت (اختياري)</label>
                  <Input
                    type="datetime-local"
                    value={newNotification.scheduledAt}
                    onChange={(e) => setNewNotification({...newNotification, scheduledAt: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    onClick={handleCreateNotification}
                    loading={actionLoading === 'create'}
                  >
                    إنشاء الإشعار
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View Notification Modal */}
        {showViewModal && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <CardTitle>عرض الإشعار</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">العنوان:</span> <span className="font-medium">{selectedNotification.title}</span></div>
                  <div><span className="text-gray-500">النوع:</span> <span className="font-medium">{getTypeLabel(selectedNotification.type)}</span></div>
                  <div><span className="text-gray-500">المستلمين:</span> <span className="font-medium">{getRecipientsLabel(selectedNotification.recipients)}</span></div>
                  <div><span className="text-gray-500">نشط:</span> <span className="font-medium">{selectedNotification.isActive ? 'نعم' : 'لا'}</span></div>
                  <div><span className="text-gray-500">تم الإنشاء:</span> <span className="font-medium">{formatDate(selectedNotification.createdAt)}</span></div>
                  {selectedNotification.sentAt && (
                    <div><span className="text-gray-500">تاريخ الإرسال:</span> <span className="font-medium">{formatDate(selectedNotification.sentAt)}</span></div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الرسالة</label>
                  <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">{selectedNotification.message}</div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowViewModal(false)}>إغلاق</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Notification Modal */}
        {showEditModal && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <CardTitle>تعديل الإشعار</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">العنوان</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="عنوان الإشعار"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الرسالة</label>
                  <textarea
                    value={editForm.message}
                    onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                    placeholder="محتوى الإشعار"
                    className="w-full p-2 border rounded-md h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">النوع</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="info">معلومات</option>
                      <option value="success">نجاح</option>
                      <option value="warning">تحذير</option>
                      <option value="error">خطأ</option>
                      <option value="announcement">إعلان</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">المستلمين</label>
                    <select
                      value={editForm.recipients}
                      onChange={(e) => setEditForm({ ...editForm, recipients: e.target.value as any })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="all">الجميع</option>
                      <option value="students">الطلاب</option>
                      <option value="teachers">المعلمين</option>
                      <option value="admins">المسؤولين</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="editActive" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                  <label htmlFor="editActive">نشط</label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>إلغاء</Button>
                  <Button onClick={handleSaveEdit} loading={actionLoading === 'edit'}>حفظ</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
