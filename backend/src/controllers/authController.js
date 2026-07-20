const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// 🚀 NEW: Importing your dedicated utility
const sendEmail = require('../utils/emailService'); 

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Flow 1: Login Request
exports.loginRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const lowerEmail = email.toLowerCase();
    
    const user = await User.findOne({ email: lowerEmail });
    
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Account not found. Please sign up.' });
    }

    const otp = generateOTP();
    await Otp.findOneAndUpdate(
      { email: lowerEmail },
      { otp, tempData: { isSignup: false } },
      { upsert: true, new: true } 
    );

    // 🚀 THE FIX: Using your email service
    const subject = "Your FileGate Authentication Token";
    const text = `Your secure login token is: ${otp}\n\nThis token will expire in 5 minutes. Do not share it with anyone.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #0f172a;">FileGate Security</h2>
        <p>You requested to log in. Your secure authentication token is:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 4px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #ef4444; font-size: 12px;">This token expires in 5 minutes. Do not share this with anyone.</p>
      </div>
    `;

    await sendEmail(lowerEmail, subject, text, html);

    res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login request failed. Check email server configuration.' });
  }
};

// Flow 2: Sign Up Request
exports.signupRequest = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const lowerEmail = email.toLowerCase();

    const existingUser = await User.findOne({ $or: [{ email: lowerEmail }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ error: 'DUPLICATE_USER', message: 'Email or Phone number is already registered.' });
    }

    const otp = generateOTP();
    await Otp.findOneAndUpdate(
      { email: lowerEmail },
      { otp, tempData: { name, phone, isSignup: true } },
      { upsert: true, new: true }
    );

    // 🚀 THE FIX: Using your email service
    const subject = "Verify your FileGate Identity";
    const text = `Your identity verification token is: ${otp}\n\nThis token will expire in 5 minutes.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #0f172a;">FileGate Clearance</h2>
        <p>You requested a new cryptographic identity. Your verification token is:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 4px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 12px;">This token expires in 5 minutes.</p>
      </div>
    `;

    await sendEmail(lowerEmail, subject, text, html);

    res.status(200).json({ message: 'Verification OTP sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Signup request failed. Check email server configuration.' });
  }
};

// Flow 3: Verify OTP & Issue JWT 
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const lowerEmail = email.toLowerCase();

    const otpRecord = await Otp.findOne({ email: lowerEmail });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(401).json({ error: 'Invalid or expired OTP.' });
    }

    let user;
    if (otpRecord.tempData.isSignup) {
      user = await User.create({
        name: otpRecord.tempData.name,
        email: lowerEmail,
        phone: otpRecord.tempData.phone
      });
    } else {
      user = await User.findOne({ email: lowerEmail });
    }

    const sessionToken = crypto.randomBytes(16).toString('hex');
    // Using updateOne to bypass any legacy validation issues
    await User.updateOne(
      { _id: user._id }, 
      { $set: { activeSessionToken: sessionToken } }
    );

    const token = jwt.sign(
      { id: user._id, sessionToken },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isProduction, 
      sameSite: isProduction ? 'none' : 'lax', 
      maxAge: 24 * 60 * 60 * 1000 
    });

    await Otp.deleteOne({ email: lowerEmail });

    res.status(200).json({ 
      message: 'Authentication successful', 
      user: { id: user._id, email: user.email, name: user.name } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification protocol failed.' });
  }
};
// Flow 4: Session Persistence (Check if cookie is still valid on refresh)
exports.checkAuthStatus = (req, res) => {
  // If the request makes it past the requireAuth middleware, the user is authenticated.
  res.status(200).json({ 
    user: { 
      id: req.user._id, 
      email: req.user.email, 
      name: req.user.name 
    } 
  });
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