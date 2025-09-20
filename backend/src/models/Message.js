// models/chat.js
// --------------------------------------
// Chat & Message Models using Mongoose
// --------------------------------------

const mongoose = require('mongoose');

// --------------------------------------
// Message Schema
// --------------------------------------
const messageSchema = new mongoose.Schema(
  {
    // Message Content
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'system'],
      default: 'text',
    },

    // Sender Information
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    senderRole: {
      type: String,
      enum: ['student', 'teacher', 'admin', 'system'],
      required: true,
    },

    // Conversation/Chat Room
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: [true, 'Chat room is required'],
    },

    // Reply/Thread
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },

    // File Attachments
    attachments: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimetype: { type: String, required: true },
        size: { type: Number, required: true },
        path: { type: String, required: true },
        thumbnail: String,
        duration: Number, // voice/video
      },
    ],

    // Message Status
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'deleted'],
      default: 'sent',
    },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    originalContent: String,

    // Read Receipts
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],

    // Reactions
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Mentions
    mentions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        position: { start: Number, end: Number },
      },
    ],

    // Priority & Tags
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    // AI Features
    aiGenerated: { type: Boolean, default: false },
    aiSummary: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },

    // Moderation
    isReported: { type: Boolean, default: false },
    reportedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: {
          type: String,
          enum: ['spam', 'inappropriate', 'harassment', 'other'],
        },
        reportedAt: { type: Date, default: Date.now },
      },
    ],
    isHidden: { type: Boolean, default: false },
    hiddenReason: String,

    // System Messages
    systemMessageType: {
      type: String,
      enum: [
        'user_joined',
        'user_left',
        'user_added',
        'user_removed',
        'room_created',
        'room_updated',
        'assignment_posted',
        'grade_released',
      ],
    },
    systemMessageData: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --------------------------------------
// ChatRoom Schema
// --------------------------------------
const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Chat room name is required'],
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['course', 'general', 'private', 'group', 'study_group', 'project'],
      required: [true, 'Room type is required'],
    },

    // Associated Course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: function () {
        return this.type === 'course';
      },
    },

    // Creator
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Room creator is required'],
    },

    // Members
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        lastSeen: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
        permissions: {
          canPost: { type: Boolean, default: true },
          canUpload: { type: Boolean, default: true },
          canMention: { type: Boolean, default: true },
        },
      },
    ],

    // Room Settings
    isPrivate: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false },
    maxMembers: { type: Number, default: 1000 },

    // Message Settings
    allowFileUploads: { type: Boolean, default: true },
    allowedFileTypes: [
      {
        type: String,
        enum: [
          'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
          'txt', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3',
        ],
      },
    ],
    maxFileSize: { type: Number, default: 10485760 }, // 10MB
    messageRetention: { type: Number, default: 365 }, // days

    // Moderation
    moderationEnabled: { type: Boolean, default: false },
    autoModeration: {
      enabled: { type: Boolean, default: false },
      bannedWords: [String],
      maxMessageLength: { type: Number, default: 2000 },
    },

    // Status
    status: { type: String, enum: ['active', 'archived', 'suspended'], default: 'active' },
    lastActivity: { type: Date, default: Date.now },

    // Stats
    stats: {
      totalMessages: { type: Number, default: 0 },
      totalMembers: { type: Number, default: 0 },
      activeMembers: { type: Number, default: 0 },
      dailyMessages: { type: Number, default: 0 },
    },

    // AI Features
    aiModerationEnabled: { type: Boolean, default: false },
    aiSummaryEnabled: { type: Boolean, default: false },
    lastAiSummary: {
      content: String,
      generatedAt: Date,
      messageCount: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --------------------------------------
// Indexes
// --------------------------------------
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ threadId: 1 });
messageSchema.index({ 'mentions.user': 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ content: 'text' }); // Full-text search

chatRoomSchema.index({ type: 1, status: 1 });
chatRoomSchema.index({ course: 1 });
chatRoomSchema.index({ 'members.user': 1 });
chatRoomSchema.index({ creator: 1 });
chatRoomSchema.index({ lastActivity: -1 });

// --------------------------------------
// Virtuals
// --------------------------------------
messageSchema.virtual('isUnread').get(function () {
  return false; // application logic can override
});

messageSchema.virtual('replyCount').get(function () {
  return 0; // computed externally
});

chatRoomSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.filter(m => m.isActive).length : 0;
});

chatRoomSchema.virtual('isGroup').get(function () {
  return this.memberCount > 2;
});

// --------------------------------------
// Instance Methods
// --------------------------------------
messageSchema.methods.addReaction = async function (userId, emoji) {
  this.reactions = this.reactions.filter(
    r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
  );
  this.reactions.push({ user: userId, emoji });
  return this.save();
};

messageSchema.methods.removeReaction = async function (userId, emoji) {
  this.reactions = this.reactions.filter(
    r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
  );
  return this.save();
};

messageSchema.methods.markAsRead = async function (userId) {
  const existing = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!existing) {
    this.readBy.push({ user: userId });
    return this.save();
  }
  return this;
};

chatRoomSchema.methods.addMember = async function (userId, role = 'member') {
  const existing = this.members.find(m => m.user.toString() === userId.toString());
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.joinedAt = new Date();
    }
  } else {
    this.members.push({ user: userId, role });
  }
  this.stats.totalMembers = this.memberCount;
  return this.save();
};

chatRoomSchema.methods.removeMember = async function (userId) {
  const idx = this.members.findIndex(m => m.user.toString() === userId.toString());
  if (idx > -1) {
    this.members[idx].isActive = false;
    this.stats.totalMembers = this.memberCount;
    return this.save();
  }
  throw new Error('User is not a member of this room');
};

chatRoomSchema.methods.updateLastActivity = function () {
  this.lastActivity = new Date();
  this.stats.dailyMessages += 1;
  return this.save();
};

// --------------------------------------
// Static Methods
// --------------------------------------
chatRoomSchema.statics.findUserRooms = function (userId) {
  return this.find({
    'members.user': userId,
    'members.isActive': true,
    status: 'active',
  })
    .populate('course', 'name code')
    .populate('creator', 'firstName lastName avatar')
    .sort({ lastActivity: -1 });
};

chatRoomSchema.statics.findPublicRooms = function () {
  return this.find({
    isPrivate: false,
    status: 'active',
    type: { $ne: 'private' },
  })
    .populate('course', 'name code')
    .populate('creator', 'firstName lastName avatar')
    .sort({ 'stats.activeMembers': -1 });
};

// --------------------------------------
// Middleware
// --------------------------------------
messageSchema.pre('save', function (next) {
  if (this.isNew) {
    this.constructor
      .model('ChatRoom')
      .findByIdAndUpdate(
        this.chatRoom,
        { $inc: { 'stats.totalMessages': 1 }, $set: { lastActivity: new Date() } }
      )
      .exec();
  }
  next();
});

// --------------------------------------
// Model Exports
// --------------------------------------
const Message = mongoose.model('Message', messageSchema);
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = { Message, ChatRoom };
