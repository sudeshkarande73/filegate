const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const { firebaseLogin, logout, checkAuthStatus } = require('../controllers/authController');

router.post('/firebase-login', firebaseLogin);
router.post('/logout', logout);
router.get('/status', requireAuth, checkAuthStatus);

module.exports = router;