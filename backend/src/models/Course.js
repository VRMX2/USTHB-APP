const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Basic Course Information
  code: {
    type: String,
    required: [true, 'Course code is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z]{2,4}[0-9]{3,4}$/, 'Course code format should be like CS101, MATH201, etc.']
  },
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    minlength: [3, 'Course name must be at least 3 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    minlength: [20, 'Description must be at least 20 characters']
  },
  
  // Academic Information
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [6, 'Credits cannot exceed 6']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Computer Science', 'Software Engineering', 'Information Systems', 'Artificial Intelligence', 'Networks']
  },
  level: {
    type: String,
    required: [true, 'Course level is required'],
    enum: ['L1', 'L2', 'L3', 'M1', 'M2']
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
  },
  
  // Course Type & Category
  type: {
    type: String,
    required: [true, 'Course type is required'],
    enum: ['Core', 'Elective', 'Specialty', 'Project', 'Internship']
  },
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: ['Theory', 'Practical', 'Mixed', 'Project', 'Seminar']
  },
  
  // Teaching Staff
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Primary instructor is required']
  },
  assistants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Schedule Information
  schedule: {
    lectures: [{
      day: {
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time format should be HH:MM']
      },
      endTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time format should be HH:MM']
      },
      room: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['Lecture', 'Tutorial', 'Lab', 'Seminar'],
        default: 'Lecture'
      }
    }]
  },
  
  // Course Capacity & Enrollment
  maxStudents: {
    type: Number,
    required: [true, 'Maximum students capacity is required'],
    min: [1, 'Maximum students must be at least 1']
  },
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['enrolled', 'completed', 'dropped', 'failed'],
      default: 'enrolled'
    }
  }],
  
  // Prerequisites
  prerequisites: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    grade: {
      type: String,
      enum: ['D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'],
      default: 'D'
    }
  }],
  
  // Course Content & Materials
  syllabus: {
    type: String, // PDF file path or content
    default: null
  },
  learningOutcomes: [{
    type: String,
    required: true
  }],
  topics: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    weekNumber: {
      type: Number,
      min: 1,
      max: 16
    },
    resources: [{
      title: String,
      type: {
        type: String,
        enum: ['PDF', 'Video', 'Link', 'Book', 'Article']
      },
      url: String,
      filePath: String
    }]
  }],
  
  // Assessment Structure
  assessments: {
    assignments: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 20
      },
      count: {
        type: Number,
        min: 0,
        default: 3
      }
    },
    quizzes: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 15
      },
      count: {
        type: Number,
        min: 0,
        default: 4
      }
    },
    midterm: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 25
      }
    },
    final: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 40
      }
    },
    participation: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    }
  },
  
  // Important Dates
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year format should be YYYY-YYYY']
  },
  startDate: {
    type: Date,
    required: [true, 'Course start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'Course end date is required']
  },
  examDate: {
    type: Date
  },
  
  // Course Status & Settings
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  allowLateEnrollment: {
    type: Boolean,
    default: false
  },
  lateEnrollmentDeadline: {
    type: Date
  },
  
  // Communication Settings
  discussionForum: {
    enabled: {
      type: Boolean,
      default: true
    },
    moderationRequired: {
      type: Boolean,
      default: false
    }
  },
  
  // Statistics
  stats: {
    totalEnrollments: {
      type: Number,
      default: 0
    },
    activeEnrollments: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageGrade: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for available spots
courseSchema.virtual('availableSpots').get(function() {
  return this.maxStudents - this.enrolledStudents.length;
});

// Virtual for enrollment status
courseSchema.virtual('isFullyEnrolled').get(function() {
  return this.enrolledStudents.length >= this.maxStudents;
});

// Virtual for current enrollment count
courseSchema.virtual('currentEnrollment').get(function() {
  return this.enrolledStudents.filter(enrollment => 
    enrollment.status === 'enrolled'
  ).length;
});

// Virtual for course duration in weeks
courseSchema.virtual('durationWeeks').get(function() {
  if (this.startDate && this.endDate) {
    const timeDiff = this.endDate - this.startDate;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24 * 7));
  }
  return 0;
});

// Indexes for better performance
courseSchema.index({ code: 1 });
courseSchema.index({ department: 1, level: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ status: 1, isVisible: 1 });
courseSchema.index({ academicYear: 1, semester: 1 });

// Pre-save validation
courseSchema.pre('save', function(next) {
  // Validate that end date is after start date
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Validate assessment percentages sum to 100
  const totalPercentage = (this.assessments.assignments?.percentage || 0) +
                         (this.assessments.quizzes?.percentage || 0) +
                         (this.assessments.midterm?.percentage || 0) +
                         (this.assessments.final?.percentage || 0) +
                         (this.assessments.participation?.percentage || 0);
  
  if (totalPercentage !== 100) {
    return next(new Error('Assessment percentages must sum to 100'));
  }
  
  next();
});

// Method to enroll a student
courseSchema.methods.enrollStudent = async function(studentId) {
  // Check if course is full
  if (this.isFullyEnrolled) {
    throw new Error('Course is full');
  }
  
  // Check if student is already enrolled
  const existingEnrollment = this.enrolledStudents.find(
    enrollment => enrollment.student.toString() === studentId.toString()
  );
  
  if (existingEnrollment) {
    throw new Error('Student is already enrolled in this course');
  }
  
  // Add student to enrolled list
  this.enrolledStudents.push({
    student: studentId,
    enrollmentDate: new Date(),
    status: 'enrolled'
  });
  
  // Update statistics
  this.stats.totalEnrollments += 1;
  this.stats.activeEnrollments += 1;
  
  return this.save();
};

// Method to drop a student
courseSchema.methods.dropStudent = async function(studentId) {
  const enrollmentIndex = this.enrolledStudents.findIndex(
    enrollment => enrollment.student.toString() === studentId.toString()
  );
  
  if (enrollmentIndex === -1) {
    throw new Error('Student is not enrolled in this course');
  }
  
  // Update enrollment status instead of removing
  this.enrolledStudents[enrollmentIndex].status = 'dropped';
  this.stats.activeEnrollments = Math.max(0, this.stats.activeEnrollments - 1);
  
  return this.save();
};

// Method to get active students
courseSchema.methods.getActiveStudents = function() {
  return this.enrolledStudents.filter(enrollment => 
    enrollment.status === 'enrolled'
  );
};

// Static method to find courses by instructor
courseSchema.statics.findByInstructor = function(instructorId) {
  return this.find({ 
    $or: [
      { instructor: instructorId },
      { assistants: instructorId }
    ]
  }).populate('instructor assistants', 'firstName lastName email');
};

// Static method to find available courses for enrollment
courseSchema.statics.findAvailableForEnrollment = function() {
  return this.find({
    status: 'active',
    isVisible: true,
    $expr: { $lt: ['$stats.activeEnrollments', '$maxStudents'] }
  });
};

module.exports = mongoose.model('Course', courseSchema);