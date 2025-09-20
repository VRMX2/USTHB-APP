const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Course = require('../models/Course');

let io;
const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

// Initialize Socket.IO
const initializeSocket = (socketIO) => {
  io = socketIO;

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`📱 User ${socket.user.firstName} ${socket.user.lastName} connected`);
    
    // Store user connection
    connectedUsers.set(socket.userId, socket.id);
    userSockets.set(socket.id, socket.userId);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Join user to course rooms they have access to
    joinCourseRooms(socket);

    // Handle course room joining
    socket.on('join_course', async (courseId) => {
      try {
        const course = await Course.findById(courseId);
        if (!course) {
          socket.emit('error', { message: 'Course not found' });
          return;
        }

        // Check if user has access to the course
        const hasAccess = 
          course.enrolledStudents.includes(socket.userId) ||
          course.teacher.toString() === socket.userId ||
          socket.user.role === 'admin';

        if (hasAccess) {
          socket.join(`course_${courseId}`);
          socket.emit('course_joined', { 
            courseId, 
            courseName: course.name,
            message: `Joined ${course.name} chat room`
          });
          
          // Notify others in the course
          socket.to(`course_${courseId}`).emit('user_joined_course', {
            user: {
              id: socket.userId,
              name: `${socket.user.firstName} ${socket.user.lastName}`,
              role: socket.user.role
            },
            courseId
          });
        } else {
          socket.emit('error', { message: 'Not authorized to join this course' });
        }
      } catch (error) {
        console.error('Join course error:', error);
        socket.emit('error', { message: 'Failed to join course' });
      }
    });

    // Handle leaving course room
    socket.on('leave_course', (courseId) => {
      socket.leave(`course_${courseId}`);
      socket.emit('course_left', { courseId, message: 'Left course chat room' });
      
      // Notify others in the course
      socket.to(`course_${courseId}`).emit('user_left_course', {
        user: {
          id: socket.userId,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          role: socket.user.role
        },
        courseId
      });
    });

    // Handle private message typing indicators
    socket.on('typing_start', (data) => {
      if (data.recipientId && data.conversationType === 'private') {
        socket.to(`user_${data.recipientId}`).emit('user_typing', {
          userId: socket.userId,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          conversationType: 'private'
        });
      } else if (data.courseId && data.conversationType === 'course') {
        socket.to(`course_${data.courseId}`).emit('user_typing', {
          userId: socket.userId,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          courseId: data.courseId,
          conversationType: 'course'
        });
      }
    });

    socket.on('typing_stop', (data) => {
      if (data.recipientId && data.conversationType === 'private') {
        socket.to(`user_${data.recipientId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          conversationType: 'private'
        });
      } else if (data.courseId && data.conversationType === 'course') {
        socket.to(`course_${data.courseId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          courseId: data.courseId,
          conversationType: 'course'
        });
      }
    });

    // Handle message read receipts
    socket.on('message_read', (data) => {
      const { messageId, senderId, conversationType, courseId } = data;
      
      if (conversationType === 'private' && senderId) {
        socket.to(`user_${senderId}`).emit('message_read_receipt', {
          messageId,
          readBy: socket.userId,
          readAt: new Date()
        });
      } else if (conversationType === 'course' && courseId) {
        socket.to(`course_${courseId}`).emit('message_read_receipt', {
          messageId,
          readBy: socket.userId,
          readAt: new Date(),
          courseId
        });
      }
    });

    // Handle online status
    socket.on('status_update', (status) => {
      socket.user.onlineStatus = status;
      
      // Broadcast status update to relevant users
      broadcastStatusUpdate(socket.userId, {
        status,
        lastSeen: new Date()
      });
    });

    // Handle file sharing in courses
    socket.on('file_shared', (data) => {
      const { courseId, fileInfo } = data;
      
      socket.to(`course_${courseId}`).emit('file_shared', {
        fileInfo,
        sharedBy: {
          id: socket.userId,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          role: socket.user.role
        },
        courseId,
        timestamp: new Date()
      });
    });

    // Handle announcement notifications
    socket.on('announcement_created', (data) => {
      const { announcement } = data;
      
      // Broadcast to relevant users based on announcement scope
      if (announcement.type === 'general') {
        io.emit('new_announcement', announcement);
      } else if (announcement.department) {
        io.to(`department_${announcement.department}`).emit('new_announcement', announcement);
      } else if (announcement.course) {
        io.to(`course_${announcement.course}`).emit('new_announcement', announcement);
      }
    });

    // Handle grade notifications
    socket.on('grade_updated', (data) => {
      const { studentId, gradeInfo } = data;
      
      socket.to(`user_${studentId}`).emit('grade_updated', {
        ...gradeInfo,
        timestamp: new Date()
      });
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      socket.emit('connection_error', { message: 'Connection failed' });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`📱 User ${socket.user.firstName} ${socket.user.lastName} disconnected: ${reason}`);
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      userSockets.delete(socket.id);
      
      // Update user's last seen
      updateUserLastSeen(socket.userId);
      
      // Broadcast offline status
      broadcastStatusUpdate(socket.userId, {
        status: 'offline',
        lastSeen: new Date()
      });
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      message: 'Connected to USTHB App',
      user: {
        id: socket.userId,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
        role: socket.user.role
      },
      timestamp: new Date()
    });
  });

  return io;
};

