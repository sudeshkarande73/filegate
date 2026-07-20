const multer = require('multer');

// We use memoryStorage so the file is kept in RAM as a Buffer, not saved to disk.
const storage = multer.memoryStorage();

// Set a file size limit (e.g., 10MB) to protect your server from crashing
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

module.exports = upload;