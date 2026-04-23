// ============================================================
// FILE: server/middleware/upload.cjs
// ✅ SAMPLE: Multer configuration with 30 file limit
// NOTE: If you already have multer configured in server.cjs,
//       update those settings instead of creating this new file
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================
// PHOTO LIMITS - Must match booking.controller.cjs and documents.controller.cjs
// ============================================================
const MAX_PICKUP_PHOTOS = 30;
const MAX_DELIVERY_PHOTOS = 30;
const MAX_FILES_PER_REQUEST = 30; // Max files in single upload request
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

// ============================================================
// ALLOWED FILE TYPES
// ============================================================
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

// ============================================================
// UPLOAD DIRECTORY
// ============================================================
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'temp');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================================
// STORAGE CONFIGURATION
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4().slice(0, 8);
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 50);
    cb(null, `${timestamp}-${uniqueId}-${safeName}${ext}`);
  },
});

// ============================================================
// FILE FILTER
// ============================================================
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error(`File type not allowed: ${file.mimetype}`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(`File extension not allowed: ${ext}`);
    error.code = 'INVALID_FILE_EXTENSION';
    return cb(error, false);
  }

  cb(null, true);
};

// ============================================================
// MULTER INSTANCES
// ============================================================

// Single file upload (for POD, gate pass, etc.)
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).single('file');

// Multiple file upload (for pickup/delivery photos)
// ✅ UPDATED: Limit increased to 30
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST, // ✅ Max 30 files per request
  },
}).array('files', MAX_FILES_PER_REQUEST);

// Flexible upload (handles both single and multiple)
const uploadAny = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
  },
}).any();

// ============================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: `Too many files. Maximum ${MAX_FILES_PER_REQUEST} files allowed per request`,
          code: 'TOO_MANY_FILES',
          maxAllowed: MAX_FILES_PER_REQUEST,
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field',
          code: 'UNEXPECTED_FILE',
        });
      default:
        return res.status(400).json({
          success: false,
          message: err.message,
          code: err.code,
        });
    }
  }

  if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_FILE_EXTENSION') {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code,
      allowedTypes: ALLOWED_MIME_TYPES,
    });
  }

  next(err);
};

// ============================================================
// WRAPPER MIDDLEWARE FOR EASY USE
// ============================================================

// Use for single file uploads
const singleFileUpload = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
};

// Use for multiple file uploads (pickup/delivery photos)
const multipleFileUpload = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
};

// Use when you don't know if it's single or multiple
const flexibleUpload = (req, res, next) => {
  uploadAny(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  // Middleware functions
  singleFileUpload,
  multipleFileUpload,
  flexibleUpload,
  handleMulterError,
  
  // Raw multer instances (if needed)
  uploadSingle,
  uploadMultiple,
  uploadAny,
  
  // Constants
  MAX_PICKUP_PHOTOS,
  MAX_DELIVERY_PHOTOS,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  UPLOAD_DIR,
};
