const Grade = require('../models/Grade');
const Course = require('../models/Course');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get grades for a student
// @route   GET /api/grades/student/:studentId
// @access  Private (Student can view own grades, Teachers/Admin can view all)
const getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = await User.findById(req.user.userId);

    // Check authorization
    if (user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({ 
        message: 'Students can only view their own grades' 
      });
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const grades = await Grade.find({ student: studentId })
      .populate('course', 'name code credits department')
      .populate('addedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Calculate overall statistics
    const totalCredits = grades.reduce((sum, grade) => sum + (grade.course.credits || 0), 0);
    const weightedSum = grades.reduce((sum, grade) => {
      return sum + (grade.finalGrade * (grade.course.credits || 1));
    }, 0);
    const gpa = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 0;

    // Grade distribution
    const gradeDistribution = {
      A: grades.filter(g => g.finalGrade >= 16).length,
      B: grades.filter(g => g.finalGrade >= 14 && g.finalGrade < 16).length,
      C: grades.filter(g => g.finalGrade >= 12 && g.finalGrade < 14).length,
      D: grades.filter(g => g.finalGrade >= 10 && g.finalGrade < 12).length,
      F: grades.filter(g => g.finalGrade < 10).length
    };

    res.json({
      message: 'Student grades retrieved successfully',
      grades,
      statistics: {
        totalCourses: grades.length,
        totalCredits,
        gpa: parseFloat(gpa),
        averageGrade: grades.length > 0 ? (grades.reduce((sum, g) => sum + g.finalGrade, 0) / grades.length).toFixed(2) : 0,
        gradeDistribution
      }
    });

  } catch (error) {
    console.error('Get student grades error:', error);
    res.status(500).json({ 
      message: 'Server error getting student grades',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get grades for a course
// @route   GET /api/grades/course/:courseId
// @access  Private (Teacher/Admin only)
const getCourseGrades = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = await User.findById(req.user.userId);

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check authorization
    if (user.role !== 'admin' && course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to view grades for this course' 
      });
    }

    const grades = await Grade.find({ course: courseId })
      .populate('student', 'firstName lastName studentId email')
      .populate('addedBy', 'firstName lastName')
      .sort({ 'student.lastName': 1 });

    // Calculate course statistics
    const courseStats = {
      totalStudents: grades.length,
      averageGrade: grades.length > 0 ? (grades.reduce((sum, g) => sum + g.finalGrade, 0) / grades.length).toFixed(2) : 0,
      highestGrade: grades.length > 0 ? Math.max(...grades.map(g => g.finalGrade)) : 0,
      lowestGrade: grades.length > 0 ? Math.min(...grades.map(g => g.finalGrade)) : 0,
      passRate: grades.length > 0 ? ((grades.filter(g => g.finalGrade >= 10).length / grades.length) * 100).toFixed(1) : 0
    };

    res.json({
      message: 'Course grades retrieved successfully',
      grades,
      courseInfo: {
        name: course.name,
        code: course.code,
        credits: course.credits
      },
      statistics: courseStats
    });

  } catch (error) {
    console.error('Get course grades error:', error);
    res.status(500).json({ 
      message: 'Server error getting course grades',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add or update grade
// @route   POST /api/grades
// @access  Private (Teacher/Admin only)
const addOrUpdateGrade = async (req, res) => {
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
      student: studentId,
      course: courseId,
      examGrade,
      homeworkGrade,
      projectGrade,
      participationGrade,
      finalGrade,
      feedback,
      semester,
      academicYear
    } = req.body;

    // Verify course and authorization
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin' && course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to grade this course' 
      });
    }

    // Verify student exists and is enrolled
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!course.enrolledStudents.includes(studentId)) {
      return res.status(400).json({ 
        message: 'Student is not enrolled in this course' 
      });
    }

    // Check if grade already exists
    let grade = await Grade.findOne({ student: studentId, course: courseId });

    if (grade) {
      // Update existing grade
      grade.examGrade = examGrade !== undefined ? examGrade : grade.examGrade;
      grade.homeworkGrade = homeworkGrade !== undefined ? homeworkGrade : grade.homeworkGrade;
      grade.projectGrade = projectGrade !== undefined ? projectGrade : grade.projectGrade;
      grade.participationGrade = participationGrade !== undefined ? participationGrade : grade.participationGrade;
      grade.finalGrade = finalGrade;
      grade.feedback = feedback || grade.feedback;
      grade.addedBy = req.user.userId;
      grade.updatedAt = new Date();

      await grade.save();
    } else {
      // Create new grade
      grade = new Grade({
        student: studentId,
        course: courseId,
        examGrade: examGrade || 0,
        homeworkGrade: homeworkGrade || 0,
        projectGrade: projectGrade || 0,
        participationGrade: participationGrade || 0,
        finalGrade,
        feedback: feedback || '',
        semester: semester || 'S1',
        academicYear: academicYear || new Date().getFullYear(),
        addedBy: req.user.userId
      });

      await grade.save();
    }

    await grade.populate([
      { path: 'student', select: 'firstName lastName studentId email' },
      { path: 'course', select: 'name code credits' },
      { path: 'addedBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      message: grade.createdAt === grade.updatedAt ? 'Grade added successfully' : 'Grade updated successfully',
      grade
    });

  } catch (error) {
    console.error('Add/Update grade error:', error);
    res.status(500).json({ 
      message: 'Server error managing grade',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete grade
// @route   DELETE /api/grades/:gradeId
// @access  Private (Teacher/Admin only)
const deleteGrade = async (req, res) => {
  try {
    const { gradeId } = req.params;

    const grade = await Grade.findById(gradeId).populate('course', 'teacher');
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // Check authorization
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin' && grade.course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this grade' 
      });
    }

    await Grade.findByIdAndDelete(gradeId);

    res.json({
      message: 'Grade deleted successfully'
    });

  } catch (error) {
    console.error('Delete grade error:', error);
    res.status(500).json({ 
      message: 'Server error deleting grade',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user's grades
// @route   GET /api/grades/my-grades
// @access  Private (Students only)
const getMyGrades = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'student') {
      return res.status(403).json({ 
        message: 'This endpoint is for students only' 
      });
    }

    const { semester, academicYear } = req.query;
    
    let filter = { student: req.user.userId };
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = parseInt(academicYear);

    const grades = await Grade.find(filter)
      .populate('course', 'name code credits department')
      .populate('addedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalCredits = grades.reduce((sum, grade) => sum + (grade.course.credits || 0), 0);
    const weightedSum = grades.reduce((sum, grade) => {
      return sum + (grade.finalGrade * (grade.course.credits || 1));
    }, 0);
    const gpa = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 0;

    // Subject performance analysis
    const subjectPerformance = {};
    grades.forEach(grade => {
      const dept = grade.course.department;
      if (!subjectPerformance[dept]) {
        subjectPerformance[dept] = { total: 0, count: 0, grades: [] };
      }
      subjectPerformance[dept].total += grade.finalGrade;
      subjectPerformance[dept].count += 1;
      subjectPerformance[dept].grades.push(grade.finalGrade);
    });

    Object.keys(subjectPerformance).forEach(dept => {
      subjectPerformance[dept].average = (subjectPerformance[dept].total / subjectPerformance[dept].count).toFixed(2);
    });

    res.json({
      message: 'Your grades retrieved successfully',
      grades,
      statistics: {
        totalCourses: grades.length,
        totalCredits,
        gpa: parseFloat(gpa),
        averageGrade: grades.length > 0 ? (grades.reduce((sum, g) => sum + g.finalGrade, 0) / grades.length).toFixed(2) : 0,
        subjectPerformance
      }
    });

  } catch (error) {
    console.error('Get my grades error:', error);
    res.status(500).json({ 
      message: 'Server error getting your grades',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get grade analytics for admin
// @route   GET /api/grades/analytics
// @access  Private (Admin only)
const getGradeAnalytics = async (req, res) => {
  try {
    const { department, semester, academicYear } = req.query;

    let matchFilter = {};
    if (semester) matchFilter.semester = semester;
    if (academicYear) matchFilter.academicYear = parseInt(academicYear);

    // Get department filter for courses if specified
    let courseFilter = {};
    if (department) courseFilter.department = department;

    const analytics = await Grade.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      { $match: { 'courseInfo.department': department || { $exists: true } } },
      {
        $group: {
          _id: null,
          totalStudents: { $addToSet: '$student' },
          totalGrades: { $sum: 1 },
          averageGrade: { $avg: '$finalGrade' },
          highestGrade: { $max: '$finalGrade' },
          lowestGrade: { $min: '$finalGrade' },
          gradeDistribution: {
            $push: {
              $switch: {
                branches: [
                  { case: { $gte: ['$finalGrade', 16] }, then: 'A' },
                  { case: { $gte: ['$finalGrade', 14] }, then: 'B' },
                  { case: { $gte: ['$finalGrade', 12] }, then: 'C' },
                  { case: { $gte: ['$finalGrade', 10] }, then: 'D' }
                ],
                default: 'F'
              }
            }
          }
        }
      }
    ]);

    // Department-wise analytics
    const departmentAnalytics = await Grade.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $group: {
          _id: '$courseInfo.department',
          averageGrade: { $avg: '$finalGrade' },
          totalGrades: { $sum: 1 },
          passRate: {
            $avg: {
              $cond: [{ $gte: ['$finalGrade', 10] }, 1, 0]
            }
          }
        }
      },
      { $sort: { averageGrade: -1 } }
    ]);

    const result = analytics[0] || {
      totalStudents: [],
      totalGrades: 0,
      averageGrade: 0,
      highestGrade: 0,
      lowestGrade: 0,
      gradeDistribution: []
    };

    // Process grade distribution
    const gradeDistribution = result.gradeDistribution.reduce((acc, grade) => {
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

    res.json({
      message: 'Grade analytics retrieved successfully',
      analytics: {
        totalUniqueStudents: result.totalStudents.length,
        totalGrades: result.totalGrades,
        averageGrade: result.averageGrade ? result.averageGrade.toFixed(2) : 0,
        highestGrade: result.highestGrade || 0,
        lowestGrade: result.lowestGrade || 0,
        gradeDistribution,
        passRate: result.totalGrades > 0 ? 
          (((gradeDistribution.A + gradeDistribution.B + gradeDistribution.C + gradeDistribution.D) / result.totalGrades) * 100).toFixed(1) : 0
      },
      departmentAnalytics: departmentAnalytics.map(dept => ({
        department: dept._id,
        averageGrade: dept.averageGrade.toFixed(2),
        totalGrades: dept.totalGrades,
        passRate: (dept.passRate * 100).toFixed(1)
      }))
    });

  } catch (error) {
    console.error('Get grade analytics error:', error);
    res.status(500).json({ 
      message: 'Server error getting grade analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Export grades to CSV
// @route   GET /api/grades/export/:courseId
// @access  Private (Teacher/Admin only)
const exportGrades = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = await User.findById(req.user.userId);

    // Check if course exists and user has access
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (user.role !== 'admin' && course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Not authorized to export grades for this course' 
      });
    }

    const grades = await Grade.find({ course: courseId })
      .populate('student', 'firstName lastName studentId email')
      .sort({ 'student.lastName': 1 });

    // Convert to CSV format
    const csvData = [
      ['Student ID', 'First Name', 'Last Name', 'Email', 'Exam Grade', 'Homework Grade', 'Project Grade', 'Participation Grade', 'Final Grade', 'Feedback']
    ];

    grades.forEach(grade => {
      csvData.push([
        grade.student.studentId,
        grade.student.firstName,
        grade.student.lastName,
        grade.student.email,
        grade.examGrade,
        grade.homeworkGrade,
        grade.projectGrade,
        grade.participationGrade,
        grade.finalGrade,
        grade.feedback || ''
      ]);
    });

    res.json({
      message: 'Grades exported successfully',
      csvData,
      filename: `${course.code}_grades_${new Date().toISOString().split('T')[0]}.csv`
    });

  } catch (error) {
    console.error('Export grades error:', error);
    res.status(500).json({ 
      message: 'Server error exporting grades',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getStudentGrades,
  getCourseGrades,
  addOrUpdateGrade,
  deleteGrade,
  getMyGrades,
  getGradeAnalytics,
  exportGrades
};