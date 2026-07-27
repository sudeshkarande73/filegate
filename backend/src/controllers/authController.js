const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('../config/firebaseAdmin'); // This runs the initialization
const { getAuth } = require('firebase-admin/auth'); // Modern modular auth

exports.firebaseLogin = async (req, res) => {
  try {
    const { idToken, name } = req.body;

    if (!idToken) {
      return res.status(401).json({ error: 'No authentication token provided.' });
    }

    // 1. Verify the Firebase Token
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

// 🚀 NECESSARY CHANGE: Renamed to `status` to match your routes, and added robust token decoding 
// to fix the "Zombie Login" and 404 error on page refresh.
exports.status = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ isAuthenticated: false });
    
    // Decode the token directly here so it works even without middleware
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) return res.status(401).json({ isAuthenticated: false });

    // 🚀 Security Bonus: This checks if they logged in on another device and invalidates this one!
    if (decoded.sessionToken && user.activeSessionToken !== decoded.sessionToken) {
        return res.status(401).json({ isAuthenticated: false, error: 'Session invalidated by another login.' });
    }
    
    res.status(200).json({ 
      isAuthenticated: true, 
      user: { id: user._id, email: user.email, name: user.name } 
    });
  } catch (err) {
    res.status(401).json({ isAuthenticated: false });
  }
};