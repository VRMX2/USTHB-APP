const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

// Import middleware
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Import controllers
const {
  getStudentGrades,
  getCourseGrades,
  addOrUpdateGrade,
  deleteGrade,
  getMyGrades,
  getGradeAnalytics,
  exportGrades
} = require('../controllers/gradeController');

// Validation rules
const addGradeValidation = [
  body('student')
    .isMongoId()
    .withMessage('Invalid student ID'),
  
  body('course')
    .isMongoId()
    .withMessage('Invalid course ID'),
  
  body('examGrade')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Exam grade must be between 0 and 20'),
  
  body('homeworkGrade')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Homework grade must be between 0 and 20'),
  
  body('projectGrade')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Project grade must be between 0 and 20'),
  
  body('participationGrade')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Participation grade must be between 0 and 20'),
  
  body('finalGrade')
    .isFloat({ min: 0, max: 20 })
    .withMessage('Final grade must be between 0 and 20'),
  
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters'),
  
  body('semester')
    .optional()
    .isIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
    .withMessage('Semester must be S1, S2, S3, S4, S5, or S6'),
  
  body('academicYear')
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Academic year must be between 2020 and 2030')
];

const studentIdValidation = [
  param('studentId')
    .isMongoId()
    .withMessage('Invalid student ID')
];

const courseIdValidation = [
  param('courseId')
    .isMongoId()
    .withMessage('Invalid course ID')
];

const gradeIdValidation = [
  param('gradeId')
    .isMongoId()
    .withMessage('Invalid grade ID')
];

// @route   GET /api/grades/my-grades
// @desc    Get current student's grades
// @access  Private (Students only)
router.get('/my-grades', 
  auth, 
  roleCheck(['student']), 
  getMyGrades
);

// @route   GET /api/grades/analytics
// @desc    Get grade analytics for admin
// @access  Private (Admin only)
router.get('/analytics', 
  auth, 
  roleCheck(['admin']), 
  getGradeAnalytics
);

// @route   GET /api/grades/student/:studentId
// @desc    Get grades for a specific student
// @access  Private (Student can view own, Teachers/Admin can view all)
router.get('/student/:studentId', 
  auth, 
  studentIdValidation, 
  getStudentGrades
);

// @route   GET /api/grades/course/:courseId
// @desc    Get grades for a specific course
// @access  Private (Teacher/Admin only)
router.get('/course/:courseId', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  courseIdValidation, 
  getCourseGrades
);

// @route   GET /api/grades/export/:courseId
// @desc    Export grades for a course to CSV
// @access  Private (Teacher/Admin only)
router.get('/export/:courseId', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  courseIdValidation, 
  exportGrades
);

// @route   POST /api/grades
// @desc    Add or update grade
// @access  Private (Teacher/Admin only)
router.post('/', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  addGradeValidation, 
  addOrUpdateGrade
);

// @route   DELETE /api/grades/:gradeId
// @desc    Delete grade
// @access  Private (Teacher/Admin only)
router.delete('/:gradeId', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  gradeIdValidation, 
  deleteGrade
);

module.exports = router;