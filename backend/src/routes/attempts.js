const express = require('express');
const router = express.Router();

const {
  startQuiz,
  submitAnswer,
  completeQuiz,
  getUserAttempts,
  getQuizAttempts,
  getAttemptDetails,
  getStudentAttempts,
  getAttemptsStats,
  getOwnAttemptDetails,
  logCheatingAttempt
} = require('../controllers/quizAttemptController');

const { authenticate, authorize } = require('../middlewares/auth');
const { quizLimiter } = require('../middlewares/rateLimiter');
const { validate, startQuizSchema, submitAnswerSchema } = require('../utils/validation');

// All routes require authentication
router.use(authenticate);

// Student routes
router.post('/start', quizLimiter, validate(startQuizSchema), startQuiz);
router.post('/:attemptId/answer', quizLimiter, validate(submitAnswerSchema), submitAnswer);
router.post('/:attemptId/complete', quizLimiter, completeQuiz);
router.post('/:attemptId/cheat-log', logCheatingAttempt);
router.get('/my-attempts', getUserAttempts);
router.get('/:attemptId/my-details', getOwnAttemptDetails);

// Teacher and Admin routes
router.get('/quiz/:quizId', authorize('teacher', 'admin'), getQuizAttempts);
router.get('/:attemptId/details', authorize('teacher', 'admin'), getAttemptDetails);
router.get('/student/:studentId', authorize('teacher', 'admin'), getStudentAttempts);
router.get('/stats', authorize('teacher', 'admin'), getAttemptsStats);

module.exports = router;
