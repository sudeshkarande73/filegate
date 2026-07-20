const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  // Store temporary signup data here until OTP is verified
  tempData: {
    name: String,
    phone: String,
    isSignup: Boolean
  },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-deletes after 5 minutes (300 seconds)
});

module.exports = mongoose.model('Otp', otpSchema);