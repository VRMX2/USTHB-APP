const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Define storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Organize files by type and date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    switch (file.fieldname) {
      case 'avatar':
      case 'profilePicture':
        uploadPath += `avatars/${year}/${month}/`;
        break;
      case 'courseResource':
      case 'resource':
        uploadPath += `resources/${year}/${month}/`;
        break;
      case 'assignment':
        uploadPath += `assignments/${year}/${month}/`;
        break;
      case 'announcement':
        uploadPath += `announcements/${year}/${month}/`;
        break;
      case 'chatFile':
        uploadPath += `chat/${year}/${month}/`;
        break;
      case 'syllabus':
        uploadPath += `syllabus/${year}/${month}/`;
        break;
      default:
        uploadPath += `general/${year}/${month}/`;
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    
    // Sanitize filename
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedName}_${timestamp}_${randomString}${ext}`;
    
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types by field
  const allowedTypes = {
    avatar: {
      mimetypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
      extensions: ['.jpg', '.jpeg', '.png', '.gif'],
      maxSize: 5 * 1024 * 1024 // 5MB
    },
    courseResource: {
      mimetypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'video/mp4',
        'audio/mpeg'
      ],
      extensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mp3'],
      maxSize: 50 * 1024 * 1024 // 50MB
    },
    assignment: {
      mimetypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
      ],
      extensions: ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'],
      maxSize: 25 * 1024 * 1024 // 25MB
    },
    chatFile: {
      mimetypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'audio/mpeg',
        'video/mp4'
      ],
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.mp3', '.mp4'],
      maxSize: 10 * 1024 * 1024 // 10MB
    }
  };

  const fieldConfig = allowedTypes[file.fieldname] || allowedTypes.courseResource;
  const ext = path.extname(file.originalname).toLowerCase();

  // Check file extension
  if (!fieldConfig.extensions.includes(ext)) {
    return cb(new Error(`Invalid file extension. Allowed: ${fieldConfig.extensions.join(', ')}`), false);
  }

  // Check mimetype
  if (!fieldConfig.mimetypes.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed types: ${fieldConfig.mimetypes.join(', ')}`), false);
  }

  cb(null, true);
};

// Create multer upload instances
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10, // Maximum number of files
    fields: 20 // Maximum number of non-file fields
  }
});

// Specific upload configurations for different use cases
const uploadAvatar = upload.single('avatar');
const uploadCourseResource = upload.single('courseResource');
const uploadAssignment = upload.single('assignment');
const uploadChatFile = upload.single('chatFile');
const uploadSyllabus = upload.single('syllabus');
const uploadMultipleResources = upload.array('resources', 5);
const uploadAnnouncementFiles = upload.array('attachments', 3);

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size allowed is 50MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum allowed is 10 files.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.'
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many fields in the request.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Upload error: ' + err.message
        });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// File validation middleware (additional security checks)
const validateUploadedFile = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];

  try {
    for (const file of files) {
      // Check if file actually exists
      if (!fs.existsSync(file.path)) {
        return res.status(400).json({
          success: false,
          message: 'Uploaded file not found on server'
        });
      }

      // Additional security checks could be added here:
      // - Virus scanning
      // - File content validation
      // - Image processing for thumbnails
      
      // Generate file checksum for integrity
      const fileBuffer = fs.readFileSync(file.path);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Add checksum to file object
      file.checksum = checksum;

      // For images, you could add thumbnail generation here
      if (file.mimetype.startsWith('image/')) {
        // Thumbnail generation would go here
        // file.thumbnailPath = generateThumbnail(file.path);
      }
    }

    next();
  } catch (error) {
    console.error('File validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating uploaded file'
    });
  }
};

// Clean up failed uploads
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  const cleanup = () => {
    if (res.statusCode >= 400) {
      // Clean up uploaded files on error
      const files = req.files || [req.file].filter(Boolean);
      files.forEach(file => {
        if (file && file.path && fs.existsSync(file.path)) {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error cleaning up file:', err);
          });
        }
      });
    }
  };

  res.send = function(data) {
    cleanup();
    originalSend.call(this, data);
  };

  res.json = function(data) {
    cleanup();
    originalJson.call(this, data);
  };

  next();
};

// Role-based upload permissions
const checkUploadPermissions = (requiredRole = null) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for file upload'
      });
    }

    // Define role-based upload limits
    const uploadLimits = {
      student: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['assignment', 'chatFile'],
        dailyLimit: 50 // 50 files per day
      },
      teacher: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['courseResource', 'assignment', 'syllabus', 'chatFile', 'avatar'],
        dailyLimit: 200 // 200 files per day
      },
      admin: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['courseResource', 'assignment', 'syllabus', 'chatFile', 'avatar', 'announcement'],
        dailyLimit: 1000 // 1000 files per day
      }
    };

    const userLimits = uploadLimits[req.user.role] || uploadLimits.student;

    // Check if user can upload this type of file
    const uploadType = req.body.uploadType || 'general';
    if (!userLimits.allowedTypes.includes(uploadType)) {
      return res.status(403).json({
        success: false,
        message: `Your role (${req.user.role}) is not allowed to upload ${uploadType} files`
      });
    }

    // Add limits to request for multer to use
    req.uploadLimits = userLimits;

    if (requiredRole && req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: `Upload requires ${requiredRole} role or higher`
      });
    }

    next();
  };
};

// Storage space management
const checkStorageQuota = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Define storage quotas by role (in bytes)
    const storageQuotas = {
      student: 500 * 1024 * 1024,   // 500MB
      teacher: 2 * 1024 * 1024 * 1024, // 2GB
      admin: 10 * 1024 * 1024 * 1024   // 10GB
    };

    const userQuota = storageQuotas[req.user.role] || storageQuotas.student;

    // Calculate current usage (this would typically be stored in the database)
    // For now, we'll skip this check but the structure is here
    // const currentUsage = await calculateUserStorageUsage(req.user._id);

    // if (currentUsage + estimatedUploadSize > userQuota) {
    //   return res.status(413).json({
    //     success: false,
    //     message: 'Storage quota exceeded'
    //   });
    // }

    next();
  } catch (error) {
    console.error('Storage quota check error:', error);
    next(); // Continue on error
  }
};

// File metadata extractor
const extractFileMetadata = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];

  files.forEach(file => {
    // Add additional metadata
    file.uploadedAt = new Date();
    file.uploadedBy = req.user?._id;
    file.fileExtension = path.extname(file.originalname).toLowerCase();
    file.baseName = path.basename(file.originalname, file.fileExtension);
    
    // Categorize file type
    if (file.mimetype.startsWith('image/')) {
      file.category = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      file.category = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      file.category = 'audio';
    } else if (file.mimetype === 'application/pdf') {
      file.category = 'pdf';
    } else if (file.mimetype.includes('document') || file.mimetype.includes('word')) {
      file.category = 'document';
    } else if (file.mimetype.includes('presentation') || file.mimetype.includes('powerpoint')) {
      file.category = 'presentation';
    } else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) {
      file.category = 'spreadsheet';
    } else {
      file.category = 'other';
    }
  });

  next();
};

module.exports = {
  upload,
  uploadAvatar,
  uploadCourseResource,
  uploadAssignment,
  uploadChatFile,
  uploadSyllabus,
  uploadMultipleResources,
  uploadAnnouncementFiles,
  handleUploadError,
  validateUploadedFile,
  cleanupOnError,
  checkUploadPermissions,
  checkStorageQuota,
  extractFileMetadata
};