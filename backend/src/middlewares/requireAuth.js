const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  try {
    // 1. Extract the cryptographic token from the secure cookie
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'ACCESS DENIED: No cryptographic token provided.' });
    }

    // 2. Decode the token using your environment secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user in the database
    // We map decoded.id because that is exactly how we signed it in authController.js
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'ACCESS DENIED: Unrecognized cryptographic identity.' });
    }

    // 4. Session Hijacking Prevention (Zero-Trust Concurrency)
    // If the token doesn't match the active session in the DB, force a disconnect
    if (decoded.sessionToken && user.activeSessionToken !== decoded.sessionToken) {
       return res.status(401).json({ error: 'ACCESS DENIED: Session invalidated. You logged in on another device.' });
    }

    // 5. Explicitly map the ID to fix the MongoDB ValidationError
    req.user = user;
    req.user.id = user._id.toString(); // <--- THIS FIXES THE CRASH

    next(); // Pass control to the File Controller
  } catch (error) {
    console.error('[AUTH ERROR]:', error.message);
    res.status(401).json({ error: 'ACCESS DENIED: Invalid or expired token.' });
  }
};

module.exports = requireAuth;