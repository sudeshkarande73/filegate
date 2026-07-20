const mongoose = require('mongoose');
const PermissionSchema = new mongoose.Schema({
  fileId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'File', 
    required: true,
    index: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
    // Not required, because the receiver might not have an account yet
  },
  allowedEmail: { 
    type: String, 
    required: true,
    index: true // When a user drops a .vsf, search by their logged-in email here
  },
  role: { 
    type: String, 
    enum: ['VIEWER', 'EDITOR'], 
    default: 'VIEWER' 
  },
  grantedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // --- V2 & V3 Future-Proofing Fields ---
  isActive: { 
    type: Boolean, 
    default: true 
  },
  expiresAt: { 
    type: Date // If current date > expiresAt, access is denied
  },
  viewCount: { 
    type: Number, 
    default: 0 
  },
  maxViews: { 
    type: Number // If viewCount >= maxViews, access is denied
  }
});
// Note: Use { timestamps: true } to auto-generate grantedAt (createdAt).
module.exports = mongoose.model('Permission', PermissionSchema);