const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const cacheService = require('../utils/cache');
const socketService = require('../services/socketService');

// Register new user
const register = async (req, res) => {
  try {
    const { name, phone, age, fatherPhone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Create new user
    const user = new User({
      name,
      phone,
      age,
      fatherPhone,
      password,
      role: 'student'
    });

    await user.save();

    // Emit socket event for new student registration
    if (user.role === 'student') {
      socketService.notifyRole('teacher', 'user_registered', {
        user: user.toJSON()
      });
      socketService.notifyRole('admin', 'user_registered', {
        user: user.toJSON()
      });
    }

    // Remove password from response
    const userResponse = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for approval.',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is approved (except admin)
    if (user.role !== 'admin' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Account not approved yet'
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      phone: user.phone,
      role: user.role
    };

    const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Cache user data
    const userResponse = user.toJSON();
    await cacheService.set(cacheService.keys.user(user._id), userResponse, 900);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Refresh access token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const tokenPayload = {
      userId: user._id,
      phone: user.phone,
      role: user.role
    };

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(tokenPayload);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    user.lastSeen = new Date();
    await user.save();

    // Update cache
    const userResponse = user.toJSON();
    await cacheService.set(cacheService.keys.user(user._id), userResponse, 900);

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();

      // Clear cache
      await cacheService.del(cacheService.keys.user(user._id));
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, age, fatherPhone } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (age) user.age = age;
    if (fatherPhone) user.fatherPhone = fatherPhone;

    await user.save();

    // Update cache
    const userResponse = user.toJSON();
    await cacheService.set(cacheService.keys.user(user._id), userResponse, 900);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile
};
