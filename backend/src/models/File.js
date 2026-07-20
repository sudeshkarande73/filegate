const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
  mimeType: { type: String, required: true }, // Needed for decryption streaming
  size: { type: Number },
  
  // --- ADVANCED GOVERNANCE ---
  expiresAt: { type: Date }, // Time-Bomb
  isBurnAfterReading: { type: Boolean, default: false }, // One-Time Link
  isBurned: { type: Boolean, default: false }, // Tripped when read
  allowedCountries: [{ type: String }], // Geo-Fencing (e.g., ['IN', 'US'])
  
  allowedUsers: [{
    email: { type: String, required: true },
    accessLevel: { type: String, enum: ['read', 'write'], default: 'read' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);