const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Allowed file types and their corresponding MIME types
const ALLOWED_FILE_TYPES = {
  // Documents
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain'],
  
  // Images
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  svg: ['image/svg+xml'],
  
  // Archives
  zip: ['application/zip'],
  rar: ['application/x-rar-compressed']
};

// File size limits (in MB)
const FILE_SIZE_LIMITS = {
  image: 5,      // 5MB for images
  document: 50,  // 50MB for documents
  archive: 100,  // 100MB for archives
  video: 500     // 500MB for videos (if needed)
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, extension);
  
  return `${baseName}_${timestamp}_${randomString}${extension}`;
};

/**
 * Get file category based on MIME type
 * @param {string} mimetype - File MIME type
 */
const getFileCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
  if (mimetype.includes('zip') || mimetype.includes('rar')) return 'archive';
  return 'other';
};

/**
 * Validate file type
 * @param {string} mimetype - File MIME type
 * @param {string} originalname - Original filename
 */
const validateFileType = (mimetype, originalname) => {
  const extension = path.extname(originalname).toLowerCase().substring(1);
  const allowedTypes = ALLOWED_FILE_TYPES[extension];
  
  if (!allowedTypes) {
    return {
      isValid: false,
      error: `File type .${extension} is not allowed`
    };
  }
  
  if (!allowedTypes.includes(mimetype)) {
    return {
      isValid: false,
      error: `MIME type ${mimetype} doesn't match expected type for .${extension} files`
    };
  }
  
  return { isValid: true };
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {string} mimetype - File MIME type
 */
const validateFileSize = (size, mimetype) => {
  const category = getFileCategory(mimetype);
  const limitInBytes = FILE_SIZE_LIMITS[category] * 1024 * 1024;
  
  if (size > limitInBytes) {
    return {
      isValid: false,
      error: `File size exceeds the limit of ${FILE_SIZE_LIMITS[category]}MB for ${category} files`
    };
  }
  
  return { isValid: true };
};

/**
 * Create upload directory if it doesn't exist
 * @param {string} dirPath - Directory path
 */
const ensureUploadDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
};

/**
 * Delete file from filesystem
 * @param {string} filePath - Path to file
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, message: 'File already deleted' };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Get file information
 * @param {string} filePath - Path to file
 */
const getFileInfo = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false };
    }
    throw error;
  }
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 */
const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Generate file URL for client access
 * @param {string} filename - Filename
 * @param {string} category - File category (documents, images, etc.)
 */
const generateFileUrl = (filename, category = 'uploads') => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/api/files/${category}/${filename}`;
};

/**
 * Multer storage configuration for different file types
 */
const createMulterStorage = (uploadPath) => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      const category = getFileCategory(file.mimetype);
      const fullPath = path.join(uploadPath, category);
      
      try {
        await ensureUploadDir(fullPath);
        cb(null, fullPath);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueName = generateUniqueFilename(file.originalname);
      cb(null, uniqueName);
    }
  });
};

/**
 * Multer file filter
 */
const fileFilter = (req, file, cb) => {
  // Validate file type
  const typeValidation = validateFileType(file.mimetype, file.originalname);
  if (!typeValidation.isValid) {
    return cb(new Error(typeValidation.error), false);
  }
  
  cb(null, true);
};

/**
 * Create multer upload middleware
 * @param {string} uploadPath - Base upload path
 * @param {number} maxSize - Max file size in MB (optional)
 */
const createUploadMiddleware = (uploadPath = './uploads', maxSize = null) => {
  const storage = createMulterStorage(uploadPath);
  
  const options = {
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize ? maxSize * 1024 * 1024 : 100 * 1024 * 1024 // Default 100MB
    }
  };
  
  return multer(options);
};

/**
 * Clean up old files (older than specified days)
 * @param {string} dirPath - Directory to clean
 * @param {number} daysOld - Files older than this many days will be deleted
 */
const cleanupOldFiles = async (dirPath, daysOld = 30) => {
  try {
    const files = await fs.readdir(dirPath);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    
    return { success: true, deletedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get directory size
 * @param {string} dirPath - Directory path
 */
const getDirectorySize = async (dirPath) => {
  let totalSize = 0;
  
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    return 0;
  }
};

/**
 * Create directory structure for organized file storage
 * @param {string} basePath - Base upload path
 */
const createUploadStructure = async (basePath = './uploads') => {
  const directories = [
    'documents',
    'images',
    'archives',
    'temp',
    'profiles',
    'course-materials',
    'assignments'
  ];
  
  try {
    await ensureUploadDir(basePath);
    
    for (const dir of directories) {
      await ensureUploadDir(path.join(basePath, dir));
    }
    
    return { success: true, message: 'Upload structure created successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 */
const sanitizeFilename = (filename) => {
  // Remove potentially dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Check if file is image
 * @param {string} mimetype - File MIME type
 */
const isImage = (mimetype) => {
  return mimetype.startsWith('image/');
};

/**
 * Check if file is document
 * @param {string} mimetype - File MIME type
 */
const isDocument = (mimetype) => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ];
  return documentTypes.includes(mimetype);
};

/**
 * Get file extension from MIME type
 * @param {string} mimetype - File MIME type
 */
const getExtensionFromMimeType = (mimetype) => {
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'application/zip': '.zip'
  };
  
  return mimeToExt[mimetype] || '';
};

module.exports = {
  generateUniqueFilename,
  getFileCategory,
  validateFileType,
  validateFileSize,
  ensureUploadDir,
  deleteFile,
  getFileInfo,
  formatFileSize,
  generateFileUrl,
  createMulterStorage,
  fileFilter,
  createUploadMiddleware,
  cleanupOldFiles,
  getDirectorySize,
  createUploadStructure,
  sanitizeFilename,
  isImage,
  isDocument,
  getExtensionFromMimeType,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS
};