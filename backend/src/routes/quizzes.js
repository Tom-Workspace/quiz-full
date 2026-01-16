const express = require('express');
const router = express.Router();

const {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizStats,
  getAllStats,
  cloneQuiz
} = require('../controllers/quizController');

const { authenticate, authorize } = require('../middlewares/auth');
const { quizLimiter } = require('../middlewares/rateLimiter');
const { validate, quizSchema, updateQuizSchema } = require('../utils/validation');

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', getAllQuizzes);
// IMPORTANT: Register /stats BEFORE /:quizId to avoid shadowing
router.get('/stats', authorize('teacher', 'admin'), getAllStats);

// Teacher and Admin routes
router.post('/', authorize('teacher', 'admin'), quizLimiter, validate(quizSchema), createQuiz);
router.post('/:quizId/clone', authorize('teacher', 'admin'), cloneQuiz);
router.get('/:quizId', getQuizById);
router.put('/:quizId', authorize('teacher', 'admin'), validate(updateQuizSchema), updateQuiz);
router.delete('/:quizId', authorize('teacher', 'admin'), deleteQuiz);
router.get('/:quizId/stats', authorize('teacher', 'admin'), getQuizStats);

module.exports = router;
