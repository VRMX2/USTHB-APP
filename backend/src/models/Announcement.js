const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required'],
    minlength: [10, 'Content must be at least 10 characters']
  },
  summary: {
    type: String,
    maxlength: [300, 'Summary cannot exceed 300 characters']
  },
  
  // Author Information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  
  // Targeting & Audience
  targetAudience: {
    type: String,
    required: [true, 'Target audience is required'],
    enum: ['all', 'students', 'teachers', 'department', 'course', 'year', 'custom']
  },
  
  // Specific targeting criteria
  targetCriteria: {
    departments: [{
      type: String,
      enum: ['Computer Science', 'Software Engineering', 'Information Systems', 'Artificial Intelligence', 'Networks']
    }],
    courses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    years: [{
      type: Number,
      min: 1,
      max: 5
    }],
    specificUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    roles: [{
      type: String,
      enum: ['student', 'teacher', 'admin']
    }]
  },
  
  // Announcement Type & Priority
  type: {
    type: String,
    required: [true, 'Announcement type is required'],
    enum: ['general', 'academic', 'administrative', 'event', 'deadline', 'emergency', 'maintenance']
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: ['news', 'alert', 'reminder', 'update', 'announcement'],
    default: 'announcement'
  },
  
  // Scheduling
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.publishDate;
      },
      message: 'Expiry date must be after publish date'
    }
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  
  // Status & Visibility
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'archived', 'expired'],
    default: 'draft'
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // Attachments & Media
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  images: [{
    filename: String,
    path: String,
    caption: String
  }],
  
  // Links
  externalLinks: [{
    title: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL']
    },
    description: String
  }],
  
  // Interaction & Engagement
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
  
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['like', 'love', 'helpful', 'important', 'concerning'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comments
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    replies: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: [500, 'Reply cannot exceed 500 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Notification Settings
  notifications: {
    sendEmail: {
      type: Boolean,
      default: false
    },
    sendPush: {
      type: Boolean,
      default: true
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    pushSent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  },
  
  // Analytics & Tracking
  analytics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    }
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Related content
  relatedAnnouncements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Announcement'
  }],
  
  // Moderation
  isModerated: {
    type: Boolean,
    default: false
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    content: String,
    title: String,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for read status
announcementSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

// Virtual for engagement statistics
announcementSchema.virtual('engagementStats').get(function() {
  const totalReactions = this.reactions.length;
  const totalComments = this.comments.length;
  const totalViews = this.views.count;
  
  return {
    reactions: totalReactions,
    comments: totalComments,
    views: totalViews,
    engagement: totalViews > 0 ? ((totalReactions + totalComments) / totalViews * 100) : 0
  };
});

// Virtual for reaction counts by type
announcementSchema.virtual('reactionCounts').get(function() {
  const counts = {
    like: 0,
    love: 0,
    helpful: 0,
    important: 0,
    concerning: 0
  };
  
  this.reactions.forEach(reaction => {
    counts[reaction.type]++;
  });
  
  return counts;
});

// Indexes for better performance
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ author: 1 });
announcementSchema.index({ status: 1, isVisible: 1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ type: 1, priority: 1 });
announcementSchema.index({ expiryDate: 1 });
announcementSchema.index({ isPinned: -1, publishDate: -1 });
announcementSchema.index({ tags: 1 });

// Text index for search functionality
announcementSchema.index({
  title: 'text',
  content: 'text',
  summary: 'text',
  tags: 'text'
});

// Pre-save middleware
announcementSchema.pre('save', function(next) {
  // Auto-generate summary if not provided
  if (!this.summary && this.content) {
    this.summary = this.content.length > 300 
      ? this.content.substring(0, 297) + '...' 
      : this.content;
  }
  
  // Update status based on dates
  const now = new Date();
  if (this.publishDate > now && this.status === 'published') {
    this.status = 'scheduled';
    this.isScheduled = true;
  } else if (this.publishDate <= now && this.status === 'scheduled') {
    this.status = 'published';
    this.isScheduled = false;
  }
  
  // Check if expired
  if (this.expiryDate && this.expiryDate <= now && this.status === 'published') {
    this.status = 'expired';
  }
  
  next();
});

// Method to add a view
announcementSchema.methods.addView = async function(userId) {
  const existingView = this.views.users.find(
    view => view.user.toString() === userId.toString()
  );
  
  if (existingView) {
    existingView.viewCount += 1;
    existingView.viewedAt = new Date();
  } else {
    this.views.users.push({ user: userId });
  }
  
  this.views.count += 1;
  this.analytics.impressions += 1;
  
  return this.save();
};

// Method to add a reaction
announcementSchema.methods.addReaction = async function(userId, reactionType) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    type: reactionType
  });
  
  return this.save();
};

// Method to remove reaction
announcementSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Method to add comment
announcementSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    author: userId,
    content: content,
    createdAt: new Date()
  });
  
  return this.save();
};

// Static method to find announcements for user
announcementSchema.statics.findForUser = function(user) {
  const query = {
    status: 'published',
    isVisible: true,
    publishDate: { $lte: new Date() },
    $or: [
      { targetAudience: 'all' },
      { targetAudience: user.role },
      { 'targetCriteria.specificUsers': user._id }
    ]
  };
  
  // Add role-specific criteria
  if (user.role === 'student') {
    query.$or.push(
      { targetAudience: 'students' },
      { 'targetCriteria.departments': user.department },
      { 'targetCriteria.years': user.year },
      { 'targetCriteria.courses': { $in: user.enrolledCourses.map(c => c.course) } }
    );
  } else if (user.role === 'teacher') {
    query.$or.push(
      { targetAudience: 'teachers' },
      { 'targetCriteria.departments': user.department },
      { 'targetCriteria.courses': { $in: user.teachingCourses } }
    );
  }
  
  return this.find(query)
    .populate('author', 'firstName lastName avatar role')
    .sort({ isPinned: -1, publishDate: -1 });
};

// Static method to get trending announcements
announcementSchema.statics.getTrending = function(limit = 10) {
  return this.find({
    status: 'published',
    isVisible: true,
    publishDate: { 
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  })
  .sort({ 'analytics.engagementRate': -1, 'views.count': -1 })
  .limit(limit)
  .populate('author', 'firstName lastName avatar');
};

module.exports = mongoose.model('Announcement', announcementSchema);