// Helper function to join user to course rooms they have access to
const joinCourseRooms = async (socket) => {
  try {
    let courses = [];
    
    if (socket.user.role === 'student') {
      courses = await Course.find({ 
        enrolledStudents: socket.userId 
      }).select('_id name code');
    } else if (socket.user.role === 'teacher') {
      courses = await Course.find({ 
        $or: [
          { teacher: socket.userId },
          { enrolledStudents: socket.userId }
        ]
      }).select('_id name code');
    } else if (socket.user.role === 'admin') {
      courses = await Course.find({}).select('_id name code');
    }

    courses.forEach(course => {
      socket.join(`course_${course._id}`);
    });

    // Also join department room
    if (socket.user.department) {
      socket.join(`department_${socket.user.department}`);
    }

    console.log(`User ${socket.user.firstName} joined ${courses.length} course rooms`);
  } catch (error) {
    console.error('Error joining course rooms:', error);
  }
};

// Helper function to broadcast status updates
const broadcastStatusUpdate = async (userId, statusInfo) => {
  try {
    // Find users who should receive this status update
    // (users in same courses, private conversations, etc.)
    const user = await User.findById(userId);
    if (!user) return;

    // Broadcast to courses the user is part of
    if (user.role === 'student' && user.enrolledCourses) {
      user.enrolledCourses.forEach(courseId => {
        io.to(`course_${courseId}`).emit('user_status_update', {
          userId,
          ...statusInfo
        });
      });
    }

    // Broadcast to department
    if (user.department) {
      io.to(`department_${user.department}`).emit('user_status_update', {
        userId,
        ...statusInfo
      });
    }
  } catch (error) {
    console.error('Error broadcasting status update:', error);
  }
};

// Helper function to update user's last seen
const updateUserLastSeen = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date(),
      onlineStatus: 'offline'
    });
  } catch (error) {
    console.error('Error updating last seen:', error);
  }
};

// Function to emit to specific user
const emitToUser = (userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId && io) {
    io.to(`user_${userId}`).emit(event, data);
    return true;
  }
  return false;
};

// Function to emit to course
const emitToCourse = (courseId, event, data) => {
  if (io) {
    io.to(`course_${courseId}`).emit(event, data);
    return true;
  }
  return false;
};

// Function to emit to department
const emitToDepartment = (department, event, data) => {
  if (io) {
    io.to(`department_${department}`).emit(event, data);
    return true;
  }
  return false;
};

// Function to broadcast to all connected users
const broadcastToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    return true;
  }
  return false;
};

// Function to get online users count
const getOnlineUsersCount = () => {
  return connectedUsers.size;
};

// Function to get online users in a course
const getCourseOnlineUsers = (courseId) => {
  if (!io) return [];
  
  const room = io.sockets.adapter.rooms.get(`course_${courseId}`);
  if (!room) return [];
  
  const onlineUsers = [];
  room.forEach(socketId => {
    const userId = userSockets.get(socketId);
    if (userId) {
      onlineUsers.push(userId);
    }
  });
  
  return onlineUsers;
};

// Function to check if user is online
const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

// Function to get socket instance for external use
const getSocketInstance = () => {
  return io;
};

module.exports = {
  initializeSocket,
  emitToUser,
  emitToCourse,
  emitToDepartment,
  broadcastToAll,
  getOnlineUsersCount,
  getCourseOnlineUsers,
  isUserOnline,
  getSocketInstance
};