const Message = require('../models/Message');
const Course = require('../models/Course');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get messages for a course
// @route   GET /api/chat/course/:courseId
// @access  Private
const getCourseMessages = async (req, res) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Check if course exists and user has access
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user.userId);
    const hasAccess = 
      course.enrolledStudents.includes(req.user.userId) ||
      course.teacher.toString() === req.user.userId ||
      user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Not authorized to view messages for this course' 
      });
    }

    const messages = await Message.find({ 
      course: courseId,
      messageType: 'course'
    })
      .populate('sender', 'firstName lastName profilePicture role studentId')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalMessages = await Message.countDocuments({ 
      course: courseId,
      messageType: 'course'
    });

    // Reverse to show oldest first
    messages.reverse();

    res.json({
      message: 'Course messages retrieved successfully',
      messages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages
    });

  } catch (error) {
    console.error('Get course messages error:', error);
    res.status(500).json({ 
      message: 'Server error getting messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send message to course
// @route   POST /api/chat/course/:courseId
// @access  Private
const sendCourseMessage = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { courseId } = req.params;
    const { content, replyTo, attachments } = req.body;

    // Check if course exists and user has access
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user.userId);
    const hasAccess = 
      course.enrolledStudents.includes(req.user.userId) ||
      course.teacher.toString() === req.user.userId ||
      user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Not authorized to send messages to this course' 
      });
    }

    // Validate reply message if specified
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.course.toString() !== courseId) {
        return res.status(400).json({ 
          message: 'Invalid reply message' 
        });
      }
    }

    const message = new Message({
      content,
      sender: req.user.userId,
      course: courseId,
      messageType: 'course',
      replyTo: replyTo || null,
      attachments: attachments || []
    });

    await message.save();

    await message.populate([
      { path: 'sender', select: 'firstName lastName profilePicture role studentId' },
      { path: 'replyTo', select: 'content sender' }
    ]);

    // Emit to socket for real-time updates
    const io = req.app.get('socketio');
    if (io) {
      io.to(`course_${courseId}`).emit('new_message', {
        message,
        course: courseId
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send course message error:', error);
    res.status(500).json({ 
      message: 'Server error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get private messages between two users
// @route   GET /api/chat/private/:userId
// @access  Private
const getPrivateMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await Message.find({
      messageType: 'private',
      $or: [
        { sender: req.user.userId, recipient: userId },
        { sender: userId, recipient: req.user.userId }
      ]
    })
      .populate('sender', 'firstName lastName profilePicture role studentId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalMessages = await Message.countDocuments({
      messageType: 'private',
      $or: [
        { sender: req.user.userId, recipient: userId },
        { sender: userId, recipient: req.user.userId }
      ]
    });

    // Reverse to show oldest first
    messages.reverse();

    // Mark messages as read
    await Message.updateMany(
      { 
        sender: userId, 
        recipient: req.user.userId, 
        messageType: 'private',
        isRead: false 
      },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      message: 'Private messages retrieved successfully',
      messages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      conversation: {
        user1: req.user.userId,
        user2: userId
      }
    });

  } catch (error) {
    console.error('Get private messages error:', error);
    res.status(500).json({ 
      message: 'Server error getting private messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send private message
// @route   POST /api/chat/private/:userId
// @access  Private
const sendPrivateMessage = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { userId } = req.params;
    const { content, attachments } = req.body;

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent sending message to self
    if (userId === req.user.userId) {
      return res.status(400).json({ 
        message: 'Cannot send message to yourself' 
      });
    }

    const message = new Message({
      content,
      sender: req.user.userId,
      recipient: userId,
      messageType: 'private',
      attachments: attachments || []
    });

    await message.save();

    await message.populate('sender', 'firstName lastName profilePicture role studentId');

    // Emit to socket for real-time updates
    const io = req.app.get('socketio');
    if (io) {
      io.to(`user_${userId}`).emit('new_private_message', {
        message,
        from: req.user.userId
      });
    }

    res.status(201).json({
      message: 'Private message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send private message error:', error);
    res.status(500).json({ 
      message: 'Server error sending private message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's conversations
// @route   GET /api/chat/conversations
// @access  Private
const getUserConversations = async (req, res) => {
  try {
    // Get latest message for each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          messageType: 'private',
          $or: [
            { sender: req.user.userId },
            { recipient: req.user.userId }
          ]
        }
      },
      {
        $addFields: {
          conversationPartner: {
            $cond: [
              { $eq: ['$sender', req.user.userId] },
              '$recipient',
              '$sender'
            ]
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationPartner',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', req.user.userId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'partner'
        }
      },
      {
        $unwind: '$partner'
      },
      {
        $project: {
          partner: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            profilePicture: 1,
            role: 1,
            studentId: 1,
            isActive: 1
          },
          lastMessage: {
            content: 1,
            createdAt: 1,
            sender: 1,
            isRead: 1
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      message: 'Conversations retrieved successfully',
      conversations
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      message: 'Server error getting conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/mark-read/:userId
// @access  Private
const markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Message.updateMany(
      { 
        sender: userId, 
        recipient: req.user.userId, 
        messageType: 'private',
        isRead: false 
      },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      message: 'Messages marked as read',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ 
      message: 'Server error marking messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/message/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender or admin
    const user = await User.findById(req.user.userId);
    if (message.sender.toString() !== req.user.userId && user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete this message' 
      });
    }

    await Message.findByIdAndDelete(messageId);

    // Emit to socket for real-time updates
    const io = req.app.get('socketio');
    if (io) {
      if (message.messageType === 'course') {
        io.to(`course_${message.course}`).emit('message_deleted', {
          messageId,
          course: message.course
        });
      } else if (message.messageType === 'private') {
        io.to(`user_${message.recipient}`).emit('private_message_deleted', {
          messageId,
          conversationWith: message.sender
        });
      }
    }

    res.json({
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      message: 'Server error deleting message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Search messages
// @route   GET /api/chat/search
// @access  Private
const searchMessages = async (req, res) => {
  try {
    const { q, type, courseId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    let filter = {
      content: { $regex: q, $options: 'i' },
      $or: [
        { sender: req.user.userId },
        { recipient: req.user.userId }
      ]
    };

    // Filter by message type
    if (type === 'course') {
      filter.messageType = 'course';
      delete filter.$or; // Remove private message filter for course search
      
      // Get user's enrolled courses for filtering
      const user = await User.findById(req.user.userId);
      const accessibleCourses = await Course.find({
        $or: [
          { enrolledStudents: req.user.userId },
          { teacher: req.user.userId },
          ...(user.role === 'admin' ? [{}] : [])
        ]
      }).select('_id');
      
      filter.course = { $in: accessibleCourses.map(c => c._id) };
      
      if (courseId) {
        filter.course = courseId;
      }
    } else if (type === 'private') {
      filter.messageType = 'private';
    }

    const messages = await Message.find(filter)
      .populate('sender', 'firstName lastName profilePicture role studentId')
      .populate('recipient', 'firstName lastName profilePicture role studentId')
      .populate('course', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalMessages = await Message.countDocuments(filter);

    res.json({
      message: 'Search results retrieved successfully',
      messages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      searchQuery: q
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ 
      message: 'Server error searching messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/chat/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Message.countDocuments({
      recipient: req.user.userId,
      messageType: 'private',
      isRead: false
    });

    res.json({
      message: 'Unread count retrieved successfully',
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      message: 'Server error getting unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCourseMessages,
  sendCourseMessage,
  getPrivateMessages,
  sendPrivateMessage,
  getUserConversations,
  markMessagesAsRead,
  deleteMessage,
  searchMessages,
  getUn