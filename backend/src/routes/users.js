const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getPendingApprovals,
  updateUserApproval,
  updateUserRole,
  deleteUser,
  getOnlineUsers,
  getUserStats,
  getUserById
} = require('../controllers/userController');

const { authenticate, authorize } = require('../middlewares/auth');
const { validate, approveUserSchema, updateUserRoleSchema } = require('../utils/validation');

// All routes require authentication
router.use(authenticate);

// Teacher and Admin routes
router.get('/', authorize('teacher', 'admin'), getAllUsers);
router.get('/pending', authorize('teacher', 'admin'), getPendingApprovals);
router.get('/online', authorize('teacher', 'admin'), getOnlineUsers);
router.put('/:userId/approval', authorize('teacher', 'admin'), validate(approveUserSchema), updateUserApproval);

// Admin only routes
router.get('/stats', authorize('admin'), getUserStats);
router.get('/:userId', authorize('teacher', 'admin'), getUserById);
router.put('/:userId/role', authorize('admin'), validate(updateUserRoleSchema), updateUserRole);
router.delete('/:userId', authorize('admin'), deleteUser);

module.exports = router;
