const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // File Information
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required']
  },
  mimetype: {
    type: String,
    required: [true, 'File type is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  
  // File Type & Category
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'zip', 'rar', 'other']
  },
  category: {
    type: String,
    required: [true, 'Resource category is required'],
    enum: ['lecture_notes', 'assignments', 'exams', 'books', 'articles', 'videos', 'presentations', 'lab_materials', 'projects', 'solutions', 'syllabus', 'other']
  },
  
  // Association
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  
  // Academic Information
  academicYear: {
    type: String,
    match: [/^\d{4}-\d{4}$/, 'Academic year format should be YYYY-YYYY']
  },
  semester: {
    type: String,
    enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
  },
  topic: {
    type: String,
    trim: true
  },
  week: {
    type: Number,
    min: 1,
    max: 16
  },
  
  // Access Control
  visibility: {
    type: String,
    required: [true, 'Visibility is required'],
    enum: ['public', 'course', 'students', 'teachers', 'private'],
    default: 'course'
  },
  allowedRoles: [{
    type: String,
    enum: ['student', 'teacher', 'admin']
  }],
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'hidden', 'deleted'],
    default: 'active'
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  
  // Download & Usage Statistics
  downloads: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      downloadedAt: {
        type: Date,
        default: Date.now
      },
      downloadCount: {
        type: Number,
        default: 1
      }
    }]
  },
  views: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      },
      viewCount: {
        type: Number,
        default: 1
      }
    }]
  },
  
  // Ratings & Reviews
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  // Tags & Keywords
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // AI-Generated Content
  aiSummary: {
    type: String,
    maxlength: [1000, 'AI summary cannot exceed 1000 characters']
  },
  aiKeywords: [String],
  aiGeneratedQuestions: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    }
  }],
  
  // Document Processing
  textContent: {
    type: String // Extracted text for search indexing
  },
  pageCount: {
    type: Number,
    min: 0
  },
  language: {
    type: String,
    enum: ['en', 'fr', 'ar', 'mixed'],
    default: 'en'
  },
  
  // Thumbnail & Preview
  thumbnail: {
    filename: String,
    path: String,
    generated: {
      type: Boolean,
      default: false
    }
  },
  previewUrl: String,
  
  // Version Control
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  previousVersions: [{
    version: Number,
    filename: String,
    path: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changes: String
  }],
  isLatestVersion: {
    type: Boolean,
    default: true
  },
  
  // Related Resources
  relatedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  
  // Flags & Special Properties
  isFeatured: {
    type: Boolean,
    default: false
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  hasLicense: {
    type: Boolean,
    default: false
  },
  licenseType: {
    type: String,
    enum: ['cc0', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nd', 'mit', 'gpl', 'proprietary', 'fair_use']
  },
  
  // Expiry & Scheduling
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  
  // Security
  checksum: String, // File integrity verification
  scanStatus: {
    type: String,
    enum: ['pending', 'clean', 'suspicious', 'malicious'],
    default: 'pending'
  },
  scanDate: Date,
  
  // Analytics
  analytics: {
    popularityScore: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    },
    lastAccessed: Date,
    peakUsagePeriod: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
resourceSchema.virtual('sizeInMB').get(function() {
  return (this.size / (1024 * 1024)).toFixed(2);
});

resourceSchema.virtual('downloadCount').get(function() {
  return this.downloads.count;
});

resourceSchema.virtual('viewCount').get(function() {
  return this.views.count;
});

resourceSchema.virtual('ratingCount').get(function() {
  return this.ratings.length;
});

resourceSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

resourceSchema.virtual('fileExtension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// Indexes
resourceSchema.index({ course: 1, category: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ status: 1, visibility: 1 });
resourceSchema.index({ category: 1, fileType: 1 });
resourceSchema.index({ tags: 1 });
resourceSchema.index({ createdAt: -1 });
resourceSchema.index({ averageRating: -1 });
resourceSchema.index({ 'downloads.count': -1 });

// Text search index
resourceSchema.index({
  title: 'text',
  description: 'text',
  textContent: 'text',
  tags: 'text',
  keywords: 'text'
});

// Pre-save middleware
resourceSchema.pre('save', function(next) {
  // Calculate average rating
  if (this.ratings.length > 0) {
    const totalRating = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
    this.averageRating = totalRating / this.ratings.length;
  }
  
  // Determine file type based on mimetype
  if (!this.fileType && this.mimetype) {
    const mimeToType = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'application/zip': 'zip',
      'application/x-rar-compressed': 'rar'
    };
    
    this.fileType = mimeToType[this.mimetype] || 'other';
  }
  
  // Update popularity score
  const ageInDays = (new Date() - this.createdAt) / (1000 * 60 * 60 * 24);
  const downloadWeight = this.downloads.count * 2;
  const ratingWeight = this.averageRating * this.ratings.length;
  const viewWeight = this.views.count * 0.5;
  
  this.analytics.popularityScore = (downloadWeight + ratingWeight + viewWeight) / Math.max(ageInDays, 1);
  
  next();
});

// Methods
resourceSchema.methods.addDownload = async function(userId) {
  const existingDownload = this.downloads.users.find(
    d => d.user.toString() === userId.toString()
  );
  
  if (existingDownload) {
    existingDownload.downloadCount += 1;
    existingDownload.downloadedAt = new Date();
  } else {
    this.downloads.users.push({ user: userId });
  }
  
  this.downloads.count += 1;
  this.analytics.lastAccessed = new Date();
  
  return this.save();
};

resourceSchema.methods.addView = async function(userId) {
  const existingView = this.views.users.find(
    v => v.user.toString() === userId.toString()
  );
  
  if (existingView) {
    existingView.viewCount += 1;
    existingView.viewedAt = new Date();
  } else {
    this.views.users.push({ user: userId });
  }
  
  this.views.count += 1;
  this.analytics.lastAccessed = new Date();
  
  return this.save();
};

resourceSchema.methods.addRating = async function(userId, rating, review = null) {
  // Remove existing rating from same user
  this.ratings = this.ratings.filter(
    r => r.user.toString() !== userId.toString()
  );
  
  // Add new rating
  this.ratings.push({
    user: userId,
    rating,
    review
  });
  
  return this.save();
};

resourceSchema.methods.canAccess = function(user) {
  // Check if resource is active
  if (this.status !== 'active') return false;
  
  // Check if expired
  if (this.isExpired) return false;
  
  // Check visibility
  switch (this.visibility) {
    case 'public':
      return true;
    case 'private':
      return this.uploadedBy.toString() === user._id.toString() ||
             this.allowedUsers.includes(user._id);
    case 'course':
      // Check if user is enrolled in the course or is the instructor
      return user.enrolledCourses.some(ec => ec.course.toString() === this.course.toString()) ||
             user.teachingCourses.includes(this.course) ||
             user.role === 'admin';
    case 'students':
      return user.role === 'student' || user.role === 'admin';
    case 'teachers':
      return user.role === 'teacher' || user.role === 'admin';
    default:
      return false;
  }
};

// Static methods
resourceSchema.statics.findByCategory = function(category, userId = null) {
  const query = { category, status: 'active' };
  
  if (userId) {
    // Add access control logic here
    query.$or = [
      { visibility: 'public' },
      { uploadedBy: userId }
    ];
  } else {
    query.visibility = 'public';
  }
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName avatar')
    .populate('course', 'name code')
    .sort({ createdAt: -1 });
};

resourceSchema.statics.findByCourse = function(courseId, userId = null) {
  const query = { course: courseId, status: 'active' };
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName avatar')
    .sort({ category: 1, createdAt: -1 });
};

resourceSchema.statics.searchResources = function(searchTerm, filters = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: 'active'
  };
  
  // Apply filters
  if (filters.category) query.category = filters.category;
  if (filters.fileType) query.fileType = filters.fileType;
  if (filters.course) query.course = filters.course;
  if (filters.uploader) query.uploadedBy = filters.uploader;
  if (filters.minRating) query.averageRating = { $gte: filters.minRating };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('uploadedBy', 'firstName lastName avatar')
    .populate('course', 'name code');
};

resourceSchema.statics.getPopularResources = function(limit = 10) {
  return this.find({ status: 'active', visibility: { $ne: 'private' } })
    .sort({ 'analytics.popularityScore': -1 })
    .limit(limit)
    .populate('uploadedBy', 'firstName lastName avatar')
    .populate('course', 'name code');
};

resourceSchema.statics.getRecentResources = function(limit = 10) {
  return this.find({ status: 'active', visibility: { $ne: 'private' } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'firstName lastName avatar')
    .populate('course', 'name code');
};

resourceSchema.statics.getFeaturedResources = function() {
  return this.find({ 
    status: 'active', 
    isFeatured: true,
    visibility: { $ne: 'private' }
  })
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'firstName lastName avatar')
    .populate('course', 'name code');
};

module.exports = mongoose.model('Resource', resourceSchema);