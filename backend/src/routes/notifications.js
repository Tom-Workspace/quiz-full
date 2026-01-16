const express = require('express');
const router = express.Router();

const {
  createNotification,
  getAllNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  updateNotification,
  deleteNotification,
  getNotificationStats,
  sendNotification
} = require('../controllers/notificationController');

const { authenticate, authorize } = require('../middlewares/auth');
const { validate, createNotificationSchema, updateNotificationSchema } = require('../utils/validation');

// All routes require authentication
router.use(authenticate);

// User routes - accessible by all authenticated users
router.get('/user', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:notificationId/read', markAsRead);
router.patch('/:notificationId/unread', markAsUnread);

// Admin/Teacher routes
router.get('/', authorize('admin', 'teacher'), getAllNotifications);
router.post('/', authorize('admin', 'teacher'), validate(createNotificationSchema), createNotification);
router.put('/:notificationId', authorize('admin', 'teacher'), validate(updateNotificationSchema), updateNotification);
router.delete('/:notificationId', authorize('admin', 'teacher'), deleteNotification);
router.get('/:notificationId/stats', authorize('admin', 'teacher'), getNotificationStats);
router.post('/:notificationId/send', authorize('admin', 'teacher'), sendNotification);

module.exports = router;
