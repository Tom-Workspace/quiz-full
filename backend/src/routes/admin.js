const express = require('express');
const router = express.Router();

const { getDashboardStats, getSystemHealth, getRecentActivities, getQuickActions } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/system-health', getSystemHealth);
router.get('/recent-activities', getRecentActivities);
router.get('/quick-actions', getQuickActions);

module.exports = router;
