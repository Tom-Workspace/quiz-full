const Notification = require('../models/Notification');
const User = require('../models/User');
const socketService = require('../services/socketService');

// Create notification (Admin/Teacher only)
const createNotification = async (req, res) => {
  try {
    const { title, message, type, priority, recipients, targetUsers, expiresAt } = req.body;
    
    // Create notification
    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      sender: req.user._id,
      recipients: recipients || ['students'],
      targetUsers: targetUsers || [],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    await notification.save();
    await notification.populate('sender', 'name role');

    // Get target users based on recipients
    let users = [];
    if (recipients && recipients.includes('all')) {
      users = await User.find({ _id: { $ne: req.user._id } });
    } else if (recipients && recipients.length > 0) {
      const roleFilter = recipients.filter(r => ['students', 'teachers', 'admins'].includes(r));
      const mappedRoles = roleFilter.map(r => r === 'students' ? 'student' : r === 'teachers' ? 'teacher' : 'admin');
      users = await User.find({ role: { $in: mappedRoles } });
    } else if (targetUsers && targetUsers.length > 0) {
      users = await User.find({ _id: { $in: targetUsers } });
    }

    // Update notification with actual target users
    notification.targetUsers = users.map(u => u._id);
    await notification.save();

    // Send real-time notification to all target users
    users.forEach(user => {
      socketService.sendToUser(user._id.toString(), 'new_notification', {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        sender: notification.sender,
        createdAt: notification.createdAt
      });
    });

    res.status(201).json({
      success: true,
      message: 'Notification created and sent successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
};

// Get all notifications (Admin/Teacher)
const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const notifications = await Notification.find(filter)
      .populate('sender', 'name role')
      .populate('readBy.user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    });
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const filter = {
      isActive: true,
      $or: [
        { targetUsers: userId },
        { recipients: 'all' },
        { recipients: req.user.role === 'student' ? 'students' : req.user.role === 'teacher' ? 'teachers' : 'admins' }
      ]
    };

    // Add expiry filter
    filter.$and = [
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }
    ];

    if (unreadOnly === 'true') {
      filter['readBy.user'] = { $ne: userId };
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      isActive: true,
      $or: [
        { targetUsers: userId },
        { recipients: 'all' },
        { recipients: req.user.role === 'student' ? 'students' : req.user.role === 'teacher' ? 'teachers' : 'admins' }
      ],
      'readBy.user': { $ne: userId },
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if already read
    const alreadyRead = notification.readBy.some(read => read.user.toString() === userId.toString());
    if (!alreadyRead) {
      notification.readBy.push({ user: userId });
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// Mark notification as unread
const markAsUnread = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.readBy = notification.readBy.filter(read => read.user.toString() !== userId.toString());
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as unread'
    });
  } catch (error) {
    console.error('Mark as unread error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as unread'
    });
  }
};

// Update notification (Admin/Teacher only)
const updateNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const updates = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && notification.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    Object.assign(notification, updates);
    await notification.save();
    await notification.populate('sender', 'name role');

    res.json({
      success: true,
      message: 'Notification updated successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
};

// Delete notification (Admin only or sender)
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && notification.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId)
      .populate('sender', 'name role')
      .populate('readBy.user', 'name role')
      .populate('targetUsers', 'name role');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const stats = {
      totalRecipients: notification.targetUsers.length,
      totalRead: notification.readBy.length,
      totalUnread: notification.targetUsers.length - notification.readBy.length,
      readPercentage: notification.targetUsers.length > 0 
        ? Math.round((notification.readBy.length / notification.targetUsers.length) * 100) 
        : 0,
      readBy: notification.readBy,
      unreadUsers: notification.targetUsers.filter(user => 
        !notification.readBy.some(read => read.user._id.toString() === user._id.toString())
      )
    };

    res.json({
      success: true,
      data: {
        notification,
        ...stats
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics'
    });
  }
};

// Send (broadcast) an existing notification to its target recipients
const sendNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId).populate('sender', 'name role');
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Resolve recipients into concrete users
    let users = [];
    if (notification.recipients.includes('all')) {
      users = await User.find({ _id: { $ne: req.user._id } });
    } else if (notification.recipients.length > 0) {
      const mappedRoles = notification.recipients.map(r => r === 'students' ? 'student' : r === 'teachers' ? 'teacher' : 'admin');
      users = await User.find({ role: { $in: mappedRoles } });
    }

    // Merge targetUsers with resolved users
    const set = new Set([...(notification.targetUsers || []).map(id => id.toString())]);
    users.forEach(u => set.add(u._id.toString()));
    notification.targetUsers = Array.from(set);
    notification.isActive = true;
    notification.sentAt = new Date();
    await notification.save();

    // Broadcast
    const payload = {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      sender: notification.sender,
      createdAt: notification.createdAt
    };
    notification.targetUsers.forEach(userId => {
      socketService.sendToUser(userId.toString(), 'new_notification', payload);
    });

    res.json({ success: true, message: 'Notification sent successfully', data: { notification } });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

module.exports = {
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
};
