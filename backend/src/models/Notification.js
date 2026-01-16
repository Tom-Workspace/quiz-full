const mongoose = require('mongoose');

const notificationReadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
});

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: {
    type: [String],
    enum: ['all', 'students', 'teachers', 'admins'],
    default: ['students']
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readBy: [notificationReadSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date
  }
});

// Index for better query performance
notificationSchema.index({ sender: 1 });
notificationSchema.index({ recipients: 1 });
notificationSchema.index({ isActive: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update updatedAt field before saving
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for read count
notificationSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for unread count
notificationSchema.virtual('unreadCount').get(function() {
  return Math.max(0, (this.targetUsers.length || 0) - this.readBy.length);
});

// Method to mark as read by user
notificationSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
  if (!alreadyRead) {
    this.readBy.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to check if read by user
notificationSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Static method to get unread notifications for user
notificationSchema.statics.getUnreadForUser = function(userId, userRole) {
  const query = {
    isActive: true,
    $or: [
      { targetUsers: userId },
      { recipients: 'all' },
      { recipients: userRole }
    ],
    'readBy.user': { $ne: userId }
  };

  if (this.expiresAt) {
    query.expiresAt = { $gt: new Date() };
  }

  return this.find(query).populate('sender', 'name role').sort({ createdAt: -1 });
};

module.exports = mongoose.model('Notification', notificationSchema);
