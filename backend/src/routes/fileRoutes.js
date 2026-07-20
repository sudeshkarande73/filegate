const express = require('express');
const router = express.Router();
const multer = require('multer');

// 👉 Notice downloadFile instead of unlockFile
const { uploadFile, downloadFile, getMyFiles, revokeAccess, removeUserAccess, addUserAccess } = require('../controllers/fileController');
const requireAuth = require('../middlewares/requireAuth');

// 🚀 PRODUCTION UPGRADE: Disk Storage & 10MB Limit
const upload = multer({ 
  dest: 'temp_uploads/', 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

router.post('/upload', requireAuth, upload.single('vaultFile'), uploadFile);
router.get('/download/:id', requireAuth, downloadFile); // <-- Serves the raw binary for frontend decryption

router.get('/vault', requireAuth, getMyFiles);
router.delete('/revoke/:id', requireAuth, revokeAccess); 
router.put('/revoke-user/:id', requireAuth, removeUserAccess); 
router.put('/grant-user/:id', requireAuth, addUserAccess); 

module.exports = router;