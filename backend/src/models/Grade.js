const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  // Student & Course Information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  
  // Academic Period
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year format should be YYYY-YYYY']
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
  },
  
  // Assessment Information
  assessmentType: {
    type: String,
    required: [true, 'Assessment type is required'],
    enum: ['assignment', 'quiz', 'midterm', 'final', 'project', 'participation', 'lab', 'presentation', 'homework']
  },
  assessmentName: {
    type: String,
    required: [true, 'Assessment name is required'],
    trim: true
  },
  assessmentDescription: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Grade Information
  pointsEarned: {
    type: Number,
    required: [true, 'Points earned is required'],
    min: [0, 'Points earned cannot be negative']
  },
  totalPoints: {
    type: Number,
    required: [true, 'Total points is required'],
    min: [1, 'Total points must be at least 1']
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  letterGrade: {
    type: String,
    enum: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W', 'P', 'NP']
  },
  gradePoints: {
    type: Number,
    min: [0, 'Grade points cannot be negative'],
    max: [4, 'Grade points cannot exceed 4.0']
  },
  
  // Weight in Course
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight cannot be negative'],
    max: [100, 'Weight cannot exceed 100%']
  },
  
  // Dates
  assignedDate: {
    type: Date,
    required: [true, 'Assigned date is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  submissionDate: {
    type: Date
  },
  gradedDate: {
    type: Date
  },
  releasedDate: {
    type: Date
  },
  
  // Submission Status
  submissionStatus: {
    type: String,
    enum: ['not_submitted', 'submitted', 'late', 'missing', 'excused'],
    default: 'not_submitted'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  daysLate: {
    type: Number,
    default: 0,
    min: 0
  },
  latePenalty: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Grading Status
  gradingStatus: {
    type: String,
    enum: ['not_graded', 'grading', 'graded', 'returned', 'disputed'],
    default: 'not_graded'
  },
  isReleased: {
    type: Boolean,
    default: false
  },
  
  // Feedback & Comments
  feedback: {
    type: String,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters']
  },
  privateNotes: {
    type: String,
    maxlength: [1000, 'Private notes cannot exceed 1000 characters']
  },
  rubricScores: [{
    criterion: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1
    },
    comments: String
  }],
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['submission', 'feedback', 'rubric']
    }
  }],
  
  // Extra Credit & Adjustments
  extraCredit: {
    type: Number,
    default: 0,
    min: 0
  },
  adjustments: [{
    reason: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    adjustedDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Attempts (for quizzes/tests with multiple attempts)
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  maxAttempts: {
    type: Number,
    default: 1,
    min: 1
  },
  bestAttempt: {
    type: Boolean,
    default: true
  },
  
  // AI Analytics
  aiAnalysis: {
    performanceTrend: {
      type: String,
      enum: ['improving', 'declining', 'stable', 'inconsistent']
    },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'moderate', 'challenging', 'very_challenging']
    },
    timeSpent: Number, // in minutes
    suggestions: [String],
    strengthAreas: [String],
    weaknessAreas: [String]
  },
  
  // Statistical Information
  classAverage: Number,
  classMedian: Number,
  classStandardDeviation: Number,
  percentileRank: Number,
  
  // Flags & Special Cases
  isExcused: {
    type: Boolean,
    default: false
  },
  excuseReason: String,
  isIncomplete: {
    type: Boolean,
    default: false
  },
  incompleteDeadline: Date,
  needsReview: {
    type: Boolean,
    default: false
  },
  reviewReason: String,
  
  // Grade History (for tracking changes)
  gradeHistory: [{
    previousGrade: Number,
    newGrade: Number,
    reason: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Course Grade Summary Schema
const courseGradeSummarySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  
  // Overall Grade
  currentGrade: {
    type: Number,
    min: 0,
    max: 100
  },
  letterGrade: {
    type: String,
    enum: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W']
  },
  gradePoints: {
    type: Number,
    min: 0,
    max: 4
  },
  credits: {
    type: Number,
    required: true
  },
  
  // Category Breakdown
  categoryGrades: [{
    category: {
      type: String,
      enum: ['assignments', 'quizzes', 'midterm', 'final', 'participation', 'projects'],
      required: true
    },
    earnedPoints: {
      type: Number,
      default: 0
    },
    totalPoints: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    weight: {
      type: Number,
      required: true
    },
    gradeCount: {
      type: Number,
      default: 0
    }
  }],
  
  // Status & Progress
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'withdrawn', 'incomplete'],
    default: 'in_progress'
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Statistics
  rank: Number,
  classSize: Number,
  classAverage: Number,
  
  // Trends & Analytics
  trendAnalysis: {
    trend: {
      type: String,
      enum: ['improving', 'declining', 'stable']
    },
    recentPerformance: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor']
    },
    projectedFinalGrade: Number,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  
  // Important Dates
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  finalGradeDate: Date
}, {
  timestamps: true
});

