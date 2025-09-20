const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAllAnnouncements = async (req, res) => {
  try {
    const { type, department, course, priority } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const user = await User.findById(req.user.userId);
    
    // Build filter query
    let filter = {};
    
    // Filter by type
    if (type) {
      filter.type = type;
    }
    
    // Filter by department
    if (department) {
      filter.department = department;
    } else if (user.department && user.role === 'student') {
      // Students see announcements for their department
      filter.$or = [
        { department: user.department },
        { department: null }, // General announcements
        { type: 'general' }
      ];
    }
    
    // Filter by course
    if (course) {
      filter.course = course;
    } else if (user.role === 'student' && user.enrolledCourses.length > 0) {
      // Students also see announcements for their enrolled courses
      filter.$or = [
        ...(filter.$or || []),
        { course: { $in: user.enrolledCourses } }
      ];
    }
    
    // Filter by priority
    if (priority) {
      filter.priority = priority;
    }

    // Only show active announcements
    filter.isActive = true;

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'firstName lastName role department')
      .populate('course', 'name code')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalAnnouncements = await Announcement.countDocuments(filter);

    res.json({
      message: 'Announcements retrieved successfully',
      announcements,
      currentPage: page,
      totalPages: Math.ceil(totalAnnouncements / limit),
      totalAnnouncements
    });

  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ 
      message: 'Server error getting announcements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Private
const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'firstName lastName role department profilePicture')
      .populate('course', 'name code department');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user has access to this announcement
    const user = await User.findById(req.user.userId);
    const hasAccess = 
      announcement.type === 'general' ||
      announcement.department === user.department ||
      announcement.department === null ||
      (announcement.course && user.enrolledCourses.includes(announcement.course._id)) ||
      user.role === 'admin' ||
      announcement.createdBy._id.toString() === req.user.userId;

    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Not authorized to view this announcement' 
      });
    }

    res.json({
      message: 'Announcement retrieved successfully',
      announcement
    });

  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ 
      message: 'Server error getting announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private (Teacher/Admin only)
const createAnnouncement = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const {
      title,
      content,
      type,
      department,
      course,
      priority,
      expiresAt,
      attachments
    } = req.body;

    // Validate course access if specified
    if (course) {
      const courseDoc = await Course.findById(course);
      if (!courseDoc) {
        return res.status(400).json({ message: 'Course not found' });
      }

      const user = await User.findById(req.user.userId);
      if (user.role !== 'admin' && courseDoc.teacher.toString() !== req.user.userId) {
        return res.status(403).json({ 
          message: 'Not authorized to create announcements for this course' 
        });
      }
    }

    const announcement = new Announcement({
      title,
      content,
      type: type || 'general',
      department,
      course: course || null,
      priority: priority || 'medium',
      createdBy: req.user.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      attachments: attachments || []
    });

    await announcement.save();
    
    await announcement.populate([
      { path: 'createdBy', select: 'firstName lastName role department' },
      { path: 'course', select: 'name code' }
    ]);

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement
    });

  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ 
      message: 'Server error creating announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Creator/Admin only)
const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user is the creator or admin
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin' && announcement.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to update this announcement' 
      });
    }

    const {
      title,
      content,
      type,
      department,
      course,
      priority,
      expiresAt,
      attachments,
      isActive
    } = req.body;

    // Update fields if provided
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (type) announcement.type = type;
    if (department !== undefined) announcement.department = department;
    if (course !== undefined) announcement.course = course;
    if (priority) announcement.priority = priority;
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (attachments) announcement.attachments = attachments;
    if (typeof isActive === 'boolean') announcement.isActive = isActive;

    announcement.updatedAt = new Date();
    await announcement.save();

    await announcement.populate([
      { path: 'createdBy', select: 'firstName lastName role department' },
      { path: 'course', select: 'name code' }
    ]);

    res.json({
      message: 'Announcement updated successfully',
      announcement
    });

  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ 
      message: 'Server error updating announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Creator/Admin only)
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user is the creator or admin
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin' && announcement.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this announcement' 
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ 
      message: 'Server error deleting announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get announcements by priority
// @route   GET /api/announcements/priority/:priority
// @access  Private
const getAnnouncementsByPriority = async (req, res) => {
  try {
    const { priority } = req.params;
    const user = await User.findById(req.user.userId);

    // Build filter for user's relevant announcements
    let filter = {
      priority,
      isActive: true,
      $or: [
        { type: 'general' },
        { department: user.department },
        { department: null }
      ]
    };

    // Add course filter for students
    if (user.role === 'student' && user.enrolledCourses.length > 0) {
      filter.$or.push({ course: { $in: user.enrolledCourses } });
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'firstName lastName role department')
      .populate('course', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      message: `${priority} priority announcements retrieved successfully`,
      announcements
    });

  } catch (error) {
    console.error('Get announcements by priority error:', error);
    res.status(500).json({ 
      message: 'Server error getting announcements by priority',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get recent announcements
// @route   GET /api/announcements/recent
// @access  Private
const getRecentAnnouncements = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const user = await User.findById(req.user.userId);

    // Build filter for user's relevant announcements
    let filter = {
      isActive: true,
      $or: [
        { type: 'general' },
        { department: user.department },
        { department: null }
      ]
    };

    // Add course filter for students
    if (user.role === 'student' && user.enrolledCourses.length > 0) {
      filter.$or.push({ course: { $in: user.enrolledCourses } });
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'firstName lastName role department')
      .populate('course', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      message: 'Recent announcements retrieved successfully',
      announcements
    });

  } catch (error) {
    console.error('Get recent announcements error:', error);
    res.status(500).json({ 
      message: 'Server error getting recent announcements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Search announcements
// @route   GET /api/announcements/search
// @access  Private
const searchAnnouncements = async (req, res) => {
  try {
    const { q, type, department, priority } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const user = await User.findById(req.user.userId);

    // Build search filter
    let filter = {
      isActive: true,
      $and: [
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } }
          ]
        },
        {
          $or: [
            { type: 'general' },
            { department: user.department },
            { department: null }
          ]
        }
      ]
    };

    // Add course filter for students
    if (user.role === 'student' && user.enrolledCourses.length > 0) {
      filter.$and[1].$or.push({ course: { $in: user.enrolledCourses } });
    }

    // Additional filters
    if (type) filter.type = type;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'firstName lastName role department')
      .populate('course', 'name code')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalAnnouncements = await Announcement.countDocuments(filter);

    res.json({
      message: 'Search results retrieved successfully',
      announcements,
      currentPage: page,
      totalPages: Math.ceil(totalAnnouncements / limit),
      totalAnnouncements,
      searchQuery: q
    });

  } catch (error) {
    console.error('Search announcements error:', error);
    res.status(500).json({ 
      message: 'Server error searching announcements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementsByPriority,
  getRecentAnnouncements,
  searchAnnouncements
};