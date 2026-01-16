const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const cacheService = require('../utils/cache');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyAccessToken(token);
      
      // Try to get user from cache first
      let user = await cacheService.get(cacheService.keys.user(decoded.userId));
      
      if (!user) {
        // If not in cache, get from database
        user = await User.findById(decoded.userId).select('-password -refreshToken');
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        // Cache user data for 15 minutes
        await cacheService.set(cacheService.keys.user(decoded.userId), user, 900);
      }

      // Check if user is approved (except for admin)
      if (user.role !== 'admin' && !user.isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Account not approved yet'
        });
      }

      req.user = user;
      next();
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      
      if (user && user.isApproved) {
        req.user = user;
      }
    } catch (tokenError) {
      // Ignore token errors in optional auth
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};