// Virtuals for Grade
gradeSchema.virtual('finalScore').get(function() {
  let score = this.pointsEarned;
  if (this.extraCredit) score += this.extraCredit;
  if (this.latePenalty) score -= this.latePenalty;
  
  // Apply adjustments
  if (this.adjustments && this.adjustments.length > 0) {
    const totalAdjustment = this.adjustments.reduce((sum, adj) => sum + adj.points, 0);
    score += totalAdjustment;
  }
  
  return Math.max(0, Math.min(score, this.totalPoints));
});

gradeSchema.virtual('finalPercentage').get(function() {
  return (this.finalScore / this.totalPoints) * 100;
});

gradeSchema.virtual('isPass').get(function() {
  return this.finalPercentage >= 60; // Assuming 60% is passing
});

// Indexes
gradeSchema.index({ student: 1, course: 1, academicYear: 1, semester: 1 });
gradeSchema.index({ course: 1, assessmentType: 1 });
gradeSchema.index({ instructor: 1 });
gradeSchema.index({ gradingStatus: 1, isReleased: 1 });
gradeSchema.index({ dueDate: 1 });

courseGradeSummarySchema.index({ student: 1, academicYear: 1, semester: 1 });
courseGradeSummarySchema.index({ course: 1 });

// Pre-save middleware for Grade
gradeSchema.pre('save', function(next) {
  // Calculate percentage
  if (this.pointsEarned !== undefined && this.totalPoints !== undefined) {
    this.percentage = (this.finalScore / this.totalPoints) * 100;
  }
  
  // Calculate letter grade based on percentage
  if (this.percentage !== undefined) {
    if (this.percentage >= 97) this.letterGrade = 'A';
    else if (this.percentage >= 93) this.letterGrade = 'A-';
    else if (this.percentage >= 90) this.letterGrade = 'B+';
    else if (this.percentage >= 87) this.letterGrade = 'B';
    else if (this.percentage >= 83) this.letterGrade = 'B-';
    else if (this.percentage >= 80) this.letterGrade = 'C+';
    else if (this.percentage >= 77) this.letterGrade = 'C';
    else if (this.percentage >= 73) this.letterGrade = 'C-';
    else if (this.percentage >= 70) this.letterGrade = 'D+';
    else if (this.percentage >= 60) this.letterGrade = 'D';
    else this.letterGrade = 'F';
  }
  
  // Calculate grade points
  const gradePointMap = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
  };
  this.gradePoints = gradePointMap[this.letterGrade] || 0;
  
  // Check if late
  if (this.submissionDate && this.dueDate && this.submissionDate > this.dueDate) {
    this.isLate = true;
    this.daysLate = Math.ceil((this.submissionDate - this.dueDate) / (1000 * 60 * 60 * 24));
  }
  
  next();
});

// Methods for Grade
gradeSchema.methods.addAdjustment = function(reason, points, adjustedBy) {
  this.adjustments.push({
    reason,
    points,
    adjustedBy
  });
  
  // Add to grade history
  const oldGrade = this.finalScore;
  this.gradeHistory.push({
    previousGrade: oldGrade,
    newGrade: oldGrade + points,
    reason: `Adjustment: ${reason}`,
    changedBy: adjustedBy
  });
  
  return this.save();
};

gradeSchema.methods.updateGrade = function(newPoints, reason, changedBy) {
  const oldGrade = this.pointsEarned;
  
  this.gradeHistory.push({
    previousGrade: oldGrade,
    newGrade: newPoints,
    reason,
    changedBy
  });
  
  this.pointsEarned = newPoints;
  this.gradedDate = new Date();
  
  return this.save();
};

// Static methods
gradeSchema.statics.getStudentGrades = function(studentId, courseId, academicYear, semester) {
  return this.find({
    student: studentId,
    course: courseId,
    academicYear,
    semester,
    isReleased: true
  }).populate('course', 'name code');
};

gradeSchema.statics.getCourseGrades = function(courseId, academicYear, semester) {
  return this.find({
    course: courseId,
    academicYear,
    semester
  }).populate('student', 'firstName lastName studentId');
};

gradeSchema.statics.calculateGPA = async function(studentId, academicYear, semester) {
  const pipeline = [
    {
      $match: {
        student: mongoose.Types.ObjectId(studentId),
        academicYear,
        semester,
        isReleased: true,
        gradingStatus: 'graded'
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseInfo'
      }
    },
    {
      $unwind: '$courseInfo'
    },
    {
      $group: {
        _id: '$course',
        finalGrade: { $avg: '$gradePoints' },
        credits: { $first: '$courseInfo.credits' }
      }
    },
    {
      $group: {
        _id: null,
        totalGradePoints: { $sum: { $multiply: ['$finalGrade', '$credits'] } },
        totalCredits: { $sum: '$credits' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  if (result.length > 0) {
    return result[0].totalGradePoints / result[0].totalCredits;
  }
  return 0;
};

const Grade = mongoose.model('Grade', gradeSchema);
const CourseGradeSummary = mongoose.model('CourseGradeSummary', courseGradeSummarySchema);

module.exports = { Grade, CourseGradeSummary };