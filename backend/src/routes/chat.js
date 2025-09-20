const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

// Import middleware
const auth = require('../middleware/auth');

// Import controllers
const {
  getCourseMessages,
  sendCourseMessage,
  getPrivateMessages,
  sendPrivateMessage,
  getUserConversations,
  markMessagesAsRead,
  deleteMessage,
  searchMessages,
  getUnreadCount
} = require('../controllers/chatController');

// Validation rules
const sendMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),
  
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply message ID'),
  
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

const courseIdValidation = [
  param('courseId')
    .isMongoId()
    .withMessage('Invalid course ID')
];

const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
];

const messageIdValidation = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID')
];

// @route   GET /api/chat/conversations
// @desc    Get user's conversations list
// @access  Private
router.get('/conversations', auth, getUserConversations);

// @route   GET /api/chat/unread-count
// @desc    Get unread messages count
// @access  Private
router.get('/unread-count', auth, getUnreadCount);

// @route   GET /api/chat/search
// @desc    Search messages
// @access  Private
router.get('/search', auth, searchMessages);

// @route   GET /api/chat/course/:courseId
// @desc    Get messages for a specific course
// @access  Private
router.get('/course/:courseId', 
  auth, 
  courseIdValidation, 
  getCourseMessages
);

// @route   POST /api/chat/course/:courseId
// @desc    Send message to course
// @access  Private
router.post('/course/:courseId', 
  auth, 
  courseIdValidation,
  sendMessageValidation, 
  sendCourseMessage
);

// @route   GET /api/chat/private/:userId
// @desc    Get private messages with specific user
// @access  Private
router.get('/private/:userId', 
  auth, 
  userIdValidation, 
  getPrivateMessages
);

// @route   POST /api/chat/private/:userId
// @desc    Send private message to user
// @access  Private
router.post('/private/:userId', 
  auth, 
  userIdValidation,
  sendMessageValidation, 
  sendPrivateMessage
);

// @route   PUT /api/chat/mark-read/:userId
// @desc    Mark messages as read from specific user
// @access  Private
router.put('/mark-read/:userId', 
  auth, 
  userIdValidation, 
  markMessagesAsRead
);

// @route   DELETE /api/chat/message/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/message/:messageId', 
  auth, 
  messageIdValidation, 
  deleteMessage
);

module.exports = router;