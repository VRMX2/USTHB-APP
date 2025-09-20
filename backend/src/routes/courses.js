const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

// Import middleware
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Import controllers
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  unenrollFromCourse,
  getMyCourses,
  getCourseStats
} = require('../controllers/courseController');

// Validation rules
const createCourseValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Course name must be between 2 and 100 characters'),
  
  body('code')
    .trim()
    .isLength({ min: 3, max: 10 })
    .isAlphanumeric()
    .withMessage('Course code must be 3-10 alphanumeric characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('semester')
    .isIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
    .withMessage('Semester must be S1, S2, S3, S4, S5, or S6'),
  
  body('credits')
    .isInt({ min: 1, max: 10 })
    .withMessage('Credits must be between 1 and 10'),
  
  body('schedule')
    .optional()
    .isArray()
    .withMessage('Schedule must be an array'),
  
  body('maxStudents')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Max students must be between 1 and 200')
];

const updateCourseValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Course name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('semester')
    .optional()
    .isIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
    .withMessage('Semester must be S1, S2, S3, S4, S5, or S6'),
  
  body('credits')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Credits must be between 1 and 10'),
  
  body('maxStudents')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Max students must be between 1 and 200'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const courseIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid course ID')
];

// @route   GET /api/courses
// @desc    Get all courses with filtering and pagination
// @access  Private
router.get('/', auth, getAllCourses);

// @route   GET /api/courses/my-courses
// @desc    Get current user's enrolled/teaching courses
// @access  Private
router.get('/my-courses', auth, getMyCourses);

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Private
router.get('/:id', auth, courseIdValidation, getCourseById);

// @route   POST /api/courses
// @desc    Create new course
// @access  Private (Teacher/Admin only)
router.post('/', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  createCourseValidation, 
  createCourse
);

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Course teacher/Admin only)
router.put('/:id', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  courseIdValidation,
  updateCourseValidation, 
  updateCourse
);

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/:id', 
  auth, 
  roleCheck(['admin']), 
  courseIdValidation,
  deleteCourse
);

// @route   POST /api/courses/:id/enroll
// @desc    Enroll student in course
// @access  Private (Students only)
router.post('/:id/enroll', 
  auth, 
  roleCheck(['student']), 
  courseIdValidation,
  enrollInCourse
);

// @route   POST /api/courses/:id/unenroll
// @desc    Unenroll student from course
// @access  Private (Students only)
router.post('/:id/unenroll', 
  auth, 
  roleCheck(['student']), 
  courseIdValidation,
  unenrollFromCourse
);

// @route   GET /api/courses/:id/stats
// @desc    Get course statistics
// @access  Private (Course teacher/Admin only)
router.get('/:id/stats', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  courseIdValidation,
  getCourseStats
);

module.exports = router;