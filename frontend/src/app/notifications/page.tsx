'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsAPI } from '@/lib/api';
import socketService from '@/lib/socket';
import Button from '@/components/ui/Button';
import { Bell, Check, Clock, Trash2, Eye, EyeOff, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';

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

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Listen for new notifications
      socketService.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
      });

      return () => {
        socketService.off('new_notification');
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getUserNotifications();
      setNotifications(response.data.data.notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, readBy: [...notif.readBy, { user: user!._id, readAt: new Date() }] }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsUnread(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, readBy: notif.readBy.filter(r => r.user !== user!._id) }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking as unread:', error);
    }
  };

  const markSelectedAsRead = async () => {
    try {
      await Promise.all(selectedNotifications.map(id => notificationsAPI.markAsRead(id)));
      setNotifications(prev => 
        prev.map(notif => 
          selectedNotifications.includes(notif._id)
            ? { ...notif, readBy: [...notif.readBy, { user: user!._id, readAt: new Date() }] }
            : notif
        )
      );
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Error marking selected as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const isRead = (notification: Notification) => {
    return notification.readBy.some(r => r.user === user?._id);
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !isRead(notif);
      case 'read':
        return isRead(notif);
      default:
        return true;
    }
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-r-red-500';
      case 'medium':
        return 'border-r-yellow-500';
      default:
        return 'border-r-gray-300';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 dark-transition">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">الإشعارات</h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة وعرض جميع الإشعارات الخاصة بك
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 p-4 dark-transition">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            {/* Filter Buttons */}
            <div className="flex space-x-2 space-x-reverse">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                الكل ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                غير مقروء ({notifications.filter(n => !isRead(n)).length})
              </Button>
              <Button
                variant={filter === 'read' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('read')}
              >
                مقروء ({notifications.filter(n => isRead(n)).length})
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <div className="flex space-x-2 space-x-reverse">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markSelectedAsRead}
                >
                  <Check className="h-4 w-4 ml-2" />
                  تحديد كمقروء ({selectedNotifications.length})
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center dark-transition">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                لا توجد إشعارات
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 
                 filter === 'read' ? 'لا توجد إشعارات مقروءة' : 
                 'لم تتلق أي إشعارات بعد'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-r-4 ${getPriorityColor(notification.priority)} dark-transition ${
                  !isRead(notification) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 space-x-reverse flex-1">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotifications(prev => [...prev, notification._id]);
                          } else {
                            setSelectedNotifications(prev => prev.filter(id => id !== notification._id));
                          }
                        }}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />

                      {/* Type Icon */}
                      <div className="mt-1">
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-lg font-medium ${!isRead(notification) ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} dark-transition`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {!isRead(notification) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                جديد
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              notification.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {notification.priority === 'high' ? 'عالي' : 
                               notification.priority === 'medium' ? 'متوسط' : 'منخفض'}
                            </span>
                          </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <span>من: {notification.sender.name}</span>
                            <span>{formatDate(notification.createdAt)}</span>
                            {notification.expiresAt && (
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 ml-1" />
                                ينتهي: {formatDate(notification.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 space-x-reverse ml-4">
                      {isRead(notification) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsUnread(notification._id)}
                          title="تحديد كغير مقروء"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification._id)}
                          title="تحديد كمقروء"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {(user?.role === 'admin' || user?._id === notification.sender._id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification._id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="حذف الإشعار"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
