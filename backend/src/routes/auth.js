const express = require('express');
const router = express.Router();

const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const { validate, registerSchema, loginSchema, updateUserSchema } = require('../utils/validation');

// Public routes
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateUserSchema), updateProfile);

module.exports = router;

