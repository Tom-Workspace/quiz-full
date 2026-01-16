const os = require('os');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const socketService = require('../services/socketService');

// Build dashboard KPIs
const getDashboardStats = async (req, res) => {
  try {
    // Users
    const [totalUsers, students, teachers, pendingApprovals] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ isApproved: false })
    ]);

    // Quizzes
    const [totalQuizzes, activeQuizzesDoc] = await Promise.all([
      Quiz.countDocuments({}),
      Quiz.aggregate([{ $match: { isActive: true } }, { $count: 'count' }])
    ]);
    const activeQuizzes = activeQuizzesDoc[0]?.count || 0;

    // Attempts
    const attemptsAgg = await QuizAttempt.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]);
    const totalAttempts = attemptsAgg[0]?.totalAttempts || 0;
    const averageScore = Math.round((attemptsAgg[0]?.averagePercentage || 0) * 10) / 10;

    // Online users from socket service
    const onlineUsers = socketService.getOnlineCount();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents: students,
        totalTeachers: teachers,
        pendingApprovals,
        totalQuizzes,
        activeQuizzes,
        totalAttempts,
        averageScore,
        recentRegistrations: 0,
        onlineUsers,
      }
    });
  } catch (error) {
    console.error('Admin getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard stats' });
  }
};

const getSystemHealth = async (req, res) => {
  try {
    const uptime = Math.floor(process.uptime() * 1000);
    const memoryUsage = (process.memoryUsage().heapUsed / os.totalmem()) * 100;
    const load = os.loadavg()[0];
    // Normalize CPU usage roughly to % (not exact)
    const cpuUsage = Math.min(100, Math.max(0, (load / os.cpus().length) * 100));
    const activeConnections = socketService.getOnlineCount();

    let status = 'healthy';
    if (cpuUsage > 80 || memoryUsage > 85) status = 'warning';
    if (cpuUsage > 90 || memoryUsage > 90) status = 'critical';

    res.json({
      success: true,
      data: {
        status,
        uptime,
        memoryUsage: Math.round(memoryUsage * 10) / 10,
        cpuUsage: Math.round(cpuUsage * 10) / 10,
        activeConnections,
      }
    });
  } catch (error) {
    console.error('Admin getSystemHealth error:', error);
    res.status(500).json({ success: false, message: 'Failed to get system health' });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const [recentUsers, recentQuizzes, recentAttempts] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).limit(10).select('name role createdAt'),
      Quiz.find({}).sort({ createdAt: -1 }).limit(10).select('title createdAt'),
      QuizAttempt.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(10).populate('student', 'name').select('percentage createdAt')
    ]);

    const activities = [];
    for (const u of recentUsers) {
      activities.push({
        _id: `user_${u._id}`,
        type: 'user_registration',
        user: { name: u.name, role: u.role },
        description: `تم إنشاء حساب جديد: ${u.name}`,
        createdAt: u.createdAt
      });
    }
    for (const q of recentQuizzes) {
      activities.push({
        _id: `quiz_${q._id}`,
        type: 'quiz_created',
        user: { name: 'نظام', role: 'system' },
        description: `تم إنشاء كويز: ${q.title}`,
        createdAt: q.createdAt
      });
    }
    for (const a of recentAttempts) {
      activities.push({
        _id: `attempt_${a._id}`,
        type: 'quiz_completed',
        user: { name: a.student?.name || 'طالب', role: 'student' },
        description: `أكمل محاولة بنتيجة ${Math.round(a.percentage || 0)}%`,
        createdAt: a.createdAt
      });
    }

    // Sort by createdAt desc and take top 15
    activities.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
    res.json({ success: true, data: activities.slice(0, 15) });
  } catch (error) {
    console.error('Admin getRecentActivities error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recent activities' });
  }
};

const getQuickActions = async (req, res) => {
  try {
    const actions = [
      { title: 'إضافة مستخدم جديد', href: '/admin/users' },
      { title: 'إنشاء إشعار', href: '/admin/notifications' },
      { title: 'مراجعة الكويزات', href: '/admin/quizzes' },
      { title: 'تصدير البيانات', href: '/admin/reports' },
    ];
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error('Admin getQuickActions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get quick actions' });
  }
};

module.exports = { getDashboardStats, getSystemHealth, getRecentActivities, getQuickActions };
