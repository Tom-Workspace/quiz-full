const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const cacheService = require('../utils/cache');
const socketService = require('../services/socketService');

// Get all users (Admin/Teacher only)
const getAllUsers = async (req, res) => {
  try {
    const { role, isApproved, page = 1, limit = 10, search } = req.query;
    
    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

// Get pending approvals (Teacher/Admin only)
const getPendingApprovals = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      role: 'student',
      isApproved: false
    })
    .select('-password -refreshToken')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        users: pendingUsers
      }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending approvals'
    });
  }
};

// Approve/Reject user (Teacher/Admin only)
const updateUserApproval = async (req, res) => {
  try {
    const { userId } = req.params;
    const { approved } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isApproved = approved;
    await user.save();

    // Clear user cache
    await cacheService.del(cacheService.keys.user(userId));

    // Emit socket event for user status change
    socketService.notifyRole('teacher', 'user_status_changed', {
      user: user.toJSON()
    });
    socketService.notifyRole('admin', 'user_status_changed', {
      user: user.toJSON()
    });

    res.json({
      success: true,
      message: `User ${approved ? 'approved' : 'rejected'} successfully`,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Update user approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user approval'
    });
  }
};

// Update user role (Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent changing own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    user.role = role;
    await user.save();

    // Clear user cache
    await cacheService.del(cacheService.keys.user(userId));

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete user's quiz attempts
    await QuizAttempt.deleteMany({ student: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    // Clear user cache
    await cacheService.del(cacheService.keys.user(userId));

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Get online users (Teacher/Admin only)
const getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = await User.find({
      isOnline: true,
      isApproved: true
    })
    .select('name phone role lastSeen')
    .sort({ lastSeen: -1 });

    res.json({
      success: true,
      data: {
        users: onlineUsers
      }
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get online users'
    });
  }
};

// Get user statistics (Admin only)
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: ['$isApproved', 1, 0]
            }
          },
          online: {
            $sum: {
              $cond: ['$isOnline', 1, 0]
            }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const pendingApprovals = await User.countDocuments({
      role: 'student',
      isApproved: false
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        pendingApprovals,
        roleStats: stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics'
    });
  }
};

// Get single user details with stats (Admin/Teacher only)
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Aggregate attempts statistics for this user
    const [stats] = await QuizAttempt.aggregate([
      { $match: { student: user._id } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          averageScore: { $avg: '$score' },
          averagePercentage: { $avg: '$percentage' },
          bestScore: { $max: '$score' },
          bestPercentage: { $max: '$percentage' }
        }
      }
    ]);

    const recentAttempts = await QuizAttempt.find({ student: user._id })
      .populate('quiz', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        stats: stats || {
          totalAttempts: 0,
          completedAttempts: 0,
          averageScore: 0,
          averagePercentage: 0,
          bestScore: 0,
          bestPercentage: 0
        },
        recentAttempts
      }
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
};

module.exports = {
  getAllUsers,
  getPendingApprovals,
  updateUserApproval,
  updateUserRole,
  deleteUser,
  getOnlineUsers,
  getUserStats,
  getUserById
};
