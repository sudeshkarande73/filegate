const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth'); // 🚀 NEW: Import Gatekeeper
const { loginRequest, signupRequest, verifyOtp, logout, checkAuthStatus } = require('../controllers/authController');

router.post('/login-request', loginRequest);
router.post('/signup-request', signupRequest);
router.post('/verify-otp', verifyOtp);
router.post('/logout', logout);

// 🚀 NEW: The route React calls on refresh to check the cookie
router.get('/status', requireAuth, checkAuthStatus); 

module.exports = router;