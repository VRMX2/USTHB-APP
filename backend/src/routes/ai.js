const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

// Import middleware
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Import controllers
const {
  askAI,
  generateStudyPlan,
  summarizeContent,
  generateFlashcards,
  getPerformanceInsights,
  generateQuiz,
  smartSearch,
  getCourseRecommendations,
  analyzeChatDiscussion,
  getAIUsageStats
} = require('../controllers/aiController');

// Validation rules
const askAIValidation = [
  body('question')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Question must be between 5 and 1000 characters'),
  
  body('context')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Context must not exceed 2000 characters'),
  
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid course ID')
];

const studyPlanValidation = [
  body('examDates')
    .optional()
    .isObject()
    .withMessage('Exam dates must be an object'),
  
  body('studyHoursPerDay')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Study hours per day must be between 1 and 12'),
  
  body('preferences')
    .optional()
    .isIn(['intensive', 'balanced', 'light'])
    .withMessage('Preferences must be intensive, balanced, or light'),
  
  body('weakSubjects')
    .optional()
    .isArray()
    .withMessage('Weak subjects must be an array')
];

const summarizeValidation = [
  body('content')
    .trim()
    .isLength({ min: 100, max: 10000 })
    .withMessage('Content must be between 100 and 10000 characters'),
  
  body('type')
    .optional()
    .isIn(['lecture', 'article', 'book', 'general'])
    .withMessage('Type must be lecture, article, book, or general'),
  
  body('length')
    .optional()
    .isIn(['short', 'medium', 'long'])
    .withMessage('Length must be short, medium, or long')
];

const flashcardsValidation = [
  body('content')
    .trim()
    .isLength({ min: 100, max: 8000 })
    .withMessage('Content must be between 100 and 8000 characters'),
  
  body('count')
    .optional()
    .isInt({ min: 5, max: 30 })
    .withMessage('Count must be between 5 and 30'),
  
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject must be between 2 and 100 characters')
];

const quizValidation = [
  body('content')
    .trim()
    .isLength({ min: 100, max: 8000 })
    .withMessage('Content must be between 100 and 8000 characters'),
  
  body('questionCount')
    .optional()
    .isInt({ min: 5, max: 50 })
    .withMessage('Question count must be between 5 and 50'),
  
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  
  body('questionTypes')
    .optional()
    .isArray()
    .withMessage('Question types must be an array')
];

const smartSearchValidation = [
  body('query')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Query must be between 3 and 500 characters'),
  
  body('searchIn')
    .optional()
    .isArray()
    .withMessage('Search in must be an array'),
  
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid course ID')
];

const analyzeChatValidation = [
  body('courseId')
    .isMongoId()
    .withMessage('Invalid course ID'),
  
  body('messageCount')
    .optional()
    .isInt({ min: 10, max: 200 })
    .withMessage('Message count must be between 10 and 200')
];

// @route   POST /api/ai/ask
// @desc    Ask AI assistant a question
// @access  Private
router.post('/ask', 
  auth, 
  askAIValidation, 
  askAI
);

// @route   POST /api/ai/study-plan
// @desc    Generate personalized study plan
// @access  Private (Students only)
router.post('/study-plan', 
  auth, 
  roleCheck(['student']), 
  studyPlanValidation, 
  generateStudyPlan
);

// @route   POST /api/ai/summarize
// @desc    Summarize content using AI
// @access  Private
router.post('/summarize', 
  auth, 
  summarizeValidation, 
  summarizeContent
);

// @route   POST /api/ai/flashcards
// @desc    Generate flashcards from content
// @access  Private
router.post('/flashcards', 
  auth, 
  flashcardsValidation, 
  generateFlashcards
);

// @route   GET /api/ai/performance-insights
// @desc    Get AI-powered performance insights
// @access  Private (Students only)
router.get('/performance-insights', 
  auth, 
  roleCheck(['student']), 
  getPerformanceInsights
);

// @route   POST /api/ai/quiz
// @desc    Generate quiz questions from content
// @access  Private
router.post('/quiz', 
  auth, 
  quizValidation, 
  generateQuiz
);

// @route   POST /api/ai/smart-search
// @desc    Perform AI-powered smart search
// @access  Private
router.post('/smart-search', 
  auth, 
  smartSearchValidation, 
  smartSearch
);

// @route   GET /api/ai/course-recommendations
// @desc    Get AI-powered course recommendations
// @access  Private (Students only)
router.get('/course-recommendations', 
  auth, 
  roleCheck(['student']), 
  getCourseRecommendations
);

// @route   POST /api/ai/analyze-chat
// @desc    Analyze course chat discussion for insights
// @access  Private (Teachers/Admin only)
router.post('/analyze-chat', 
  auth, 
  roleCheck(['teacher', 'admin']), 
  analyzeChatValidation, 
  analyzeChatDiscussion
);

// @route   GET /api/ai/usage-stats
// @desc    Get AI usage statistics
// @access  Private
router.get('/usage-stats', 
  auth, 
  getAIUsageStats
);

module.exports = router;