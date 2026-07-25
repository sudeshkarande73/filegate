const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Remove: const admin = require('../config/firebaseAdmin');
// Add these:
require('../config/firebaseAdmin'); // This runs the initialization
const { getAuth } = require('firebase-admin/auth'); // Modern modular auth

exports.firebaseLogin = async (req, res) => {
  try {
    const { idToken, name } = req.body;

    if (!idToken) {
      return res.status(401).json({ error: 'No authentication token provided.' });
    }

    // 1. Verify the Firebase Token
   // OLD WAY (Delete this):
    // const decodedToken = await admin.auth().verifyIdToken(idToken);

    // NEW WAY (Add this):
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { email, uid, email_verified } = decodedToken;

    // 2. Enforce Email Verification strictly on the backend
    if (!email_verified) {
      return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address.' });
    }

    // 3. Sync with MongoDB (Create if it doesn't exist)
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({
        email,
        name: name || email.split('@')[0], // Use provided name, or fallback to email prefix
        firebaseUid: uid
      });
    }

    // 4. Concurrency Handshake (Invalidate old sessions)
    const sessionToken = crypto.randomBytes(16).toString('hex');
    await User.updateOne({ _id: user._id }, { $set: { activeSessionToken: sessionToken } });

    // 5. Generate your custom FileGate JWT
    const token = jwt.sign(
      { id: user._id, sessionToken },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 6. Set the HTTP-Only Cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isProduction, 
      sameSite: isProduction ? 'none' : 'lax', 
      maxAge: 24 * 60 * 60 * 1000 
    });

    res.status(200).json({ 
      message: 'Authentication successful', 
      user: { id: user._id, email: user.email, name: user.name } 
    });

  } catch (error) {
    console.error('[FIREBASE AUTH ERROR]:', error);
    res.status(401).json({ error: 'Invalid or expired cryptographic token.' });
  }
};

exports.logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.status(200).json({ message: 'Disconnected.' });
};

// Required for Auto-Restore on Page Refresh
exports.checkAuthStatus = (req, res) => {
  res.status(200).json({ 
    user: { id: req.user._id, email: req.user.email, name: req.user.name } 
  });
};