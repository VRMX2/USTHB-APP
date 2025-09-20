const validator = require('validator');

// Email validation
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

// Password validation (min 8 chars, at least 1 uppercase, 1 lowercase, 1 number)
const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Phone number validation (Algerian format)
const isValidPhone = (phone) => {
  const algerianPhoneRegex = /^(\+213|0)(5|6|7)[0-9]{8}$/;
  return algerianPhoneRegex.test(phone);
};

// Student ID validation (USTHB format: year + department + number)
const isValidStudentId = (studentId) => {
  const studentIdRegex = /^[0-9]{2}[A-Z]{2,3}[0-9]{4}$/;
  return studentIdRegex.test(studentId);
};

// Name validation (letters and spaces only)
const isValidName = (name) => {
  const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,50}$/;
  return nameRegex.test(name);
};

// Course code validation (USTHB format: department + level + number)
const isValidCourseCode = (courseCode) => {
  const courseCodeRegex = /^[A-Z]{2,4}[0-9]{3}$/;
  return courseCodeRegex.test(courseCode);
};

// Grade validation (0-20 scale used in Algeria)
const isValidGrade = (grade) => {
  return !isNaN(grade) && grade >= 0 && grade <= 20;
};

// File validation
const isValidFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

const isValidFileSize = (size, maxSizeInMB) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return size <= maxSizeInBytes;
};

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

// Validate user registration data
const validateUserRegistration = (userData) => {
  const errors = [];

  if (!userData.firstName || !isValidName(userData.firstName)) {
    errors.push('First name must contain only letters and be 2-50 characters long');
  }

  if (!userData.lastName || !isValidName(userData.lastName)) {
    errors.push('Last name must contain only letters and be 2-50 characters long');
  }

  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!userData.password || !isValidPassword(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  if (userData.phone && !isValidPhone(userData.phone)) {
    errors.push('Please provide a valid Algerian phone number');
  }

  if (userData.role === 'student' && (!userData.studentId || !isValidStudentId(userData.studentId))) {
    errors.push('Student ID must follow USTHB format (e.g., 22INF1234)');
  }

  if (!['student', 'teacher', 'admin'].includes(userData.role)) {
    errors.push('Invalid role specified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate course data
const validateCourseData = (courseData) => {
  const errors = [];

  if (!courseData.name || courseData.name.trim().length < 3) {
    errors.push('Course name must be at least 3 characters long');
  }

  if (!courseData.code || !isValidCourseCode(courseData.code)) {
    errors.push('Course code must follow USTHB format (e.g., INF301)');
  }

  if (!courseData.credits || courseData.credits < 1 || courseData.credits > 10) {
    errors.push('Credits must be between 1 and 10');
  }

  if (!courseData.department || courseData.department.trim().length < 2) {
    errors.push('Department must be specified');
  }

  if (!courseData.semester || !['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(courseData.semester)) {
    errors.push('Semester must be S1, S2, S3, S4, S5, or S6');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate grade data
const validateGradeData = (gradeData) => {
  const errors = [];

  if (!gradeData.value || !isValidGrade(gradeData.value)) {
    errors.push('Grade must be between 0 and 20');
  }

  if (!gradeData.type || !['exam', 'quiz', 'assignment', 'project'].includes(gradeData.type)) {
    errors.push('Grade type must be exam, quiz, assignment, or project');
  }

  if (!gradeData.courseId || !validator.isMongoId(gradeData.courseId)) {
    errors.push('Invalid course ID');
  }

  if (!gradeData.studentId || !validator.isMongoId(gradeData.studentId)) {
    errors.push('Invalid student ID');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate announcement data
const validateAnnouncementData = (announcementData) => {
  const errors = [];

  if (!announcementData.title || announcementData.title.trim().length < 5) {
    errors.push('Announcement title must be at least 5 characters long');
  }

  if (!announcementData.content || announcementData.content.trim().length < 10) {
    errors.push('Announcement content must be at least 10 characters long');
  }

  if (!['general', 'course', 'exam', 'event'].includes(announcementData.type)) {
    errors.push('Announcement type must be general, course, exam, or event');
  }

  if (!['low', 'medium', 'high', 'urgent'].includes(announcementData.priority)) {
    errors.push('Priority must be low, medium, high, or urgent');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate message data
const validateMessageData = (messageData) => {
  const errors = [];

  if (!messageData.content || messageData.content.trim().length < 1) {
    errors.push('Message content cannot be empty');
  }

  if (messageData.content.length > 1000) {
    errors.push('Message content cannot exceed 1000 characters');
  }

  if (!messageData.senderId || !validator.isMongoId(messageData.senderId)) {
    errors.push('Invalid sender ID');
  }

  if (messageData.receiverId && !validator.isMongoId(messageData.receiverId)) {
    errors.push('Invalid receiver ID');
  }

  if (messageData.courseId && !validator.isMongoId(messageData.courseId)) {
    errors.push('Invalid course ID');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generic MongoDB ID validation
const isValidMongoId = (id) => {
  return validator.isMongoId(id);
};

// Date validation helpers
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

const isFutureDate = (dateString) => {
  const date = new Date(dateString);
  return date > new Date();
};

const isPastDate = (dateString) => {
  const date = new Date(dateString);
  return date < new Date();
};

// Pagination validation
const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  
  return {
    page: Math.max(1, pageNum),
    limit: Math.min(Math.max(1, limitNum), 100) // Max 100 items per page
  };
};

// AI prompt validation
const validateAIPrompt = (prompt) => {
  const errors = [];

  if (!prompt || typeof prompt !== 'string') {
    errors.push('Prompt must be a string');
  }

  if (prompt.trim().length < 5) {
    errors.push('Prompt must be at least 5 characters long');
  }

  if (prompt.length > 2000) {
    errors.push('Prompt cannot exceed 2000 characters');
  }

  // Check for potentially harmful content
  const harmfulPatterns = [
    /hack|exploit|vulnerability/i,
    /illegal|fraud|scam/i,
    /violence|harm|hurt/i
  ];

  if (harmfulPatterns.some(pattern => pattern.test(prompt))) {
    errors.push('Prompt contains potentially harmful content');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  // Basic validation functions
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidStudentId,
  isValidName,
  isValidCourseCode,
  isValidGrade,
  isValidFileType,
  isValidFileSize,
  isValidMongoId,
  isValidDate,
  isFutureDate,
  isPastDate,
  
  // Sanitization
  sanitizeInput,
  
  // Complex validation functions
  validateUserRegistration,
  validateCourseData,
  validateGradeData,
  validateAnnouncementData,
  validateMessageData,
  validatePagination,
  validateAIPrompt
};