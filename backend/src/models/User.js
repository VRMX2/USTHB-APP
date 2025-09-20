const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  
  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  dateOfBirth: {
    type: Date
  },
  
  // Academic Info
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Only for students
    match: [/^[0-9]{8,12}$/, 'Student ID must be 8-12 digits']
  },
  department: {
    type: String,
    enum: ['Computer Science', 'Software Engineering', 'Information Systems', 'Artificial Intelligence', 'Networks'],
    required: function() {
      return this.role === 'student' || this.role === 'teacher';
    }
  },
  year: {
    type: Number,
    min: 1,
    max: 5,
    required: function() {
      return this.role === 'student';
    }
  },
  specialization: {
    type: String,
    required: function() {
      return this.role === 'student' && this.year >= 3;
    }
  },
  
  // Teacher specific fields
  employeeId: {
    type: String,
    unique: true,
    sparse: true, // Only for teachers
    required: function() {
      return this.role === 'teacher';
    }
  },
  title: {
    type: String,
    enum: ['Professor', 'Assistant Professor', 'Lecturer', 'Teaching Assistant'],
    required: function() {
      return this.role === 'teacher';
    }
  },
  officeHours: {
    type: String
  },
  
  // Enrolled Courses (for students)
  enrolledCourses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped'],
      default: 'active'
    }
  }],
  
  // Teaching Courses (for teachers)
  teachingCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Security
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  
  // Preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      announcements: {
        type: Boolean,
        default: true
      },
      grades: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      enum: ['en', 'fr', 'ar'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ role: 1, department: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate student/employee ID
userSchema.pre('save', async function(next) {
  if (this.isNew) {
    if (this.role === 'student' && !this.studentId) {
      // Generate unique student ID
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({ role: 'student' });
      this.studentId = `${year}${String(count + 1).padStart(6, '0')}`;
    } else if (this.role === 'teacher' && !this.employeeId) {
      // Generate unique employee ID
      const count = await this.constructor.countDocuments({ role: 'teacher' });
      this.employeeId = `EMP${String(count + 1).padStart(6, '0')}`;
    }
  }
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we're past 5 attempts and not locked yet, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static method to get available reasons for account lock
userSchema.statics.getFailedLogin = function() {
  return {
    NOT_FOUND: 0,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
  };
};

module.exports = mongoose.model('User', userSchema);