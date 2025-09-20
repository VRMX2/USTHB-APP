const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

// Import middleware
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Import controllers
const {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementsByPriority,
  getRecentAnnouncements,
  searchAnnouncements
} = require('../controllers/announcementController');

// Validation rules
const createAnnouncementValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  
  body('type')
    .optional()
    .isIn(['general', 'academic', 'event', 'urgent', 'course'])
    .withMessage('Type must be general, academic, event, urgent, or course'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('course')
    .optional()
    .isMongoId()
    .withMessage('Invalid course ID'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be a valid date'),
  
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

const updateAnnouncementValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  
  body('type')
    .optional()
    .isIn(['general', 'academic', 'event', 'urgent', 'course'])
    .withMessage('Type must be general, academic, event, urgent, or course'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('course')
    .optional()
    .isMongoId()
    .withMessage('Invalid course ID'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be a valid date'),
  
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const announcementIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid announcement ID')
];

const priorityValidation = [
  param('priority')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical')
];

// @route   GET /api/announcements
// @desc    Get all announcements with filtering and pagination
// @access  Private
router.get('/', auth, getAllAnnouncements);

// @route   GET /api/announcements/recent
// @desc    Get recent announcements
// @access  Private
router.get('/recent', auth, getRecentAnnouncements);

// @route   GET /api/announcements/search
// @desc    Search announcements
// @access  Private
router.get('/search', auth, searchAnnouncements);

// @route   GET /api/announcements/priority/:priority
// @desc    Get announcements by priority
// @access  Private
router.get('/priority/:priority', 
  auth, 
  priorityValidation, 
  getAnnouncementsByPriority
);

// @route   GET /api/announcements/:id
// @desc    Get single announcement by ID
// @access  Private
router.get('/:id', 
  auth, 
  announcementIdValidation, 
  getAnnouncementById
);

// @route   POST /api/announcements
// @desc    Create new announcement
// @access  Private (Teacher/Admin only)
router.post('/', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  createAnnouncementValidation, 
  createAnnouncement
);

// @route   PUT /api/announcements/:id
// @desc    Update announcement
// @access  Private (Creator/Admin only)
router.put('/:id', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  announcementIdValidation,
  updateAnnouncementValidation, 
  updateAnnouncement
);

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement
// @access  Private (Creator/Admin only)
router.delete('/:id', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  announcementIdValidation,
  deleteAnnouncement
);

module.exports = router;