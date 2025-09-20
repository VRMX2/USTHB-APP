// Role-based access control middleware

// Check if user has specific role
const hasRole = (...roles) => {
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
        message: `Access denied. Required role(s): ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }

  next();
};

// Check if user is teacher
const isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher privileges required.'
    });
  }

  next();
};

// Check if user is student
const isStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student privileges required.'
    });
  }

  next();
};

// Check if user is teacher or admin
const isTeacherOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher or Administrator privileges required.'
    });
  }

  next();
};

// Check if user is student or teacher (not admin-only)
const isStudentOrTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['student', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student or Teacher privileges required.'
    });
  }

  next();
};

// Advanced permission checker
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Define role-based permissions
    const rolePermissions = {
      admin: [
        // User management
        'users:read', 'users:create', 'users:update', 'users:delete',
        // Course management
        'courses:read', 'courses:create', 'courses:update', 'courses:delete',
        // Announcement management
        'announcements:read', 'announcements:create', 'announcements:update', 'announcements:delete',
        // Grade management
        'grades:read', 'grades:create', 'grades:update', 'grades:delete',
        // Resource management
        'resources:read', 'resources:create', 'resources:update', 'resources:delete',
        // Chat management
        'chat:read', 'chat:create', 'chat:update', 'chat:delete', 'chat:moderate',
        // AI features
        'ai:use', 'ai:admin',
        // Analytics
        'analytics:read', 'analytics:export',
        // System settings
        'system:configure', 'system:backup', 'system:restore'
      ],
      teacher: [
        // Limited user management (own courses)
        'users:read_course',
        // Course management (own courses)
        'courses:read', 'courses:create', 'courses:update_own',
        // Announcement management (own courses)
        'announcements:read', 'announcements:create_course', 'announcements:update_own',
        // Grade management (own courses)
        'grades:read_course', 'grades:create_course', 'grades:update_course',
        // Resource management (own courses)
        'resources:read', 'resources:create_course', 'resources:update_own',
        // Chat management (own courses)
        'chat:read_course', 'chat:create_course', 'chat:moderate_course',
        // AI features
        'ai:use',
        // Limited analytics (own courses)
        'analytics:read_course'
      ],
      student: [
        // Basic read permissions
        'courses:read_enrolled', 'announcements:read_targeted', 
        'grades:read_own', 'resources:read_allowed',
        // Chat participation
        'chat:read_enrolled', 'chat:participate',
        // AI features
        'ai:use',
        // Profile management
        'profile:update_own'
      ]
    };

    const userPermissions = rolePermissions[req.user.role] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

// Check resource ownership
const isOwnerOrAdmin = (resourceField = 'user') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admins have access to everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get resource from previous middleware or fetch it
      let resource = req.resource;
      
      if (!resource && req.params.id) {
        // This assumes the resource was loaded in a previous middleware
        // You would implement specific logic here for each resource type
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check ownership
      const ownerId = resource[resourceField];
      if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

// Check department access
const hasDepartmentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin has access to all departments
  if (req.user.role === 'admin') {
    return next();
  }

  const targetDepartment = req.params.department || req.body.department;
  
  if (targetDepartment && req.user.department !== targetDepartment) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access resources from your department.'
    });
  }

  next();
};

// Dynamic role checker based on context
const contextualRoleCheck = (context) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    let hasAccess = false;

    switch (context) {
      case 'course_management':
        // Teachers can manage their courses, admins can manage all
        hasAccess = req.user.role === 'admin' || 
                   (req.user.role === 'teacher' && req.userOwnsResource);
        break;

      case 'grade_input':
        // Only teachers of the course and admins can input grades
        hasAccess = req.user.role === 'admin' || 
                   (req.user.role === 'teacher' && req.userTeachesCourse);
        break;

      case 'student_records':
        // Students can view their own, teachers can view their students', admins all
        hasAccess = req.user.role === 'admin' || 
                   (req.user.role === 'teacher' && req.isStudentInCourse) ||
                   (req.user.role === 'student' && req.isOwnRecord);
        break;

      case 'announcement_creation':
        // Teachers and admins can create announcements
        hasAccess = ['teacher', 'admin'].includes(req.user.role);
        break;

      default:
        hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied for context: ${context}`
      });
    }

    next();
  };
};

// Rate limiting based on role
const roleBasedRateLimit = (req, res, next) => {
  const limits = {
    admin: { requests: 1000, window: 3600000 }, // 1000 requests per hour
    teacher: { requests: 500, window: 3600000 }, // 500 requests per hour
    student: { requests: 200, window: 3600000 }  // 200 requests per hour
  };

  const userLimit = limits[req.user?.role] || limits.student;
  
  // Implementation would depend on your rate limiting strategy
  // This is a placeholder for the actual rate limiting logic
  req.rateLimit = userLimit;
  next();
};

// Validate role hierarchy (prevent privilege escalation)
const validateRoleHierarchy = (req, res, next) => {
  const hierarchy = {
    admin: 3,
    teacher: 2,
    student: 1
  };

  const currentUserLevel = hierarchy[req.user.role] || 0;
  const targetRole = req.body.role;
  const targetUserLevel = hierarchy[targetRole] || 0;

  // Users can only assign roles of equal or lower level
  if (targetUserLevel > currentUserLevel) {
    return res.status(403).json({
      success: false,
      message: 'Cannot assign a role with higher privileges than your own'
    });
  }

  next();
};

module.exports = {
  hasRole,
  isAdmin,
  isTeacher,
  isStudent,
  isTeacherOrAdmin,
  isStudentOrTeacher,
  hasPermission,
  isOwnerOrAdmin,
  hasDepartmentAccess,
  contextualRoleCheck,
  roleBasedRateLimit,
  validateRoleHierarchy
};