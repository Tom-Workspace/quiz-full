'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsAPI, usersAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Plus, Send, Edit, Trash2, Users, User, AlertCircle, Info, CheckCircle, XCircle, Eye } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  role: string;
  isApproved: boolean;
}

interface Notification {
  _id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  recipients: {
    roles?: string[];
    users?: string[];
  };
  readBy: Array<{
    user: string;
    readAt: Date;
  }>;
  sender: {
    _id: string;
    name: string;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    recipientType: 'roles' as 'roles' | 'users',
    selectedRoles: [] as string[],
    selectedUsers: [] as string[],
    expiresAt: ''
  });

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'teacher')) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notificationsResponse, usersResponse] = await Promise.all([
        notificationsAPI.getAll(),
        usersAPI.getUsers()
      ]);
      
      setNotifications(notificationsResponse.data.data.notifications);
      setUsers(usersResponse.data.data.users);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const notificationData = {
        type: formData.type,
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        recipients: formData.recipientType === 'roles' 
          ? { roles: formData.selectedRoles }
          : { users: formData.selectedUsers },
        ...(formData.expiresAt && { expiresAt: new Date(formData.expiresAt) })
      };

      if (editingNotification) {
        await notificationsAPI.updateNotification(editingNotification._id, notificationData);
      } else {
        await notificationsAPI.createNotification(notificationData);
      }

      // Reset form and reload data
      setFormData({
        type: 'info',
        title: '',
        message: '',
        priority: 'medium',
        recipientType: 'roles',
        selectedRoles: [],
        selectedUsers: [],
        expiresAt: ''
      });
      setShowCreateForm(false);
      setEditingNotification(null);
      loadData();
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      recipientType: notification.recipients.roles ? 'roles' : 'users',
      selectedRoles: notification.recipients.roles || [],
      selectedUsers: notification.recipients.users || [],
      expiresAt: notification.expiresAt ? new Date(notification.expiresAt).toISOString().slice(0, 16) : ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (notificationId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      try {
        await notificationsAPI.deleteNotification(notificationId);
        loadData();
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    }
  };

  const viewNotificationStats = async (notificationId: string) => {
    try {
      const response = await notificationsAPI.getNotificationStats(notificationId);
      const notification = notifications.find(n => n._id === notificationId);
      if (notification) {
        setSelectedNotification({
          ...notification,
          ...response.data.data
        });
      }
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">غير مصرح</h1>
          <p className="text-gray-600 dark:text-gray-400">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 dark-transition">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">إدارة الإشعارات</h1>
            <p className="text-gray-600 dark:text-gray-400">
              إنشاء وإدارة الإشعارات للطلاب
            </p>
          </div>
          <Button
            onClick={() => {
              setShowCreateForm(true);
              setEditingNotification(null);
              setFormData({
                type: 'info',
                title: '',
                message: '',
                priority: 'medium',
                recipientType: 'roles',
                selectedRoles: [],
                selectedUsers: [],
                expiresAt: ''
              });
            }}
          >
            <Plus className="h-4 w-4 ml-2" />
            إشعار جديد
          </Button>
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  {editingNotification ? 'تعديل الإشعار' : 'إشعار جديد'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type and Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        نوع الإشعار
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="info">معلومات</option>
                        <option value="success">نجح</option>
                        <option value="warning">تحذير</option>
                        <option value="error">خطأ</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        الأولوية
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="low">منخفضة</option>
                        <option value="medium">متوسطة</option>
                        <option value="high">عالية</option>
                      </select>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      العنوان
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الرسالة
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  {/* Recipients */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      المستقبلين
                    </label>
                    <div className="space-y-3">
                      <div className="flex space-x-4 space-x-reverse">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="roles"
                            checked={formData.recipientType === 'roles'}
                            onChange={(e) => setFormData({...formData, recipientType: e.target.value as any})}
                            className="ml-2"
                          />
                          حسب الأدوار
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="users"
                            checked={formData.recipientType === 'users'}
                            onChange={(e) => setFormData({...formData, recipientType: e.target.value as any})}
                            className="ml-2"
                          />
                          مستخدمين محددين
                        </label>
                      </div>

                      {formData.recipientType === 'roles' ? (
                        <div className="space-y-2">
                          {['student', 'teacher'].map((role) => (
                            <label key={role} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.selectedRoles.includes(role)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({...formData, selectedRoles: [...formData.selectedRoles, role]});
                                  } else {
                                    setFormData({...formData, selectedRoles: formData.selectedRoles.filter(r => r !== role)});
                                  }
                                }}
                                className="ml-2"
                              />
                              {role === 'student' ? 'الطلاب' : 'المعلمين'}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                          {users.filter(u => u.role === 'student').map((user) => (
                            <label key={user._id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <input
                                type="checkbox"
                                checked={formData.selectedUsers.includes(user._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({...formData, selectedUsers: [...formData.selectedUsers, user._id]});
                                  } else {
                                    setFormData({...formData, selectedUsers: formData.selectedUsers.filter(u => u !== user._id)});
                                  }
                                }}
                                className="ml-2"
                              />
                              <span className="text-sm">{user.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      تاريخ انتهاء الصلاحية (اختياري)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4 space-x-reverse pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingNotification(null);
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit">
                      <Send className="h-4 w-4 ml-2" />
                      {editingNotification ? 'تحديث' : 'إرسال'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Modal */}
        {selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  إحصائيات الإشعار
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {selectedNotification.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {selectedNotification.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {selectedNotification.readBy?.length || 0}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">قرأوا الإشعار</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {formatDate(selectedNotification.createdAt)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">تاريخ الإنشاء</div>
                    </div>
                  </div>

                  {selectedNotification.readBy && selectedNotification.readBy.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        قائمة القراءة:
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {selectedNotification.readBy.map((read: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-sm">{read.user?.name || 'مستخدم محذوف'}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(read.readAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedNotification(null)}
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 dark-transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  {getTypeIcon(notification.type)}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    notification.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {notification.priority === 'high' ? 'عالي' : 
                     notification.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewNotificationStats(notification._id)}
                    title="عرض الإحصائيات"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(notification)}
                    title="تعديل"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notification._id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {notification.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                {notification.message}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-2 space-x-reverse">
                  {notification.recipients.roles ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>
                    {notification.recipients.roles 
                      ? `${notification.recipients.roles.length} دور`
                      : `${notification.recipients.users?.length || 0} مستخدم`
                    }
                  </span>
                </div>
                
                <span>{formatDate(notification.createdAt)}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  قرأه: {notification.readBy.length} شخص
                </div>
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 dark-transition">
              <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                لا توجد إشعارات
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                ابدأ بإنشاء إشعار جديد لإرساله للطلاب
              </p>
              <Button
                onClick={() => {
                  setShowCreateForm(true);
                  setEditingNotification(null);
                }}
              >
                <Plus className="h-4 w-4 ml-2" />
                إشعار جديد
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationManagementPage;
