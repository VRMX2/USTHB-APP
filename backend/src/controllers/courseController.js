const Course = require('../models/Course');
const User = require('../models/User');
const Resource = require('../models/Resource');
const { validationResult } = require('express-validator');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
const getAllCourses = async (req, res) => {
  try {
    const { department, semester, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Build filter query
    let filter = {};
    
    if (department) {
      filter.department = department;
    }
    
    if (semester) {
      filter.semester = semester;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(filter)
      .populate('teacher', 'firstName lastName email department')
      .populate('enrolledStudents', 'firstName lastName studentId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCourses = await Course.countDocuments(filter);

    res.json({
      message: 'Courses retrieved successfully',
      courses,
      currentPage: page,
      totalPages: Math.ceil(totalCourses / limit),
      totalCourses
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ 
      message: 'Server error getting courses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'firstName lastName email department profilePicture')
      .populate('enrolledStudents', 'firstName lastName studentId profilePicture');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get course resources
    const resources = await Resource.find({ course: course._id })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Course retrieved successfully',
      course: {
        ...course.toObject(),
        resources
      }
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ 
      message: 'Server error getting course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Teacher/Admin only)
const createCourse = async (req, res) => {
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
      name,
      code,
      description,
      department,
      semester,
      credits,
      schedule,
      maxStudents
    } = req.body;

    // Check if course code already exists
    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({ 
        message: 'Course with this code already exists' 
      });
    }

    const course = new Course({
      name,
      code,
      description,
      department,
      semester,
      credits,
      teacher: req.user.userId,
      schedule,
      maxStudents: maxStudents || 50
    });

    await course.save();
    
    await course.populate('teacher', 'firstName lastName email department');

    res.status(201).json({
      message: 'Course created successfully',
      course
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ 
      message: 'Server error creating course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Teacher/Admin only)
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the teacher or admin
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin' && course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to update this course' 
      });
    }

    const {
      name,
      description,
      department,
      semester,
      credits,
      schedule,
      maxStudents,
      isActive
    } = req.body;

    // Update fields if provided
    if (name) course.name = name;
    if (description) course.description = description;
    if (department) course.department = department;
    if (semester) course.semester = semester;
    if (credits) course.credits = credits;
    if (schedule) course.schedule = schedule;
    if (maxStudents) course.maxStudents = maxStudents;
    if (typeof isActive === 'boolean') course.isActive = isActive;

    course.updatedAt = new Date();
    await course.save();

    await course.populate('teacher', 'firstName lastName email department');

    res.json({
      message: 'Course updated successfully',
      course
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ 
      message: 'Server error updating course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin only)
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Remove course from all enrolled students
    await User.updateMany(
      { enrolledCourses: course._id },
      { $pull: { enrolledCourses: course._id } }
    );

    // Delete course resources
    await Resource.deleteMany({ course: course._id });

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ 
      message: 'Server error deleting course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Enroll student in course
// @route   POST /api/courses/:id/enroll
// @access  Private (Student only)
const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.isActive) {
      return res.status(400).json({ 
        message: 'Cannot enroll in inactive course' 
      });
    }

    // Check if course is full
    if (course.enrolledStudents.length >= course.maxStudents) {
      return res.status(400).json({ 
        message: 'Course is full' 
      });
    }

    // Check if student is already enrolled
    if (course.enrolledStudents.includes(req.user.userId)) {
      return res.status(400).json({ 
        message: 'Already enrolled in this course' 
      });
    }

    // Enroll student
    course.enrolledStudents.push(req.user.userId);
    await course.save();

    // Add course to student's enrolled courses
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { enrolledCourses: course._id }
    });

    await course.populate('teacher', 'firstName lastName email');

    res.json({
      message: 'Enrolled in course successfully',
      course
    });

  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({ 
      message: 'Server error enrolling in course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Unenroll student from course
// @route   POST /api/courses/:id/unenroll
// @access  Private (Student only)
const unenrollFromCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if student is enrolled
    if (!course.enrolledStudents.includes(req.user.userId)) {
      return res.status(400).json({ 
        message: 'Not enrolled in this course' 
      });
    }

    // Unenroll student
    course.enrolledStudents = course.enrolledStudents.filter(
      studentId => studentId.toString() !== req.user.userId
    );
    await course.save();

    // Remove course from student's enrolled courses
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { enrolledCourses: course._id }
    });

    res.json({
      message: 'Unenrolled from course successfully'
    });

  } catch (error) {
    console.error('Unenroll course error:', error);
    res.status(500).json({ 
      message: 'Server error unenrolling from course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get enrolled courses for current user
// @route   GET /api/courses/my-courses
// @access  Private
const getMyCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'enrolledCourses',
        populate: {
          path: 'teacher',
          select: 'firstName lastName email'
        }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is a teacher, get courses they teach
    let teachingCourses = [];
    if (user.role === 'teacher' || user.role === 'admin') {
      teachingCourses = await Course.find({ teacher: req.user.userId })
        .populate('enrolledStudents', 'firstName lastName studentId');
    }

    res.json({
      message: 'Courses retrieved successfully',
      enrolledCourses: user.enrolledCourses || [],
      teachingCourses
    });

  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ 
      message: 'Server error getting courses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get course statistics
// @route   GET /api/courses/:id/stats
// @access  Private (Teacher/Admin only)
const getCourseStats = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('enrolledStudents', 'firstName lastName studentId');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the teacher or admin
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin' && course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to view course statistics' 
      });
    }

    // Get resource count
    const resourceCount = await Resource.countDocuments({ course: course._id });

    const stats = {
      totalStudents: course.enrolledStudents.length,
      maxStudents: course.maxStudents,
      enrollmentPercentage: Math.round((course.enrolledStudents.length / course.maxStudents) * 100),
      totalResources: resourceCount,
      isActive: course.isActive,
      createdAt: course.createdAt,
      enrolledStudents: course.enrolledStudents
    };

    res.json({
      message: 'Course statistics retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ 
      message: 'Server error getting course statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  unenrollFromCourse,
  getMyCourses,
  getCourseStats
};