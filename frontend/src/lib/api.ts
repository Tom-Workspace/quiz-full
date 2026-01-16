import axios from 'axios';
// import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  refreshToken: () => api.post('/auth/refresh-token'),
};

// Users API
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getPendingApprovals: () => api.get('/users/pending'),
  getOnlineUsers: () => api.get('/users/online'),
  getUserStats: () => api.get('/users/stats'),
  updateApproval: (userId: string, approved: boolean) =>
    api.put(`/users/${userId}/approval`, { approved }),
  updateRole: (userId: string, role: string) =>
    api.put(`/users/${userId}/role`, { role }),
  updateStatus: (userId: string, isActive: boolean) =>
    api.put(`/users/${userId}/status`, { isActive }),
  deleteUser: (userId: string) => api.delete(`/users/${userId}`),
  getById: (userId: string) => api.get(`/users/${userId}`),
};

// Quizzes API
export const quizzesAPI = {
  getAll: (params?: any) => api.get('/quizzes', { params }),
  getById: (id: string, params?: any) => api.get(`/quizzes/${id}`, { params }),
  create: (data: any) => api.post('/quizzes', data),
  update: (id: string, data: any) => api.put(`/quizzes/${id}`, data),
  delete: (id: string) => api.delete(`/quizzes/${id}`),
  clone: (id: string) => api.post(`/quizzes/${id}/clone`),
  getStats: (id: string) => api.get(`/quizzes/${id}/stats`),
  getAllStats: () => api.get('/quizzes/stats'),
};

// Quiz Attempts API
export const attemptsAPI = {
  start: (quizId: string) => api.post('/attempts/start', { quizId }),
  submitAnswer: (attemptId: string, data: any) =>
    api.post(`/attempts/${attemptId}/answer`, data),
  complete: (attemptId: string, data?: any) => api.post(`/attempts/${attemptId}/complete`, data),
  logCheatingAttempt: (attemptId: string, message: string) => api.post(`/attempts/${attemptId}/cheat-log`, { message }),
  getUserAttempts: (params?: any) => api.get('/attempts/my-attempts', { params }),
  getQuizAttempts: (quizId: string, params?: any) =>
    api.get(`/attempts/quiz/${quizId}`, { params }),
  getAttemptDetails: (attemptId: string) =>
    api.get(`/attempts/${attemptId}/details`),
  getMyAttemptDetails: (attemptId: string) =>
    api.get(`/attempts/${attemptId}/my-details`),
  getStudentAttempts: (studentId: string, params?: any) => api.get(`/attempts/student/${studentId}`, { params }),
  getStats: () => api.get('/attempts/stats'),
};

// Notifications API
export const notificationsAPI = {
  create: (data: any) => api.post('/notifications', data),
  getAll: (params?: any) => api.get('/notifications', { params }),
  getUserNotifications: (params?: any) => api.get('/notifications/user', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId: string) => api.patch(`/notifications/${notificationId}/read`),
  markAsUnread: (notificationId: string) => api.patch(`/notifications/${notificationId}/unread`),
  // markAllAsRead: () => api.put('/notifications/mark-all-read'),
  update: (notificationId: string, data: any) => api.put(`/notifications/${notificationId}`, data),
  delete: (notificationId: string) => api.delete(`/notifications/${notificationId}`),
  send: (notificationId: string) => api.post(`/notifications/${notificationId}/send`),
  getStats: () => api.get('/notifications/stats'),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getSystemHealth: () => api.get('/admin/system-health'),
  getRecentActivities: () => api.get('/admin/recent-activities'),
  getQuickActions: () => api.get('/admin/quick-actions'),
};

// Settings API (Admin)
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
};

export default api;
