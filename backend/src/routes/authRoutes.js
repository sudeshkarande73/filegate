const express = require('express');
const router = express.Router();
const { firebaseLogin, logout, status } = require('../controllers/authController');

router.post('/firebase-login', firebaseLogin);
router.post('/logout', logout);

//No requireAuth middleware here. The status controller handles the security check itself!
router.get('/status', status);

module.exports = router;