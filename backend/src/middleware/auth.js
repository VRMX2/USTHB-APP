const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../config/jwt');

// Main authentication middleware
const auth = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookies (if using cookie auth)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Get user from the token (without password)
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user not found'
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts'
        });
      }

      // Update last seen
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      // Add user to request object
      req.user = user;
      next();

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive && !user.isLocked) {
          req.user = user;
        }
      } catch (error) {
        // Continue without user if token is invalid
        console.warn('Optional auth - invalid token:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

// Middleware to check if user is authenticated (for routes that require login)
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to access this route'
    });
  }
  next();
};

// Check if user owns resource or has permission
const authorize = (...allowedFields) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to access this route'
      });
    }

    let hasPermission = false;

    // Check if user role is in allowed roles
    if (allowedFields.includes(req.user.role)) {
      hasPermission = true;
    }

    // Check for admin privilege
    if (req.user.role === 'admin') {
      hasPermission = true;
    }

    // Check for resource ownership (if resource ID is provided)
    if (req.params.id && req.resource) {
      // For resources with owner/creator field
      const ownerFields = ['owner', 'creator', 'uploadedBy', 'author', 'instructor'];
      for (const field of ownerFields) {
        if (req.resource[field] && req.resource[field].toString() === req.user._id.toString()) {
          hasPermission = true;
          break;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Rate limiting middleware for authentication routes
const authRateLimit = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `auth_limit_${ip}`;
    
    // This would typically use Redis for production
    // For now, we'll use a simple in-memory store
    if (!global.authLimits) {
      global.authLimits = new Map();
    }
    
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10;
    
    let attempts = global.authLimits.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > attempts.resetTime) {
      attempts = { count: 0, resetTime: now + windowMs };
    }
    
    attempts.count++;
    global.authLimits.set(key, attempts);
    
    if (attempts.count > maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
      });
    }
    
    next();
  } catch (error) {
    console.error('Auth rate limit error:', error);
    next(); // Continue if rate limiting fails
  }
};

// Middleware to check email verification
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to access this route'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this feature'
    });
  }

  next();
};

// Middleware to check if user is enrolled in a course
const requireCourseEnrollment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Admin and teachers have access to all courses
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      return next();
    }

    // Check if student is enrolled in the course
    if (req.user.role === 'student') {
      const isEnrolled = req.user.enrolledCourses.some(
        enrollment => enrollment.course.toString() === courseId.toString() && 
                     enrollment.status === 'active'
      );

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this course'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Course enrollment check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking course enrollment'
    });
  }
};

// Middleware to check if user is instructor of a course
const requireCourseInstructor = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Admin has access to all courses
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is instructor of the course
    if (req.user.role === 'teacher') {
      const isInstructor = req.user.teachingCourses.includes(courseId);

      if (!isInstructor) {
        return res.status(403).json({
          success: false,
          message: 'You are not the instructor of this course'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only course instructors can perform this action'
      });
    }

    next();
  } catch (error) {
    console.error('Course instructor check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking course instructor'
    });
  }
};

// Middleware to validate user role transitions
const validateRoleTransition = (req, res, next) => {
  const { role } = req.body;
  const currentRole = req.user.role;

  // Define allowed role transitions
  const allowedTransitions = {
    student: ['teacher'], // Student can become teacher (with approval)
    teacher: [], // Teachers cannot change roles themselves
    admin: ['student', 'teacher', 'admin'] // Admin can change to any role
  };

  // Only admins can change other users' roles
  if (req.params.id && req.params.id !== req.user._id.toString()) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can change other users\' roles'
      });
    }
  }

  // Check if role transition is allowed
  if (role && role !== currentRole) {
    if (!allowedTransitions[currentRole]?.includes(role) && currentRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: `Role transition from ${currentRole} to ${role} is not allowed`
      });
    }
  }

  next();
};

module.exports = {
  auth,
  optionalAuth,
  requireAuth,
  authorize,
  authRateLimit,
  requireEmailVerification,
  requireCourseEnrollment,
  requireCourseInstructor,
  validateRoleTransition
};